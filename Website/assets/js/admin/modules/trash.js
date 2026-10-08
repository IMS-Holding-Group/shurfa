// سلة المحذوفات: استعادة المحتوى المحذوف، والحذف النهائي للمسؤول الأول فقط
import { api } from '../api.js';
import { el, button, chip, confirmBar, table, pageHeader, section, notify, fmtDate } from '../ui.js';
import { can, isSuper } from '../app.js';

const TYPE_LABEL = { page: 'صفحة', service: 'خدمة', guide: 'مقال' };

export async function render(root) {
 const full = can('content', 'full');
 const box = el('div');
 const draw = async () => {
  const items = (await api.get('/api/admin/trash')).items;
  box.replaceChildren(table([
   { label: 'العنوان', key: 'title' },
   { label: 'النوع', render: (r) => chip(TYPE_LABEL[r.entity_type] || r.entity_type, 'sand') },
   { label: 'الرابط', render: (r) => el('code', { text: r.slug }) },
   { label: 'حُذف في', render: (r) => fmtDate(r.deleted_at) },
   { label: '', render: (r) => el('span', { class: 'inline-list' },
    full ? button('استعادة', { small: true, onClick: async () => { try { await api.post(`/api/admin/trash/${r.entity_type}/${r.id}/restore`); notify('استُعيد العنصر كمسودة.'); await draw(); } catch (e) { notify(e.message, 'error'); } } }) : null,
    isSuper() ? button('حذف نهائي', { style: 'quiet', small: true, onClick: (e) => { e.currentTarget.closest('td').append(confirmBar('الحذف النهائي لا يمكن التراجع عنه. تأكيد؟', { confirmLabel: 'حذف نهائيًا', onConfirm: async () => { await api.del(`/api/admin/trash/${r.entity_type}/${r.id}`); notify('حُذف نهائيًا.'); await draw(); } })); } }) : null) }
  ], items, { empty: 'سلة المحذوفات فارغة.' }));
 };
 await draw();
 root.replaceChildren(pageHeader('سلة المحذوفات'), el('p', { class: 'support muted', text: 'المحتوى المحذوف يبقى هنا حتى تستعيده أو يحذفه المسؤول الأول نهائيًا.' }), section('', box));
}
