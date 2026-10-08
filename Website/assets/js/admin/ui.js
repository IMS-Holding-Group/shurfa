// أدوات بناء الواجهة في اللوحة: عناصر DOM، حقول، جداول، وسوم، أشرطة تأكيد، رسائل
const SVG_NS = 'http://www.w3.org/2000/svg';

// ينشئ عنصرًا مع خصائص وأبناء. المفاتيح الخاصة: class, text, dataset, on (كائن أحداث)
export function el(tag, attrs = {}, ...children) {
 const node = document.createElement(tag);
 for (const [k, v] of Object.entries(attrs || {})) {
  if (v === undefined || v === null || v === false) continue;
  if (k === 'class') node.className = v;
  else if (k === 'text') node.textContent = v;
  else if (k === 'dataset') Object.assign(node.dataset, v);
  else if (k === 'on') for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
  else if (k === 'value' && 'value' in node) node.value = v;
  else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'required' || k === 'open') node[k] = !!v;
  else node.setAttribute(k, v === true ? '' : v);
 }
 node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false).map((c) => (typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c)));
 return node;
}

// أيقونات اللوحة: مضلعات بسيطة بلون النص الحالي
const ICONS = {
 up: '12,5 20,13 16,13 16,19 8,19 8,13 4,13',
 down: '12,19 4,11 8,11 8,5 16,5 16,11 20,11',
 close: '6,4 12,10 18,4 20,6 14,12 20,18 18,20 12,14 6,20 4,18 10,12 4,6',
 plus: '10,4 14,4 14,10 20,10 20,14 14,14 14,20 10,20 10,14 4,14 4,10 10,10',
 check: '9,17 4,12 6,10 9,13 18,4 20,6',
 menu: '4,6 20,6 20,8 4,8 4,11 20,11 20,13 4,13 4,16 20,16 4,18 4,18',
 eye: '12,6 20,12 12,18 4,12',
 copy: '6,4 16,4 16,8 20,8 20,20 10,20 10,16 6,16',
 trash: '7,6 17,6 16,20 8,20',
 edit: '15,4 20,9 9,20 4,20 4,15'
};
export function icon(name, size = 20) {
 const svg = document.createElementNS(SVG_NS, 'svg');
 svg.setAttribute('viewBox', '0 0 24 24');
 svg.setAttribute('width', size);
 svg.setAttribute('height', size);
 svg.setAttribute('aria-hidden', 'true');
 svg.setAttribute('focusable', 'false');
 const p = document.createElementNS(SVG_NS, 'polygon');
 p.setAttribute('points', ICONS[name] || ICONS.plus);
 p.setAttribute('fill', 'currentColor');
 svg.append(p);
 return svg;
}

export function button(label, { style = 'secondary', small = false, iconName, onClick, type = 'button', title, disabled = false } = {}) {
 const cls = ['btn'];
 if (style === 'secondary') cls.push('btn-secondary');
 if (style === 'quiet') cls.push('btn-quiet');
 if (small) cls.push('btn-small');
 if (iconName && !label) cls.push('btn-icon');
 const b = el('button', { class: cls.join(' '), type, title: title || (label ? undefined : ''), 'aria-label': label ? undefined : title, disabled });
 if (iconName) b.append(icon(iconName, small ? 18 : 20));
 if (label) b.append(document.createTextNode(label));
 if (onClick) b.addEventListener('click', onClick);
 return b;
}

export function link(label, href, { style = 'secondary', small = false, newTab = false, download = false } = {}) {
 const cls = ['btn'];
 if (style === 'secondary') cls.push('btn-secondary');
 if (style === 'quiet') cls.push('btn-quiet');
 if (small) cls.push('btn-small');
 return el('a', { class: cls.join(' '), href, target: newTab ? '_blank' : undefined, rel: newTab ? 'noopener noreferrer' : undefined, download: download || undefined, text: label });
}

