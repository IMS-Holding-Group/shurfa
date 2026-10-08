// تشغيل الخادم وربط المسارات والوسطاء
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { initSupabase } from './supabase.js';
import { createRouter, parseCookies, readBody, parseBody, HttpError } from './router.js';
import { staticHandler, serveFile } from './static.js';
import { securityHeaders, startRateLimitCleanup } from './security.js';
import { resolveSession } from './auth.js';
import { startPeriodicInvalidation } from './cache.js';
import { buildCsp } from './services/tracking.js';
import * as pageviews from './services/pageviews.js';
import { getSettings, getMenus, getPage, getService, getServices, getGuide, getGuides, getAllLivePages, getFaqs, getGovernorates, warmAllPages } from './cms/content.js';
import { findRedirect, activeRedirects } from './cms/redirects.js';
import { getActiveTiers } from './services/passport.js';
import { registerSiteRoutes, notFoundHtml, errorHtml, maintenanceHtml } from './api/site.js';
import { registerPublicApi } from './api/public.js';
import { registerV1Api } from './api/v1.js';
import { registerAdminApi } from './api/admin/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = loadConfig();
initSupabase(config);

const router = createRouter();
const serveAssets = staticHandler(path.join(ROOT, 'assets'), '/assets/');

// يبدأ استعلامات الصفحة معًا حتى ينتظر الزائر أبطأ استعلام واحد لا مجموعها
function warmPublic(pathname) {
 const slug = pathname === '/' ? 'home' : String(pathname || '').replace(/^\/|\/$/g, '');
 const jobs = [getSettings(), activeRedirects(), getMenus(), getAllLivePages(), warmAllPages(), getServices(), getGuides(500), getFaqs(''), getGovernorates(), getActiveTiers()];
 if (/^[a-z0-9\u0600-\u06FF-]{1,80}$/.test(slug)) jobs.push(getPage(slug));
 const service = /^\/services\/([^/]+)\/?$/.exec(pathname);
 if (service) jobs.push(getService(decodeURIComponent(service[1])));
 const guide = /^\/guide\/([^/]+)\/?$/.exec(pathname);
 if (guide) jobs.push(getGuide(decodeURIComponent(guide[1])));
 return Promise.all(jobs);
}

const BODY_LIMIT = 1024 * 1024;
const MEDIA_LIMIT = 12 * 1024 * 1024;
const FORM_LIMIT = 20 * 1024;

// 1) السياق الأساسي: الكوكيز ورابط الموقع
router.use(async (ctx, next) => {
 ctx.cookies = parseCookies(ctx.req.headers.cookie || '');
 ctx.siteUrl = config.siteUrl;
 await next();
});

// 2) الملفات الثابتة: /assets و/admin
router.use(async (ctx, next) => {
 if (ctx.method !== 'GET' && ctx.method !== 'HEAD') return next();
 if (ctx.path.startsWith('/assets/')) {
  securityHeaders(ctx, buildCsp({}, 'site', { supabaseOrigin: config.supabaseOrigin }), config.cookieSecure);
  if (await serveAssets(ctx)) return;
  return ctx.text(404, 'الملف غير موجود');
 }
 if (ctx.path === '/admin' || ctx.path === '/admin/' || ctx.path === '/admin/index.html') {
  const session = await resolveSession(ctx);
  if (!session) return ctx.redirect(302, '/admin/login');
  securityHeaders(ctx, buildCsp({}, 'admin', { supabaseOrigin: config.supabaseOrigin }), config.cookieSecure);
  ctx.setHeader('Cache-Control', 'no-store');
  if (await serveFile(ctx, path.join(ROOT, 'admin', 'index.html'))) return;
 }
 if (ctx.path === '/admin/login' || ctx.path === '/admin/login.html') {
  const session = await resolveSession(ctx);
  if (session) return ctx.redirect(302, '/admin');
  securityHeaders(ctx, buildCsp({}, 'admin', { supabaseOrigin: config.supabaseOrigin }), config.cookieSecure);
  ctx.setHeader('Cache-Control', 'no-store');
  if (await serveFile(ctx, path.join(ROOT, 'admin', 'login.html'))) return;
 }
 await next();
});

