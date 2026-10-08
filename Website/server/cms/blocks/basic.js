// الكتل الأساسية: غلاف، نص، أعمدة، خطوات، أرقام، شريط دعوة، شريط تنبيه، فاصل مسافة
import { escapeHtml, button, img } from '../../render/components.js';
import { renderMarkdown } from '../../render/markdown.js';
import { appCtaButton, getLogos } from '../../render/layout.js';
import { isSafeUrl } from '../urls.js';

const TONE_HELP = 'جمل قصيرة، الفعل أولًا، بدون مبالغة';

export function blockTitle(text, tag = 'h2') {
 return text ? `<${tag} class="block-title">${escapeHtml(text)}</${tag}>` : '';
}

const styleOptions = [{ value: 'primary', label_ar: 'أساسي (طوبي)' }, { value: 'secondary', label_ar: 'ثانوي (إطار تركوازي)' }];

export const hero = {
 type: 'hero',
 label_ar: 'غلاف',
 description_ar: 'عنوان كبير وسطر مقدِّم وزر أو زران، للرئيسية وبدايات الصفحات.',
 icon: 'activities',
 summary: 'title',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: TONE_HELP, required: true, max_length: 80 },
  { key: 'lead', type: 'longtext', label_ar: 'السطر المقدِّم', help_ar: 'جملة واحدة تشرح العنوان.', max_length: 240 },
  { key: 'align', type: 'select', label_ar: 'المحاذاة', help_ar: 'يمين للنصوص الطويلة، وسط للأغلفة الختامية.', options: [{ value: 'start', label_ar: 'يمين' }, { value: 'center', label_ar: 'وسط' }], default: 'start' },
  { key: 'image', type: 'image', label_ar: 'صورة (اختيارية)', help_ar: 'تظهر بجانب النص على الشاشات العريضة.' },
  { key: 'image_alt', type: 'text', label_ar: 'النص البديل للصورة', help_ar: 'يصف الصورة لقارئات الشاشة.', max_length: 200 },
  { key: 'buttons', type: 'list', label_ar: 'الأزرار', help_ar: 'حتى زران. زر واحد أساسي في الشاشة.', min_items: 0, max_items: 2, fields: [
   { key: 'kind', type: 'select', label_ar: 'النوع', help_ar: 'دعوة التطبيق تتبدل تلقائيًا حسب حالة التطبيق.', options: [{ value: 'link', label_ar: 'رابط' }, { value: 'app_cta', label_ar: 'دعوة التطبيق' }], default: 'link' },
   { key: 'label', type: 'text', label_ar: 'النص', help_ar: 'يُترك فارغًا لدعوة التطبيق.', max_length: 40 },
   { key: 'url', type: 'url', label_ar: 'الرابط', help_ar: 'مثل /services أو https://...' },
   { key: 'style', type: 'select', label_ar: 'النمط', help_ar: '', options: styleOptions, default: 'primary' }
  ] }
 ],
 defaults: { bg: 'ink', data: { title: '', lead: '', align: 'start', image: '', image_alt: '', buttons: [] } },
 render(data, ctx) {
  const buttons = (data.buttons || []).map((b) => {
   if (b.kind === 'app_cta') return appCtaButton(ctx.settings, 'hero', b.style);
   if (!b.label || !b.url || !isSafeUrl(b.url)) return '';
   return button({ label: b.label, href: b.url, style: b.style, track: 'cta_click', trackLabel: b.label, trackLocation: 'hero' });
  }).filter(Boolean).join('');
  const picture = data.image ? img({ src: data.image, alt: data.image_alt || '', cls: 'hero-img', lazy: false }) : '';
  const logos = getLogos();
  const watermark = ctx.isHome && ctx.firstHero && logos['logo-monogram-white'] ? `<img class="hero-watermark" src="${escapeHtml(logos['logo-monogram-white'])}" alt="" aria-hidden="true">` : '';
  if (ctx.firstHero) ctx.firstHero = false;
  return `${watermark}<div class="hero-inner${picture ? ' has-image' : ''}${data.align === 'center' ? ' hero-center' : ''}">
<div class="hero-text"><${ctx.isFirstBlock ? 'h1' : 'h2'} class="display">${escapeHtml(data.title)}</${ctx.isFirstBlock ? 'h1' : 'h2'}>${data.lead ? `<p class="lead">${escapeHtml(data.lead)}</p>` : ''}${buttons ? `<div class="hero-actions">${buttons}</div>` : ''}</div>
${picture}</div>`;
 }
};