let fieldSeq = 0;
// حقل كامل: تسمية، عنصر إدخال، سطر مساعدة، عدّاد اختياري، رسالة خطأ
export function field({ label, help = '', type = 'text', name, value = '', options = [], required = false, maxLength, placeholder, rows = 4, counterMax, onInput, onChange, disabled = false, min, max, step, inputmode }) {
 fieldSeq += 1;
 const id = `fld-${fieldSeq}`;
 const helpId = `${id}-help`;
 const errId = `${id}-err`;
 let input;
 const common = { id, name, required, disabled, 'aria-describedby': `${help ? `${helpId} ` : ''}${errId}` };
 if (type === 'textarea') input = el('textarea', { ...common, class: 'textarea', rows, maxlength: maxLength, placeholder });
 else if (type === 'select') {
  input = el('select', { ...common, class: 'select' });
  options.forEach((o) => input.append(el('option', { value: o.value ?? o, text: o.label ?? o })));
 } else if (type === 'checkbox') {
  input = el('input', { ...common, type: 'checkbox', checked: !!value });
  const wrap = el('div', { class: 'field' }, el('label', { class: 'checkbox', for: id }, input, el('span', { text: label })), help ? el('p', { class: 'field-help', id: helpId, text: help }) : null, el('p', { class: 'field-error', id: errId, 'aria-live': 'polite' }));
  if (onChange) input.addEventListener('change', onChange);
  return { wrap, input, setError: (t) => setFieldError(wrap, input, t), get: () => input.checked, set: (v) => { input.checked = !!v; } };
 } else input = el('input', { ...common, class: 'input', type, maxlength: maxLength, placeholder, min, max, step, inputmode });
 if (type !== 'checkbox') input.value = value ?? '';
 const wrap = el('div', { class: 'field' },
  el('label', { class: 'field-label', for: id }, label, required ? el('span', { 'aria-hidden': 'true', text: ' *' }) : null),
  input,
  help ? el('p', { class: 'field-help', id: helpId, text: help }) : null,
  el('p', { class: 'field-error', id: errId, 'aria-live': 'polite' }));
 const limit = counterMax || (type === 'textarea' || type === 'text' ? maxLength : undefined);
 if (limit) attachCounter(wrap, input, limit);
 if (onInput) input.addEventListener('input', onInput);
 if (onChange) input.addEventListener('change', onChange);
 return { wrap, input, setError: (t) => setFieldError(wrap, input, t), get: () => input.value, set: (v) => { input.value = v ?? ''; input.dispatchEvent(new Event('input')); } };
}

export function setFieldError(wrap, input, text) {
 const err = wrap.querySelector('.field-error');
 if (err) err.textContent = text || '';
 if (text) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
}

// عدّاد أحرف يتلوّن: أخضر ضمن الحد، ذهبي عند الاقتراب، أحمر عند التجاوز
export function attachCounter(wrap, input, max) {
 const c = el('p', { class: 'counter support', 'aria-live': 'polite' });
 const update = () => {
  const len = input.value.length;
  c.textContent = `${len} / ${max}`;
  c.classList.toggle('ok', len <= max * 0.9);
  c.classList.toggle('near', len > max * 0.9 && len <= max);
  c.classList.toggle('over', len > max);
 };
 input.addEventListener('input', update);
 input.insertAdjacentElement('afterend', c);
 update();
}

// يوزّع أخطاء الخادم على الحقول بالاسم ويعيد ما لم يجد له حقلًا
export function applyErrors(fields, errors = {}) {
 const rest = [];
 Object.values(fields).forEach((f) => f.setError && f.setError(''));
 for (const [k, v] of Object.entries(errors)) {
  if (fields[k] && fields[k].setError) fields[k].setError(v); else rest.push(`${k}: ${v}`);
 }
 const first = Object.keys(errors).find((k) => fields[k]);
 if (first && fields[first].input) fields[first].input.focus();
 return rest;
}

export function chip(text, kind = 'sand') { return el('span', { class: `chip chip-${kind}`, text }); }

const STATUS = {
 draft: ['مسودة', 'sand'],
 published: ['منشور', 'success'],
 scheduled: ['مجدول', 'gold'],
 pending: ['تغييرات غير منشورة', 'purple'],
 expired: ['انتهى نشره', 'sand'],
 deleted: ['محذوف', 'error']
};
export function statusChip(status) { const [t, k] = STATUS[status] || [status, 'sand']; return chip(t, k); }
export const STATUS_LABELS = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v[0]]));

export function notice(text, kind = '') { return el('div', { class: `notice${kind ? ` notice-${kind}` : ''}`, role: 'status' }, el('p', { text })); }

// شريط رسائل أعلى المحتوى
export function notify(text, kind = 'success') {
 const bar = document.getElementById('app-messages');
 if (!bar) return;
 bar.replaceChildren(notice(text, kind));
 bar.scrollIntoView({ block: 'nearest' });
 if (kind === 'success') setTimeout(() => { if (bar.firstChild && bar.firstChild.textContent === text) bar.replaceChildren(); }, 5000);
}
export function clearNotify() { const bar = document.getElementById('app-messages'); if (bar) bar.replaceChildren(); }

// شريط تأكيد مسطح: «تأكيد الحذف؟ [حذف] [إلغاء]»
export function confirmBar(text, { confirmLabel = 'حذف', onConfirm, onCancel } = {}) {
 const bar = el('div', { class: 'confirm-bar', role: 'alertdialog', 'aria-live': 'assertive' });
 const cancel = button('إلغاء', { style: 'quiet', small: true, onClick: () => { bar.remove(); if (onCancel) onCancel(); } });
 const ok = button(confirmLabel, { style: 'primary', small: true, onClick: async () => { ok.disabled = true; try { await onConfirm(); bar.remove(); } catch (e) { ok.disabled = false; notify(e.message || 'تعذر التنفيذ.', 'error'); } } });
 bar.append(el('p', { text }), el('div', { class: 'confirm-actions' }, ok, cancel));
 setTimeout(() => ok.focus(), 0);
 return bar;
}