// 3) الترويسات الأمنية وسياسة CSP الديناميكية
router.use(async (ctx, next) => {
 const isPublicPage = (ctx.method === 'GET' || ctx.method === 'HEAD') && !ctx.path.startsWith('/api/') && !ctx.path.startsWith('/admin') && !ctx.path.startsWith('/assets/');
 if (isPublicPage) warmPublic(ctx.path).catch(() => {});
 let settings = {};
 try { settings = await getSettings(); } catch { settings = {}; }
 ctx.settings = settings;
 const scope = ctx.path.startsWith('/admin/preview/') ? 'preview' : (ctx.path.startsWith('/admin') ? 'admin' : 'site');
 ctx.applyCsp = ({ hasVideo = false } = {}) => securityHeaders(ctx, buildCsp(settings, scope, { supabaseOrigin: config.supabaseOrigin, hasVideo }), config.cookieSecure);
 ctx.applyCsp();
 await next();
});

// 4) التحويلات قبل البحث عن الصفحة
router.use(async (ctx, next) => {
 if (ctx.method === 'GET' && !ctx.path.startsWith('/api/') && !ctx.path.startsWith('/admin')) {
  const r = await findRedirect(ctx.path).catch(() => null);
  if (r) return ctx.redirect(r.code === 302 ? 302 : 301, r.to_url);
 }
 await next();
});

// 5) وضع الصيانة: الصفحات العامة فقط، وتبقى اللوحة وواجهاتها متاحة
router.use(async (ctx, next) => {
 if (ctx.settings?.maintenance_enabled === true && !ctx.path.startsWith('/admin') && !ctx.path.startsWith('/api/admin')) {
  if (ctx.path.startsWith('/api/')) return ctx.json(503, { ok: false, message: 'الموقع في الصيانة حاليًا.' }, { 'Retry-After': '600' });
  return ctx.html(503, await maintenanceHtml(ctx, ctx.settings), { 'Retry-After': '600' });
 }
 await next();
});

// 6) قراءة الجسم لطلبات الكتابة بحدود حجم حسب المسار
router.use(async (ctx, next) => {
 if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(ctx.method)) {
  const limit = ctx.path === '/api/admin/media' ? MEDIA_LIMIT : (ctx.path.startsWith('/api/forms/') ? FORM_LIMIT : BODY_LIMIT);
  ctx.rawBody = await readBody(ctx.req, limit);
  ctx.body = parseBody(ctx.rawBody, ctx.req.headers['content-type']);
 }
 await next();
});

// 7) عدّاد المشاهدات الداخلي بعد اكتمال الاستجابة
router.use(async (ctx, next) => {
 ctx.res.on('finish', () => {
  if (pageviews.shouldCount(ctx, ctx.res.statusCode)) pageviews.record(ctx.path);
 });
 await next();
});

registerPublicApi(router);
registerV1Api(router);
registerAdminApi(router);
registerSiteRoutes(router);

router.setNotFound(async (ctx) => {
 if (ctx.path.startsWith('/api/')) return ctx.fail(404, 'المسار غير موجود.');
 ctx.html(404, await notFoundHtml(ctx));
});

router.setError(async (ctx, err) => {
 const status = err instanceof HttpError ? err.status : 500;
 if (status >= 500) console.error(`Unexpected error in ${ctx.method} ${ctx.path}:`, err?.message || err);
 if (ctx.responded) return;
 if (ctx.path.startsWith('/api/')) return ctx.fail(status, err instanceof HttpError ? err.message : 'حدث خطأ غير متوقع.', err?.fields);
 if (err instanceof HttpError && status === 404) return ctx.html(404, await notFoundHtml(ctx));
 if (err instanceof HttpError && status < 500) return ctx.text(status, err.message);
 ctx.html(500, await errorHtml(ctx));
});

const server = http.createServer((req, res) => {
 router.handle(req, res).catch((err) => {
  console.error('Request handling failed:', err?.message || err);
  if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('حدث خطأ غير متوقع.'); }
 });
});

server.on('error', (err) => {
 if (err.code === 'EADDRINUSE') console.error(`Port ${config.port} is already in use. Change PORT in .env or stop the program using it.`);
 else console.error('Server failed to start:', err.message);
 process.exit(1);
});

server.listen(config.port, () => {
 console.log(`Shurfah server is running at ${config.siteUrl} (port ${config.port})`);
 console.log(`Admin panel: ${config.siteUrl}/admin`);
});

warmPublic('/').catch((err) => console.error('Failed to warm the public cache:', err?.message || err));
pageviews.start();
startRateLimitCleanup();
startPeriodicInvalidation();

// إغلاق نظيف يفرّغ عدّاد المشاهدات
async function shutdown(signal) {
 console.log(`Received ${signal}, shutting down...`);
 server.close();
 try { await pageviews.stop(); } catch (err) { console.error('Failed to flush pageviews:', err?.message || err); }
 process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