export const text = {
 type: 'text',
 label_ar: 'نص',
 description_ar: 'عنوان ونص بصيغة Markdown المبسّطة، لأي محتوى حر.',
 icon: 'file',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: TONE_HELP, max_length: 120 },
  { key: 'body', type: 'markdown', label_ar: 'النص', help_ar: 'يدعم العناوين والقوائم والعريض والروابط والصور من المكتبة.', required: true, max_length: 20000 },
  { key: 'width', type: 'select', label_ar: 'العرض', help_ar: 'ضيق للقراءة المريحة، عادي للمحتوى العام.', options: [{ value: 'normal', label_ar: 'عادي' }, { value: 'narrow', label_ar: 'ضيق' }], default: 'normal' }
 ],
 defaults: { bg: 'cream', data: { title: '', body: '', width: 'normal' } },
 render(data, ctx) {
  const tag = ctx.isFirstBlock ? 'h1' : 'h2';
  const extra = ctx.extraHtml || '';
  ctx.extraHtml = '';
  return `<div class="${data.width === 'narrow' ? 'narrow' : ''}">${blockTitle(data.title, tag)}<div class="block-body prose">${renderMarkdown(data.body)}${extra}</div></div>`;
 }
};

export const columns = {
 type: 'columns',
 label_ar: 'أعمدة نصية',
 description_ar: 'من عمودين إلى أربعة، كل عمود عنوان وفقرة قصيرة.',
 icon: 'menu',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: TONE_HELP, max_length: 120 },
  { key: 'items', type: 'list', label_ar: 'الأعمدة', help_ar: 'من 2 إلى 4 أعمدة.', min_items: 2, max_items: 4, fields: [
   { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', required: true, max_length: 80 },
   { key: 'text', type: 'longtext', label_ar: 'النص', help_ar: 'جملة أو جملتان.', required: true, max_length: 400 }
  ] }
 ],
 defaults: { bg: 'cream', data: { title: '', items: [{ title: '', text: '' }, { title: '', text: '' }] } },
 render(data) {
  const n = Math.min(4, Math.max(2, data.items.length));
  return `${blockTitle(data.title)}<div class="grid cols-${n}">${data.items.map((it) => `<div class="column-item"><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.text)}</p></div>`).join('')}</div>`;
 }
};

export const steps = {
 type: 'steps',
 label_ar: 'خطوات مرقّمة',
 description_ar: 'رقم كبير ملوّن وعنوان وسطر لكل خطوة.',
 icon: 'check',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: TONE_HELP, max_length: 120 },
  { key: 'items', type: 'list', label_ar: 'الخطوات', help_ar: 'من 2 إلى 6 خطوات.', min_items: 2, max_items: 6, fields: [
   { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', required: true, max_length: 60 },
   { key: 'text', type: 'longtext', label_ar: 'النص', help_ar: 'سطر واحد.', required: true, max_length: 200 }
  ] }
 ],
 defaults: { bg: 'white', data: { title: '', items: [{ title: '', text: '' }, { title: '', text: '' }] } },
 render(data) {
  return `${blockTitle(data.title)}<ol class="steps">${data.items.map((it, i) => `<li class="step"><span class="step-number" aria-hidden="true">${i + 1}</span><h3>${escapeHtml(it.title)}</h3><p>${escapeHtml(it.text)}</p></li>`).join('')}</ol>`;
 }
};