export function table(columns, rows, { empty = 'لا توجد عناصر بعد.', rowClass } = {}) {
 if (!rows.length) return el('p', { class: 'muted empty', text: empty });
 const thead = el('thead', {}, el('tr', {}, ...columns.map((c) => el('th', { scope: 'col', text: c.label, class: c.className }))));
 const tbody = el('tbody', {}, ...rows.map((r, i) => el('tr', { class: rowClass ? rowClass(r) : undefined }, ...columns.map((c) => {
  const content = c.render ? c.render(r, i) : (r[c.key] ?? '');
  return el('td', { class: c.className, 'data-label': c.label }, content instanceof Node || Array.isArray(content) ? content : String(content));
 }))));
 return el('div', { class: 'table-wrap' }, el('table', { class: 'table' }, thead, tbody));
}

export function pagination({ page, pages, onChange }) {
 if (pages <= 1) return el('div');
 return el('nav', { class: 'pagination', 'aria-label': 'ترقيم الصفحات' },
  button('السابق', { small: true, disabled: page <= 1, onClick: () => onChange(page - 1) }),
  el('span', { class: 'support', text: `صفحة ${page} من ${pages}` }),
  button('التالي', { small: true, disabled: page >= pages, onClick: () => onChange(page + 1) }));
}

export function searchBox(value, onSearch, placeholder = 'بحث') {
 const input = el('input', { class: 'input', type: 'search', value, placeholder, 'aria-label': placeholder });
 const form = el('form', { class: 'search-box', on: { submit: (e) => { e.preventDefault(); onSearch(input.value.trim()); } } }, input, button('بحث', { small: true, type: 'submit' }));
 return form;
}

export function pageHeader(title, ...actions) {
 return el('div', { class: 'page-header' }, el('h1', { text: title }), el('div', { class: 'page-actions' }, ...actions));
}

export function section(title, ...children) {
 return el('section', { class: 'panel' }, title ? el('h2', { text: title }) : null, ...children);
}

export function stats(items) {
 return el('div', { class: 'stats' }, ...items.map((s) => el('div', { class: 'stat' }, el('p', { class: 'stat-value', text: String(s.value) }), el('p', { class: 'stat-label', text: s.label }))));
}

// التاريخ بصيغة الهوية: 2026/1/3م 5:50ص بتوقيت مسقط
const dtf = new Intl.DateTimeFormat('en-GB-u-nu-latn-ca-gregory', { timeZone: 'Asia/Muscat', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
export function fmtDate(iso, withTime = true) {
 if (!iso) return '';
 const d = new Date(iso);
 if (Number.isNaN(d.getTime())) return '';
 const p = Object.fromEntries(dtf.formatToParts(d).map((x) => [x.type, x.value]));
 const date = `${p.year}/${Number(p.month)}/${Number(p.day)}م`;
 if (!withTime) return date;
 const suffix = /p/i.test(p.dayPeriod || '') ? 'م' : 'ص';
 return `${date} ${Number(p.hour)}:${p.minute}${suffix}`;
}

// تحويل بين ISO والحقل datetime-local بتوقيت مسقط (+04:00 ثابت)
export function toLocalInput(iso) {
 if (!iso) return '';
 const d = new Date(iso);
 if (Number.isNaN(d.getTime())) return '';
 const m = new Date(d.getTime() + 4 * 3600 * 1000);
 return m.toISOString().slice(0, 16);
}
export function fromLocalInput(v) {
 if (!v) return null;
 const d = new Date(`${v}:00+04:00`);
 return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function fmtBytes(n) {
 const b = Number(n || 0);
 if (b < 1024) return `${b} بايت`;
 if (b < 1024 * 1024) return `${Math.round(b / 1024)} كيلوبايت`;
 return `${(b / (1024 * 1024)).toFixed(1)} ميغابايت`;
}

export function fmtNumber(n) { return new Intl.NumberFormat('en-US').format(Number(n || 0)); }

// تتبّع التغييرات غير المحفوظة
let dirty = false;
export function setDirty(v) { dirty = !!v; }
export function isDirty() { return dirty; }
window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

export async function copyText(text) {
 try { await navigator.clipboard.writeText(text); notify('نُسخ الرابط.'); } catch { notify('تعذر النسخ تلقائيًا. انسخه يدويًا.', 'error'); }
}

export function slugify(text) {
 return String(text || '').toLowerCase().trim().replace(/[^a-z0-9\u0600-\u06FF\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
