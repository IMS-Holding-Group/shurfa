// واجهة الردود وطلبات الشركاء: الصلاحية تتبع module_group للنموذج
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { can, hasLevel } from '../../rbac.js';
import { cleanText, isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { listForms, getFormById, toCsv } from '../../cms/forms.js';
import { guarded, paging, pageResult } from './shared.js';

const STATUSES = ['new', 'in_review', 'accepted', 'rejected', 'closed'];

function moduleOf(group) { return group === 'applications' ? 'applications' : 'messages'; }

async function formsForGroup(group) {
 const all = await listForms();
 return all.filter((f) => f.module_group === group);
}

async function loadSubmission(id) {
 const { data, error } = await db().from('form_submissions').select('*').eq('id', id).maybeSingle();
 if (error || !data) throw new HttpError(404, 'الرد غير موجود.');
 const form = await getFormById(data.form_id);
 return { submission: data, form };
}

export function registerSubmissionsApi(router) {
 // القائمة: ?group=messages|applications&form=slug&status=&q=&page=
 router.get('/api/admin/submissions', async (ctx) => {
  const group = ctx.query.get('group') === 'applications' ? 'applications' : 'messages';
  if (!hasLevel(ctx.profile.role, moduleOf(group), 'view')) throw new HttpError(403, 'ليست لديك صلاحية لهذه الوحدة.');
  const forms = await formsForGroup(group);
  const formSlug = ctx.query.get('form');
  const ids = forms.filter((f) => !formSlug || f.slug === formSlug).map((f) => f.id);
  const p = paging(ctx);
  if (!ids.length) return ctx.ok({ ...pageResult([], 0, p), forms });
  let q = db().from('form_submissions').select('*', { count: 'exact' }).in('form_id', ids).order('created_at', { ascending: false });
  const status = ctx.query.get('status');
  if (status && STATUSES.includes(status)) q = q.eq('status', status);
  const byId = Object.fromEntries(forms.map((f) => [f.id, f]));
  const decorate = (s) => ({ ...s, form_slug: byId[s.form_id]?.slug, form_title: byId[s.form_id]?.title });
  if (p.q) {
   // ponytail: البحث داخل JSON يتم في الذاكرة على آخر 1000 رد، يُنقل إلى فهرس نصي عند نمو البيانات
   const { data, error } = await q.limit(1000);
   if (error) throw new HttpError(500, 'تعذر قراءة الردود.');
   const needle = p.q.toLowerCase();
   const hits = (data || []).filter((s) => JSON.stringify(s.data).toLowerCase().includes(needle));
   return ctx.ok({ ...pageResult(hits.slice(p.from, p.to + 1).map(decorate), hits.length, p), forms });
  }
  const { data, error, count } = await q.range(p.from, p.to);
  if (error) throw new HttpError(500, 'تعذر قراءة الردود.');
  ctx.ok({ ...pageResult((data || []).map(decorate), count, p), forms });
 }, guarded);

 router.get('/api/admin/submissions/counts', async (ctx) => {
  const forms = await listForms();
  const out = { messages: 0, applications: 0 };
  for (const group of ['messages', 'applications']) {
   if (!hasLevel(ctx.profile.role, group, 'view')) continue;
   const ids = forms.filter((f) => f.module_group === group).map((f) => f.id);
   if (!ids.length) continue;
   const { count } = await db().from('form_submissions').select('id', { count: 'exact', head: true }).in('form_id', ids).eq('status', 'new');
   out[group] = count || 0;
  }
  ctx.ok(out);
 }, guarded);

 router.get('/api/admin/submissions/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { submission, form } = await loadSubmission(ctx.params.id);
  if (!hasLevel(ctx.profile.role, moduleOf(form.module_group), 'view')) throw new HttpError(403, 'ليست لديك صلاحية.');
  let handler = '';
  if (submission.handled_by) {
   const { data } = await db().from('profiles').select('full_name').eq('id', submission.handled_by).maybeSingle();
   handler = data?.full_name || '';
  }
  ctx.ok({ submission: { ...submission, handler }, form: { id: form.id, slug: form.slug, title: form.title, module_group: form.module_group, fields: form.fields } });
 }, guarded);

 router.put('/api/admin/submissions/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { submission, form } = await loadSubmission(ctx.params.id);
  const module = moduleOf(form.module_group);
  if (!can(ctx.profile.role, module, 'approve')) throw new HttpError(403, 'ليست لديك صلاحية لتغيير الحالة.');
  const patch = {};
  if ('status' in (ctx.body || {})) {
   if (!STATUSES.includes(ctx.body.status)) throw new HttpError(400, 'الحالة غير معروفة.', { status: 'اختر حالة صالحة.' });
   patch.status = ctx.body.status;
  }
  if ('internal_note' in (ctx.body || {})) patch.internal_note = cleanText(ctx.body.internal_note, 2000);
  patch.handled_by = ctx.user.id;
  patch.handled_at = new Date().toISOString();
  const { data, error } = await db().from('form_submissions').update(patch).eq('id', submission.id).select('*').single();
  if (error) throw new HttpError(500, 'تعذر الحفظ.');
  await audit(ctx, 'update', 'submission', data.id, { status: submission.status, internal_note: submission.internal_note }, { status: data.status, internal_note: data.internal_note });
  ctx.ok(data);
 }, guarded);

 router.delete('/api/admin/submissions/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { submission, form } = await loadSubmission(ctx.params.id);
  if (!can(ctx.profile.role, moduleOf(form.module_group), 'delete')) throw new HttpError(403, 'ليست لديك صلاحية للحذف.');
  const { error } = await db().from('form_submissions').delete().eq('id', submission.id);
  if (error) throw new HttpError(500, 'تعذر الحذف.');
  await audit(ctx, 'delete', 'submission', submission.id, { form: form.slug }, null);
  ctx.ok({ deleted: true });
 }, guarded);

 // تصدير CSV لردود نموذج واحد
 router.get('/api/admin/export', async (ctx) => {
  if (ctx.query.get('type') !== 'submissions') throw new HttpError(400, 'نوع التصدير غير معروف.');
  const slug = String(ctx.query.get('form') || '');
  const forms = await listForms();
  const form = forms.find((f) => f.slug === slug);
  if (!form) throw new HttpError(404, 'النموذج غير موجود.');
  if (!can(ctx.profile.role, moduleOf(form.module_group), 'export')) throw new HttpError(403, 'ليست لديك صلاحية للتصدير.');
  const { data, error } = await db().from('form_submissions').select('*').eq('form_id', form.id).order('created_at', { ascending: false }).limit(5000);
  if (error) throw new HttpError(500, 'تعذر التصدير.');
  await audit(ctx, 'export', 'submission', form.id, null, { count: (data || []).length });
  ctx.send(200, toCsv(form, data || []), 'text/csv; charset=utf-8', { 'Content-Disposition': `attachment; filename="${form.slug}-submissions.csv"`, 'Cache-Control': 'no-store' });
 }, guarded);
}
