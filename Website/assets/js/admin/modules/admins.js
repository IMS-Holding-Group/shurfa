// حسابات الإدارة (للمسؤول الأول): إنشاء وتعديل وإيقاف الحسابات وأدوارها
import { api } from '../api.js';
import { el, button, field, chip, table, pageHeader, section, notify, applyErrors, fmtDate, setDirty } from '../ui.js';
import { state } from '../app.js';

const PASSWORD_HELP = '10 أحرف فأكثر، فيها حرف كبير وصغير ورقم ورمز. سيُطلب من صاحب الحساب تغييرها عند أول دخول.';

export async function render(root) {
 const slot = el('div');
 const box = el('div');
 let data = await api.get('/api/admin/admins');

 const openEditor = (p) => {
  const f = {
   full_name: field({ label: 'الاسم الكامل', value: p?.full_name || '', maxLength: 80, required: true, onInput: () => setDirty(true) }),
   email: field({ label: 'البريد الإلكتروني', value: p?.email || '', maxLength: 120, required: true, type: 'email', onInput: () => setDirty(true) }),
   role: field({ label: 'الدور', help: 'يحدد الوحدات المتاحة. راجع مصفوفة الصلاحيات في README.', type: 'select', options: data.roles, onChange: () => setDirty(true) }),
   is_active: field({ label: 'مفعّل', help: 'الحساب الموقوف لا يستطيع الدخول.', type: 'checkbox', value: p ? p.is_active : true, onChange: () => setDirty(true) })
  };
  f.role.set(p?.role || 'customer_service');
  const pw = field({ label: p ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور الأولى', help: PASSWORD_HELP, type: 'password', required: !p, onInput: () => setDirty(true) });
  pw.input.autocomplete = 'new-password';
  slot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: p ? `تعديل: ${p.full_name}` : 'حساب جديد' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => { setDirty(false); slot.replaceChildren(); } })),
   el('div', { class: 'form-grid' }, f.full_name.wrap, f.email.wrap, f.role.wrap, f.is_active.wrap, pw.wrap),
   button('حفظ', { style: 'primary', onClick: async () => {
    const body = { full_name: f.full_name.get(), email: f.email.get(), role: f.role.get(), is_active: f.is_active.get() };
    if (p) { if (pw.get()) body.new_password = pw.get(); } else body.password = pw.get();
    try {
     if (p) await api.put(`/api/admin/admins/${p.id}`, body); else await api.post('/api/admin/admins', body);
     setDirty(false); notify('حُفظ الحساب.'); slot.replaceChildren(); await reload();
    } catch (e) { applyErrors({ ...f, password: pw, new_password: pw }, e.fields); notify(e.message, 'error'); }
   } })));
 };

 const draw = () => box.replaceChildren(table([
  { label: 'الاسم', render: (p) => el('span', {}, p.full_name, p.id === state.me.id ? ' ' : '', p.id === state.me.id ? chip('أنت', 'teal') : null) },
  { label: 'البريد', key: 'email' },
  { label: 'الدور', render: (p) => chip(p.role_label, p.role === 'super_admin' ? 'brick' : 'sand') },
  { label: 'الحالة', render: (p) => el('span', { class: 'inline-list' }, p.is_active ? chip('مفعّل', 'success') : chip('موقوف', 'error'), p.must_change_password ? chip('بانتظار تغيير كلمة المرور', 'gold') : null) },
  { label: 'آخر دخول', render: (p) => fmtDate(p.last_login_at) || 'لم يدخل بعد' },
  { label: '', render: (p) => button('تعديل', { small: true, onClick: () => openEditor(p) }) }
 ], data.items, { empty: 'لا حسابات.' }));
 const reload = async () => { data = await api.get('/api/admin/admins'); draw(); };
 draw();
 root.replaceChildren(pageHeader('حسابات الإدارة', button('حساب جديد', { style: 'primary', onClick: () => openEditor(null) })), slot, section('', box));
}
