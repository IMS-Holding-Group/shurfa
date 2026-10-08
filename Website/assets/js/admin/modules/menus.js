// القوائم: قائمة الرأس وأربع مجموعات للتذييل، عناصر بنوع وجهة وترتيب بأزرار
import { api } from '../api.js';
import { el, button, field, chip, pageHeader, section, notify, setDirty } from '../ui.js';
import { can } from '../app.js';

const LIMITS = { main: 7, footer_1: 8, footer_2: 8, footer_3: 8, footer_4: 8 };
const LABELS = { main: 'قائمة الرأس', footer_1: 'مجموعة التذييل 1', footer_2: 'مجموعة التذييل 2', footer_3: 'مجموعة التذييل 3', footer_4: 'مجموعة التذييل 4' };
const TARGET_TYPES = [{ value: 'page', label: 'صفحة' }, { value: 'service', label: 'خدمة' }, { value: 'guide', label: 'مقال' }, { value: 'url', label: 'رابط مخصص' }];

export async function render(root) {
 const full = can('content', 'full');
 const data = await api.get('/api/admin/menus');
 const targets = data.targets;
 const menus = Object.fromEntries(data.menus.map((m) => [m.key, m]));

 const menuBlock = (key) => {
  const m = menus[key] || { key, title: '', items: [], warnings: [] };
  const items = (m.items || []).map((x) => ({ ...x }));
  const rows = el('div', { class: 'list-rows' });
  const title = key === 'main' ? null : field({ label: 'عنوان المجموعة', maxLength: 40, value: m.title || '', onInput: () => setDirty(true) });
  const warn = el('div');
  const drawWarnings = (list) => warn.replaceChildren(...(list || []).map((w) => el('p', { class: 'notice notice-purple', text: w })));
  drawWarnings(m.warnings);
  const controls = [];
  const draw = () => {
   controls.length = 0;
   rows.replaceChildren(...items.map((it, i) => {
    const label = field({ label: 'النص', maxLength: 40, value: it.label || '', required: true, onInput: () => setDirty(true) });
    const type = field({ label: 'نوع الوجهة', type: 'select', options: TARGET_TYPES, onChange: () => { setDirty(true); drawTarget(); } });
    type.set(it.target_type || 'page');
    const targetSlot = el('div');
    let target;
    const drawTarget = () => {
     const t = type.get();
     if (t === 'url') target = field({ label: 'الرابط', help: 'https:// أو مسار يبدأ بـ / أو #معرّف', value: it.target || '', maxLength: 2048, onInput: () => setDirty(true) });
     else {
      const opts = (targets[t] || []).map((x) => ({ value: x.slug, label: x.title }));
      target = field({ label: TARGET_TYPES.find((x) => x.value === t).label, type: 'select', options: [{ value: '', label: 'اختر' }, ...opts], onChange: () => setDirty(true) });
      target.set(it.target || '');
     }
     targetSlot.replaceChildren(target.wrap);
    };
    drawTarget();
    const newTab = field({ label: 'يفتح في تبويب جديد', type: 'checkbox', value: !!it.new_tab, onChange: () => setDirty(true) });
    controls.push({ get: () => ({ label: label.get(), target_type: type.get(), target: target.get(), new_tab: newTab.get() }) });
    return el('div', { class: 'list-row' },
     el('div', { class: 'list-row-head' }, el('strong', { text: `عنصر ${i + 1}` }), el('div', { class: 'inline-list' },
      button('', { style: 'quiet', small: true, iconName: 'up', title: 'أعلى', disabled: i === 0, onClick: () => { sync(); [items[i - 1], items[i]] = [items[i], items[i - 1]]; setDirty(true); draw(); } }),
      button('', { style: 'quiet', small: true, iconName: 'down', title: 'أسفل', disabled: i === items.length - 1, onClick: () => { sync(); [items[i + 1], items[i]] = [items[i], items[i + 1]]; setDirty(true); draw(); } }),
      button('حذف', { style: 'quiet', small: true, onClick: () => { sync(); items.splice(i, 1); setDirty(true); draw(); } }))),
     el('div', { class: 'form-grid' }, label.wrap, type.wrap, targetSlot, newTab.wrap));
   }));
   addBtn.disabled = items.length >= LIMITS[key];
  };
  const sync = () => controls.forEach((c, i) => { items[i] = c.get(); });
  const addBtn = button('إضافة عنصر', { small: true, iconName: 'plus', onClick: () => { sync(); items.push({ label: '', target_type: 'page', target: '', new_tab: false }); setDirty(true); draw(); } });
  const saveBtn = button('حفظ القائمة', { style: 'primary', onClick: async () => {
   sync();
   try { const r = await api.put(`/api/admin/menus/${key}`, { title: title ? title.get() : '', items }); setDirty(false); drawWarnings(r.warnings); notify(`حُفظت ${LABELS[key]}.`); } catch (e) { notify(e.message, 'error'); }
  } });
  draw();
  const sec = section(LABELS[key], el('p', { class: 'support muted', text: `حتى ${LIMITS[key]} عناصر. الروابط إلى محتوى غير منشور تُخفى تلقائيًا من الموقع.` }), warn, title ? title.wrap : null, rows, el('div', { class: 'inline-list' }, full ? addBtn : null, full ? saveBtn : null));
  if (!full) sec.querySelectorAll('input, select, button').forEach((n) => { n.disabled = true; });
  return sec;
 };

 root.replaceChildren(pageHeader('القوائم'), ...Object.keys(LIMITS).map(menuBlock));
}
