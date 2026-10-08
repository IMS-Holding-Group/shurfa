// الأسئلة الشائعة: إدارة الأسئلة ومجموعاتها وترتيبها بأزرار أعلى وأسفل
import { api } from '../api.js';
import { el, button, field, chip, confirmBar, table, pageHeader, section, notify, applyErrors, setDirty } from '../ui.js';
import { can } from '../app.js';
import { markdownEditor } from '../editors/markdown.js';

export async function render(root) {
 const full = can('content', 'full');
 const data = await api.get('/api/admin/faqs');
 let items = data.items;
 const editorSlot = el('div');
 const listBox = el('div');

 const openEditor = (faq) => {
  const f = {
   question: field({ label: 'السؤال', help: 'جملة قصيرة بصيغة سؤال.', required: true, maxLength: 200, value: faq?.question || '', onInput: () => setDirty(true) }),
   answer: markdownEditor({ label: 'الإجابة', value: faq?.answer || '', maxLength: 3000, required: true, onInput: () => setDirty(true) }),
   group_name: field({ label: 'المجموعة', help: 'اسم المجموعة التي يظهر فيها السؤال، مثل «عام» أو «الجواز التراثي».', maxLength: 60, value: faq?.group_name || 'عام', onInput: () => setDirty(true) }),
   is_published: field({ label: 'منشور', type: 'checkbox', value: faq ? faq.is_published : true, onChange: () => setDirty(true) })
  };
  const save = async () => {
   const body = { question: f.question.get(), answer: f.answer.get(), group_name: f.group_name.get(), is_published: f.is_published.get(), sort: faq?.sort ?? items.length };
   try {
    if (faq) await api.put(`/api/admin/faqs/${faq.id}`, body); else await api.post('/api/admin/faqs', body);
    setDirty(false); notify('حُفظ السؤال.'); editorSlot.replaceChildren(); await reload();
   } catch (e) { applyErrors(f, e.fields); notify(e.message, 'error'); }
  };
  editorSlot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: faq ? 'تعديل السؤال' : 'سؤال جديد' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => { setDirty(false); editorSlot.replaceChildren(); } })),
   f.question.wrap, f.answer.wrap, el('div', { class: 'form-grid' }, f.group_name.wrap, f.is_published.wrap),
   el('div', { class: 'inline-list' }, button('حفظ', { style: 'primary', onClick: save }))));
  editorSlot.scrollIntoView({ block: 'start' });
 };

 const move = async (i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  try { await api.post('/api/admin/faqs/reorder', { ids: items.map((x) => x.id) }); await reload(); } catch (e) { notify(e.message, 'error'); }
 };

 const draw = () => {
  listBox.replaceChildren(table([
   { label: 'السؤال', render: (r) => el('span', {}, r.question, ' ', r.is_published ? null : chip('مخفي', 'sand')) },
   { label: 'المجموعة', key: 'group_name' },
   { label: '', render: (r, i) => el('span', { class: 'inline-list' },
    full ? button('', { style: 'quiet', small: true, iconName: 'up', title: 'أعلى', disabled: i === 0, onClick: () => move(i, -1) }) : null,
    full ? button('', { style: 'quiet', small: true, iconName: 'down', title: 'أسفل', disabled: i === items.length - 1, onClick: () => move(i, 1) }) : null,
    full ? button('تعديل', { small: true, onClick: () => openEditor(r) }) : null,
    full ? button('حذف', { style: 'quiet', small: true, onClick: (e) => { e.currentTarget.closest('tr').querySelector('td:last-child').append(confirmBar('تأكيد حذف السؤال؟', { onConfirm: async () => { await api.del(`/api/admin/faqs/${r.id}`); notify('حُذف السؤال.'); await reload(); } })); } }) : null) }
  ], items, { empty: 'لا أسئلة بعد.' }));
 };
 const reload = async () => { items = (await api.get('/api/admin/faqs')).items; draw(); };
 draw();
 root.replaceChildren(
  pageHeader('الأسئلة الشائعة', full ? button('سؤال جديد', { style: 'primary', onClick: () => openEditor(null) }) : null),
  el('p', { class: 'support muted', text: `المجموعات الحالية: ${(data.groups || []).join('، ') || 'لا توجد'}` }),
  editorSlot,
  section('', listBox));
}
