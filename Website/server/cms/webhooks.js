// الإرسال الصادر الآمن: التوقيع بـ HMAC-SHA256، حماية SSRF، إعادة المحاولة بتأخير متصاعد
import { createHmac, randomBytes } from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { db } from '../supabase.js';
import { HttpError } from '../router.js';
import { isHttpsUrl } from './urls.js';

export const EVENTS = ['form_submitted', 'content_published'];
const TIMEOUT_MS = 8000;
const RETRY_DELAYS = [5 * 1000, 30 * 1000, 5 * 60 * 1000];
const MAX_DELIVERIES = 200;

export function generateSecret() {
 return randomBytes(32).toString('hex');
}

export function sign(body, secret) {
 return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

// عنوان IPv4 المضمّن في 6to4 (2002:hhhh:hhhh::)
function embedded6to4(lower) {
 if (!lower.startsWith('2002:')) return '';
 const parts = lower.split(':');
 const hex = `${(parts[1] || '0').padStart(4, '0')}${(parts[2] || '0').padStart(4, '0')}`;
 if (!/^[0-9a-f]{8}$/.test(hex)) return '';
 return [0, 2, 4, 6].map((i) => String(parseInt(hex.slice(i, i + 2), 16))).join('.');
}

// يحدد إن كان عنوان IP خاصًا أو محليًا أو غير قابل للتوجيه
// ponytail: الفحص قبل fetch، إعادة ربط DNS قصيرة تبقى فجوة حتى يُثبَّت العنوان على الاتصال
export function isPrivateAddress(ip) {
 if (!ip) return true;
 if (net.isIPv4(ip)) {
  const [a, b] = ip.split('.').map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && (b === 0 || b === 168)) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  return false;
 }
 if (net.isIPv6(ip)) {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1') return true;
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  if (lower.startsWith('ff')) return true;
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (v4) return isPrivateAddress(v4[1]);
  const sixToFour = embedded6to4(lower);
  if (sixToFour) return isPrivateAddress(sixToFour);
  return false;
 }
 return true;
}

// يحلّل اسم النطاق ويرفض إن كان أي عنوان ناتج خاصًا
export async function assertSafeDestination(url) {
 if (!isHttpsUrl(url)) throw new Error('الرابط يجب أن يكون https.');
 const { hostname } = new URL(url);
 if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) throw new Error('الوجهة محلية غير مسموحة.');
 if (net.isIP(hostname)) {
  if (isPrivateAddress(hostname)) throw new Error('الوجهة عنوان خاص غير مسموح.');
  return;
 }
 let addresses = [];
 try { addresses = await dns.lookup(hostname, { all: true }); } catch { throw new Error('تعذر تحليل اسم النطاق.'); }
 if (addresses.length === 0) throw new Error('لا عناوين لهذا النطاق.');
 if (addresses.some((a) => isPrivateAddress(a.address))) throw new Error('الوجهة تشير إلى عنوان خاص.');
}

async function deliverOnce(hook, event, body) {
 await assertSafeDestination(hook.url);
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
 try {
  const res = await fetch(hook.url, {
   method: 'POST',
   redirect: 'manual',
   signal: controller.signal,
   headers: {
    'Content-Type': 'application/json',
    'X-Shurfah-Event': event,
    'X-Shurfah-Signature': sign(body, hook.secret),
    'User-Agent': 'Shurfah-Webhook/1.0'
   },
   body
  });
  return { status: res.status, ok: res.status >= 200 && res.status < 300 };
 } finally { clearTimeout(timer); }
}

async function logDelivery(hookId, event, attempt, result) {
 await db().from('webhook_deliveries').insert({ webhook_id: hookId, event, status_code: result.status ?? null, ok: !!result.ok, error: result.error || null, attempt });
 await db().from('webhooks').update({ last_status_code: result.status ?? null, last_attempt_at: new Date().toISOString() }).eq('id', hookId);
 const { data } = await db().from('webhook_deliveries').select('id').eq('webhook_id', hookId).order('created_at', { ascending: false });
 const extra = (data || []).slice(MAX_DELIVERIES).map((d) => d.id);
 if (extra.length) await db().from('webhook_deliveries').delete().in('id', extra);
}

// يرسل مع إعادة المحاولة حتى 3 مرات دون تعطيل المستدعي
export async function deliverWithRetry(hook, event, payload) {
 const body = JSON.stringify(payload);
 for (let attempt = 1; attempt <= RETRY_DELAYS.length; attempt += 1) {
  let result;
  try { result = await deliverOnce(hook, event, body); } catch (err) { result = { ok: false, status: null, error: (err?.name === 'AbortError' ? 'انتهت المهلة' : err?.message || 'خطأ') }; }
  await logDelivery(hook.id, event, attempt, result).catch(() => {});
  if (result.ok) return result;
  if (result.error && /https|خاص|محلي|النطاق/.test(result.error)) return result;
  if (attempt < RETRY_DELAYS.length) await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt - 1]));
 }
 return { ok: false };
}

