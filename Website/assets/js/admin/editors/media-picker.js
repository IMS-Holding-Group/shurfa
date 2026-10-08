// منتقي الوسائط داخل الصفحة: اختيار صورة أو ملف من المكتبة أو رفعه مباشرة
import { api } from '../api.js';
import { el, button, field, searchBox, pagination, notify, fmtBytes } from '../ui.js';

const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_PDF = 10 * 1024 * 1024;
export const UPLOAD_HINT = 'نوصي بصور بعرض 1600 بكسل كحد أقصى ووزن أقل من 500 كيلوبايت لسرعة الموقع.';

function readAsBase64(file) {
 return new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1] || '');
  r.onerror = () => reject(new Error('تعذر قراءة الملف.'));
  r.readAsDataURL(file);
 });
}

// يرفع ملفًا واحدًا ويعيد سجل الوسائط
export async function uploadFile(file, { altText = '', title = '' } = {}) {
 const isPdf = file.type === 'application/pdf';
 const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
 if (!isPdf && !isImage) throw new Error('الأنواع المسموحة: JPG وPNG وWebP وPDF.');
 if (isImage && file.size > MAX_IMAGE) throw new Error('حجم الصورة يتجاوز 5 ميغابايت.');
 if (isPdf && file.size > MAX_PDF) throw new Error('حجم الملف يتجاوز 10 ميغابايت.');
 if (isImage && !altText.trim()) throw new Error('النص البديل إلزامي لكل صورة.');
 const dataBase64 = await readAsBase64(file);
 return api.post('/api/admin/media', { filename: file.name, contentType: file.type, dataBase64, altText: altText.trim(), title: title.trim() || file.name.replace(/\.[^.]+$/, '') });
}

// يرسم لوحة اختيار داخل حاوية ويستدعي onPick(asset) عند الاختيار
export function mediaPicker({ kind = 'image', onPick, onClose }) {
 const panel = el('div', { class: 'inline-panel media-picker', role: 'region', 'aria-label': 'اختيار من المكتبة' });
 const grid = el('div', { class: 'media-grid' });
 const pager = el('div');
 let page = 1; let q = '';

 const load = async () => {
  grid.replaceChildren(el('p', { class: 'muted', text: 'يُحمَّل...' }));
  try {
   const r = await api.get(`/api/admin/media?kind=${kind}&page=${page}&q=${encodeURIComponent(q)}`);
   grid.replaceChildren(...r.items.map((a) => {
    const pick = button('', { style: 'quiet', title: `اختيار: ${a.title || a.alt_text}`, onClick: () => { onPick(a); panel.remove(); } });
    pick.className = 'media-tile';
    pick.replaceChildren(a.kind === 'image' ? el('img', { class: 'media-img', src: a.url, alt: a.alt_text, loading: 'lazy' }) : el('span', { class: 'media-pdf', text: 'PDF' }), el('span', { class: 'media-name', text: a.title || a.alt_text }), el('span', { class: 'support muted', text: `${fmtBytes(a.size_bytes)}${a.width ? ` · ${a.width}×${a.height}` : ''}` }));
    return pick;
   }));
   if (!r.items.length) grid.replaceChildren(el('p', { class: 'muted', text: 'لا توجد ملفات مطابقة.' }));
   pager.replaceChildren(pagination({ page: r.page, pages: r.pages, onChange: (p) => { page = p; load(); } }));
  } catch (e) { grid.replaceChildren(el('p', { class: 'muted', text: e.message })); }
 };

 const fileInput = el('input', { type: 'file', accept: kind === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png,image/webp', class: 'input' });
 const alt = field({ label: 'النص البديل', help: 'يصف الصورة بجملة قصيرة لقارئات الشاشة ومحركات البحث. إلزامي للصور.', maxLength: 300 });
 const uploadBtn = button('رفع واختيار', { style: 'primary', small: true, onClick: async () => {
  const f = fileInput.files[0];
  if (!f) { notify('اختر ملفًا أولًا.', 'error'); return; }
  uploadBtn.disabled = true;
  try { const a = await uploadFile(f, { altText: alt.get() }); notify('رُفع الملف.'); onPick(a); panel.remove(); } catch (e) { alt.setError(e.fields?.altText || ''); notify(e.message, 'error'); } finally { uploadBtn.disabled = false; }
 } });
 const uploadBox = el('div', { class: 'upload-box' }, el('p', { class: 'field-label', text: 'أو ارفع ملفًا جديدًا' }), fileInput, kind === 'pdf' ? null : alt.wrap, el('p', { class: 'support muted', text: UPLOAD_HINT }), uploadBtn);

 panel.append(
  el('div', { class: 'inline-panel-head' }, el('h3', { text: kind === 'pdf' ? 'اختر ملف PDF' : 'اختر صورة' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => { panel.remove(); if (onClose) onClose(); } })),
  searchBox('', (v) => { q = v; page = 1; load(); }, 'بحث بالاسم أو النص البديل'),
  grid, pager, uploadBox);
 load();
 return panel;
}
