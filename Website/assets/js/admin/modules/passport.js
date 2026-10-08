// الجواز التراثي: فئات الجواز وأسعارها وخصوماتها وخيار «مجاني عند الإطلاق»
import { api } from '../api.js';
import { el, button, field, chip, pageHeader, section, notify, applyErrors, setDirty } from '../ui.js';
import { can } from '../app.js';

export async function render(root) {
 const full = can('passport', 'full');
 const data = await api.get('/api/admin/passport');
 const free = field({ label: 'الجواز مجاني عند الإطلاق', help: 'عند التفعيل تُعرض الفئات بوسم «مجاني عند الإطلاق» وتُخفى الأسعار من الحاسبة.', type: 'checkbox', value: data.passport_free, onChange: async () => {
  try { await api.put('/api/admin/passport/free', { passport_free: free.get() }); notify('حُفظ الخيار.'); } catch (e) { notify(e.message, 'error'); free.set(!free.get()); }
 } });
 if (!full) free.input.disabled = true;

 const tierBlock = (t) => {
  const f = {
   name_ar: field({ label: 'اسم الفئة', maxLength: 40, value: t.name_ar, required: true, onInput: () => setDirty(true) }),
   price_omr: field({ label: 'السعر (ريال عُماني)', help: 'حتى 3 منازل عشرية (بيسة).', type: 'number', value: t.price_omr, min: 0, max: 9999, step: '0.001', onInput: () => setDirty(true) }),
   duration_days: field({ label: 'المدة (أيام)', type: 'number', value: t.duration_days, min: 1, max: 365, step: '1', onInput: () => setDirty(true) }),
   discount_min_pct: field({ label: 'أقل خصم (%)', type: 'number', value: t.discount_min_pct, min: 0, max: 100, step: '1', onInput: () => setDirty(true) }),
   discount_max_pct: field({ label: 'أعلى خصم (%)', type: 'number', value: t.discount_max_pct, min: 0, max: 100, step: '1', onInput: () => setDirty(true) }),
   sort: field({ label: 'الترتيب', type: 'number', value: t.sort, min: 0, max: 99, step: '1', onInput: () => setDirty(true) }),
   is_active: field({ label: 'مفعّلة', type: 'checkbox', value: t.is_active, onChange: () => setDirty(true) })
  };
  const save = button('حفظ الفئة', { style: 'primary', small: true, onClick: async () => {
   const body = Object.fromEntries(Object.entries(f).map(([k, c]) => [k, c.get()]));
   try { await api.put(`/api/admin/passport/${t.id}`, body); setDirty(false); notify(`حُفظت فئة ${body.name_ar}.`); } catch (e) { applyErrors(f, e.fields); notify(e.message, 'error'); }
  } });
  const sec = section(`${t.name_ar} (${t.code})`, el('div', { class: 'form-grid' }, f.name_ar.wrap, f.price_omr.wrap, f.duration_days.wrap, f.discount_min_pct.wrap, f.discount_max_pct.wrap, f.sort.wrap, f.is_active.wrap), full ? save : null);
  if (!full) sec.querySelectorAll('input').forEach((n) => { n.disabled = true; });
  return sec;
 };

 root.replaceChildren(
  pageHeader('الجواز التراثي'),
  el('p', { class: 'support muted', text: 'الأرقام المرجعية: برونزي 9 ريالات لمدة 7 أيام، فضي 16 ريالًا لمدة 15 يومًا، ذهبي 25 ريالًا لمدة 30 يومًا.' }),
  section('الإطلاق', free.wrap),
  ...data.tiers.map(tierBlock));
}
