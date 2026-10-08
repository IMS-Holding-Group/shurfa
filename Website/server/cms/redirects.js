// التحويلات: فحص المسار والوجهة ومنع الحلقات، مع استيراد وتصدير CSV
import { db } from '../supabase.js';
import { cached, invalidate } from '../cache.js';
import { HttpError } from '../router.js';
import { isHttpsUrl } from './urls.js';

const RESERVED_PREFIXES = ['/admin', '/api', '/assets'];
const RESERVED_EXACT = ['/sitemap.xml', '/robots.txt', '/favicon.ico'];
const MAX_HOPS = 5;

export function normalizePath(p) {
 let s = String(p || '').trim();
 if (!s.startsWith('/')) return '';
 s = s.replace(/\/{2,}/g, '/');
 if (s.length > 1) s = s.replace(/\/+$/, '');
 return s.slice(0, 500);
}

export function isReservedPath(p) {
 if (RESERVED_EXACT.includes(p)) return true;
 return RESERVED_PREFIXES.some((pre) => p === pre || p.startsWith(`${pre}/`));
}

// يتتبع وجهة التحويل داخل القائمة حتى 5 قفزات ويرفض الحلقة
export function detectLoop(fromPath, toUrl, all) {
 const map = new Map(all.filter((r) => r.is_active !== false).map((r) => [r.from_path, r.to_url]));
 map.set(fromPath, toUrl);
 let current = toUrl;
 for (let hop = 0; hop < MAX_HOPS; hop += 1) {
  if (!current.startsWith('/')) return false;
  const normalized = normalizePath(current.split('?')[0]);
  if (normalized === fromPath) return true;
  if (!map.has(normalized)) return false;
  current = map.get(normalized);
 }
 return true;
}

export function validateRedirect(input, all, excludeId = null) {
 const errors = {};
 const from = normalizePath(input.from_path);
 const to = String(input.to_url || '').trim();
 const code = Number(input.code || 301);
 if (!from) errors.from_path = 'المسار يجب أن يبدأ بـ /.';
 else if (isReservedPath(from)) errors.from_path = 'هذا المسار محجوز للنظام.';
 if (!to) errors.to_url = 'الوجهة مطلوبة.';
 else if (!(to.startsWith('/') && !to.startsWith('//')) && !isHttpsUrl(to)) errors.to_url = 'الوجهة رابط نسبي يبدأ بـ / أو رابط https.';
 else if (normalizePath(to) === from) errors.to_url = 'الوجهة لا يمكن أن تكون المسار نفسه.';
 if (![301, 302].includes(code)) errors.code = 'النوع 301 أو 302 فقط.';
 if (!errors.from_path && !errors.to_url) {
  const others = all.filter((r) => r.id !== excludeId);
  if (others.some((r) => r.from_path === from)) errors.from_path = 'يوجد تحويل لهذا المسار مسبقًا.';
  else if (detectLoop(from, to, others)) errors.to_url = 'هذا التحويل يؤدي إلى حلقة.';
 }
 return { errors, row: { from_path: from, to_url: to, code, is_active: input.is_active === undefined ? true : (input.is_active === true || input.is_active === 'true') } };
}

export async function listRedirects() {
 const { data, error } = await db().from('redirects').select('*').order('created_at', { ascending: false });
 if (error) throw new HttpError(500, 'تعذر قراءة التحويلات.');
 return data || [];
}

export async function activeRedirects() {
 return cached('redirects:active', async () => {
  const { data } = await db().from('redirects').select('from_path, to_url, code').eq('is_active', true);
  const map = new Map();
  for (const r of data || []) map.set(r.from_path, r);
  return map;
 });
}

// يبحث عن تحويل للمسار الحالي
export async function findRedirect(path) {
 const map = await activeRedirects();
 return map.get(normalizePath(path)) || null;
}

export async function createRedirect(input) {
 const all = await listRedirects();
 const { errors, row } = validateRedirect(input, all);
 if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
 const { data, error } = await db().from('redirects').insert(row).select('*').single();
 if (error) throw new HttpError(500, 'تعذر إنشاء التحويل.');
 invalidate('redirects');
 return data;
}

export async function updateRedirect(id, input) {
 const all = await listRedirects();
 const current = all.find((r) => r.id === id);
 if (!current) throw new HttpError(404, 'التحويل غير موجود.');
 const { errors, row } = validateRedirect({ ...current, ...input }, all, id);
 if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
 const { data, error } = await db().from('redirects').update(row).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر حفظ التحويل.');
 invalidate('redirects');
 return { before: current, after: data };
}

export async function deleteRedirect(id) {
 const { data: current } = await db().from('redirects').select('*').eq('id', id).maybeSingle();
 if (!current) throw new HttpError(404, 'التحويل غير موجود.');
 const { error } = await db().from('redirects').delete().eq('id', id);
 if (error) throw new HttpError(500, 'تعذر حذف التحويل.');
 invalidate('redirects');
 return current;
}

export function redirectsToCsv(rows) {
 const esc = (v) => { const s = String(v ?? '').replace(/"/g, '""'); return /[",\n]/.test(s) ? `"${s}"` : s; };
 const lines = ['from_path,to_url,code,is_active'];
 for (const r of rows) lines.push([r.from_path, r.to_url, r.code, r.is_active].map(esc).join(','));
 return `\uFEFF${lines.join('\r\n')}`;
}

// يقرأ CSV بسيطًا (من، إلى، النوع، مفعّل) ويعيد الصفوف الصالحة وأخطاء الباقي
export function parseRedirectsCsv(text) {
 const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
 const rows = [];
 const errors = [];
 lines.forEach((line, i) => {
  if (i === 0 && /from_path/i.test(line)) return;
  const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) || [];
  const [from_path, to_url, code, is_active] = cells;
  if (!from_path || !to_url) { errors.push(`السطر ${i + 1}: بيانات ناقصة.`); return; }
  rows.push({ from_path, to_url, code: Number(code || 301), is_active: is_active === undefined || is_active === '' ? true : /^(true|1|نعم)$/i.test(is_active) });
 });
 return { rows, errors };
}
