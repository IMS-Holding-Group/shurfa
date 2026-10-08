// واجهة القوائم مع خيارات الوجهات (صفحات وخدمات ومقالات) وتحذيرات الروابط
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { audit } from '../../services/audit.js';
import { listMenus, saveMenu, menuWarnings, MENU_KEYS } from '../../cms/menus.js';
import { guarded } from './shared.js';

export function registerMenusApi(router) {
 const view = [...guarded, requirePermission('content', 'view')];
 const full = [...guarded, requirePermission('content', 'full')];

 router.get('/api/admin/menus', async (ctx) => {
  const menus = await listMenus();
  const withWarnings = [];
  for (const m of menus) withWarnings.push({ ...m, warnings: await menuWarnings(m.items) });
  const [pages, services, guides] = await Promise.all([
   db().from('pages').select('slug, title').is('deleted_at', null).order('title'),
   db().from('services').select('slug, title').is('deleted_at', null).order('sort'),
   db().from('guides').select('slug, title').is('deleted_at', null).order('title')
  ]);
  ctx.ok({ menus: withWarnings, targets: { page: pages.data || [], service: services.data || [], guide: guides.data || [] } });
 }, view);

 router.put('/api/admin/menus/:key', async (ctx) => {
  if (!MENU_KEYS.includes(ctx.params.key)) throw new HttpError(404, 'القائمة غير موجودة.');
  const { before, after } = await saveMenu(ctx.params.key, ctx.body?.title, ctx.body?.items || []);
  await audit(ctx, 'update', 'menu', ctx.params.key, before, after);
  ctx.ok({ ...after, warnings: await menuWarnings(after.items) });
 }, full);
}
