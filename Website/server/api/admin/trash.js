// واجهة سلة المحذوفات: العرض والاستعادة والحذف النهائي (للمسؤول الأول)
import { HttpError } from '../../router.js';
import { requirePermission, requireSuperAdmin } from '../../rbac.js';
import { isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { listTrash, restore, purge } from '../../cms/trash.js';
import { guarded } from './shared.js';

export function registerTrashApi(router) {
 const view = [...guarded, requirePermission('content', 'view')];
 const full = [...guarded, requirePermission('content', 'full')];

 router.get('/api/admin/trash', async (ctx) => { ctx.ok({ items: await listTrash() }); }, view);

 router.post('/api/admin/trash/:type/:id/restore', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const data = await restore(ctx.params.type, ctx.params.id, ctx.user.id);
  await audit(ctx, 'restore', ctx.params.type, data.id, null, data);
  ctx.ok(data);
 }, full);

 router.delete('/api/admin/trash/:type/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const before = await purge(ctx.params.type, ctx.params.id);
  await audit(ctx, 'purge', ctx.params.type, ctx.params.id, before, null);
  ctx.ok({ deleted: true });
 }, [...guarded, requireSuperAdmin()]);
}
