// واجهة القراءة العامة للمحتوى المنشور وحده (للتطبيق ولأي استهلاك آخر)
import { HttpError } from '../router.js';
import { LIMITS, rateLimit } from '../security.js';
import { getPage, getServices, getService, getGuides, getGuide, getFaqs, getMenus, resolveMenu, getPublicSettings } from '../cms/content.js';
import { getActiveTiers } from '../services/passport.js';

const CACHE = { 'Cache-Control': 'public, max-age=60' };

function publicPage(p) {
 const { draft, created_by, updated_by, deleted_at, ...rest } = p;
 rest.blocks = (rest.blocks || []).filter((b) => !b.hidden);
 return rest;
}

function publicService(s) {
 const { draft, created_by, updated_by, deleted_at, ...rest } = s;
 return rest;
}

export function registerV1Api(router) {
 const limit = rateLimit('v1', LIMITS.publicApi);

 router.get('/api/v1/pages/:slug', async (ctx) => {
  const page = await getPage(ctx.params.slug);
  if (!page) throw new HttpError(404, 'الصفحة غير موجودة.');
  ctx.json(200, { ok: true, data: publicPage(page) }, CACHE);
 }, [limit]);

 router.get('/api/v1/services', async (ctx) => {
  ctx.json(200, { ok: true, data: (await getServices()).map(publicService) }, CACHE);
 }, [limit]);

 router.get('/api/v1/services/:slug', async (ctx) => {
  const s = await getService(ctx.params.slug);
  if (!s) throw new HttpError(404, 'الخدمة غير موجودة.');
  ctx.json(200, { ok: true, data: publicService(s) }, CACHE);
 }, [limit]);

 router.get('/api/v1/guides', async (ctx) => {
  const limitN = Math.min(50, Math.max(1, Number(ctx.query.get('limit') || 12)));
  ctx.json(200, { ok: true, data: (await getGuides(limitN)).map(publicService) }, CACHE);
 }, [limit]);

 router.get('/api/v1/guides/:slug', async (ctx) => {
  const g = await getGuide(ctx.params.slug);
  if (!g) throw new HttpError(404, 'المقال غير موجود.');
  ctx.json(200, { ok: true, data: publicService(g) }, CACHE);
 }, [limit]);

 router.get('/api/v1/faqs', async (ctx) => {
  ctx.json(200, { ok: true, data: await getFaqs(ctx.query.get('group') || '') }, CACHE);
 }, [limit]);

 router.get('/api/v1/menus/:key', async (ctx) => {
  const menus = await getMenus();
  const m = menus[ctx.params.key];
  if (!m) throw new HttpError(404, 'القائمة غير موجودة.');
  ctx.json(200, { ok: true, data: { key: m.key, title: m.title, items: await resolveMenu(m.items) } }, CACHE);
 }, [limit]);

 router.get('/api/v1/passport-tiers', async (ctx) => {
  ctx.json(200, { ok: true, data: await getActiveTiers() }, CACHE);
 }, [limit]);

 router.get('/api/v1/settings/public', async (ctx) => {
  ctx.json(200, { ok: true, data: await getPublicSettings() }, CACHE);
 }, [limit]);
}
