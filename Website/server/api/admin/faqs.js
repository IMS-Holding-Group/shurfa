// واجهة الأسئلة الشائعة
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { cleanText, toBool, isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { invalidate } from '../../cache.js';
import { guarded } from './shared.js';

function validate(body) {
 const errors = {};
 const row = {
  question: cleanText(body.question, 200),
  answer: cleanText(body.answer, 3000),
  group_name: cleanText(body.group_name, 60) || 'عام',
  sort: Math.max(0, Math.min(999, Number(body.sort) || 0)),
  is_published: body.is_published === undefined ? true : toBool(body.is_published)
 };
 if (!row.question) errors.question = 'السؤال مطلوب.';
 if (!row.answer) errors.answer = 'الإجابة مطلوبة.';
 if (/<\s*[a-zA-Z!/]/.test(row.question)) errors.question = 'وسوم HTML غير مسموحة.';
 return { row, errors };
}

export function registerFaqsApi(router) {
 const view = [...guarded, requirePermission('content', 'view')];
 const full = [...guarded, requirePermission('content', 'full')];

 router.get('/api/admin/faqs', async (ctx) => {
  const { data, error } = await db().from('faqs').select('*').order('group_name').order('sort');
  if (error) throw new HttpError(500, 'تعذر قراءة الأسئلة.');
  const groups = [...new Set((data || []).map((f) => f.group_name))];
  ctx.ok({ items: data || [], groups });
 }, view);

 router.post('/api/admin/faqs', async (ctx) => {
  const { row, errors } = validate(ctx.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  const { data, error } = await db().from('faqs').insert(row).select('*').single();
  if (error) throw new HttpError(500, 'تعذر إضافة السؤال.');
  invalidate('faqs');
  await audit(ctx, 'create', 'faq', data.id, null, data);
  ctx.ok(data);
 }, full);

 router.put('/api/admin/faqs/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: before } = await db().from('faqs').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'السؤال غير موجود.');
  const { row, errors } = validate({ ...before, ...(ctx.body || {}) });
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  const { data, error } = await db().from('faqs').update(row).eq('id', ctx.params.id).select('*').single();
  if (error) throw new HttpError(500, 'تعذر حفظ السؤال.');
  invalidate('faqs');
  await audit(ctx, 'update', 'faq', data.id, before, data);
  ctx.ok(data);
 }, full);

 router.post('/api/admin/faqs/reorder', async (ctx) => {
  const ids = Array.isArray(ctx.body?.ids) ? ctx.body.ids.filter(isUuid) : [];
  for (let i = 0; i < ids.length; i += 1) await db().from('faqs').update({ sort: i + 1 }).eq('id', ids[i]);
  invalidate('faqs');
  await audit(ctx, 'reorder', 'faq', null, null, { ids });
  ctx.ok({ reordered: ids.length });
 }, full);

 router.delete('/api/admin/faqs/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: before } = await db().from('faqs').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'السؤال غير موجود.');
  const { error } = await db().from('faqs').delete().eq('id', ctx.params.id);
  if (error) throw new HttpError(500, 'تعذر حذف السؤال.');
  invalidate('faqs');
  await audit(ctx, 'delete', 'faq', ctx.params.id, before, null);
  ctx.ok({ deleted: true });
 }, full);
}
