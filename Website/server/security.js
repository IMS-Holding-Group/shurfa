// الترويسات الأمنية، تحديد المعدل بنافذة منزلقة، قفل الدخول، والتحقق من المدخلات
import { HttpError } from './router.js';

// ===== تحديد المعدل بنافذة منزلقة =====
// ponytail: خرائط بالذاكرة تكفي لخادم واحد، تُنقل إلى مخزن مشترك عند التوسع لأكثر من نسخة
const windows = new Map();

export const LIMITS = {
 login: { max: 5, windowMs: 15 * 60 * 1000 },
 form: { max: 5, windowMs: 60 * 60 * 1000 },
 admin: { max: 300, windowMs: 60 * 1000 },
 publicApi: { max: 120, windowMs: 60 * 1000 }
};

// يسجّل محاولة ويعيد true إذا كانت ضمن الحد
export function hit(key, limit, now = Date.now()) {
 const list = (windows.get(key) || []).filter((t) => now - t < limit.windowMs);
 if (list.length >= limit.max) { windows.set(key, list); return false; }
 list.push(now);
 windows.set(key, list);
 return true;
}

export function remaining(key, limit, now = Date.now()) {
 const list = (windows.get(key) || []).filter((t) => now - t < limit.windowMs);
 return Math.max(0, limit.max - list.length);
}

export function resetKey(key) { windows.delete(key); }

// تنظيف دوري كل 10 دقائق للمفاتيح المنتهية
export function startRateLimitCleanup() {
 const timer = setInterval(() => {
  const now = Date.now();
  const maxWindow = Math.max(...Object.values(LIMITS).map((l) => l.windowMs));
  for (const [key, list] of windows) {
   const alive = list.filter((t) => now - t < maxWindow);
   if (alive.length === 0) windows.delete(key); else windows.set(key, alive);
  }
 }, 10 * 60 * 1000);
 timer.unref();
 return timer;
}

// وسيط يحدد المعدل لإجراء معيّن حسب عنوان IP
export function rateLimit(action, limit, keyFn) {
 return async (ctx, next) => {
  const key = `${action}:${keyFn ? keyFn(ctx) : ctx.ip}`;
  if (!hit(key, limit)) {
   ctx.setHeader('Retry-After', String(Math.ceil(limit.windowMs / 1000)));
   throw new HttpError(429, 'طلبات كثيرة في وقت قصير. حاول بعد قليل.');
  }
  await next();
 };
}

// ===== قفل الدخول: محاولات فاشلة لكل (بريد + IP) خلال 15 دقيقة =====
const failures = new Map();

export function loginLocked(email, ip, now = Date.now()) {
 const key = `${email.toLowerCase()}|${ip}`;
 const list = (failures.get(key) || []).filter((t) => now - t < LIMITS.login.windowMs);
 failures.set(key, list);
 return list.length >= LIMITS.login.max;
}

export function recordLoginFailure(email, ip, now = Date.now()) {
 const key = `${email.toLowerCase()}|${ip}`;
 const list = (failures.get(key) || []).filter((t) => now - t < LIMITS.login.windowMs);
 list.push(now);
 failures.set(key, list);
}

export function clearLoginFailures(email, ip) { failures.delete(`${email.toLowerCase()}|${ip}`); }

// ===== الترويسات الأمنية =====
export function securityHeaders(ctx, csp, cookieSecure) {
 ctx.setHeader('Content-Security-Policy', csp);
 ctx.setHeader('X-Content-Type-Options', 'nosniff');
 ctx.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
 ctx.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
 ctx.setHeader('X-Frame-Options', ctx.path.startsWith('/admin/preview/') ? 'SAMEORIGIN' : 'DENY');
 if (cookieSecure) ctx.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// ===== التحقق من المدخلات =====
export function cleanText(value, max = 500) {
 if (value === undefined || value === null) return '';
 let s = String(value).replace(/\u0000/g, '').replace(/\r\n?/g, '\n').trim();
 if (s.length > max) s = s.slice(0, max);
 return s;
}

export function isEmail(value) {
 return /^[^\s@<>"']{1,64}@[^\s@<>"']{1,255}\.[A-Za-z]{2,}$/.test(String(value || ''));
}

// صيغة عُمانية أو دولية: +968 أو 8 أرقام تبدأ بـ 7 أو 9 أو 2، أو رقم دولي بعلامة +
export function isPhone(value) {
 const s = String(value || '').replace(/[\s-]/g, '');
 if (/^(\+968)?[792]\d{7}$/.test(s)) return true;
 return /^\+[1-9]\d{7,14}$/.test(s);
}

export function isUuid(value) {
 return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

export function isSlug(value) {
 return /^[a-z0-9\u0600-\u06FF]+(?:-[a-z0-9\u0600-\u06FF]+)*$/.test(String(value || '')) && String(value).length <= 80;
}

export function toInt(value, fallback = 0, min = -Infinity, max = Infinity) {
 const n = Number.parseInt(String(value), 10);
 if (!Number.isFinite(n)) return fallback;
 return Math.min(max, Math.max(min, n));
}

export function toBool(value) {
 return value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
}

// التحقق من مطابقة الأصل للمضيف في طلبات الكتابة الإدارية (حماية CSRF)
export function checkCsrf(ctx) {
 if (ctx.method === 'GET' || ctx.method === 'HEAD') return;
 if (ctx.req.headers['x-requested-with'] !== 'shurfah') throw new HttpError(403, 'الطلب مرفوض: ترويسة الحماية ناقصة.');
 const origin = ctx.req.headers.origin;
 const host = ctx.req.headers.host;
 if (!origin || !host) throw new HttpError(403, 'الطلب مرفوض: الأصل غير معروف.');
 let originHost = '';
 try { originHost = new URL(origin).host; } catch { throw new HttpError(403, 'الطلب مرفوض: الأصل غير صالح.'); }
 if (originHost !== host) throw new HttpError(403, 'الطلب مرفوض: الأصل لا يطابق المضيف.');
}

// كشف الروبوتات من وكيل المستخدم (لعدّاد المشاهدات والتحميل المسبق)
export const BOT_PATTERN = /bot|crawl|spider|slurp|headless|preview|monitor/i;
