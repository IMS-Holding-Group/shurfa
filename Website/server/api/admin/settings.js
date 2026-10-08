// واجهة إعدادات الموقع (للمسؤول الأول): حالة التطبيق، المتاجر، التواصل، السجل، الصيانة، الفهرسة
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { cleanText, toBool, isEmail, isPhone } from '../../security.js';
import { audit } from '../../services/audit.js';
import { invalidate } from '../../cache.js';
import { isHttpsUrl, isAllowedImage } from '../../cms/urls.js';
import { guarded } from './shared.js';

const KEYS = ['app_status', 'app_store_url', 'play_store_url', 'contact_email', 'contact_phone', 'commercial_registration', 'tourism_permit', 'maintenance_enabled', 'maintenance_text', 'site_noindex', 'default_og_image', 'not_found_text'];
const APP_STATUSES = ['coming_soon', 'beta', 'available'];

export function validateSettings(body) {
 const values = {};
 const errors = {};
 if ('app_status' in body) { if (!APP_STATUSES.includes(body.app_status)) errors.app_status = 'حالة غير معروفة.'; else values.app_status = body.app_status; }
 for (const k of ['app_store_url', 'play_store_url']) {
  if (!(k in body)) continue;
  const v = cleanText(body[k], 300);
  if (v && !isHttpsUrl(v)) errors[k] = 'الرابط يجب أن يبدأ بـ https://.'; else values[k] = v;
 }
 if ('contact_email' in body) { const v = cleanText(body.contact_email, 120); if (v && !isEmail(v)) errors.contact_email = 'بريد غير صحيح.'; else values.contact_email = v; }
 if ('contact_phone' in body) { const v = cleanText(body.contact_phone, 30); if (v && !isPhone(v)) errors.contact_phone = 'رقم غير صحيح.'; else values.contact_phone = v; }
 if ('commercial_registration' in body) values.commercial_registration = cleanText(body.commercial_registration, 40);
 if ('tourism_permit' in body) values.tourism_permit = cleanText(body.tourism_permit, 40);
 if ('maintenance_enabled' in body) values.maintenance_enabled = toBool(body.maintenance_enabled);
 if ('maintenance_text' in body) values.maintenance_text = cleanText(body.maintenance_text, 300) || 'نجهّز الموقع الآن. عُد بعد قليل.';
 if ('site_noindex' in body) values.site_noindex = toBool(body.site_noindex);
 if ('default_og_image' in body) { const v = cleanText(body.default_og_image, 2048); if (v && !isAllowedImage(v)) errors.default_og_image = 'الصورة من المكتبة فقط.'; else values.default_og_image = v; }
 if ('not_found_text' in body) values.not_found_text = cleanText(body.not_found_text, 300) || 'الصفحة التي تبحث عنها غير موجودة.';
 return { values, errors };
}

export function registerSettingsApi(router) {
 const full = [...guarded, requirePermission('settings', 'full')];

 router.get('/api/admin/settings', async (ctx) => {
  const { data, error } = await db().from('site_settings').select('key, value, is_public').in('key', KEYS);
  if (error) throw new HttpError(500, 'تعذر قراءة الإعدادات.');
  ctx.ok(Object.fromEntries((data || []).map((r) => [r.key, r.value])));
 }, full);

 router.put('/api/admin/settings', async (ctx) => {
  const { values, errors } = validateSettings(ctx.body || {});
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  const { data: beforeRows } = await db().from('site_settings').select('key, value').in('key', Object.keys(values));
  for (const [key, value] of Object.entries(values)) {
   const { error } = await db().from('site_settings').update({ value }).eq('key', key);
   if (error) throw new HttpError(500, 'تعذر حفظ الإعدادات.');
  }
  invalidate('');
  await audit(ctx, 'update', 'settings', null, Object.fromEntries((beforeRows || []).map((r) => [r.key, r.value])), values);
  const { data } = await db().from('site_settings').select('key, value').in('key', KEYS);
  ctx.ok(Object.fromEntries((data || []).map((r) => [r.key, r.value])));
 }, full);
}
