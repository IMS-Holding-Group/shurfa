// القوائم: قائمة الرأس وأربع مجموعات للتذييل مع التحقق من عناصرها
import { db } from '../supabase.js';
import { invalidate } from '../cache.js';
import { HttpError } from '../router.js';
import { cleanText } from '../security.js';
import { isSafeUrl } from './urls.js';

export const MENU_KEYS = ['main', 'footer_1', 'footer_2', 'footer_3', 'footer_4'];
const LIMITS = { main: 7, footer_1: 8, footer_2: 8, footer_3: 8, footer_4: 8 };
const TARGET_TYPES = ['page', 'service', 'guide', 'url'];

// يعيد قائمة أخطاء عربية أو قائمة فارغة
export function validateMenu(key, title, items) {
 const errors = [];
 if (!MENU_KEYS.includes(key)) errors.push('مفتاح القائمة غير معروف.');
 if (!Array.isArray(items)) return ['العناصر يجب أن تكون قائمة.'];
 if (items.length > LIMITS[key]) errors.push(`الحد الأقصى ${LIMITS[key]} عناصر في هذه القائمة.`);
 items.forEach((item, i) => {
  if (!cleanText(item?.label, 60)) errors.push(`العنصر ${i + 1}: النص مطلوب.`);
  if (!TARGET_TYPES.includes(item?.target_type)) errors.push(`العنصر ${i + 1}: نوع الوجهة غير صالح.`);
  const target = cleanText(item?.target, 2048);
  if (!target) errors.push(`العنصر ${i + 1}: الوجهة مطلوبة.`);
  else if (item.target_type === 'url' && !isSafeUrl(target)) errors.push(`العنصر ${i + 1}: الرابط غير مسموح.`);
  else if (item.target_type !== 'url' && !/^[a-z0-9\u0600-\u06FF-]{1,80}$/.test(target)) errors.push(`العنصر ${i + 1}: الرابط غير صالح.`);
 });
 return errors;
}

export function normalizeItems(items) {
 return items.map((item) => ({
  label: cleanText(item.label, 60),
  target_type: item.target_type,
  target: cleanText(item.target, 2048),
  new_tab: item.new_tab === true || item.new_tab === 'true'
 }));
}

export async function listMenus() {
 const { data, error } = await db().from('menus').select('*').order('key');
 if (error) throw new HttpError(500, 'تعذر قراءة القوائم.');
 return data || [];
}

export async function saveMenu(key, title, items) {
 const errors = validateMenu(key, title, items);
 if (errors.length) throw new HttpError(400, errors[0], { items: errors.join(' ') });
 const { data: before } = await db().from('menus').select('*').eq('key', key).maybeSingle();
 const row = { key, title: cleanText(title, 60), items: normalizeItems(items) };
 const { data, error } = await db().from('menus').upsert(row).select('*').single();
 if (error) throw new HttpError(500, 'تعذر حفظ القائمة.');
 invalidate('menus');
 return { before, after: data };
}

// يفحص وجهات القائمة ليحدد ما يشير لمحتوى غير منشور أو محذوف (للتحذير في اللوحة)
export async function menuWarnings(items) {
 const [pages, services, guides] = await Promise.all([
  db().from('pages').select('slug, status, deleted_at'),
  db().from('services').select('slug, status, deleted_at'),
  db().from('guides').select('slug, status, deleted_at')
 ]);
 const live = (list, slug) => (list.data || []).some((r) => r.slug === slug && r.status === 'published' && !r.deleted_at);
 return (items || []).map((item) => {
  if (item.target_type === 'page') return live(pages, item.target) ? '' : 'الصفحة غير منشورة أو محذوفة';
  if (item.target_type === 'service') return live(services, item.target) ? '' : 'الخدمة غير منشورة أو محذوفة';
  if (item.target_type === 'guide') return live(guides, item.target) ? '' : 'المقال غير منشور أو محذوف';
  return '';
 });
}
