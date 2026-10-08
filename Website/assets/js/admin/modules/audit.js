// سجل التدقيق: قراءة فقط مع بحث وترقيم صفحات
import { api } from '../api.js';
import { el, button, table, pagination, searchBox, pageHeader, section, fmtDate } from '../ui.js';
import { navigate } from '../app.js';

const ACTIONS = { create: 'إنشاء', update: 'تعديل', save_draft: 'حفظ مسودة', publish: 'نشر', unpublish: 'إلغاء نشر', discard_draft: 'تجاهل مسودة', restore_revision: 'استعادة نسخة', soft_delete: 'حذف', restore: 'استعادة', hard_delete: 'حذف نهائي', upload: 'رفع', delete: 'حذف', login: 'دخول', logout: 'خروج', password_change: 'تغيير كلمة المرور', export: 'تصدير', rotate_secret: 'تدوير سر', reorder: 'إعادة ترتيب', import: 'استيراد', status_change: 'تغيير حالة' };
const ENTITIES = { page: 'صفحة', service: 'خدمة', guide: 'مقال', faq: 'سؤال', menu: 'قائمة', redirect: 'تحويل', media: 'وسائط', form: 'نموذج', submission: 'رد', settings: 'إعدادات', integrations: 'تكاملات', webhook: 'Webhook', admin: 'حساب', passport_tier: 'فئة جواز', session: 'جلسة', account: 'حسابي' };

export async function render(root, r) {
 const page = Number(r.query.get('page') || 1);
 const q = r.query.get('q') || '';
 const data = await api.get(`/api/admin/audit?page=${page}&q=${encodeURIComponent(q)}`);
 const diffPanel = el('div');
 const showDiff = (row) => {
  const dump = (v) => el('pre', { class: 'audit-json', text: v ? JSON.stringify(v, null, 1).slice(0, 4000) : 'لا شيء' });
  diffPanel.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: `تفاصيل السجل ${row.id}` }), button('إغلاق', { style: 'quiet', small: true, onClick: () => diffPanel.replaceChildren() })),
   el('div', { class: 'form-grid' }, el('div', {}, el('p', { class: 'field-label', text: 'قبل' }), dump(row.before)), el('div', {}, el('p', { class: 'field-label', text: 'بعد' }), dump(row.after)))));
  diffPanel.scrollIntoView({ block: 'start' });
 };
 root.replaceChildren(
  pageHeader('سجل التدقيق'),
  el('p', { class: 'support muted', text: 'كل كتابة تُسجَّل هنا ولا يمكن حذفها ولا تعديلها. كلمات المرور والمفاتيح لا تُسجَّل.' }),
  searchBox(q, (v) => navigate(`#/audit?q=${encodeURIComponent(v)}`), 'بحث بالبريد أو الإجراء أو الكيان'),
  diffPanel,
  section('', table([
   { label: 'الوقت', render: (x) => fmtDate(x.created_at) },
   { label: 'المستخدم', render: (x) => x.actor_email || '' },
   { label: 'الإجراء', render: (x) => ACTIONS[x.action] || x.action },
   { label: 'الكيان', render: (x) => `${ENTITIES[x.entity] || x.entity}${x.entity_id ? ` (${String(x.entity_id).slice(0, 8)})` : ''}` },
   { label: 'IP', render: (x) => x.ip || '' },
   { label: '', render: (x) => (x.before || x.after ? button('التفاصيل', { style: 'quiet', small: true, onClick: () => showDiff(x) }) : '') }
  ], data.items, { empty: 'لا سجلات بعد.' })),
  pagination({ page: data.page, pages: data.pages, onChange: (p) => navigate(`#/audit?page=${p}&q=${encodeURIComponent(q)}`) }));
}
