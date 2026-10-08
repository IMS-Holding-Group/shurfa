// مولّد النماذج: يبني حقول التحرير من مخطط الحقول القادم من سجل الكتل
import { el, button, field, icon, setDirty } from '../ui.js';
import { markdownEditor } from './markdown.js';
import { mediaPicker } from './media-picker.js';

const TONE_HELP = 'جمل قصيرة، الفعل أولًا، بدون مبالغة.';

function optionsFor(spec, lookups) {
 if (spec.type === 'select') return (spec.options || []).map((o) => ({ value: o.value, label: o.label_ar || o.value }));
 if (spec.type === 'icon') return [{ value: '', label: 'بدون أيقونة' }, ...(lookups.icons || []).map((i) => ({ value: i.value, label: i.label_ar }))];
 if (spec.type === 'service_select') return [{ value: '', label: 'اختر خدمة' }, ...(lookups.services || []).map((s) => ({ value: s.slug, label: s.title }))];
 if (spec.type === 'form_select') return [{ value: '', label: 'اختر نموذجًا' }, ...(lookups.forms || []).map((f) => ({ value: f.slug, label: f.title }))];
 if (spec.type === 'faq_group_select') return [{ value: '', label: 'كل المجموعات' }, ...(lookups.faqGroups || []).map((g) => ({ value: g, label: g }))];
 return [];
}

// حقل صورة أو ملف: معاينة ومسار وزر «اختيار من المكتبة» يفتح المنتقي داخل الصفحة
function mediaField(spec, value, lookups) {
 const kind = spec.type === 'file' ? 'pdf' : 'image';
 const preview = el('div', { class: 'media-field-preview' });
 const path = el('input', { class: 'input', type: 'text', readonly: true, 'aria-label': `${spec.label_ar} (الرابط)` });
 const slot = el('div');
 const err = el('p', { class: 'field-error', 'aria-live': 'polite' });
 let current = value || '';
 const render = () => {
  path.value = current;
  preview.replaceChildren(current ? (kind === 'image' ? el('img', { class: 'media-img', src: current, alt: '' }) : el('span', { class: 'media-pdf', text: 'PDF' })) : el('span', { class: 'support muted', text: 'لم يُختر شيء بعد.' }));
 };
 const choose = button('اختيار من المكتبة', { small: true, onClick: () => { slot.replaceChildren(mediaPicker({ kind, onPick: (a) => { current = a.url; render(); setDirty(true); if (lookups.onPickAlt && a.alt_text) lookups.onPickAlt(spec.key, a.alt_text); } })); } });
 const clear = button('إزالة', { style: 'quiet', small: true, onClick: () => { current = ''; render(); setDirty(true); } });
 render();
 const wrap = el('div', { class: 'field media-field' }, el('p', { class: 'field-label', text: spec.label_ar + (spec.required ? ' *' : '') }), preview, path, el('div', { class: 'inline-list' }, choose, clear), slot, spec.help_ar ? el('p', { class: 'field-help', text: spec.help_ar }) : null, err);
 return { wrap, input: path, get: () => current, set: (v) => { current = v || ''; render(); }, setError: (t) => { err.textContent = t || ''; } };
}

