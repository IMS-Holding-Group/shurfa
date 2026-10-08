// مسارات الموقع العام: الصفحات، الخدمات، المقالات، خريطة الموقع، robots، favicon
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveFile } from '../static.js';
import { getSettings, getMenus, getPage, getService, getServices, getGuide, getGuides, getAllLivePages, resolveMenu } from '../cms/content.js';
import { renderPage, renderServicePage, renderGuidePage } from '../render/page.js';
import { renderStatusPage, getLogos } from '../render/layout.js';
import { escapeHtml } from '../render/components.js';
import { cached } from '../cache.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// يبني سياق الرسم المشترك لكل صفحة عامة
export async function buildRenderContext(ctx, overridePath) {
 const settings = await getSettings();
 const menus = await cached('menus:resolved', async () => {
  const raw = await getMenus();
  const out = {};
  for (const key of ['main', 'footer_1', 'footer_2', 'footer_3', 'footer_4']) {
   const m = raw[key];
   out[key] = { title: m?.title || '', items: await resolveMenu(m?.items || []) };
  }
  return out;
 });
 return {
  settings,
  menus: { main: menus.main.items, footer_1: menus.footer_1, footer_2: menus.footer_2, footer_3: menus.footer_3, footer_4: menus.footer_4 },
  siteUrl: ctx.siteUrl,
  path: overridePath || ctx.path,
  query: ctx.query,
  cookies: ctx.cookies,
  formState: ctx.state.formState || {},
  jsonLd: []
 };
}

export async function notFoundHtml(ctx) {
 const rc = await buildRenderContext(ctx);
 return renderStatusPage(rc, { code: 404, title: 'الصفحة غير موجودة', text: rc.settings.not_found_text || 'الصفحة التي تبحث عنها غير موجودة.' });
}

export async function errorHtml(ctx) {
 try {
  const rc = await buildRenderContext(ctx);
  return renderStatusPage(rc, { code: 500, title: 'حدث خطأ', text: 'حدث خطأ غير متوقع. حاول مجددًا بعد قليل.' });
 } catch {
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>حدث خطأ | شُرفة</title><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/assets/css/tokens.css"><link rel="stylesheet" href="/assets/css/base.css"></head><body><main class="status-page"><h1>حدث خطأ</h1><p>حدث خطأ غير متوقع. حاول مجددًا بعد قليل.</p><p><a href="/">العودة إلى الرئيسية</a></p></main></body></html>`;
 }
}

export async function maintenanceHtml(ctx, settings) {
 const rc = await buildRenderContext(ctx);
 return renderStatusPage(rc, { code: 503, title: 'الموقع في الصيانة', text: settings.maintenance_text || 'نجهّز الموقع الآن. عُد بعد قليل.', showHome: false });
}

// يرسم المسار العام ويعيد { status, html } أو null إن لم يطابق أي محتوى
export async function renderPath(ctx, pathname, formState) {
 ctx.state.formState = formState || ctx.state.formState;
 const service = /^\/services\/([^/]+)\/?$/.exec(pathname);
 const guide = /^\/guide\/([^/]+)\/?$/.exec(pathname);
 const slug = pathname === '/' ? 'home' : pathname.replace(/^\/|\/$/g, '');
 const pagePromise = !service && !guide && /^[a-z0-9\u0600-\u06FF-]{1,80}$/.test(slug) ? getPage(slug) : null;
 const rc = await buildRenderContext(ctx, pathname);
 if (service) {
  const s = await getService(decodeURIComponent(service[1]));
  if (!s) return null;
  const html = await renderServicePage(rc, s, await getServices());
  return { status: 200, html, hasVideo: rc.hasVideo };
 }
 if (guide) {
  const g = await getGuide(decodeURIComponent(guide[1]));
  if (!g) return null;
  const html = await renderGuidePage(rc, g, await getGuides(4));
  return { status: 200, html, hasVideo: rc.hasVideo };
 }
 if (!pagePromise) return null;
 const page = await pagePromise;
 if (!page) return null;
 if (slug === 'home' && pathname !== '/') return null;
 const html = await renderPage(rc, page);
 return { status: 200, html, hasVideo: rc.hasVideo };
}

async function sitemapXml(ctx) {
 const [pages, services, guides] = await Promise.all([getAllLivePages(), getServices(), getGuides(500)]);
 const urls = [];
 for (const p of pages) if (!p.noindex) urls.push({ loc: p.slug === 'home' ? '/' : `/${p.slug}`, lastmod: p.updated_at });
 for (const s of services) if (!s.noindex) urls.push({ loc: `/services/${s.slug}`, lastmod: s.updated_at });
 for (const g of guides) if (!g.noindex) urls.push({ loc: `/guide/${g.slug}`, lastmod: g.updated_at });
 const body = urls.map((u) => `<url><loc>${escapeHtml(`${ctx.siteUrl}${u.loc}`)}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function registerSiteRoutes(router) {
 router.get('/sitemap.xml', async (ctx) => {
  const settings = await getSettings();
  if (settings.site_noindex === true) return ctx.text(404, 'غير متاح');
  ctx.send(200, await sitemapXml(ctx), 'application/xml; charset=utf-8', { 'Cache-Control': 'public, max-age=3600' });
 });

 router.get('/robots.txt', async (ctx) => {
  const settings = await getSettings();
  const lines = settings.site_noindex === true
   ? ['User-agent: *', 'Disallow: /']
   : ['User-agent: *', 'Disallow: /admin', 'Disallow: /api', 'Allow: /', `Sitemap: ${ctx.siteUrl}/sitemap.xml`];
  ctx.text(200, `${lines.join('\n')}\n`, { 'Cache-Control': 'public, max-age=3600' });
 });

 router.get('/favicon.ico', async (ctx) => {
  const logos = getLogos();
  const mono = logos['logo-monogram'];
  if (mono) {
   const served = await serveFile(ctx, path.join(ROOT, mono.replace(/^\//, '').split('/').join(path.sep)));
   if (served) return;
  }
  for (const name of ['favicon.ico', 'favicon.png', 'favicon.svg']) {
   const p = path.join(ROOT, 'assets', 'images', 'logo', name);
   if (existsSync(p) && await serveFile(ctx, p)) return;
  }
  ctx.text(404, 'لم يُرفع شعار المونوغرام بعد. ضعه في assets/images/logo/logo-monogram.svg');
 });

 router.get('/services/:slug', async (ctx) => {
  const r = await renderPath(ctx, ctx.path);
  if (!r) return ctx.html(404, await notFoundHtml(ctx));
  if (r.hasVideo && ctx.applyCsp) ctx.applyCsp({ hasVideo: true });
  ctx.html(r.status, r.html);
 });

 router.get('/guide/:slug', async (ctx) => {
  const r = await renderPath(ctx, ctx.path);
  if (!r) return ctx.html(404, await notFoundHtml(ctx));
  if (r.hasVideo && ctx.applyCsp) ctx.applyCsp({ hasVideo: true });
  ctx.html(r.status, r.html);
 });

 router.get('/', async (ctx) => {
  const r = await renderPath(ctx, '/');
  if (!r) return ctx.html(404, await notFoundHtml(ctx));
  if (r.hasVideo && ctx.applyCsp) ctx.applyCsp({ hasVideo: true });
  ctx.html(r.status, r.html);
 });

 router.get('/:slug', async (ctx) => {
  const r = await renderPath(ctx, ctx.path);
  if (!r) return ctx.html(404, await notFoundHtml(ctx));
  if (r.hasVideo && ctx.applyCsp) ctx.applyCsp({ hasVideo: true });
  ctx.html(r.status, r.html);
 });
}
