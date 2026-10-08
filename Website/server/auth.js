// الجلسات والكوكيز والتحقق من الرمز عبر Supabase Auth من داخل الخادم
import { anonClient, db, supabaseConfig } from './supabase.js';
import { HttpError } from './router.js';
import { loginLocked, recordLoginFailure, clearLoginFailures, isEmail } from './security.js';

export const COOKIE_AT = 'shurfah_at';
export const COOKIE_RT = 'shurfah_rt';
const AT_MAX_AGE = 60 * 60;
const RT_MAX_AGE = 7 * 24 * 60 * 60;

export const DEFAULT_PASSWORDS = ['Shurfah@Super#2026', 'Shurfah@Cs#2026', 'Shurfah@Mkt#2026', 'Shurfah@Fin#2026', 'Shurfah@Ops#2026'];

function cookie(name, value, maxAge) {
 const { cookieSecure } = supabaseConfig();
 const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAge}`];
 if (cookieSecure) parts.push('Secure');
 return parts.join('; ');
}

export function setSessionCookies(ctx, session) {
 ctx.setHeader('Set-Cookie', [
  cookie(COOKIE_AT, session.access_token, AT_MAX_AGE),
  cookie(COOKIE_RT, session.refresh_token, RT_MAX_AGE)
 ]);
}

export function clearSessionCookies(ctx) {
 ctx.setHeader('Set-Cookie', [cookie(COOKIE_AT, '', 0), cookie(COOKIE_RT, '', 0)]);
}

// سياسة كلمة المرور: 10 أحرف فأكثر، كبير وصغير ورقم ورمز، وليست افتراضية
export function passwordProblem(password) {
 const p = String(password || '');
 if (p.length < 10) return 'كلمة المرور يجب أن تكون 10 أحرف فأكثر.';
 if (!/[a-z]/.test(p)) return 'كلمة المرور يجب أن تحتوي حرفًا صغيرًا.';
 if (!/[A-Z]/.test(p)) return 'كلمة المرور يجب أن تحتوي حرفًا كبيرًا.';
 if (!/[0-9]/.test(p)) return 'كلمة المرور يجب أن تحتوي رقمًا.';
 if (!/[^A-Za-z0-9]/.test(p)) return 'كلمة المرور يجب أن تحتوي رمزًا.';
 if (DEFAULT_PASSWORDS.includes(p)) return 'لا يمكن استخدام كلمة مرور افتراضية. اختر كلمة جديدة.';
 return '';
}

async function loadProfile(userId) {
 const { data, error } = await db().from('profiles').select('*').eq('id', userId).maybeSingle();
 if (error) throw new Error('تعذر قراءة ملف الحساب');
 return data;
}

// تسجيل الدخول: يعيد الجلسة والملف أو يرمي خطأ عربيًا
export async function login(ctx, email, password) {
 const mail = String(email || '').trim().toLowerCase();
 if (!isEmail(mail) || !password) throw new HttpError(400, 'أدخل البريد وكلمة المرور.');
 if (loginLocked(mail, ctx.ip)) throw new HttpError(429, 'أُغلق الدخول مؤقتًا بعد 5 محاولات فاشلة. حاول بعد 15 دقيقة.');
 const client = anonClient();
 const { data, error } = await client.auth.signInWithPassword({ email: mail, password });
 if (error || !data?.session) {
  recordLoginFailure(mail, ctx.ip);
  throw new HttpError(401, 'البريد أو كلمة المرور غير صحيحة.');
 }
 const profile = await loadProfile(data.user.id);
 if (!profile || !profile.is_active) {
  recordLoginFailure(mail, ctx.ip);
  throw new HttpError(403, 'هذا الحساب غير مفعّل. تواصل مع المسؤول الأول.');
 }
 clearLoginFailures(mail, ctx.ip);
 await db().from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', profile.id);
 setSessionCookies(ctx, data.session);
 return { user: data.user, profile };
}

// يحاول قراءة الجلسة من الكوكيز ويجددها عند الحاجة، يعيد null عند الفشل
export async function resolveSession(ctx) {
 const at = ctx.cookies[COOKIE_AT];
 const rt = ctx.cookies[COOKIE_RT];
 if (!at && !rt) return null;
 const client = anonClient();
 let user = null;
 if (at) {
  const { data, error } = await client.auth.getUser(at);
  if (!error && data?.user) user = data.user;
 }
 if (!user && rt) {
  const { data, error } = await client.auth.refreshSession({ refresh_token: rt });
  if (!error && data?.session && data.user) {
   user = data.user;
   setSessionCookies(ctx, data.session);
  }
 }
 if (!user) return null;
 const profile = await loadProfile(user.id);
 if (!profile || !profile.is_active) return null;
 return { user, profile };
}

// وسيط يفرض وجود جلسة صالحة لواجهات الإدارة
export function requireSession() {
 return async (ctx, next) => {
  const session = await resolveSession(ctx);
  if (!session) {
   clearSessionCookies(ctx);
   throw new HttpError(401, 'انتهت الجلسة. سجّل الدخول مجددًا.');
  }
  ctx.user = session.user;
  ctx.profile = session.profile;
  await next();
 };
}

export async function logout(ctx) {
 const at = ctx.cookies[COOKIE_AT];
 if (at) {
  try { await db().auth.admin.signOut(at); } catch { /* الجلسة انتهت أصلًا */ }
 }
 clearSessionCookies(ctx);
}

export async function changePassword(ctx, currentPassword, newPassword) {
 const problem = passwordProblem(newPassword);
 if (problem) throw new HttpError(400, problem, { new_password: problem });
 const client = anonClient();
 const { error: verifyError } = await client.auth.signInWithPassword({ email: ctx.user.email, password: String(currentPassword || '') });
 if (verifyError) throw new HttpError(400, 'كلمة المرور الحالية غير صحيحة.', { current_password: 'كلمة المرور الحالية غير صحيحة.' });
 const { error } = await db().auth.admin.updateUserById(ctx.user.id, { password: newPassword });
 if (error) throw new HttpError(500, 'تعذر تغيير كلمة المرور. حاول مجددًا.');
 await db().from('profiles').update({ must_change_password: false }).eq('id', ctx.user.id);
}
