// كتل الوسائط: صورة ونص، معرض صور، فيديو، ملفات للتنزيل
import { escapeHtml, button, img, attrs } from '../../render/components.js';
import { renderMarkdown } from '../../render/markdown.js';
import { icon } from '../../render/icons.js';
import { blockTitle } from './basic.js';

const styleOptions = [{ value: 'primary', label_ar: 'أساسي (طوبي)' }, { value: 'secondary', label_ar: 'ثانوي (إطار تركوازي)' }];

export const image_text = {
 type: 'image_text',
 label_ar: 'صورة ونص',
 description_ar: 'صورة في جهة ونص في الجهة الأخرى، مع زر اختياري.',
 icon: 'stays',
 fields: [
  { key: 'image', type: 'image', label_ar: 'الصورة', help_ar: 'من مكتبة الوسائط.', required: true },
  { key: 'image_alt', type: 'text', label_ar: 'النص البديل', help_ar: 'يصف الصورة.', required: true, max_length: 200 },
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: 'جمل قصيرة، الفعل أولًا، بدون مبالغة', max_length: 100 },
  { key: 'body', type: 'markdown', label_ar: 'النص', help_ar: '', max_length: 5000 },
  { key: 'side', type: 'select', label_ar: 'جهة الصورة', help_ar: '', options: [{ value: 'start', label_ar: 'البداية (يمين)' }, { value: 'end', label_ar: 'النهاية (يسار)' }], default: 'start' },
  { key: 'button_label', type: 'text', label_ar: 'نص الزر (اختياري)', help_ar: '', max_length: 40 },
  { key: 'button_url', type: 'url', label_ar: 'رابط الزر', help_ar: '' },
  { key: 'button_style', type: 'select', label_ar: 'نمط الزر', help_ar: '', options: styleOptions, default: 'secondary' }
 ],
 defaults: { bg: 'white', data: { image: '', image_alt: '', title: '', body: '', side: 'start', button_label: '', button_url: '', button_style: 'secondary' } },
 render(data) {
  const btn = data.button_label && data.button_url ? button({ label: data.button_label, href: data.button_url, style: data.button_style, track: 'cta_click', trackLabel: data.button_label, trackLocation: 'image_text' }) : '';
  return `<div class="image-text side-${data.side}">${img({ src: data.image, alt: data.image_alt, cls: 'media-img' })}<div>${blockTitle(data.title)}<div class="prose">${renderMarkdown(data.body)}</div>${btn}</div></div>`;
 }
};

export const gallery = {
 type: 'gallery',
 label_ar: 'معرض صور',
 description_ar: 'من صورتين إلى 12 صورة في شبكة من 2 أو 3 أو 4 أعمدة.',
 icon: 'crafts',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'columns', type: 'select', label_ar: 'عدد الأعمدة', help_ar: '', options: [{ value: '2', label_ar: '2' }, { value: '3', label_ar: '3' }, { value: '4', label_ar: '4' }], default: '3' },
  { key: 'items', type: 'list', label_ar: 'الصور', help_ar: 'من 2 إلى 12 صورة.', min_items: 2, max_items: 12, fields: [
   { key: 'image', type: 'image', label_ar: 'الصورة', help_ar: '', required: true },
   { key: 'alt', type: 'text', label_ar: 'النص البديل', help_ar: '', required: true, max_length: 200 },
   { key: 'caption', type: 'text', label_ar: 'التعليق', help_ar: '', max_length: 120 }
  ] }
 ],
 defaults: { bg: 'white', data: { title: '', columns: '3', items: [] } },
 render(data) {
  return `${blockTitle(data.title)}<ul class="gallery gallery-${escapeHtml(data.columns)}">${data.items.map((it) => `<li><figure>${img({ src: it.image, alt: it.alt })}${it.caption ? `<figcaption>${escapeHtml(it.caption)}</figcaption>` : ''}</figure></li>`).join('')}</ul>`;
 }
};

// يستخرج معرّف فيديو YouTube من رابط أو معرّف مباشر
export function extractYoutubeId(value) {
 const s = String(value || '').trim();
 if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
 try {
  const u = new URL(s);
  if (!/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return '';
  if (u.hostname.endsWith('youtu.be')) return /^[A-Za-z0-9_-]{11}$/.test(u.pathname.slice(1)) ? u.pathname.slice(1) : '';
  const v = u.searchParams.get('v');
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = /\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
  return m ? m[1] : '';
 } catch { return ''; }
}

export const video = {
 type: 'video',
 label_ar: 'فيديو',
 description_ar: 'فيديو YouTube يُحمَّل بعد النقر فقط، بوضع الخصوصية.',
 icon: 'play',
 fields: [
  { key: 'youtube', type: 'text', label_ar: 'رابط أو معرّف YouTube', help_ar: 'مثل https://www.youtube.com/watch?v=... أو المعرّف من 11 حرفًا.', required: true, max_length: 200 },
  { key: 'title', type: 'text', label_ar: 'عنوان الفيديو', help_ar: 'يظهر فوق الفيديو ويُستخدم وصفًا لقارئات الشاشة.', required: true, max_length: 120 },
  { key: 'cover', type: 'image', label_ar: 'صورة غلاف (اختيارية)', help_ar: 'إن تُركت فارغة يظهر غلاف بلون الأخضر الداكن.' }
 ],
 defaults: { bg: 'cream', data: { youtube: '', title: '', cover: '' } },
 render(data) {
  const id = extractYoutubeId(data.youtube);
  if (!id) return blockTitle(data.title);
  const cover = data.cover ? `<img src="${escapeHtml(data.cover)}" alt="" loading="lazy">` : '';
  return `${blockTitle(data.title)}<div class="video" data-video="${escapeHtml(id)}" data-video-title="${escapeHtml(data.title)}">${cover}<button class="video-play" type="button" data-track="video_play" data-track-label="${escapeHtml(data.title)}" aria-label="تشغيل الفيديو: ${escapeHtml(data.title)}">${icon('play', 48)}<span>سيُحمَّل الفيديو من YouTube</span></button><noscript><p class="support"><a href="https://www.youtube-nocookie.com/embed/${escapeHtml(id)}" rel="noopener noreferrer" target="_blank">شاهد الفيديو على YouTube</a></p></noscript></div>`;
 }
};

export const downloads = {
 type: 'downloads',
 label_ar: 'ملفات للتنزيل',
 description_ar: 'قائمة ملفات PDF من المكتبة مع عنوان ووصف لكل ملف.',
 icon: 'download',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'items', type: 'list', label_ar: 'الملفات', help_ar: 'حتى 10 ملفات.', min_items: 1, max_items: 10, fields: [
   { key: 'file', type: 'file', label_ar: 'ملف PDF', help_ar: 'من مكتبة الوسائط.', required: true },
   { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', required: true, max_length: 100 },
   { key: 'description', type: 'text', label_ar: 'الوصف', help_ar: '', max_length: 200 }
  ] }
 ],
 defaults: { bg: 'cream', data: { title: '', items: [] } },
 render(data) {
  return `${blockTitle(data.title)}<ul class="downloads">${data.items.map((it) => `<li>${icon('file', 48)}<h3>${escapeHtml(it.title)}</h3>${it.description ? `<p class="support">${escapeHtml(it.description)}</p>` : ''}<p><a${attrs({ href: it.file, download: true, rel: 'noopener noreferrer' })}>تنزيل الملف</a></p></li>`).join('')}</ul>`;
 }
};

export const blocks = [image_text, gallery, video, downloads];
