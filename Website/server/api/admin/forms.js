// واجهة بناء النماذج
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { listForms, getFormById, createForm, updateForm, deleteForm, FIELD_TYPES } from '../../cms/forms.js';
import { getGovernorates } from '../../cms/content.js';
import { guarded } from './shared.js';

export function registerFormsApi(router) {
 const view = [...guarded, requirePermission('forms', 'view')];
 const full = [...guarded, requirePermission('forms', 'full')];

 router.get('/api/admin/forms', async (ctx) => {
  ctx.ok({ items: await listForms(), field_types: FIELD_TYPES, governorates: (await getGovernorates()).map((g) => g.name_ar) });
 }, view);

 router.get('/api/admin/forms/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  ctx.ok(await getFormById(ctx.params.id));
 }, view);

 router.post('/api/admin/forms', async (ctx) => {
  const data = await createForm(ctx.body || {});
  await audit(ctx, 'create', 'form', data.id, null, data);
  ctx.ok(data);
 }, full);

 router.put('/api/admin/forms/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { before, after } = await updateForm(ctx.params.id, ctx.body || {});
  await audit(ctx, 'update', 'form', after.id, before, after);
  ctx.ok(after);
 }, full);

 router.delete('/api/admin/forms/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const before = await deleteForm(ctx.params.id);
  await audit(ctx, 'delete', 'form', ctx.params.id, before, null);
  ctx.ok({ deleted: true });
 }, full);
}
