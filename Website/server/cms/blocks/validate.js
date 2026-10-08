// التحقق من الكتل وفق مخططاتها: يمر على الحقول المعرَّفة فقط ويقص النصوص ويفحص الروابط والصور
import { BLOCKS, BG_KEYS } from './registry.js';
import { isSafeUrl, isAllowedImage } from '../urls.js';
import { hasIcon } from '../../render/icons.js';
import { cleanText } from '../../security.js';

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
const ANCHOR_RE = /^[A-Za-z0-9-]{0,40}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
const MAX_BLOCKS = 60;

// يتحقق من قيمة حقل واحد ويعيد { value, error }
export function validateField(spec, raw, pathLabel, helpers = {}) {
 const req = !!spec.required;
 const empty = raw === undefined || raw === null || raw === '';
 switch (spec.type) {
  case 'text': case 'longtext': case 'markdown': {
   const max = spec.max_length || (spec.type === 'text' ? 200 : spec.type === 'longtext' ? 1000 : 20000);
   const value = cleanText(raw, max);
   if (req && !value) return { error: `${pathLabel}: هذا الحقل مطلوب.` };
   if (/<\s*[a-zA-Z!/]/.test(value)) return { error: `${pathLabel}: وسوم HTML غير مسموحة.` };
   if (/javascript\s*:/i.test(value)) return { error: `${pathLabel}: الرابط غير مسموح.` };
   return { value };
  }
  case 'url': {
   const value = cleanText(raw, 2048);
   if (!value) return req ? { error: `${pathLabel}: الرابط مطلوب.` } : { value: '' };
   if (!isSafeUrl(value)) return { error: `${pathLabel}: الرابط غير مسموح. المسموح https وhttp وmailto وtel والروابط النسبية.` };
   return { value };
  }
  case 'number': {
   if (empty) return req ? { error: `${pathLabel}: الرقم مطلوب.` } : { value: spec.default ?? null };
   const n = Number(raw);
   if (!Number.isFinite(n)) return { error: `${pathLabel}: قيمة رقمية غير صالحة.` };
   if (spec.min !== undefined && n < spec.min) return { error: `${pathLabel}: الحد الأدنى ${spec.min}.` };
   if (spec.max !== undefined && n > spec.max) return { error: `${pathLabel}: الحد الأقصى ${spec.max}.` };
   return { value: n };
  }
  case 'toggle': return { value: raw === true || raw === 'true' || raw === 'on' || raw === 1 };
  case 'select': {
   const allowed = (spec.options || []).map((o) => o.value);
   if (empty) return req ? { error: `${pathLabel}: اختر قيمة.` } : { value: spec.default ?? allowed[0] ?? '' };
   if (!allowed.includes(raw)) return { error: `${pathLabel}: قيمة غير مسموحة.` };
   return { value: raw };
  }
  case 'image': case 'file': {
   const value = cleanText(raw, 2048);
   if (!value) return req ? { error: `${pathLabel}: الصورة مطلوبة.` } : { value: '' };
   if (!isAllowedImage(value) && !(spec.type === 'file' && helpers.isLibraryUrl?.(value))) return { error: `${pathLabel}: الملف يجب أن يكون من مكتبة الوسائط.` };
   return { value };
  }
  case 'icon': {
   const value = cleanText(raw, 40);
   if (!value) return req ? { error: `${pathLabel}: اختر أيقونة.` } : { value: '' };
   if (!hasIcon(value)) return { error: `${pathLabel}: الأيقونة غير معروفة.` };
   return { value };
  }
  case 'service_select': case 'form_select': case 'faq_group_select': {
   const value = cleanText(raw, 80);
   if (!value) return req ? { error: `${pathLabel}: الاختيار مطلوب.` } : { value: '' };
   if (!/^[a-z0-9\u0600-\u06FF -]{1,80}$/.test(value)) return { error: `${pathLabel}: قيمة غير صالحة.` };
   return { value };
  }
  case 'date': {
   const value = cleanText(raw, 40);
   if (!value) return req ? { error: `${pathLabel}: التاريخ مطلوب.` } : { value: '' };
   if (!DATE_RE.test(value)) return { error: `${pathLabel}: صيغة التاريخ غير صالحة.` };
   return { value };
  }
  case 'list': {
   const items = Array.isArray(raw) ? raw : [];
   const min = spec.min_items ?? 0;
   const max = spec.max_items ?? 20;
   if (items.length < min) return { error: `${pathLabel}: الحد الأدنى ${min} عناصر.` };
   if (items.length > max) return { error: `${pathLabel}: الحد الأقصى ${max} عناصر.` };
   const out = [];
   const errors = [];
   items.forEach((item, i) => {
    const row = {};
    for (const sub of spec.fields || []) {
     const r = validateField(sub, item?.[sub.key], `${pathLabel} ${i + 1} › ${sub.label_ar}`, helpers);
     if (r.error) errors.push(r.error); else row[sub.key] = r.value;
    }
    out.push(row);
   });
   if (errors.length) return { error: errors.join(' ') };
   return { value: out };
  }
  default: return { error: `${pathLabel}: نوع حقل غير معروف.` };
 }
}