// يطلق الحدث لكل الوجهات المفعّلة المشتركة فيه
export async function emit(event, data, formId = null) {
 const { data: hooks } = await db().from('webhooks').select('*').eq('is_active', true).contains('events', [event]);
 for (const hook of hooks || []) {
  if (event === 'form_submitted' && Array.isArray(hook.form_ids) && hook.form_ids.length && !hook.form_ids.includes(formId)) continue;
  const payload = { event, occurred_at: new Date().toISOString(), ...data };
  deliverWithRetry(hook, event, payload).catch(() => {});
 }
}

export function validateWebhookInput(input) {
 const errors = {};
 if (!String(input.name || '').trim()) errors.name = 'الاسم مطلوب.';
 if (!isHttpsUrl(input.url)) errors.url = 'الرابط يجب أن يبدأ بـ https://.';
 const events = Array.isArray(input.events) ? input.events : [];
 if (!events.length || events.some((e) => !EVENTS.includes(e))) errors.events = 'اختر حدثًا واحدًا على الأقل.';
 if (input.form_ids !== undefined && input.form_ids !== null && !Array.isArray(input.form_ids)) errors.form_ids = 'قائمة النماذج غير صالحة.';
 return errors;
}

export function publicHook(hook) {
 const { secret, ...rest } = hook;
 return rest;
}

export async function listWebhooks() {
 const { data, error } = await db().from('webhooks').select('*').order('created_at', { ascending: false });
 if (error) throw new HttpError(500, 'تعذر قراءة الوجهات.');
 return (data || []).map(publicHook);
}

export async function createWebhook(input) {
 const errors = validateWebhookInput(input);
 if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
 try { await assertSafeDestination(input.url); } catch (err) { throw new HttpError(400, err.message, { url: err.message }); }
 const secret = generateSecret();
 const row = { name: String(input.name).trim().slice(0, 80), url: String(input.url).trim(), secret, events: input.events, form_ids: input.form_ids?.length ? input.form_ids : null, is_active: input.is_active !== false };
 const { data, error } = await db().from('webhooks').insert(row).select('*').single();
 if (error) throw new HttpError(500, 'تعذر إنشاء الوجهة.');
 return { ...publicHook(data), secret };
}

export async function updateWebhook(id, input) {
 const { data: current } = await db().from('webhooks').select('*').eq('id', id).maybeSingle();
 if (!current) throw new HttpError(404, 'الوجهة غير موجودة.');
 const merged = { ...current, ...input };
 const errors = validateWebhookInput(merged);
 if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
 if (merged.url !== current.url) { try { await assertSafeDestination(merged.url); } catch (err) { throw new HttpError(400, err.message, { url: err.message }); } }
 const patch = { name: String(merged.name).trim().slice(0, 80), url: String(merged.url).trim(), events: merged.events, form_ids: merged.form_ids?.length ? merged.form_ids : null, is_active: merged.is_active !== false };
 const { data, error } = await db().from('webhooks').update(patch).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر حفظ الوجهة.');
 return { before: publicHook(current), after: publicHook(data) };
}

export async function rotateSecret(id) {
 const secret = generateSecret();
 const { data, error } = await db().from('webhooks').update({ secret }).eq('id', id).select('*').single();
 if (error || !data) throw new HttpError(404, 'الوجهة غير موجودة.');
 return { ...publicHook(data), secret };
}

export async function deleteWebhook(id) {
 const { data: current } = await db().from('webhooks').select('*').eq('id', id).maybeSingle();
 if (!current) throw new HttpError(404, 'الوجهة غير موجودة.');
 const { error } = await db().from('webhooks').delete().eq('id', id);
 if (error) throw new HttpError(500, 'تعذر حذف الوجهة.');
 return publicHook(current);
}

export async function testWebhook(id) {
 const { data: hook } = await db().from('webhooks').select('*').eq('id', id).maybeSingle();
 if (!hook) throw new HttpError(404, 'الوجهة غير موجودة.');
 const payload = { event: 'test', occurred_at: new Date().toISOString(), message: 'إرسال تجريبي من موقع شُرفة' };
 const body = JSON.stringify(payload);
 let result;
 try { result = await deliverOnce(hook, 'test', body); } catch (err) { result = { ok: false, status: null, error: err?.name === 'AbortError' ? 'انتهت المهلة' : err?.message || 'خطأ' }; }
 await logDelivery(hook.id, 'test', 1, result).catch(() => {});
 return result;
}

export async function listDeliveries(id) {
 const { data, error } = await db().from('webhook_deliveries').select('*').eq('webhook_id', id).order('created_at', { ascending: false }).limit(50);
 if (error) throw new HttpError(500, 'تعذر قراءة السجل.');
 return data || [];
}
