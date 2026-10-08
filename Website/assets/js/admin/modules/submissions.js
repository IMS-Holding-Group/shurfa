// صندوق الردود: الرسائل وطلبات الشركاء، تصفية وبحث وتفصيل وتغيير حالة وتصدير CSV
import { api } from '../api.js';
import { el, button, link, field, chip, confirmBar, table, pagination, searchBox, pageHeader, section, notify, fmtDate, setDirty } from '../ui.js';
import { can, navigate, bumpCounts } from '../app.js';

const TITLES = { messages: 'الردود', applications: 'طلبات الشركاء' };
const STATUS = { new: ['جديد', 'brick'], in_review: ['قيد المراجعة', 'gold'], accepted: ['مقبول', 'success'], rejected: ['مرفوض', 'error'], closed: ['مغلق', 'sand'] };
const FLOW = { messages: ['new', 'in_review', 'closed'], applications: ['new', 'in_review', 'accepted', 'rejected'] };

const sChip = (s) => { const [t, k] = STATUS[s] || [s, 'sand']; return chip(t, k); };

export async function render(root, r) {
 const group = r.module;
 if (r.parts[0]) return renderDetail(root, group, r.parts[0]);
 const page = Number(r.query.get('page') || 1);
 const q = r.query.get('q') || '';
 const form = r.query.get('form') || '';
 const status = r.query.get('status') || '';
 const go = (p = 1, extra = {}) => navigate(`#/${group}?page=${p}&q=${encodeURIComponent(extra.q ?? q)}&form=${extra.form ?? form}&status=${extra.status ?? status}`);
 const data = await api.get(`/api/admin/submissions?group=${group}&page=${page}&q=${encodeURIComponent(q)}&form=${form}&status=${status}`);
 const canExport = can(group, 'full');

 const formSel = field({ label: 'النموذج', type: 'select', options: [{ value: '', label: 'كل النماذج' }, ...data.forms.map((f) => ({ value: f.slug, label: f.title }))], onChange: () => go(1, { form: formSel.get() }) });
 formSel.set(form);
 const statusSel = field({ label: 'الحالة', type: 'select', options: [{ value: '', label: 'كل الحالات' }, ...FLOW[group].map((s) => ({ value: s, label: STATUS[s][0] }))], onChange: () => go(1, { status: statusSel.get() }) });
 statusSel.set(status);

 const summary = (s) => {
  const d = s.data || {};
  const first = d.name || d.contact_name || d.business_name || d.email || Object.values(d).find((v) => typeof v === 'string' && v) || '';
  return String(first).slice(0, 60);
 };
 root.replaceChildren(
  pageHeader(TITLES[group], canExport && form ? link('تصدير CSV لهذا النموذج', `/api/admin/export?type=submissions&form=${encodeURIComponent(form)}`, { download: true }) : null),
  el('div', { class: 'filters form-grid' }, formSel.wrap, statusSel.wrap, el('div', { class: 'field' }, el('p', { class: 'field-label', text: 'بحث' }), searchBox(q, (v) => go(1, { q: v }), 'بحث في محتوى الردود'))),
  canExport && !form ? el('p', { class: 'support muted', text: 'اختر نموذجًا واحدًا لتفعيل تصدير CSV بأعمدته.' }) : null,
  table([
   { label: 'النموذج', key: 'form_title' },
   { label: 'الملخص', render: (s) => el('a', { href: `#/${group}/${s.id}`, text: summary(s) || 'بدون عنوان' }) },
   { label: 'الحالة', render: (s) => sChip(s.status) },
   { label: 'الاستلام', render: (s) => fmtDate(s.created_at) },
   { label: '', render: (s) => el('span', { class: 'inline-list' }, s.is_demo ? chip('تجريبي', 'sand') : null, s.has_webhook_failure ? chip('فشل الإرسال', 'error') : null) }
  ], data.items, { empty: 'لا ردود مطابقة.', rowClass: (s) => (s.status === 'new' ? 'is-new' : undefined) }),
  pagination({ page: data.page, pages: data.pages, onChange: (p) => go(p) }));
}

async function renderDetail(root, group, id) {
 const { submission: s, form } = await api.get(`/api/admin/submissions/${id}`);
 const canApprove = can(group, 'approve');
 const canDelete = can(group, 'full');
 const labels = Object.fromEntries((form.fields || []).map((f) => [f.name, f.label]));
 const rows = Object.entries(s.data || {}).map(([k, v]) => ({ label: labels[k] || k, value: typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : String(v ?? '') }));
 const statusSel = field({ label: 'الحالة', help: 'تغيير الحالة يُسجَّل في سجل التدقيق.', type: 'select', options: FLOW[group].map((x) => ({ value: x, label: STATUS[x][0] })), onChange: () => setDirty(true) });
 statusSel.set(FLOW[group].includes(s.status) ? s.status : FLOW[group][0]);
 const note = field({ label: 'ملاحظة داخلية', help: 'لا تظهر للزائر. حتى 2000 حرف.', type: 'textarea', rows: 4, maxLength: 2000, value: s.internal_note || '', onInput: () => setDirty(true) });
 const header = el('div');
 const actions = [];
 if (canApprove) actions.push(button('حفظ', { style: 'primary', onClick: async () => { try { await api.put(`/api/admin/submissions/${id}`, { status: statusSel.get(), internal_note: note.get() }); setDirty(false); notify('حُفظ الرد.'); await bumpCounts(); } catch (e) { notify(e.message, 'error'); } } }));
 if (canDelete) actions.push(button('حذف', { style: 'quiet', onClick: () => header.append(confirmBar('تأكيد حذف هذا الرد نهائيًا؟', { onConfirm: async () => { await api.del(`/api/admin/submissions/${id}`); setDirty(false); notify('حُذف الرد.'); await bumpCounts(); navigate(`#/${group}`); } })) }));
 actions.push(link('رجوع', `#/${group}`, { style: 'quiet' }));
 header.replaceChildren(pageHeader(`${form.title}: رد`, ...actions), el('div', { class: 'inline-list status-line' }, sChip(s.status), el('span', { class: 'support muted', text: `استُلم ${fmtDate(s.created_at)}` }), s.handler ? el('span', { class: 'support muted', text: `آخر معالجة: ${s.handler}` }) : null, s.is_demo ? chip('بيانات تجريبية', 'sand') : null));
 const sec = section('المعالجة', el('div', { class: 'form-grid' }, statusSel.wrap), note.wrap);
 if (!canApprove) sec.querySelectorAll('select, textarea').forEach((n) => { n.disabled = true; });
 root.replaceChildren(header,
  section('محتوى الرد', table([{ label: 'الحقل', key: 'label' }, { label: 'القيمة', render: (x) => el('span', { class: 'prewrap', text: x.value }) }], rows, { empty: 'لا بيانات.' })),
  sec);
}