// مكرِّر عناصر بحقول فرعية وأزرار ترتيب وحذف
function listField(spec, value, lookups) {
 const items = Array.isArray(value) ? value.map((v) => ({ ...v })) : [];
 const rows = el('div', { class: 'list-rows' });
 const err = el('p', { class: 'field-error', 'aria-live': 'polite' });
 const min = spec.min_items ?? 0; const max = spec.max_items ?? 20;
 const forms = [];
 const defaults = () => Object.fromEntries((spec.fields || []).map((f) => [f.key, f.default ?? (f.type === 'list' ? [] : (f.type === 'toggle' ? false : ''))]));
 const addBtn = button(`إضافة ${spec.item_label_ar || 'عنصر'}`, { small: true, iconName: 'plus', onClick: () => { items.push(defaults()); setDirty(true); render(); } });
 const render = () => {
  forms.length = 0;
  rows.replaceChildren(...items.map((item, i) => {
   const f = buildForm(spec.fields || [], item, lookups);
   forms.push(f);
   const head = el('div', { class: 'list-row-head' },
    el('strong', { text: `${spec.item_label_ar || 'عنصر'} ${i + 1}` }),
    el('div', { class: 'inline-list' },
     button('', { style: 'quiet', small: true, iconName: 'up', title: 'أعلى', disabled: i === 0, onClick: () => { sync(); [items[i - 1], items[i]] = [items[i], items[i - 1]]; setDirty(true); render(); } }),
     button('', { style: 'quiet', small: true, iconName: 'down', title: 'أسفل', disabled: i === items.length - 1, onClick: () => { sync(); [items[i + 1], items[i]] = [items[i], items[i + 1]]; setDirty(true); render(); } }),
     button('', { style: 'quiet', small: true, iconName: 'trash', title: 'حذف', onClick: () => { sync(); items.splice(i, 1); setDirty(true); render(); } })));
   return el('div', { class: 'list-row' }, head, f.wrap);
  }));
  addBtn.disabled = items.length >= max;
 };
 const sync = () => { forms.forEach((f, i) => { items[i] = f.get(); }); };
 render();
 const wrap = el('div', { class: 'field list-field' }, el('p', { class: 'field-label', text: spec.label_ar }), spec.help_ar ? el('p', { class: 'field-help', text: `${spec.help_ar} (من ${min} إلى ${max})` }) : null, rows, addBtn, err);
 return { wrap, get: () => { sync(); return items.map((x) => ({ ...x })); }, set: (v) => { items.splice(0, items.length, ...(Array.isArray(v) ? v : [])); render(); }, setError: (t) => { err.textContent = t || ''; }, setErrors: (list) => forms.forEach((f, i) => f.setErrors(list?.[i] || {})) };
}

function oneField(spec, value, lookups) {
 const help = spec.help_ar || (spec.key === 'title' || spec.key === 'lead' || spec.key === 'body' ? TONE_HELP : '');
 const common = { label: spec.label_ar, help, required: !!spec.required, onInput: () => setDirty(true), onChange: () => setDirty(true) };
 switch (spec.type) {
  case 'text': return field({ ...common, type: 'text', value: value ?? '', maxLength: spec.max_length || 200 });
  case 'longtext': return field({ ...common, type: 'textarea', rows: 3, value: value ?? '', maxLength: spec.max_length || 1000 });
  case 'markdown': { const m = markdownEditor({ label: spec.label_ar, help: spec.help_ar || undefined, value: value ?? '', maxLength: spec.max_length || 20000, required: !!spec.required, onInput: () => setDirty(true) }); return m; }
  case 'url': return field({ ...common, type: 'text', value: value ?? '', maxLength: 2048, placeholder: 'https://... أو /path', inputmode: 'url' });
  case 'number': return field({ ...common, type: 'number', value: value ?? spec.default ?? '', min: spec.min, max: spec.max, step: spec.step || 'any' });
  case 'toggle': return field({ ...common, type: 'checkbox', value: value === undefined ? !!spec.default : !!value });
  case 'date': return field({ ...common, type: 'date', value: value ?? '' });
  case 'select': case 'icon': case 'service_select': case 'form_select': case 'faq_group_select': {
   const f = field({ ...common, type: 'select', options: optionsFor(spec, lookups) });
   f.set(value ?? spec.default ?? '');
   return f;
  }
  case 'image': case 'file': return mediaField(spec, value, lookups);
  case 'list': return listField(spec, value, lookups);
  default: return field({ ...common, type: 'text', value: value ?? '' });
 }
}

// يبني نموذجًا كاملًا من مخطط حقول ويعيد { wrap, get, set, setErrors }
export function buildForm(specs, data = {}, lookups = {}) {
 const controls = {};
 const wrap = el('div', { class: 'generated-form' });
 for (const spec of specs) {
  const c = oneField(spec, data?.[spec.key], lookups);
  controls[spec.key] = c;
  wrap.append(c.wrap);
 }
 return {
  wrap,
  controls,
  get: () => Object.fromEntries(specs.map((s) => [s.key, controls[s.key].get()])),
  set: (d) => specs.forEach((s) => controls[s.key].set(d?.[s.key])),
  setErrors: (errors = {}) => specs.forEach((s) => controls[s.key].setError && controls[s.key].setError(errors[s.key] || ''))
 };
}

export { icon };
