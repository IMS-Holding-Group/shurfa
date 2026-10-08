// استعلامات المحتوى المنشور للموقع العام مع احترام الجدولة والحذف الناعم
import { db } from '../supabase.js';
import { cached, prime } from '../cache.js';

// يضيف شروط الظهور الفعلي: منشور، غير محذوف، ضمن نافذة الجدولة
export function liveFilter(query, now = new Date().toISOString()) {
 return query
  .eq('status', 'published')
  .is('deleted_at', null)
  .or(`publish_at.is.null,publish_at.lte.${now}`)
  .or(`unpublish_at.is.null,unpublish_at.gt.${now}`);
}

// الحالة نفسها محسوبة في JavaScript لصفوف مقروءة مسبقًا
export function isLive(row, now = Date.now()) {
 if (!row || row.status !== 'published' || row.deleted_at) return false;
 if (row.publish_at && new Date(row.publish_at).getTime() > now) return false;
 if (row.unpublish_at && new Date(row.unpublish_at).getTime() <= now) return false;
 return true;
}

export async function getSettings() {
 return cached('settings:all', async () => {
  const { data, error } = await db().from('site_settings').select('key, value, is_public');
  if (error) throw new Error('تعذر قراءة الإعدادات');
  const out = { __public: {} };
  for (const row of data || []) {
   out[row.key] = row.value;
   if (row.is_public) out.__public[row.key] = row.value;
  }
  return out;
 });
}

export async function getPublicSettings() {
 const s = await getSettings();
 return s.__public;
}

export async function getPage(slug) {
 return cached(`page:${slug}`, async () => {
  const { data, error } = await liveFilter(db().from('pages').select('*')).eq('slug', slug).maybeSingle();
  if (error) throw new Error('تعذر قراءة الصفحة');
  return data;
 });
}

export async function getAllLivePages() {
 return cached('pages:live', async () => {
  const { data, error } = await liveFilter(db().from('pages').select('id, slug, title, kind, noindex, updated_at, published_at'));
  if (error) throw new Error('تعذر قراءة الصفحات');
  return data || [];
 });
}

export async function getServices() {
 return cached('services:live', async () => {
  const { data, error } = await liveFilter(db().from('services').select('*')).order('sort');
  if (error) throw new Error('تعذر قراءة الخدمات');
  return data || [];
 });
}

export async function getService(slug) {
 const list = await getServices();
 return list.find((s) => s.slug === slug) || null;
}

export async function getGuides(limit = 12) {
 const all = await cached('guides:live', async () => {
  const { data, error } = await liveFilter(db().from('guides').select('*')).order('published_at', { ascending: false }).limit(500);
  if (error) throw new Error('تعذر قراءة المقالات');
  return data || [];
 });
 return all.slice(0, limit);
}

export async function getGuide(slug) {
 const list = await getGuides(500);
 return list.find((g) => g.slug === slug) || null;
}

// يقرأ الصفحات المنشورة دفعة واحدة ويملأ تخزين كل صفحة
export async function warmAllPages() {
 const { data, error } = await liveFilter(db().from('pages').select('*'));
 if (error) throw new Error('تعذر قراءة الصفحات');
 for (const row of data || []) {
  prime(`page:${row.slug}`, row, async () => {
   const { data: one, error: err } = await liveFilter(db().from('pages').select('*')).eq('slug', row.slug).maybeSingle();
   if (err) throw new Error('تعذر قراءة الصفحة');
   return one;
  });
 }
 return data || [];
}

export async function getFaqs(group = '') {
 return cached(`faqs:${group}`, async () => {
  let q = db().from('faqs').select('*').eq('is_published', true).order('sort');
  if (group) q = q.eq('group_name', group);
  const { data, error } = await q;
  if (error) throw new Error('تعذر قراءة الأسئلة');
  return data || [];
 });
}

export async function getMenus() {
 return cached('menus:all', async () => {
  const { data, error } = await db().from('menus').select('*');
  if (error) throw new Error('تعذر قراءة القوائم');
  const out = {};
  for (const m of data || []) out[m.key] = m;
  return out;
 });
}

export async function getForm(slug) {
 return cached(`form:${slug}`, async () => {
  const { data, error } = await db().from('forms').select('*').eq('slug', slug).eq('is_active', true).maybeSingle();
  if (error) throw new Error('تعذر قراءة النموذج');
  return data;
 });
}

export async function getGovernorates() {
 return cached('governorates', async () => {
  const { data, error } = await db().from('governorates').select('*').order('sort');
  if (error) throw new Error('تعذر قراءة المحافظات');
  return data || [];
 });
}

// يحوّل عناصر القائمة إلى روابط فعلية ويخفي ما يشير لمحتوى غير منشور
export async function resolveMenu(items) {
 const [pages, services, guides] = await Promise.all([getAllLivePages(), getServices(), getGuides(100)]);
 const out = [];
 for (const item of items || []) {
  let href = '';
  if (item.target_type === 'page') {
   const p = pages.find((x) => x.slug === item.target);
   if (!p) continue;
   href = p.slug === 'home' ? '/' : `/${p.slug}`;
  } else if (item.target_type === 'service') {
   if (!services.find((x) => x.slug === item.target)) continue;
   href = `/services/${item.target}`;
  } else if (item.target_type === 'guide') {
   if (!guides.find((x) => x.slug === item.target)) continue;
   href = `/guide/${item.target}`;
  } else {
   href = String(item.target || '');
   if (!href) continue;
  }
  out.push({ label: item.label, href, new_tab: !!item.new_tab });
 }
 return out;
}
