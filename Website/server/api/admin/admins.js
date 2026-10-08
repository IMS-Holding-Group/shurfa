// واجهة حسابات الإدارة (للمسؤول الأول): إنشاء وتعديل وإيقاف وإعادة تعيين كلمة المرور
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission, ROLES, ROLE_LABELS } from '../../rbac.js';
import { cleanText, toBool, isEmail, isUuid } from '../../security.js';
import { passwordProblem } from '../../auth.js';
import { audit } from '../../services/audit.js';
import { guarded } from './shared.js';

async function listProfiles() {
 const { data, error } = await db().from('profiles').select('*').order('created_at');
 if (error) throw new HttpError(500, 'تعذر قراءة الحسابات.');
 const { data: users } = await db().auth.admin.listUsers({ perPage: 200 });
 const emails = Object.fromEntries((users?.users || []).map((u) => [u.id, u.email]));
 return (data || []).map((p) => ({ ...p, email: emails[p.id] || '', role_label: ROLE_LABELS[p.role] }));
}

async function countActiveSupers(excludeId) {
 const { count } = await db().from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'super_admin').eq('is_active', true).neq('id', excludeId || '00000000-0000-0000-0000-000000000000');
 return count || 0;
}

export function registerAdminsApi(router) {
 const full = [...guarded, requirePermission('admins', 'full')];

 router.get('/api/admin/admins', async (ctx) => { ctx.ok({ items: await listProfiles(), roles: ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })) }); }, full);

 router.post('/api/admin/admins', async (ctx) => {
  const b = ctx.body || {};
  const errors = {};
  const email = cleanText(b.email, 120).toLowerCase();
  const fullName = cleanText(b.full_name, 80);
  if (!isEmail(email)) errors.email = 'بريد غير صحيح.';
  if (!fullName) errors.full_name = 'الاسم مطلوب.';
  if (!ROLES.includes(b.role)) errors.role = 'اختر دورًا.';
  const pw = passwordProblem(b.password);
  if (pw) errors.password = pw;
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  const { data: created, error } = await db().auth.admin.createUser({ email, password: b.password, email_confirm: true });
  if (error || !created?.user) throw new HttpError(400, 'تعذر إنشاء الحساب. قد يكون البريد مستخدمًا.', { email: 'قد يكون البريد مستخدمًا.' });
  const { data: profile, error: pErr } = await db().from('profiles').insert({ id: created.user.id, full_name: fullName, role: b.role, is_active: true, must_change_password: true }).select('*').single();
  if (pErr) { await db().auth.admin.deleteUser(created.user.id); throw new HttpError(500, 'تعذر حفظ ملف الحساب.'); }
  await audit(ctx, 'create', 'admin', profile.id, null, { email, full_name: fullName, role: b.role });
  ctx.ok({ ...profile, email, role_label: ROLE_LABELS[profile.role] });
 }, full);

 router.put('/api/admin/admins/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: before } = await db().from('profiles').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'الحساب غير موجود.');
  const b = ctx.body || {};
  const patch = {};
  const errors = {};
  if ('full_name' in b) { patch.full_name = cleanText(b.full_name, 80); if (!patch.full_name) errors.full_name = 'الاسم مطلوب.'; }
  if ('role' in b) { if (!ROLES.includes(b.role)) errors.role = 'دور غير معروف.'; else patch.role = b.role; }
  if ('is_active' in b) patch.is_active = toBool(b.is_active);
  const losingSuper = (patch.role && patch.role !== 'super_admin' && before.role === 'super_admin') || (patch.is_active === false && before.role === 'super_admin');
  if (losingSuper && (await countActiveSupers(before.id)) === 0) errors.role = 'لا يمكن إزالة آخر مسؤول أول مفعّل.';
  if (before.id === ctx.user.id && patch.is_active === false) errors.is_active = 'لا يمكنك إيقاف حسابك الحالي.';
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  if ('email' in b) {
   const email = cleanText(b.email, 120).toLowerCase();
   if (!isEmail(email)) throw new HttpError(400, 'بريد غير صحيح.', { email: 'بريد غير صحيح.' });
   const { error } = await db().auth.admin.updateUserById(before.id, { email, email_confirm: true });
   if (error) throw new HttpError(400, 'تعذر تغيير البريد. قد يكون مستخدمًا.', { email: 'قد يكون البريد مستخدمًا.' });
  }
  if (b.new_password) {
   const pw = passwordProblem(b.new_password);
   if (pw) throw new HttpError(400, pw, { new_password: pw });
   const { error } = await db().auth.admin.updateUserById(before.id, { password: b.new_password });
   if (error) throw new HttpError(500, 'تعذر إعادة تعيين كلمة المرور.');
   patch.must_change_password = true;
  }
  const { data, error } = await db().from('profiles').update(patch).eq('id', before.id).select('*').single();
  if (error) throw new HttpError(500, 'تعذر حفظ الحساب.');
  await audit(ctx, 'update', 'admin', data.id, before, data);
  ctx.ok({ ...data, role_label: ROLE_LABELS[data.role] });
 }, full);
}
