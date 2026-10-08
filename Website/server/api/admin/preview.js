// المعاينة: تعرض المسودة بالتصميم الحقيقي، محمية بالجلسة وغير مفهرسة ولا تُحسب في العدّاد
import { HttpError } from '../../router.js';
import { resolveSession } from '../../auth.js';
import { hasLevel } from '../../rbac.js';
import { isUuid } from '../../security.js';
import { getRow, withDraft } from '../../cms/drafts.js';
import { getServices, getGuides } from '../../cms/content.js';
import { buildRenderContext } from '../site.js';
import { renderPage, renderServicePage, renderGuidePage } from '../../render/page.js';

const TYPES = { page: 'pages', service: 'services', guide: 'guides' };

export function registerPreviewRoutes(router) {
 router.get('/admin/preview/:type/:id', async (ctx) => {
  const session = await resolveSession(ctx);
  if (!session) return ctx.redirect(302, '/admin/login');
  if (!hasLevel(session.profile.role, 'content', 'view')) throw new HttpError(403, 'ليست لديك صلاحية للمعاينة.');
  const table = TYPES[ctx.params.type];
  if (!table || !isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const row = withDraft(await getRow(table, ctx.params.id));
  const publicPath = table === 'pages' ? (row.slug === 'home' ? '/' : `/${row.slug}`) : (table === 'services' ? `/services/${row.slug}` : `/guide/${row.slug}`);
  const rc = await buildRenderContext(ctx, publicPath);
  let html;
  if (table === 'pages') html = await renderPage(rc, row, { preview: true });
  else if (table === 'services') html = await renderServicePage(rc, row, await getServices(), { preview: true });
  else html = await renderGuidePage(rc, row, await getGuides(4), { preview: true });
  if (rc.hasVideo && ctx.applyCsp) ctx.applyCsp({ hasVideo: true });
  ctx.html(200, html, { 'Cache-Control': 'no-store' });
 });
}
