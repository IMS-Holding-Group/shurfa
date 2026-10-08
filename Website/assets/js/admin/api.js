// الاتصال بالخادم: اللوحة لا تتصل بـ Supabase مباشرة ولا تحمل أي مفتاح
export class ApiError extends Error {
 constructor(status, message, fields) {
  super(message);
  this.status = status;
  this.fields = fields || {};
 }
}

async function request(method, path, body, { raw = false } = {}) {
 const headers = { 'X-Requested-With': 'shurfah', Accept: 'application/json' };
 if (body !== undefined) headers['Content-Type'] = 'application/json';
 let res;
 try {
  res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
 } catch {
  throw new ApiError(0, 'تعذر الاتصال بالخادم. تحقق من الشبكة.');
 }
 if (raw) return res;
 const data = await res.json().catch(() => ({ ok: false, message: 'رد غير مفهوم من الخادم.' }));
 if (res.status === 401 && path !== '/api/admin/login') {
  window.location.href = '/admin/login';
  throw new ApiError(401, 'انتهت الجلسة. سجّل الدخول مجددًا.');
 }
 if (!res.ok || data.ok === false) {
  if (data.fields && data.fields.must_change_password === 'true' && window.location.hash !== '#/account') window.location.hash = '#/account';
  throw new ApiError(res.status, data.message || 'حدث خطأ غير متوقع.', data.fields);
 }
 return data.data;
}

export const api = {
 get: (path) => request('GET', path),
 post: (path, body = {}) => request('POST', path, body),
 put: (path, body = {}) => request('PUT', path, body),
 del: (path) => request('DELETE', path)
};
