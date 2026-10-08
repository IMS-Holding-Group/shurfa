// واجهة الجواز التراثي: الفئات والأسعار والخصومات وخيار «مجاني عند الإطلاق»
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { cleanText, toBool, isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { invalidate } from '../../cache.js';
import { guarded } from './shared.js';

function validateTier(body) {
 const errors = {};
 const num = (v, key, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) { errors[key] = `قيمة بين ${min} و${max}.`; return 0; }
  return n;
 };
 const row = {
  name_ar: cleanText(body.name_ar, 40),
  price_omr: Math.round(num(body.price_omr, 'price_omr', 0, 9999) * 1000) / 1000,
  duration_days: Math.round(num(body.duration_days, 'duration_days', 1, 365)),
  discount_min_pct: num(body.discount_min_pct, 'discount_min_pct', 0, 100),
  discount_max_pct: num(body.discount_max_pct, 'discount_max_pct', 0, 100),
  sort: Math.round(Number(body.sort) || 0),
  is_active: body.is_active === undefined ? true : toBool(body.is_active)
 };
 if (!row.name_ar) errors.name_ar = 'الاسم مطلوب.';
 if (row.discount_max_pct < row.discount_min_pct) errors.discount_max_pct = 'أعلى خصم لا يقل عن أقل خصم.';
 return { row, errors };
}

export function registerPassportApi(router) {
 const view = [...guarded, requirePermission('passport', 'view')];
 const full = [...guarded, requirePermission('passport', 'full')];

 router.get('/api/admin/passport', async (ctx) => {
  const { data, error } = await db().from('passport_tiers').select('*').order('sort');
  if (error) throw new HttpError(500, 'تعذر قراءة الفئات.');
  const { data: free } = await db().from('site_settings').select('value').eq('key', 'passport_free').maybeSingle();
  ctx.ok({ tiers: data || [], passport_free: free?.value === true });
 }, view);

 router.put('/api/admin/passport/free', async (ctx) => {
  const value = toBool(ctx.body?.passport_free);
  const { error } = await db().from('site_settings').upsert({ key: 'passport_free', value, is_public: true });
  if (error) throw new HttpError(500, 'تعذر الحفظ.');
  invalidate('');
  await audit(ctx, 'update', 'setting', 'passport_free', null, { value });
  ctx.ok({ passport_free: value });
 }, full);

 router.put('/api/admin/passport/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: before } = await db().from('passport_tiers').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'الفئة غير موجودة.');
  const { row, errors } = validateTier({ ...before, ...(ctx.body || {}) });
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  const { data, error } = await db().from('passport_tiers').update(row).eq('id', ctx.params.id).select('*').single();
  if (error) throw new HttpError(500, 'تعذر حفظ الفئة.');
  invalidate('passport');
  await audit(ctx, 'update', 'passport_tier', data.id, before, data);
  ctx.ok(data);
 }, full);
}
