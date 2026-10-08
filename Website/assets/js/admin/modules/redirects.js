// التحويلات: جدول من/إلى/النوع/مفعّل، إضافة وتعديل، استيراد وتصدير CSV
import { api } from '../api.js';
import { el, button, link, field, chip, confirmBar, table, pageHeader, section, notify, applyErrors, fmtDate, setDirty } from '../ui.js';
import { can } from '../app.js';

const CODES = [{ value: '301', label: '301 دائم' }, { value: '302', label: '302 مؤقت' }];

export async function render(root) {
 const full = can('content', 'full');
 const slot = el('div');
 const listBox = el('div');
 let items = (await api.get('/api/admin/redirects')).items;

 const openEditor = (row) => {
  const f = {
   from_path: field({ label: 'من المسار', help: 'يبدأ بـ / ولا يكون مسارًا محجوزًا، مثل /old-page', value: row?.from_path || '', required: true, maxLength: 300, onInput: () => setDirty(true) }),
   to_url: field({ label: 'إلى', help: 'مسار نسبي يبدأ بـ / أو رابط https://', value: row?.to_url || '', required: true, maxLength: 2048, onInput: () => setDirty(true) }),
   code: field({ label: 'النوع', type: 'select', options: CODES, onChange: () => setDirty(true) }),
   is_active: field({ label: 'مفعّل', type: 'checkbox', value: row ? row.is_active : true, onChange: () => setDirty(true) })
  };
  f.code.set(String(row?.code || 301));
  slot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: row ? 'تعديل التحويل' : 'تحويل جديد' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => { setDirty(false); slot.replaceChildren(); } })),
   el('div', { class: 'form-grid' }, f.from_path.wrap, f.to_url.wrap, f.code.wrap, f.is_active.wrap),
   button('حفظ', { style: 'primary', onClick: async () => {
    const body = { from_path: f.from_path.get(), to_url: f.to_url.get(), code: Number(f.code.get()), is_active: f.is_active.get() };
    try { if (row) await api.put(`/api/admin/redirects/${row.id}`, body); else await api.post('/api/admin/redirects', body); setDirty(false); notify('حُفظ التحويل.'); slot.replaceChildren(); await reload(); } catch (e) { applyErrors(f, e.fields); notify(e.message, 'error'); }
   } })));
 };

 const openImport = () => {
  const ta = field({ label: 'CSV', help: 'سطر لكل تحويل: from_path,to_url,code,is_active (السطر الأول عناوين).', type: 'textarea', rows: 8 });
  slot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: 'استيراد CSV' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => slot.replaceChildren() })),
   ta.wrap,
   button('استيراد', { style: 'primary', onClick: async () => {
    try { const r = await api.post('/api/admin/redirects/import', { csv: ta.get() }); notify(`أُنشئ ${r.created} تحويلًا.${r.errors?.length ? ` أخطاء: ${r.errors.join(' ')}` : ''}`, r.errors?.length ? 'error' : 'success'); slot.replaceChildren(); await reload(); } catch (e) { notify(e.message, 'error'); }
   } })));
 };

 const draw = () => listBox.replaceChildren(table([
  { label: 'من', render: (r) => el('code', { text: r.from_path }) },
  { label: 'إلى', render: (r) => el('code', { text: r.to_url }) },
  { label: 'النوع', render: (r) => chip(String(r.code), r.code === 301 ? 'teal' : 'gold') },
  { label: 'مفعّل', render: (r) => (r.is_active ? chip('نعم', 'success') : chip('لا', 'sand')) },
  { label: 'أُنشئ', render: (r) => fmtDate(r.created_at) },
  { label: '', render: (r) => el('span', { class: 'inline-list' }, full ? button('تعديل', { small: true, onClick: () => openEditor(r) }) : null, full ? button('حذف', { style: 'quiet', small: true, onClick: (e) => { e.currentTarget.closest('td').append(confirmBar('تأكيد حذف التحويل؟', { onConfirm: async () => { await api.del(`/api/admin/redirects/${r.id}`); notify('حُذف.'); await reload(); } })); } }) : null) }
 ], items, { empty: 'لا تحويلات بعد.' }));
 const reload = async () => { items = (await api.get('/api/admin/redirects')).items; draw(); };
 draw();
 root.replaceChildren(
  pageHeader('التحويلات', full ? button('تحويل جديد', { style: 'primary', onClick: () => openEditor(null) }) : null, full ? button('استيراد CSV', { onClick: openImport }) : null, link('تصدير CSV', '/api/admin/redirects/export', { download: true })),
  slot, section('', listBox));
}
