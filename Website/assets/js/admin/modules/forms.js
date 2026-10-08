// النماذج: بناء النموذج وحقوله المرتبة، نماذج النظام تُحرَّر ولا تُحذف
import { api } from '../api.js';
import { el, button, field, chip, confirmBar, table, pageHeader, section, notify, applyErrors, setDirty, slugify } from '../ui.js';
import { can, navigate } from '../app.js';

const TYPE_LABELS = { text: 'نص قصير', email: 'بريد إلكتروني', phone: 'هاتف', textarea: 'نص طويل', select: 'قائمة اختيار', checkbox: 'مربع اختيار', governorate: 'محافظة' };
const GROUPS = [{ value: 'messages', label: 'رسائل' }, { value: 'applications', label: 'طلبات' }];

export async function render(root, r) {
 const data = await api.get('/api/admin/forms');
 if (r.parts[0]) return renderEditor(root, data, r.parts[0]);
 const full = can('forms', 'full');
 root.replaceChildren(
  pageHeader('النماذج', full ? button('نموذج جديد', { style: 'primary', onClick: () => navigate('#/forms/new') }) : null),
  el('p', { class: 'support muted', text: 'النموذج يُضاف إلى أي صفحة عبر كتلة «نموذج». نماذج النظام الثلاثة تُحرَّر حقولها ولا تُحذف.' }),
  table([
   { label: 'العنوان', render: (f) => el('a', { href: `#/forms/${f.id}`, text: f.title }) },
   { label: 'الرابط', render: (f) => el('code', { text: f.slug }) },
   { label: 'المجموعة', render: (f) => chip(f.module_group === 'applications' ? 'طلبات' : 'رسائل', f.module_group === 'applications' ? 'purple' : 'teal') },
   { label: 'الحقول', render: (f) => String((f.fields || []).length) },
   { label: 'الحالة', render: (f) => el('span', { class: 'inline-list' }, f.is_active ? chip('مفعّل', 'success') : chip('متوقف', 'sand'), f.kind === 'system' ? chip('نظام', 'teal') : null) }
  ], data.items, { empty: 'لا نماذج بعد.' }));
}

