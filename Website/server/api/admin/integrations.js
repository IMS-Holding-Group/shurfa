// واجهة التكاملات والتحليلات: أدوات القياس، الموافقة، واتساب، التواصل الاجتماعي، شريط الإعلان، Webhooks
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission, requireSuperAdmin } from '../../rbac.js';
import { cleanText, toBool, isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { invalidate } from '../../cache.js';
import { validateTrackingId, parseExtraHosts, TRACKING_PATTERNS } from '../../services/tracking.js';
import { isHttpsUrl, isSafeUrl } from '../../cms/urls.js';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, rotateSecret, testWebhook, listDeliveries, EVENTS } from '../../cms/webhooks.js';
import { guarded } from './shared.js';

const TRACKING_KEYS = ['ga4_id', 'gtm_id', 'search_console_token', 'meta_pixel_id', 'snap_pixel_id', 'tiktok_pixel_id', 'clarity_id'];
const SOCIAL_KEYS = ['x', 'instagram', 'tiktok', 'snapchat', 'youtube', 'linkedin'];
const INTEGRATION_KEYS = [...TRACKING_KEYS, 'extra_csp_hosts', 'consent_banner_enabled', 'whatsapp_enabled', 'whatsapp_number', 'social', 'announcement'];

async function readSettings(keys) {
 const { data, error } = await db().from('site_settings').select('key, value').in('key', keys);
 if (error) throw new HttpError(500, 'تعذر قراءة الإعدادات.');
 return Object.fromEntries((data || []).map((r) => [r.key, r.value]));
}

async function writeSettings(entries) {
 for (const [key, value] of Object.entries(entries)) {
  const { error } = await db().from('site_settings').update({ value }).eq('key', key);
  if (error) throw new HttpError(500, 'تعذر حفظ الإعدادات.');
 }
 invalidate('');
}

// يتحقق من حمولة التكاملات ويعيد { values, errors }
export function validateIntegrations(body, role) {
 const values = {};
 const errors = {};
 for (const key of TRACKING_KEYS) {
  if (!(key in body)) continue;
  const v = cleanText(body[key], 120);
  const problem = validateTrackingId(key, v);
  if (problem) errors[key] = problem; else values[key] = v;
 }
 if ('extra_csp_hosts' in body) {
  if (role !== 'super_admin') errors.extra_csp_hosts = 'هذا الحقل للمسؤول الأول فقط.';
  else {
   const { hosts, bad } = parseExtraHosts(body.extra_csp_hosts);
   if (bad.length) errors.extra_csp_hosts = `مضيفات غير صالحة: ${bad.join(' ')}. المسموح https:// ثم نطاق صالح.`;
   else values.extra_csp_hosts = hosts.join(' ');
  }
 }
 if ('consent_banner_enabled' in body) values.consent_banner_enabled = toBool(body.consent_banner_enabled);
 if ('whatsapp_enabled' in body) values.whatsapp_enabled = toBool(body.whatsapp_enabled);
 if ('whatsapp_number' in body) {
  const v = cleanText(body.whatsapp_number, 20).replace(/[\s+-]/g, '');
  if (v && !TRACKING_PATTERNS.whatsapp_number.test(v)) errors.whatsapp_number = 'أرقام فقط بصيغة دولية بدون +، من 8 إلى 15 رقمًا (مثل 968XXXXXXXX).';
  else values.whatsapp_number = v;
 }
 if ('social' in body && body.social && typeof body.social === 'object') {
  const social = {};
  for (const k of SOCIAL_KEYS) {
   const v = cleanText(body.social[k], 300);
   if (v && !isHttpsUrl(v)) errors[`social.${k}`] = 'الرابط يجب أن يبدأ بـ https://.';
   social[k] = v;
  }
  values.social = social;
 }
 if ('announcement' in body && body.announcement && typeof body.announcement === 'object') {
  const a = { enabled: toBool(body.announcement.enabled), text: cleanText(body.announcement.text, 160), url: cleanText(body.announcement.url, 2048) };
  if (a.enabled && !a.text) errors['announcement.text'] = 'اكتب نص الإعلان.';
  if (a.url && !isSafeUrl(a.url)) errors['announcement.url'] = 'الرابط غير مسموح.';
  values.announcement = a;
 }
 return { values, errors };
}

export function registerIntegrationsApi(router) {
 const view = [...guarded, requirePermission('integrations', 'view')];
 const full = [...guarded, requirePermission('integrations', 'full')];
 const superOnly = [...guarded, requireSuperAdmin()];

 router.get('/api/admin/integrations', async (ctx) => {
  const settings = await readSettings(INTEGRATION_KEYS);
  const warnings = [];
  if (settings.ga4_id && settings.gtm_id) warnings.push('GTM مفعّل، لذلك لا يُحمَّل GA4 مباشرة لتفادي العدّ المزدوج. أدر GA4 من داخل حاوية GTM.');
  ctx.ok({ settings, warnings, events: EVENTS });
 }, view);

 router.put('/api/admin/integrations', async (ctx) => {
  const { values, errors } = validateIntegrations(ctx.body || {}, ctx.profile.role);
  if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
  const before = await readSettings(Object.keys(values));
  await writeSettings(values);
  await audit(ctx, 'update', 'integrations', null, before, values);
  ctx.ok(await readSettings(INTEGRATION_KEYS));
 }, full);

 router.get('/api/admin/webhooks', async (ctx) => { ctx.ok({ items: await listWebhooks() }); }, superOnly);

 router.post('/api/admin/webhooks', async (ctx) => {
  const data = await createWebhook(ctx.body || {});
  await audit(ctx, 'create', 'webhook', data.id, null, { name: data.name, url: data.url, events: data.events });
  ctx.ok(data);
 }, superOnly);

 router.put('/api/admin/webhooks/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { before, after } = await updateWebhook(ctx.params.id, ctx.body || {});
  await audit(ctx, 'update', 'webhook', after.id, before, after);
  ctx.ok(after);
 }, superOnly);

 router.post('/api/admin/webhooks/:id/rotate-secret', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const data = await rotateSecret(ctx.params.id);
  await audit(ctx, 'rotate_secret', 'webhook', data.id);
  ctx.ok(data);
 }, superOnly);

 router.post('/api/admin/webhooks/:id/test', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const result = await testWebhook(ctx.params.id);
  await audit(ctx, 'test', 'webhook', ctx.params.id, null, result);
  ctx.ok(result);
 }, superOnly);

 router.get('/api/admin/webhooks/:id/deliveries', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  ctx.ok({ items: await listDeliveries(ctx.params.id) });
 }, superOnly);

 router.delete('/api/admin/webhooks/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const before = await deleteWebhook(ctx.params.id);
  await audit(ctx, 'delete', 'webhook', ctx.params.id, before, null);
  ctx.ok({ deleted: true });
 }, superOnly);
}
