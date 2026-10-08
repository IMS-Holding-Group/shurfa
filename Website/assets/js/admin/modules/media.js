// مكتبة الوسائط: رفع متعدد، بحث وتصفية، تعديل النص البديل، نسخ الرابط، حذف محمي
import { api } from '../api.js';
import { el, button, field, chip, confirmBar, pagination, searchBox, pageHeader, section, notify, fmtBytes, fmtDate, copyText, setDirty } from '../ui.js';
import { can, navigate } from '../app.js';
import { uploadFile, UPLOAD_HINT } from '../editors/media-picker.js';

export async function render(root, r) {
 const full = can('media', 'full');
 const page = Number(r.query.get('page') || 1);
 const q = r.query.get('q') || '';
 const kind = r.query.get('kind') || '';
 const data = await api.get(`/api/admin/media?page=${page}&q=${encodeURIComponent(q)}&kind=${kind}`);
 const go = (p = 1, extra = {}) => navigate(`#/media?page=${p}&q=${encodeURIComponent(extra.q ?? q)}&kind=${extra.kind ?? kind}`);

 // الرفع المتعدد بالسحب أو الاختيار، مع نص بديل لكل صورة
 const uploadSlot = el('div');
 const openUpload = () => {
  const input = el('input', { type: 'file', multiple: true, accept: 'image/jpeg,image/png,image/webp,application/pdf', class: 'input' });
  const list = el('div', { class: 'list-rows' });
  const drop = el('div', { class: 'drop-zone', on: {
   dragover: (e) => { e.preventDefault(); drop.classList.add('is-over'); },
   dragleave: () => drop.classList.remove('is-over'),
   drop: (e) => { e.preventDefault(); drop.classList.remove('is-over'); queue(Array.from(e.dataTransfer.files || [])); }
  } }, el('p', { text: 'اسحب الملفات هنا أو اخترها من جهازك.' }), input);
  const pending = [];
  const queue = (files) => {
   files.forEach((file) => {
    const alt = file.type === 'application/pdf' ? null : field({ label: `النص البديل لـ ${file.name}`, help: 'إلزامي. يصف الصورة بجملة قصيرة.', maxLength: 300, required: true });
    const row = el('div', { class: 'list-row' }, el('div', { class: 'list-row-head' }, el('strong', { text: file.name }), el('span', { class: 'support muted', text: fmtBytes(file.size) })), alt ? alt.wrap : null);
    pending.push({ file, alt, row });
    list.append(row);
   });
  };
  input.addEventListener('change', () => queue(Array.from(input.files || [])));
  const start = button('رفع الكل', { style: 'primary', onClick: async () => {
   if (!pending.length) { notify('أضف ملفًا واحدًا على الأقل.', 'error'); return; }
   start.disabled = true;
   let ok = 0;
   for (const p of pending) {
    try { await uploadFile(p.file, { altText: p.alt ? p.alt.get() : '' }); p.row.append(chip('رُفع', 'success')); ok += 1; } catch (e) { if (p.alt) p.alt.setError(e.message); else p.row.append(chip(e.message, 'error')); }
   }
   start.disabled = false;
   notify(`رُفع ${ok} من ${pending.length}.`, ok === pending.length ? 'success' : 'error');
   if (ok) go(1);
  } });
  uploadSlot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: 'رفع ملفات' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => uploadSlot.replaceChildren() })),
   el('p', { class: 'support muted', text: `${UPLOAD_HINT} الصور حتى 5 ميغابايت وملفات PDF حتى 10 ميغابايت.` }),
   drop, list, start));
 };

 const filters = el('div', { class: 'inline-list' },
  searchBox(q, (v) => go(1, { q: v }), 'بحث بالاسم أو النص البديل'),
  ...[['', 'الكل'], ['image', 'صور'], ['pdf', 'PDF']].map(([k, label]) => button(label, { small: true, style: kind === k ? 'primary' : 'quiet', onClick: () => go(1, { kind: k }) })));

 const tile = (a) => {
  const details = el('div');
  const actions = el('div', { class: 'inline-list' },
   button('نسخ الرابط', { style: 'quiet', small: true, iconName: 'copy', onClick: () => copyText(a.url) }),
   full ? button('تعديل', { style: 'quiet', small: true, onClick: () => {
    const title = field({ label: 'العنوان', maxLength: 160, value: a.title || '', onInput: () => setDirty(true) });
    const alt = field({ label: 'النص البديل', maxLength: 300, value: a.alt_text || '', required: a.kind === 'image', onInput: () => setDirty(true) });
    details.replaceChildren(el('div', { class: 'inline-panel' }, title.wrap, alt.wrap, el('div', { class: 'inline-list' }, button('حفظ', { style: 'primary', small: true, onClick: async () => { try { await api.put(`/api/admin/media/${a.id}`, { title: title.get(), alt_text: alt.get() }); setDirty(false); notify('حُفظ.'); go(page); } catch (e) { alt.setError(e.fields?.alt_text || ''); notify(e.message, 'error'); } } }), button('إلغاء', { style: 'quiet', small: true, onClick: () => { setDirty(false); details.replaceChildren(); } }))));
   } }) : null,
   full ? button('حذف', { style: 'quiet', small: true, onClick: () => {
    details.replaceChildren(confirmBar('تأكيد حذف الملف نهائيًا من المكتبة والتخزين؟', { onConfirm: async () => {
     try { await api.del(`/api/admin/media/${a.id}`); notify('حُذف الملف.'); go(page); } catch (e) {
      if (e.status === 409) {
       const u = await api.get(`/api/admin/media/${a.id}/usages`);
       details.replaceChildren(el('div', { class: 'notice notice-error' }, el('p', { text: 'لا يمكن حذف ملف مستخدم. أماكن الاستخدام:' }), el('ul', {}, ...u.usages.map((x) => el('li', { text: `${({ page: 'صفحة', service: 'خدمة', guide: 'مقال', setting: 'إعداد' })[x.type] || x.type}: ${x.title}` })))));
      } else throw e;
     }
    } }));
   } }) : null);
  return el('div', { class: 'media-item' },
   a.kind === 'image' ? el('img', { class: 'media-img', src: a.url, alt: a.alt_text, loading: 'lazy' }) : el('span', { class: 'media-pdf', text: 'PDF' }),
   el('p', { class: 'media-name', text: a.title || a.alt_text }),
   el('p', { class: 'support muted', text: `${fmtBytes(a.size_bytes)}${a.width ? ` · ${a.width}×${a.height}` : ''} · ${fmtDate(a.created_at, false)}` }),
   a.kind === 'image' ? el('p', { class: 'support', text: `النص البديل: ${a.alt_text}` }) : null,
   actions, details);
 };

 root.replaceChildren(
  pageHeader('مكتبة الوسائط', full ? button('رفع ملفات', { style: 'primary', onClick: openUpload }) : null),
  el('p', { class: 'support muted', text: UPLOAD_HINT }),
  uploadSlot, filters,
  data.items.length ? el('div', { class: 'media-grid' }, ...data.items.map(tile)) : el('p', { class: 'muted empty', text: 'لا ملفات بعد.' }),
  pagination({ page: data.page, pages: data.pages, onChange: (p) => go(p) }));
}