function renderEditor(root, data, id) {
 const full = can('forms', 'full');
 const isNew = id === 'new';
 const form = isNew ? { title: '', slug: '', module_group: 'messages', submit_label: 'إرسال', success_message: 'وصلتنا رسالتك.', is_active: true, fields: [{ name: 'name', type: 'text', label: 'الاسم', required: true }], kind: 'custom' } : data.items.find((f) => f.id === id);
 if (!form) { root.replaceChildren(el('p', { class: 'notice notice-error', text: 'النموذج غير موجود.' })); return; }
 const isSystem = form.kind === 'system';
 let slugTouched = !isNew;
 const f = {
  title: field({ label: 'العنوان', required: true, maxLength: 120, value: form.title, onInput: () => { setDirty(true); if (!slugTouched) f.slug.set(slugify(f.title.get())); } }),
  slug: field({ label: 'الرابط (slug)', help: 'يُستخدم في مسار الإرسال /api/forms/<slug>. أحرف لاتينية صغيرة وأرقام وشرطات.', required: true, maxLength: 60, value: form.slug, disabled: isSystem, onInput: () => { slugTouched = true; setDirty(true); } }),
  module_group: field({ label: 'المجموعة', help: 'تحدد أين تظهر الردود ومن يملك صلاحيتها: «رسائل» لخدمة العملاء، «طلبات» للشركاء.', type: 'select', options: GROUPS, disabled: isSystem, onChange: () => setDirty(true) }),
  submit_label: field({ label: 'نص زر الإرسال', maxLength: 40, value: form.submit_label, onInput: () => setDirty(true) }),
  success_message: field({ label: 'رسالة النجاح', help: 'تظهر للزائر بعد الإرسال.', type: 'textarea', rows: 2, maxLength: 300, value: form.success_message, onInput: () => setDirty(true) }),
  is_active: field({ label: 'مفعّل (يستقبل ردودًا)', type: 'checkbox', value: form.is_active, onChange: () => setDirty(true) })
 };
 f.module_group.set(form.module_group);

 const items = (form.fields || []).map((x) => ({ ...x }));
 const rows = el('div', { class: 'list-rows' });
 const controls = [];
 const fieldsErr = el('p', { class: 'field-error' });
 const sync = () => controls.forEach((c, i) => { items[i] = c.get(); });
 const draw = () => {
  controls.length = 0;
  rows.replaceChildren(...items.map((it, i) => {
   const c = {
    name: field({ label: 'الاسم التقني (name)', help: 'أحرف لاتينية صغيرة وأرقام وشرطة سفلية، حتى 32. يظهر كعمود في التصدير.', value: it.name || '', maxLength: 32, required: true, onInput: () => setDirty(true) }),
    label: field({ label: 'التسمية للزائر', value: it.label || '', maxLength: 120, required: true, onInput: () => setDirty(true) }),
    type: field({ label: 'النوع', type: 'select', options: data.field_types.map((t) => ({ value: t, label: TYPE_LABELS[t] || t })), onChange: () => { setDirty(true); optionsWrap.hidden = c.type.get() !== 'select'; } }),
    required: field({ label: 'إلزامي', type: 'checkbox', value: !!it.required, onChange: () => setDirty(true) }),
    max_length: field({ label: 'الحد الأقصى للأحرف', help: 'اختياري. من 1 إلى 5000.', type: 'number', value: it.max_length ?? '', min: 1, max: 5000, step: '1', onInput: () => setDirty(true) }),
    help: field({ label: 'سطر المساعدة', value: it.help || '', maxLength: 200, onInput: () => setDirty(true) }),
    options: field({ label: 'الخيارات (لقائمة الاختيار)', help: 'خيار في كل سطر، حتى 30.', type: 'textarea', rows: 3, value: (it.options || []).join('\n'), onInput: () => setDirty(true) })
   };
   c.type.set(it.type || 'text');
   const optionsWrap = c.options.wrap;
   optionsWrap.hidden = c.type.get() !== 'select';
   controls.push({ get: () => ({ name: c.name.get().trim(), label: c.label.get(), type: c.type.get(), required: c.required.get(), max_length: c.max_length.get() === '' ? undefined : Number(c.max_length.get()), help: c.help.get(), options: c.type.get() === 'select' ? c.options.get().split('\n').map((x) => x.trim()).filter(Boolean) : undefined }), c });
   return el('div', { class: 'list-row' },
    el('div', { class: 'list-row-head' }, el('strong', { text: `حقل ${i + 1}` }), el('div', { class: 'inline-list' },
     button('', { style: 'quiet', small: true, iconName: 'up', title: 'أعلى', disabled: i === 0, onClick: () => { sync(); [items[i - 1], items[i]] = [items[i], items[i - 1]]; setDirty(true); draw(); } }),
     button('', { style: 'quiet', small: true, iconName: 'down', title: 'أسفل', disabled: i === items.length - 1, onClick: () => { sync(); [items[i + 1], items[i]] = [items[i], items[i + 1]]; setDirty(true); draw(); } }),
     button('حذف', { style: 'quiet', small: true, onClick: () => { sync(); items.splice(i, 1); setDirty(true); draw(); } }))),
    el('div', { class: 'form-grid' }, c.name.wrap, c.label.wrap, c.type.wrap, c.required.wrap, c.max_length.wrap, c.help.wrap), optionsWrap);
  }));
 };
 draw();
 const addBtn = button('إضافة حقل', { small: true, iconName: 'plus', onClick: () => { sync(); items.push({ name: '', type: 'text', label: '', required: false }); setDirty(true); draw(); } });

 const save = async () => {
  sync();
  const body = { title: f.title.get(), slug: f.slug.get(), module_group: f.module_group.get(), submit_label: f.submit_label.get(), success_message: f.success_message.get(), is_active: f.is_active.get(), fields: items };
  try {
   const saved = isNew ? await api.post('/api/admin/forms', body) : await api.put(`/api/admin/forms/${id}`, body);
   setDirty(false); notify('حُفظ النموذج.');
   if (isNew) navigate(`#/forms/${saved.id}`);
  } catch (e) {
   const rest = applyErrors(f, e.fields);
   fieldsErr.textContent = '';
   for (const [k, v] of Object.entries(e.fields || {})) {
    const m = /^fields\.(\d+)\.(\w+)$/.exec(k);
    if (m && controls[Number(m[1])]?.c[m[2]]) controls[Number(m[1])].c[m[2]].setError(v);
    else if (k === 'fields') fieldsErr.textContent = v;
   }
   notify([e.message, ...rest.filter((x) => !x.startsWith('fields'))].join(' '), 'error');
  }
 };

 const header = el('div');
 const actions = [];
 if (full) actions.push(button('حفظ', { style: 'primary', onClick: save }));
 if (full && !isNew && !isSystem) actions.push(button('حذف', { style: 'quiet', onClick: () => header.append(confirmBar('تأكيد حذف النموذج؟ ردوده المحفوظة ستبقى في الصندوق.', { onConfirm: async () => { await api.del(`/api/admin/forms/${id}`); setDirty(false); notify('حُذف النموذج.'); navigate('#/forms'); } })) }));
 actions.push(el('a', { class: 'btn btn-quiet', href: '#/forms', text: 'رجوع' }));
 header.replaceChildren(pageHeader(isNew ? 'نموذج جديد' : form.title, ...actions), isSystem ? el('p', { class: 'support muted', text: 'نموذج من النظام: يمكن تعديل الحقول والنصوص، ولا يمكن تغيير الرابط أو المجموعة أو حذفه.' }) : null);
 const body = el('div', {},
  section('الأساسيات', el('div', { class: 'form-grid' }, f.title.wrap, f.slug.wrap, f.module_group.wrap, f.submit_label.wrap), f.success_message.wrap, f.is_active.wrap),
  section('الحقول', el('p', { class: 'support muted', text: 'حقل المصيدة ضد الروبوتات يُضاف تلقائيًا ولا يحتاج إعدادًا.' }), fieldsErr, rows, full ? addBtn : null));
 if (!full) body.querySelectorAll('input, select, textarea, button').forEach((n) => { n.disabled = true; });
 root.replaceChildren(header, body);
}
