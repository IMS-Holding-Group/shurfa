// فحص الروابط الآمنة: يُستخدم في الخادم والمتصفح معًا

const ALLOWED_SCHEMES = ['https:', 'http:', 'mailto:', 'tel:'];

// يعيد true إذا كان الرابط نسبيًا يبدأ بـ / أو # أو بأحد المخططات المسموحة
export function isSafeUrl(value) {
 if (typeof value !== 'string') return false;
 const url = value.trim();
 if (!url) return false;
 if (url.length > 2048) return false;
 if (/[\u0000-\u001F\u007F]/.test(url)) return false;
 if (url.startsWith('//')) return false;
 if (url.startsWith('/') || url.startsWith('#')) return true;
 const match = /^([a-zA-Z][a-zA-Z0-9+.-]*:)/.exec(url);
 if (!match) return false;
 return ALLOWED_SCHEMES.includes(match[1].toLowerCase());
}

// الروابط الخارجية فقط (https أو http) لمواقع التواصل والمتاجر والـ Webhooks
export function isHttpsUrl(value) {
 if (typeof value !== 'string') return false;
 try {
  const u = new URL(value.trim());
  return u.protocol === 'https:' && !!u.hostname;
 } catch { return false; }
}

export function isExternal(url) {
 return /^https?:/i.test(String(url || '').trim());
}

// الصور تُقبل فقط من مكتبة الوسائط (رابط التخزين) أو من /assets/
export function isAllowedImage(value, storageOrigin = '') {
 if (typeof value !== 'string' || !value.trim()) return false;
 const url = value.trim();
 if (url.startsWith('/assets/') && !url.includes('..')) return true;
 if (storageOrigin && url.startsWith(`${storageOrigin}/storage/v1/object/public/media/`)) return true;
 return false;
}
