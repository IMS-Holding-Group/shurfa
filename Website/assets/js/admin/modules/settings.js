// إعدادات الموقع (للمسؤول الأول): حالة التطبيق، المتاجر، التواصل، السجل، الصيانة، الفهرسة
import { api } from '../api.js';
import { el, button, field, pageHeader, section, notify, applyErrors, setDirty } from '../ui.js';
import { buildForm } from '../editors/fields.js';

const APP_STATUS = [{ value: 'coming_soon', label: 'قريبًا (قبل الإطلاق)' }, { value: 'beta', label: 'نسخة تجريبية' }, { value: 'available', label: 'متاح للتنزيل' }];

export async function render(root) {
 const s = await api.get('/api/admin/settings');
 const f = {
  app_status: field({ label: 'حالة التطبيق', help: 'تتحكم بنص زر دعوة التطبيق في كل الموقع: «انضم إلى قائمة الاهتمام» أو «جرّب النسخة التجريبية» أو «حمّل التطبيق».', type: 'select', options: APP_STATUS, onChange: () => setDirty(true) }),
  app_store_url: field({ label: 'رابط App Store', help: 'يُترك فارغًا حتى يُنشر التطبيق.', value: s.app_store_url || '', maxLength: 300, onInput: () => setDirty(true) }),
  play_store_url: field({ label: 'رابط Google Play', help: 'يُترك فارغًا حتى يُنشر التطبيق.', value: s.play_store_url || '', maxLength: 300, onInput: () => setDirty(true) }),
  contact_email: field({ label: 'البريد المعلن', help: 'يظهر في التذييل وصفحة التواصل. يُخفى إن كان فارغًا.', value: s.contact_email || '', maxLength: 120, onInput: () => setDirty(true) }),
  contact_phone: field({ label: 'الهاتف المعلن', help: 'بصيغة +968XXXXXXXX. يُخفى إن كان فارغًا.', value: s.contact_phone || '', maxLength: 30, onInput: () => setDirty(true) }),
  commercial_registration: field({ label: 'رقم السجل التجاري', help: 'يظهر في التذييل عند تعبئته فقط.', value: s.commercial_registration || '', maxLength: 40, onInput: () => setDirty(true) }),
  tourism_permit: field({ label: 'رقم اعتماد النشاط السياحي', help: 'يظهر في التذييل عند تعبئته فقط.', value: s.tourism_permit || '', maxLength: 40, onInput: () => setDirty(true) }),
  maintenance_enabled: field({ label: 'تفعيل وضع الصيانة', help: 'يعرض صفحة صيانة للزوار برمز 503، وتبقى اللوحة متاحة.', type: 'checkbox', value: s.maintenance_enabled === true, onChange: () => setDirty(true) }),
  maintenance_text: field({ label: 'نص صفحة الصيانة', type: 'textarea', rows: 2, maxLength: 300, value: s.maintenance_text || '', onInput: () => setDirty(true) }),
  site_noindex: field({ label: 'منع فهرسة الموقع كله', help: 'لبيئات التجربة فقط. لا تفعّله في الموقع الحقيقي.', type: 'checkbox', value: s.site_noindex === true, onChange: () => setDirty(true) }),
  not_found_text: field({ label: 'نص صفحة 404', type: 'textarea', rows: 2, maxLength: 300, value: s.not_found_text || '', onInput: () => setDirty(true) })
 };
 f.app_status.set(s.app_status || 'coming_soon');
 const og = buildForm([{ key: 'default_og_image', type: 'image', label_ar: 'صورة المشاركة الافتراضية', help_ar: 'تُستخدم عند مشاركة أي صفحة ليس لها صورة خاصة.' }], { default_og_image: s.default_og_image || '' }, {});
 f.default_og_image = og.controls.default_og_image;

 const save = async () => {
  const body = Object.fromEntries(Object.entries(f).map(([k, c]) => [k, c.get()]));
  try { await api.put('/api/admin/settings', body); setDirty(false); notify('حُفظت الإعدادات.'); } catch (e) { applyErrors(f, e.fields); notify(e.message, 'error'); }
 };
 root.replaceChildren(
  pageHeader('إعدادات الموقع', button('حفظ', { style: 'primary', onClick: save })),
  section('التطبيق', f.app_status.wrap, el('div', { class: 'form-grid' }, f.app_store_url.wrap, f.play_store_url.wrap)),
  section('بيانات التواصل والاعتماد', el('div', { class: 'form-grid' }, f.contact_email.wrap, f.contact_phone.wrap, f.commercial_registration.wrap, f.tourism_permit.wrap), el('p', { class: 'support muted', text: 'لا تُكتب هنا إلا بيانات حقيقية معتمدة. الحقول الفارغة لا تظهر في الموقع.' })),
  section('الصيانة والفهرسة', f.maintenance_enabled.wrap, f.maintenance_text.wrap, f.site_noindex.wrap),
  section('المشاركة وصفحة 404', og.wrap, f.not_found_text.wrap));
}
