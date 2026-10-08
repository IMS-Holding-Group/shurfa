// محرر Markdown المبسّط: شريط أزرار ومعاينة بالمحوّل نفسه المستخدم في الموقع
import { renderMarkdown } from '../../shared/markdown.js';
import { el, button, attachCounter } from '../ui.js';
import { mediaPicker } from './media-picker.js';

const STORAGE_ORIGIN = () => (document.body.dataset.storageOrigin || '');

// يحوّل HTML الناتج من المحوّل الآمن إلى عقد DOM عبر DOMParser (المصدر مهرَّب أصلًا)
export function markdownToNodes(source) {
 const html = renderMarkdown(source || '', { storageOrigin: STORAGE_ORIGIN() });
 const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
 doc.querySelectorAll('script, style, iframe, object, embed').forEach((n) => n.remove());
 const frag = document.createDocumentFragment();
 Array.from(doc.body.firstChild.childNodes).forEach((n) => frag.append(document.importNode(n, true)));
 return frag;
}

export function markdownEditor({ label, help = 'المسموح: عناوين، فقرات، عريض، مائل، قوائم، روابط، وصور من المكتبة.', value = '', maxLength = 20000, required = false, onInput }) {
 const ta = el('textarea', { class: 'textarea md-input', rows: 14, maxlength: maxLength, required, 'aria-label': label });
 ta.value = value || '';
 const preview = el('div', { class: 'prose md-preview', 'aria-live': 'polite' });
 const err = el('p', { class: 'field-error', 'aria-live': 'polite' });
 const pickerSlot = el('div');

 const wrapSelection = (before, after = before, placeholder = 'نص') => {
  const s = ta.selectionStart; const e = ta.selectionEnd;
  const sel = ta.value.slice(s, e) || placeholder;
  ta.setRangeText(`${before}${sel}${after}`, s, e, 'select');
  ta.focus();
  ta.dispatchEvent(new Event('input'));
 };
 const linePrefix = (prefix) => {
  const s = ta.selectionStart; const e = ta.selectionEnd;
  const start = ta.value.lastIndexOf('\n', s - 1) + 1;
  const chunk = ta.value.slice(start, e);
  const lines = chunk.split('\n').map((l, i) => (prefix === '1. ' ? `${i + 1}. ${l}` : `${prefix}${l}`));
  ta.setRangeText(lines.join('\n'), start, e, 'end');
  ta.focus();
  ta.dispatchEvent(new Event('input'));
 };

 const tools = [
  ['عنوان', () => linePrefix('## ')],
  ['عنوان فرعي', () => linePrefix('### ')],
  ['عريض', () => wrapSelection('**')],
  ['مائل', () => wrapSelection('*')],
  ['قائمة', () => linePrefix('- ')],
  ['مرقّمة', () => linePrefix('1. ')],
  ['رابط', () => {
   const s = ta.selectionStart; const e = ta.selectionEnd;
   const urlInput = el('input', { class: 'input', type: 'url', placeholder: 'https://', 'aria-label': 'الرابط' });
   const row = el('div', { class: 'inline-panel md-link-row' }, urlInput,
    button('إدراج', { style: 'primary', small: true, onClick: () => { const url = urlInput.value.trim(); if (!/^(https?:\/\/|\/|mailto:|tel:)/.test(url)) { urlInput.setAttribute('aria-invalid', 'true'); return; } ta.setSelectionRange(s, e); wrapSelection('[', `](${url})`, 'نص الرابط'); row.remove(); } }),
    button('إلغاء', { style: 'quiet', small: true, onClick: () => row.remove() }));
   pickerSlot.replaceChildren(row);
   urlInput.focus();
  }],
  ['صورة من المكتبة', () => { pickerSlot.replaceChildren(mediaPicker({ kind: 'image', onPick: (a) => { ta.setRangeText(`![${a.alt_text}](${a.url})`, ta.selectionStart, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } })); }]
 ];
 const toolbar = el('div', { class: 'md-toolbar', role: 'toolbar', 'aria-label': 'أدوات التنسيق' }, ...tools.map(([t, fn]) => button(t, { style: 'quiet', small: true, onClick: fn })));

 const tabs = el('div', { class: 'md-tabs' },
  button('كتابة', { style: 'quiet', small: true, onClick: () => wrap.classList.remove('show-preview') }),
  button('معاينة', { style: 'quiet', small: true, onClick: () => wrap.classList.add('show-preview') }));

 const update = () => { preview.replaceChildren(markdownToNodes(ta.value)); if (onInput) onInput(ta.value); };
 ta.addEventListener('input', update);
 const wrap = el('div', { class: 'field md-editor' },
  el('p', { class: 'field-label', text: label }),
  toolbar, tabs,
  el('div', { class: 'md-panes' }, el('div', { class: 'md-write' }, ta), el('div', { class: 'md-view' }, el('p', { class: 'support muted', text: 'معاينة' }), preview)),
  pickerSlot,
  el('p', { class: 'field-help', text: help }),
  err);
 attachCounter(wrap, ta, maxLength);
 update();
 return { wrap, input: ta, get: () => ta.value, set: (v) => { ta.value = v || ''; update(); }, setError: (t) => { err.textContent = t || ''; if (t) ta.setAttribute('aria-invalid', 'true'); else ta.removeAttribute('aria-invalid'); } };
}
