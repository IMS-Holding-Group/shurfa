// محرر الكتل: قائمة صفوف بأزرار ترتيب وإخفاء وتكرار وحذف وتعديل داخل الصفحة
import { el, button, field, chip, confirmBar, setDirty } from '../ui.js';
import { buildForm } from './fields.js';

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `b-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);

function summaryOf(block, spec) {
 const key = spec?.summary_field || 'title';
 const v = block.data?.[key];
 if (typeof v === 'string' && v.trim()) return v.trim().slice(0, 70);
 const firstText = Object.values(block.data || {}).find((x) => typeof x === 'string' && x.trim());
 return firstText ? String(firstText).trim().slice(0, 70) : 'بدون نص بعد';
}

export function blockEditor({ blocks = [], registry, lookups = {}, onChange }) {
 const list = blocks.map((b) => ({ ...b, data: { ...(b.data || {}) } }));
 const specs = Object.fromEntries(registry.blocks.map((b) => [b.type, b]));
 const bgOptions = registry.backgrounds.map((b) => ({ value: b.value, label: b.label_ar }));
 const rows = el('div', { class: 'block-rows' });
 const addSlot = el('div');
 let editing = -1;
 const changed = () => { setDirty(true); if (onChange) onChange(list); };

 const editorFor = (i) => {
  const b = list[i];
  const spec = specs[b.type];
  const form = buildForm(spec.fields, b.data, lookups);
  const anchor = field({ label: 'المعرّف الداخلي (anchor)', help: 'اختياري. أحرف لاتينية وأرقام وشرطات، لربط العنصر من القوائم بـ #', value: b.anchor || '', maxLength: 40 });
  const bg = field({ label: 'الخلفية', help: 'لون النص يُضبط تلقائيًا للتباين.', type: 'select', options: bgOptions });
  bg.set(b.bg || spec.defaults?.bg || 'cream');
  const hidden = field({ label: 'إخفاء الكتلة من الموقع دون حذفها', type: 'checkbox', value: !!b.hidden });
  const apply = () => {
   list[i] = { ...b, data: form.get(), anchor: anchor.get().trim(), bg: bg.get(), hidden: hidden.get() };
   editing = -1;
   changed();
   render();
  };
  return el('div', { class: 'inline-panel block-form' },
   el('h3', { text: `تعديل: ${spec.label_ar}` }),
   el('p', { class: 'support muted', text: spec.description_ar || '' }),
   form.wrap,
   el('div', { class: 'block-common' }, bg.wrap, anchor.wrap, hidden.wrap),
   el('div', { class: 'inline-list' }, button('تم', { style: 'primary', small: true, onClick: apply }), button('إلغاء', { style: 'quiet', small: true, onClick: () => { editing = -1; render(); } })));
 };

 const render = () => {
  rows.replaceChildren(...list.map((b, i) => {
   const spec = specs[b.type] || { label_ar: b.type };
   const head = el('div', { class: 'block-row-head' },
    el('div', { class: 'block-row-title' }, el('strong', { text: spec.label_ar }), b.hidden ? chip('مخفية', 'sand') : null, el('span', { class: 'support muted', text: summaryOf(b, spec) })),
    el('div', { class: 'inline-list' },
     button('', { style: 'quiet', small: true, iconName: 'up', title: 'أعلى', disabled: i === 0, onClick: () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; editing = -1; changed(); render(); } }),
     button('', { style: 'quiet', small: true, iconName: 'down', title: 'أسفل', disabled: i === list.length - 1, onClick: () => { [list[i + 1], list[i]] = [list[i], list[i + 1]]; editing = -1; changed(); render(); } }),
     button(b.hidden ? 'إظهار' : 'إخفاء', { style: 'quiet', small: true, onClick: () => { list[i] = { ...b, hidden: !b.hidden }; changed(); render(); } }),
     button('تكرار', { style: 'quiet', small: true, onClick: () => { list.splice(i + 1, 0, { ...b, id: newId(), data: JSON.parse(JSON.stringify(b.data)) }); editing = -1; changed(); render(); } }),
     button('حذف', { style: 'quiet', small: true, onClick: (e) => { const row = e.currentTarget.closest('.block-row'); row.append(confirmBar('تأكيد حذف هذه الكتلة؟', { onConfirm: () => { list.splice(i, 1); editing = -1; changed(); render(); } })); } }),
     button(editing === i ? 'إغلاق' : 'تعديل', { small: true, style: editing === i ? 'quiet' : 'secondary', onClick: () => { editing = editing === i ? -1 : i; render(); } })));
   return el('div', { class: `block-row${b.hidden ? ' is-hidden' : ''}` }, head, editing === i ? editorFor(i) : null);
  }));
  if (!list.length) rows.append(el('p', { class: 'muted empty', text: 'لا توجد كتل بعد. أضف أول كتلة.' }));
 };

 const openAdd = () => {
  const panel = el('div', { class: 'inline-panel add-block' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: 'اختر نوع الكتلة' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => addSlot.replaceChildren() })),
   ...registry.blocks.map((spec) => el('div', { class: 'add-block-row' },
    el('div', {}, el('strong', { text: spec.label_ar }), el('p', { class: 'support muted', text: spec.description_ar || '' })),
    button('إضافة', { small: true, onClick: () => {
     const defaults = spec.defaults || {};
     const seed = defaults.data || {};
     const data = {};
     for (const f of spec.fields) data[f.key] = seed[f.key] !== undefined ? JSON.parse(JSON.stringify(seed[f.key])) : (f.default ?? (f.type === 'list' ? [] : (f.type === 'toggle' ? false : '')));
     list.push({ id: newId(), type: spec.type, hidden: false, anchor: '', bg: defaults.bg || 'cream', data });
     editing = list.length - 1;
     addSlot.replaceChildren();
     changed();
     render();
     rows.lastElementChild?.scrollIntoView({ block: 'start' });
    } }))));
  addSlot.replaceChildren(panel);
 };

 render();
 const wrap = el('div', { class: 'block-editor' }, rows, el('div', { class: 'inline-list' }, button('إضافة كتلة', { iconName: 'plus', onClick: openAdd })), addSlot);
 return { wrap, get: () => list.map((b) => ({ ...b })), hasOpenEditor: () => editing >= 0 };
}
