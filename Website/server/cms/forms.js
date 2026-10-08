// تعريف النماذج والتحقق من تعريفها ومن ردود الزوار عليها
import { db } from '../supabase.js';
import { invalidate } from '../cache.js';
import { HttpError } from '../router.js';
import { cleanText, isEmail, isPhone, toBool } from '../security.js';
import { getGovernorates } from './content.js';

export const FIELD_TYPES = ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'governorate'];
export const SYSTEM_FORMS = ['contact', 'waitlist', 'partner'];
const NAME_RE = /^[a-z][a-z0-9_]{0,31}$/;
const MAX_FIELDS = 30;

// يتحقق من تعريف حقول النموذج كما يرسلها محرر النماذج
export function validateFormDefinition(def) {
 const errors = {};
 if (!cleanText(def.title, 120)) errors.title = 'العنوان مطلوب.';
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(def.slug || ''))) errors.slug = 'الرابط بأحرف لاتينية صغيرة وأرقام وشرطات فقط.';
 if (!['messages', 'applications'].includes(def.module_group)) errors.module_group = 'اختر المجموعة: رسائل أو طلبات.';
 if (!Array.isArray(def.fields) || def.fields.length === 0) errors.fields = 'أضف حقلًا واحدًا على الأقل.';
 else if (def.fields.length > MAX_FIELDS) errors.fields = `الحد الأقصى ${MAX_FIELDS} حقلًا.`;
 else {
  const names = new Set();
  def.fields.forEach((f, i) => {
   const p = `fields.${i}`;
   if (!NAME_RE.test(String(f.name || ''))) errors[`${p}.name`] = 'اسم الحقل بأحرف لاتينية صغيرة وأرقام وشرطة سفلية، حتى 32.';
   if (names.has(f.name)) errors[`${p}.name`] = 'اسم الحقل مكرر.';
   names.add(f.name);
   if (f.name === 'website_url') errors[`${p}.name`] = 'هذا الاسم محجوز لحقل المصيدة.';
   if (!cleanText(f.label, 120)) errors[`${p}.label`] = 'التسمية مطلوبة.';
   if (!FIELD_TYPES.includes(f.type)) errors[`${p}.type`] = 'نوع الحقل غير معروف.';
   if (f.type === 'select' && (!Array.isArray(f.options) || f.options.length === 0 || f.options.length > 30)) errors[`${p}.options`] = 'أضف خيارًا واحدًا على الأقل وحتى 30.';
   if (f.max_length !== undefined && f.max_length !== null && f.max_length !== '' && (!Number.isInteger(Number(f.max_length)) || Number(f.max_length) < 1 || Number(f.max_length) > 5000)) errors[`${p}.max_length`] = 'الحد الأقصى بين 1 و5000.';
  });
 }
 return errors;
}

export function normalizeFormDefinition(def) {
 return {
  slug: String(def.slug).trim(),
  title: cleanText(def.title, 120),
  module_group: def.module_group,
  submit_label: cleanText(def.submit_label, 40) || 'إرسال',
  success_message: cleanText(def.success_message, 300) || 'وصلتنا رسالتك.',
  is_active: def.is_active === undefined ? true : toBool(def.is_active),
  fields: def.fields.map((f) => ({
   name: String(f.name),
   type: f.type,
   label: cleanText(f.label, 120),
   required: toBool(f.required),
   max_length: f.max_length ? Number(f.max_length) : (f.type === 'textarea' ? 2000 : 200),
   help: cleanText(f.help, 200),
   options: f.type === 'select' ? f.options.map((o) => cleanText(o, 80)).filter(Boolean) : undefined
  }))
 };
}