export const numbers = {
 type: 'numbers',
 label_ar: 'أرقام',
 description_ar: 'أرقام كبيرة وتسميات صغيرة على شريط مسطح.',
 icon: 'clock',
 summary: 'items',
 fields: [
  { key: 'items', type: 'list', label_ar: 'الأرقام', help_ar: 'من 2 إلى 4. اكتب أرقامًا حقيقية فقط.', min_items: 2, max_items: 4, fields: [
   { key: 'value', type: 'text', label_ar: 'الرقم', help_ar: 'مثل 7 أو 11.', required: true, max_length: 12 },
   { key: 'label', type: 'text', label_ar: 'التسمية', help_ar: '', required: true, max_length: 60 }
  ] }
 ],
 defaults: { bg: 'cream', data: { items: [{ value: '', label: '' }, { value: '', label: '' }] } },
 render(data) {
  return `<div class="numbers">${data.items.map((it) => `<div><p class="number-value">${escapeHtml(it.value)}</p><p class="support muted">${escapeHtml(it.label)}</p></div>`).join('')}</div>`;
 }
};

export const cta_band = {
 type: 'cta_band',
 label_ar: 'شريط دعوة',
 description_ar: 'عنوان ونص وزر واحد، لدعوة الزائر إلى صفحة أو إجراء.',
 icon: 'arrow',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: TONE_HELP, required: true, max_length: 100 },
  { key: 'body', type: 'longtext', label_ar: 'النص', help_ar: 'جملة أو جملتان.', max_length: 300 },
  { key: 'button_label', type: 'text', label_ar: 'نص الزر', help_ar: 'فعل قصير.', max_length: 40 },
  { key: 'button_url', type: 'url', label_ar: 'رابط الزر', help_ar: '' },
  { key: 'button_style', type: 'select', label_ar: 'نمط الزر', help_ar: '', options: styleOptions, default: 'secondary' }
 ],
 defaults: { bg: 'purple_soft', data: { title: '', body: '', button_label: '', button_url: '', button_style: 'secondary' } },
 render(data) {
  const btn = data.button_label && data.button_url ? button({ label: data.button_label, href: data.button_url, style: data.button_style, track: 'cta_click', trackLabel: data.button_label, trackLocation: 'cta_band' }) : '';
  return `<div class="cta-band"><div><h2>${escapeHtml(data.title)}</h2>${data.body ? `<p class="lead">${escapeHtml(data.body)}</p>` : ''}</div>${btn ? `<div>${btn}</div>` : ''}</div>`;
 }
};

export const alert_bar = {
 type: 'alert_bar',
 label_ar: 'شريط تنبيه',
 description_ar: 'نص قصير على خلفية ذهبية فاتحة، مع رابط اختياري.',
 icon: 'alert',
 summary: 'text',
 fields: [
  { key: 'text', type: 'text', label_ar: 'النص', help_ar: TONE_HELP, required: true, max_length: 200 },
  { key: 'url', type: 'url', label_ar: 'رابط (اختياري)', help_ar: '' }
 ],
 defaults: { bg: 'gold_soft', data: { text: '', url: '' } },
 render(data) {
  const link = data.url ? ` <a href="${escapeHtml(data.url)}">المزيد</a>` : '';
  return `<div class="notice" role="status"><p>${escapeHtml(data.text)}${link}</p></div>`;
 }
};

export const spacer = {
 type: 'spacer',
 label_ar: 'فاصل مسافة',
 description_ar: 'مسافة فارغة بين الكتل، 48 أو 96 بكسل.',
 icon: 'chevron',
 summary: 'size',
 fields: [
  { key: 'size', type: 'select', label_ar: 'الحجم', help_ar: '', options: [{ value: '48', label_ar: '48' }, { value: '96', label_ar: '96' }], default: '48' }
 ],
 defaults: { bg: 'cream', data: { size: '48' } },
 render() { return ''; }
};

export const blocks = [hero, text, columns, steps, numbers, cta_band, alert_bar, spacer];
