// توليد الروابط من العناوين مع رفض الروابط المحجوزة وضمان التفرد

export const RESERVED_SLUGS = new Set([
 'admin', 'api', 'assets', 'services', 'guide', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'preview',
 'home', 'passport', 'partners', 'app', 'about', 'contact', 'faq', 'privacy', 'terms', 'cancellation'
]);

export const SYSTEM_PAGE_SLUGS = ['home', 'services', 'guide', 'passport', 'partners', 'app', 'about', 'contact', 'faq', 'privacy', 'terms', 'cancellation'];

// يحذف التشكيل ويبقي الحروف العربية واللاتينية والأرقام ويحوّل المسافات إلى شرطات
export function slugify(input) {
 let s = String(input || '').normalize('NFKD');
 s = s.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
 s = s.replace(/[\u0300-\u036f]/g, '');
 s = s.toLowerCase();
 s = s.replace(/[^a-z0-9\u0600-\u06FF]+/g, '-');
 s = s.replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
 return s.slice(0, 80).replace(/-+$/g, '');
}

export function isReserved(slug, allowSystem = false) {
 if (allowSystem) return ['admin', 'api', 'assets', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'preview'].includes(slug);
 return RESERVED_SLUGS.has(slug);
}

// يضمن التفرد عبر دالة فحص وجود، بإضافة لاحقة رقمية عند التكرار
export async function uniqueSlug(base, exists) {
 let candidate = base || 'page';
 let n = 2;
 while (await exists(candidate)) {
  candidate = `${base}-${n}`;
  n += 1;
  if (n > 500) throw new Error('تعذر توليد رابط فريد');
 }
 return candidate;
}
