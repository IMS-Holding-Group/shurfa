// مكوّنات HTML صغيرة: التهريب، السمات، الأزرار، الحقول، الوسوم
export { escapeHtml } from '../../assets/js/shared/markdown.js';
import { escapeHtml } from '../../assets/js/shared/markdown.js';
import { isExternal } from '../cms/urls.js';

// يبني سلسلة سمات من كائن مع تهريب القيم وتجاهل الفارغ
export function attrs(obj = {}) {
 return Object.entries(obj)
  .filter(([, v]) => v !== undefined && v !== null && v !== false && v !== '')
  .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeHtml(v)}"`))
  .join('');
}

export function button({ label, href, style = 'primary', track, trackLabel, trackLocation, type = 'button', small = false, extra = {} }) {
 const cls = ['btn', style === 'secondary' ? 'btn-secondary' : '', style === 'quiet' ? 'btn-quiet' : '', small ? 'btn-small' : ''].filter(Boolean).join(' ');
 const data = { 'data-track': track, 'data-track-label': trackLabel, 'data-track-location': trackLocation };
 if (href) {
  const rel = isExternal(href) ? 'noopener noreferrer' : undefined;
  return `<a${attrs({ class: cls, href, rel, ...data, ...extra })}>${escapeHtml(label)}</a>`;
 }
 return `<button${attrs({ class: cls, type, ...data, ...extra })}>${escapeHtml(label)}</button>`;
}

export function chip(label, color = 'ink') {
 return `<span class="chip chip-${escapeHtml(color)}">${escapeHtml(label)}</span>`;
}

// حقل إدخال كامل بتسميته ومساعدته ورسالة خطئه المرتبطة عبر aria-describedby
export function field({ id, name, label, type = 'text', value = '', required = false, help = '', error = '', options = [], maxLength, placeholder, autocomplete }) {
 const helpId = `${id}-help`;
 const errId = `${id}-error`;
 const describedBy = [help ? helpId : '', errId].filter(Boolean).join(' ');
 const common = { id, name, required, 'aria-describedby': describedBy, 'aria-invalid': error ? 'true' : undefined, maxlength: maxLength, autocomplete };
 let control;
 if (type === 'textarea') control = `<textarea${attrs({ ...common, class: 'textarea', placeholder })}>${escapeHtml(value)}</textarea>`;
 else if (type === 'select') {
  const opts = [`<option value="">اختر</option>`, ...options.map((o) => `<option${attrs({ value: o, selected: o === value })}>${escapeHtml(o)}</option>`)];
  control = `<select${attrs({ ...common, class: 'select' })}>${opts.join('')}</select>`;
 } else if (type === 'checkbox') {
  return `<div class="field"><label class="checkbox"><input${attrs({ type: 'checkbox', id, name, required, value: 'on', checked: !!value, 'aria-describedby': describedBy })}><span>${escapeHtml(label)}${required ? '' : ''}</span></label>${help ? `<p class="field-help" id="${helpId}">${escapeHtml(help)}</p>` : ''}<p class="field-error" id="${errId}" aria-live="polite">${escapeHtml(error)}</p></div>`;
 } else {
  const inputType = type === 'phone' ? 'tel' : (type === 'email' ? 'email' : 'text');
  control = `<input${attrs({ ...common, type: inputType, value, class: 'input', placeholder, inputmode: type === 'phone' ? 'tel' : undefined })}>`;
 }
 return `<div class="field"><label class="field-label" for="${id}">${escapeHtml(label)}${required ? ' <span aria-hidden="true">*</span>' : ''}</label>${control}${help ? `<p class="field-help" id="${helpId}">${escapeHtml(help)}</p>` : ''}<p class="field-error" id="${errId}" aria-live="polite">${escapeHtml(error)}</p></div>`;
}

export function notice(text, kind = '') {
 if (!text) return '';
 return `<div class="notice${kind ? ` notice-${kind}` : ''}" role="status"><p>${escapeHtml(text)}</p></div>`;
}

export function img({ src, alt = '', width, height, cls = 'media-img', lazy = true }) {
 if (!src) return '';
 return `<img${attrs({ src, alt, width, height, class: cls, loading: lazy ? 'lazy' : undefined, decoding: 'async' })}>`;
}

// يحوّل كائن JSON إلى نص آمن للإدراج داخل وسم script بتهريب الأقواس والعلامات
export function jsonForScript(obj) {
 return JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