// يتحقق من رد الزائر حسب تعريف النموذج ويعيد البيانات النظيفة والأخطاء
export async function validateSubmission(form, input) {
 const fields = {};
 const data = {};
 const governorates = form.fields.some((f) => f.type === 'governorate') ? (await getGovernorates()).map((g) => g.name_ar) : [];
 for (const f of form.fields) {
  const raw = input[f.name];
  const max = Number(f.max_length || 200);
  if (f.type === 'checkbox') {
   const checked = toBool(raw);
   if (f.required && !checked) fields[f.name] = 'هذا الحقل مطلوب.';
   data[f.name] = checked ? 'نعم' : 'لا';
   continue;
  }
  const value = cleanText(Array.isArray(raw) ? raw[0] : raw, 5000);
  if (!value) {
   if (f.required) fields[f.name] = 'هذا الحقل مطلوب.';
   data[f.name] = '';
   continue;
  }
  if (value.length > max) { fields[f.name] = `الحد الأقصى ${max} حرفًا.`; continue; }
  if (f.type === 'email' && !isEmail(value)) { fields[f.name] = 'اكتب بريدًا صحيحًا.'; continue; }
  if (f.type === 'phone' && !isPhone(value)) { fields[f.name] = 'اكتب رقمًا عُمانيًا من 8 أرقام أو رقمًا دوليًا يبدأ بـ +.'; continue; }
  if (f.type === 'select' && !(f.options || []).includes(value)) { fields[f.name] = 'اختر قيمة من القائمة.'; continue; }
  if (f.type === 'governorate' && !governorates.includes(value)) { fields[f.name] = 'اختر محافظة من القائمة.'; continue; }
  if (/<\s*[a-zA-Z!/]/.test(value) && f.type !== 'textarea' && f.type !== 'text') { fields[f.name] = 'قيمة غير صالحة.'; continue; }
  data[f.name] = value;
 }
 return { data, fields };
}

export async function listForms() {
 const { data, error } = await db().from('forms').select('*').order('title');
 if (error) throw new HttpError(500, 'تعذر قراءة النماذج.');
 return data || [];
}

export async function getFormById(id) {
 const { data, error } = await db().from('forms').select('*').eq('id', id).maybeSingle();
 if (error || !data) throw new HttpError(404, 'النموذج غير موجود.');
 return data;
}

export async function createForm(def) {
 const errors = validateFormDefinition(def);
 if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
 const row = { ...normalizeFormDefinition(def), kind: 'custom' };
 const { data: exists } = await db().from('forms').select('id').eq('slug', row.slug).maybeSingle();
 if (exists) throw new HttpError(400, 'الرابط مستخدم لنموذج آخر.', { slug: 'الرابط مستخدم.' });
 const { data, error } = await db().from('forms').insert(row).select('*').single();
 if (error) throw new HttpError(500, 'تعذر إنشاء النموذج.');
 invalidate('form:');
 return data;
}

export async function updateForm(id, def) {
 const current = await getFormById(id);
 const merged = { ...current, ...def, slug: current.kind === 'system' ? current.slug : (def.slug || current.slug) };
 if (current.kind === 'system') merged.module_group = current.module_group;
 const errors = validateFormDefinition(merged);
 if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
 const row = normalizeFormDefinition(merged);
 if (row.slug !== current.slug) {
  const { data: exists } = await db().from('forms').select('id').eq('slug', row.slug).neq('id', id).maybeSingle();
  if (exists) throw new HttpError(400, 'الرابط مستخدم لنموذج آخر.', { slug: 'الرابط مستخدم.' });
 }
 const { data, error } = await db().from('forms').update(row).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر حفظ النموذج.');
 invalidate('form:');
 return { before: current, after: data };
}

export async function deleteForm(id) {
 const current = await getFormById(id);
 if (current.kind === 'system') throw new HttpError(400, 'نماذج النظام لا تُحذف. يمكنك تعديل حقولها فقط.');
 const { error } = await db().from('forms').delete().eq('id', id);
 if (error) throw new HttpError(500, 'تعذر حذف النموذج.');
 invalidate('form:');
 return current;
}

// يبني CSV بترميز UTF-8 مع BOM ليُفتح بالعربية في Excel
export function toCsv(form, submissions) {
 const cols = form.fields.map((f) => ({ key: f.name, label: f.label }));
 const header = ['تاريخ الاستلام', 'الحالة', ...cols.map((c) => c.label)];
 const esc = (v) => {
  const s = String(v ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
 };
 const lines = [header.map(esc).join(',')];
 for (const s of submissions) {
  lines.push([s.created_at, s.status, ...cols.map((c) => s.data?.[c.key] ?? '')].map(esc).join(','));
 }
 return `\uFEFF${lines.join('\r\n')}`;
}
