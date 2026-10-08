// تخزين مؤقت بالذاكرة لاستعلامات الموقع العام بمدة 60 ثانية
// القيمة المنتهية تُعاد فورًا ويُحدَّث التخزين في الخلفية حتى لا ينتظر الزائر قاعدة البيانات

const TTL_MS = 60 * 1000;
const store = new Map();

function refresh(key, loader, ttl) {
 const hit = store.get(key);
 if (hit?.pending) return hit.pending;
 const pending = loader().then((value) => {
  store.set(key, { value, expires: Date.now() + ttl, loader, ttl });
  return value;
 }).catch((err) => {
  const current = store.get(key);
  if (current?.value !== undefined) {
   current.pending = null;
   current.expires = Date.now() + 15000;
   return current.value;
  }
  store.delete(key);
  throw err;
 });
 store.set(key, { value: hit?.value, expires: hit?.value !== undefined ? hit.expires : 0, loader, ttl, pending });
 return pending;
}

// يضع قيمة جاهزة دون طلب جديد، ولا يكتب فوق طلب قيد التنفيذ
export function prime(key, value, loader = null, ttl = TTL_MS) {
 const hit = store.get(key);
 if (hit?.pending) return;
 if (hit && hit.expires > Date.now() && hit.value !== undefined) return;
 store.set(key, { value, expires: Date.now() + ttl, loader, ttl });
}

// يعيد القيمة المخزنة أو ينفّذ الدالة ويخزّن نتيجتها
export async function cached(key, loader, ttl = TTL_MS) {
 const hit = store.get(key);
 const now = Date.now();
 if (hit && hit.expires > now && hit.value !== undefined) return hit.value;
 if (hit?.value !== undefined) {
  refresh(key, loader, ttl).catch(() => {});
  return hit.value;
 }
 return refresh(key, loader, ttl);
}

// يبطل كل المفاتيح التي تبدأ بالبادئة، أو الكل عند غيابها
export function invalidate(prefix = '') {
 if (!prefix) { store.clear(); return; }
 for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}

// يحدّث المنتهي في الخلفية كل دقيقة حتى يظهر المحتوى المجدول دون إيقاف الطلب التالي
export function startPeriodicInvalidation() {
 const timer = setInterval(() => {
  for (const [key, hit] of store) {
   if (!hit.loader || hit.expires > Date.now()) continue;
   refresh(key, hit.loader, hit.ttl || TTL_MS).catch(() => {});
  }
 }, TTL_MS);
 timer.unref();
 return timer;
}

export function cacheSize() { return store.size; }
