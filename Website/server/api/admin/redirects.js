// واجهة التحويلات مع استيراد وتصدير CSV
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { listRedirects, createRedirect, updateRedirect, deleteRedirect, redirectsToCsv, parseRedirectsCsv } from '../../cms/redirects.js';
import { guarded } from './shared.js';

export function registerRedirectsApi(router) {
 const view = [...guarded, requirePermission('content', 'view')];
 const full = [...guarded, requirePermission('content', 'full')];

 router.get('/api/admin/redirects', async (ctx) => {
  ctx.ok({ items: await listRedirects() });
 }, view);

 router.get('/api/admin/redirects/export', async (ctx) => {
  ctx.send(200, redirectsToCsv(await listRedirects()), 'text/csv; charset=utf-8', { 'Content-Disposition': 'attachment; filename="redirects.csv"', 'Cache-Control': 'no-store' });
 }, view);

 router.post('/api/admin/redirects', async (ctx) => {
  const data = await createRedirect(ctx.body || {});
  await audit(ctx, 'create', 'redirect', data.id, null, data);
  ctx.ok(data);
 }, full);

 router.post('/api/admin/redirects/import', async (ctx) => {
  const { rows, errors } = parseRedirectsCsv(ctx.body?.csv);
  const created = [];
  for (const r of rows) {
   try { created.push(await createRedirect(r)); } catch (err) { errors.push(`${r.from_path}: ${err.message}`); }
  }
  await audit(ctx, 'import', 'redirect', null, null, { created: created.length });
  ctx.ok({ created: created.length, errors });
 }, full);

 router.put('/api/admin/redirects/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { before, after } = await updateRedirect(ctx.params.id, ctx.body || {});
  await audit(ctx, 'update', 'redirect', after.id, before, after);
  ctx.ok(after);
 }, full);

 router.delete('/api/admin/redirects/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const before = await deleteRedirect(ctx.params.id);
  await audit(ctx, 'delete', 'redirect', ctx.params.id, before, null);
  ctx.ok({ deleted: true });
 }, full);
}