// يتحقق من كتلة واحدة ويعيد { block, errors }
export function validateBlock(input, helpers = {}) {
 const errors = [];
 if (!input || typeof input !== 'object') return { errors: ['الكتلة ليست كائنًا.'] };
 const spec = BLOCKS[input.type];
 if (!spec) return { errors: [`نوع الكتلة «${cleanText(input.type, 40)}» غير معروف.`] };
 const id = ID_RE.test(String(input.id || '')) ? String(input.id) : '';
 if (!id) errors.push('معرّف الكتلة غير صالح.');
 const anchor = cleanText(input.anchor, 40);
 if (!ANCHOR_RE.test(anchor)) errors.push('المعرّف الداخلي (anchor) بأحرف لاتينية وأرقام وشرطات فقط.');
 const bg = BG_KEYS.includes(input.bg) ? input.bg : (spec.defaults?.bg || 'cream');
 const data = {};
 const rawData = input.data && typeof input.data === 'object' ? input.data : {};
 for (const f of spec.fields) {
  const r = validateField(f, rawData[f.key], `${spec.label_ar} › ${f.label_ar}`, helpers);
  if (r.error) errors.push(r.error); else data[f.key] = r.value;
 }
 return { block: { id, type: spec.type, hidden: input.hidden === true || input.hidden === 'true', anchor, bg, data }, errors };
}

// يتحقق من قائمة الكتل كاملة
export function validateBlocks(list, helpers = {}) {
 if (!Array.isArray(list)) return { blocks: [], errors: ['الكتل يجب أن تكون قائمة.'] };
 if (list.length > MAX_BLOCKS) return { blocks: [], errors: [`الحد الأقصى ${MAX_BLOCKS} كتلة في الصفحة.`] };
 const blocks = [];
 const errors = [];
 const ids = new Set();
 list.forEach((b, i) => {
  const r = validateBlock(b, helpers);
  if (r.errors.length) errors.push(...r.errors.map((e) => `الكتلة ${i + 1}: ${e}`));
  else {
   if (ids.has(r.block.id)) errors.push(`الكتلة ${i + 1}: المعرّف مكرر.`);
   ids.add(r.block.id);
   blocks.push(r.block);
  }
 });
 return { blocks, errors };
}

// تحذير غير مانع: أكثر من زر أساسي واحد في الصفحة
export function primaryButtonWarning(blocks) {
 let count = 0;
 for (const b of blocks) {
  if (b.hidden) continue;
  if (b.type === 'hero') count += (b.data.buttons || []).filter((x) => x.style === 'primary').length;
  if (b.type === 'cta_band' && b.data.button_style === 'primary' && b.data.button_label) count += 1;
  if (b.type === 'image_text' && b.data.button_style === 'primary' && b.data.button_label) count += 1;
  if (b.type === 'app_cta' || b.type === 'form') count += 1;
 }
 return count > 1 ? 'الهوية تقضي بزر أساسي واحد في الشاشة' : '';
}
