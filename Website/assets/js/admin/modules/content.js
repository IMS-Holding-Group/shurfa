// الصفحات والخدمات والمقالات: قائمة، إنشاء، محرر بالمسودة والنشر والجدولة والسيو وسجل النسخ
import { api } from '../api.js';
import { el, button, link, field, chip, statusChip, confirmBar, table, pagination, searchBox, pageHeader, section, notify, fmtDate, applyErrors, setDirty, toLocalInput, fromLocalInput, slugify } from '../ui.js';
import { can, state, navigate } from '../app.js';
import { blockEditor } from '../editors/blocks.js';
import { markdownEditor } from '../editors/markdown.js';
import { buildForm } from '../editors/fields.js';

const KINDS = {
 pages: { title: 'الصفحات', one: 'صفحة', type: 'page', prefix: '/' },
 services: { title: 'الخدمات', one: 'خدمة', type: 'service', prefix: '/services/' },
 guides: { title: 'دليل المسافر', one: 'مقال', type: 'guide', prefix: '/guide/' }
};
const ACCENTS = [{ value: 'teal', label: 'تركوازي' }, { value: 'brick', label: 'طوبي' }, { value: 'gold', label: 'ذهبي' }, { value: 'purple', label: 'بنفسجي' }, { value: 'ink', label: 'أخضر داكن' }];
const SERVICE_STATUS = [{ value: 'available', label: 'متاحة' }, { value: 'coming_soon', label: 'قريبًا' }];
const TONE = 'جمل قصيرة، الفعل أولًا، بدون مبالغة.';

async function registry() {
 if (!state.registry) state.registry = await api.get('/api/admin/blocks/registry');
 return state.registry;
}

async function lookups() {
 const [services, forms, faqs, reg] = await Promise.all([
  api.get('/api/admin/services?page=1').catch(() => ({ items: [] })),
  api.get('/api/admin/forms').catch(() => ({ items: [] })),
  api.get('/api/admin/faqs').catch(() => ({ groups: [] })),
  registry()
 ]);
 return { services: services.items || [], forms: forms.items || [], faqGroups: faqs.groups || [], icons: reg.icons };
}

export async function render(root, r) {
 const kind = r.module;
 const meta = KINDS[kind];
 if (r.parts[0] === 'new') return renderNew(root, kind, meta);
 if (r.parts[0]) return renderEditor(root, kind, meta, r.parts[0]);
 return renderList(root, kind, meta, r.query);
}

async function renderList(root, kind, meta, query) {
 const page = Number(query.get('page') || 1);
 const q = query.get('q') || '';
 const data = await api.get(`/api/admin/${kind}?page=${page}&q=${encodeURIComponent(q)}`);
 const cols = [
  { label: 'العنوان', render: (row) => el('a', { href: `#/${kind}/${row.id}`, text: row.title }) },
  { label: 'الرابط', render: (row) => el('code', { text: `${meta.prefix}${row.slug}` }) },
  { label: 'الحالة', render: (row) => el('span', { class: 'inline-list' }, statusChip(row.display_status), row.kind === 'system' ? chip('صفحة نظام', 'teal') : null, row.service_status === 'coming_soon' ? chip('قريبًا', 'gold') : null) },
  { label: 'آخر تحديث', render: (row) => fmtDate(row.updated_at) },
  { label: '', render: (row) => el('span', { class: 'inline-list' }, link('معاينة', `/admin/preview/${meta.type}/${row.id}`, { small: true, style: 'quiet', newTab: true }), row.display_status === 'published' || row.display_status === 'pending' ? link('عرض', `${meta.prefix}${row.slug === 'home' ? '' : row.slug}`, { small: true, style: 'quiet', newTab: true }) : null) }
 ];
 root.replaceChildren(
  pageHeader(meta.title, can('content', 'full') ? link(`إنشاء ${meta.one}`, `#/${kind}/new`, { style: 'primary' }) : null),
  searchBox(q, (v) => navigate(`#/${kind}?q=${encodeURIComponent(v)}`), 'بحث بالعنوان أو الرابط'),
  table(cols, data.items, { empty: `لا توجد ${meta.title} بعد.` }),
  pagination({ page: data.page, pages: data.pages, onChange: (p) => navigate(`#/${kind}?page=${p}&q=${encodeURIComponent(q)}`) }));
}

function renderNew(root, kind, meta) {
 const title = field({ label: 'العنوان', help: TONE, required: true, maxLength: 120, onInput: () => { if (!slugTouched) slug.set(slugify(title.get())); } });
 let slugTouched = false;
 const slug = field({ label: 'الرابط (slug)', help: 'يُولَّد من العنوان ويمكن تعديله. أحرف لاتينية صغيرة وأرقام وشرطات.', maxLength: 80, onInput: () => { slugTouched = true; } });
 const form = el('form', { class: 'panel', on: { submit: async (e) => {
  e.preventDefault();
  try { const row = await api.post(`/api/admin/${kind}`, { title: title.get(), slug: slug.get() }); setDirty(false); notify(`أُنشئت ${meta.one} كمسودة.`); navigate(`#/${kind}/${row.id}`); } catch (err) { applyErrors({ title, slug }, err.fields); notify(err.message, 'error'); }
 } } }, title.wrap, slug.wrap, el('div', { class: 'inline-list' }, button('إنشاء', { style: 'primary', type: 'submit' }), link('إلغاء', `#/${kind}`, { style: 'quiet' })));
 root.replaceChildren(pageHeader(`إنشاء ${meta.one}`), form);
}

async function renderEditor(root, kind, meta, id) {
 const full = can('content', 'full');
 const [data, lk] = await Promise.all([api.get(`/api/admin/${kind}/${id}`), kind === 'pages' ? lookups() : Promise.resolve(null)]);
 let item = data.item;
 let merged = data.merged;
 let revisions = data.revisions;
 const isSystem = kind === 'pages' && item.kind === 'system';
 const fields = {};

 fields.title = field({ label: 'العنوان', help: TONE, required: true, maxLength: 120, value: merged.title, onInput: () => setDirty(true) });
 fields.slug = field({ label: 'الرابط (slug)', help: isSystem ? 'رابط صفحة النظام ثابت.' : 'أحرف لاتينية صغيرة وأرقام وشرطات. تغيير رابط منشور ينشئ تحويلًا من الرابط القديم.', maxLength: 80, value: item.slug, disabled: isSystem, onInput: () => { setDirty(true); redirectOpt.wrap.hidden = !(item.status === 'published' && fields.slug.get() !== item.slug); } });
 const redirectOpt = field({ label: 'أنشئ تحويلًا من الرابط القديم', type: 'checkbox', value: true });
 redirectOpt.wrap.hidden = true;

 let blocks = null; let body = null;
 const typeFields = [];
 if (kind === 'pages') {
  const reg = await registry();
  blocks = blockEditor({ blocks: merged.blocks || [], registry: reg, lookups: lk });
  typeFields.push(section('الكتل', el('p', { class: 'support muted', text: 'رتّب الكتل بأزرار أعلى وأسفل. احفظ المسودة لتحديث المعاينة.' }), blocks.wrap));
 }
 if (kind === 'services') {
  fields.tagline = field({ label: 'السطر التعريفي', help: TONE, maxLength: 160, value: merged.tagline || '', onInput: () => setDirty(true) });
  body = markdownEditor({ label: 'نص الخدمة', value: merged.body || '', onInput: () => setDirty(true) });
  fields.body = body;
  fields.highlights = field({ label: 'أبرز النقاط', help: 'نقطة في كل سطر، حتى 8 نقاط، كل نقطة حتى 80 حرفًا.', type: 'textarea', rows: 5, value: (merged.highlights || []).join('\n'), onInput: () => setDirty(true) });
  fields.icon_key = field({ label: 'الأيقونة', help: 'من سجل الأيقونات المرسوم.', type: 'select', options: (await registry()).icons.map((i) => ({ value: i.value, label: i.label_ar })), onChange: () => setDirty(true) });
  fields.icon_key.set(merged.icon_key || 'activities');
  fields.accent = field({ label: 'لون القسم', help: 'لون واحد يقود القسم، والبقية بمساحات صغيرة.', type: 'select', options: ACCENTS, onChange: () => setDirty(true) });
  fields.accent.set(merged.accent || 'teal');
  fields.service_status = field({ label: 'الحالة', help: 'الخدمات التي لم تُطلق بعد تُعرض بوسم «قريبًا».', type: 'select', options: SERVICE_STATUS, onChange: () => setDirty(true) });
  fields.service_status.set(merged.service_status || 'coming_soon');
  fields.sort = field({ label: 'الترتيب', help: 'رقم أصغر يظهر أولًا.', type: 'number', value: merged.sort ?? 0, min: 0, max: 999, onInput: () => setDirty(true) });
  const cover = buildForm([{ key: 'cover_path', type: 'image', label_ar: 'صورة الغلاف', help_ar: 'من مكتبة الوسائط. تظهر في أعلى صفحة الخدمة.' }], { cover_path: merged.cover_path || '' }, lk || {});
  fields.cover_path = cover.controls.cover_path;
  typeFields.push(section('محتوى الخدمة', fields.tagline.wrap, body.wrap, fields.highlights.wrap, el('div', { class: 'form-grid' }, fields.icon_key.wrap, fields.accent.wrap, fields.service_status.wrap, fields.sort.wrap), cover.wrap));
 }
 if (kind === 'guides') {
  fields.excerpt = field({ label: 'المقتطف', help: 'جملتان تُعرضان في قائمة المقالات ونتائج البحث.', type: 'textarea', rows: 3, maxLength: 240, value: merged.excerpt || '', onInput: () => setDirty(true) });
  body = markdownEditor({ label: 'نص المقال', value: merged.body || '', maxLength: 40000, required: true, onInput: () => setDirty(true) });
  fields.body = body;
  const cover = buildForm([{ key: 'cover_path', type: 'image', label_ar: 'صورة الغلاف', help_ar: 'من مكتبة الوسائط.' }], { cover_path: merged.cover_path || '' }, {});
  fields.cover_path = cover.controls.cover_path;
  typeFields.push(section('محتوى المقال', fields.excerpt.wrap, body.wrap, cover.wrap));
 }

 fields.seo_title = field({ label: 'عنوان السيو', help: 'حتى 60 حرفًا. عند الفراغ يُشتق من العنوان.', maxLength: 70, counterMax: 60, value: merged.seo_title || '', onInput: () => { setDirty(true); updateSnippet(); } });
 fields.seo_description = field({ label: 'وصف السيو', help: 'حتى 155 حرفًا. عند الفراغ يُشتق من أول فقرة.', type: 'textarea', rows: 3, maxLength: 170, counterMax: 155, value: merged.seo_description || '', onInput: () => { setDirty(true); updateSnippet(); } });
 const og = buildForm([{ key: 'og_image_path', type: 'image', label_ar: 'صورة المشاركة', help_ar: 'تظهر عند مشاركة الرابط في الشبكات. من المكتبة.' }], { og_image_path: merged.og_image_path || '' }, {});
 fields.og_image_path = og.controls.og_image_path;
 fields.noindex = field({ label: 'منع الفهرسة في محركات البحث', type: 'checkbox', value: !!item.noindex, onChange: () => setDirty(true) });
 const snippet = el('div', { class: 'seo-snippet' }, el('p', { class: 'seo-url' }), el('p', { class: 'seo-title' }), el('p', { class: 'seo-desc' }));
 const updateSnippet = () => {
  snippet.querySelector('.seo-url').textContent = `${window.location.origin}${meta.prefix}${fields.slug.get() === 'home' ? '' : fields.slug.get()}`;
  snippet.querySelector('.seo-title').textContent = `${fields.seo_title.get() || fields.title.get()} | شُرفة`.slice(0, 70);
  snippet.querySelector('.seo-desc').textContent = (fields.seo_description.get() || 'سيُشتق الوصف من أول فقرة في المحتوى.').slice(0, 160);
 };
 updateSnippet();
 fields.title.input.addEventListener('input', updateSnippet);

 fields.publish_at = field({ label: 'يُنشر في', help: 'بتوقيت مسقط. اتركه فارغًا للنشر الفوري عند الضغط على «نشر».', type: 'datetime-local', value: toLocalInput(item.publish_at), onChange: () => setDirty(true) });
 fields.unpublish_at = field({ label: 'يُلغى نشره في', help: 'اختياري. بعد هذا الوقت يختفي من الموقع تلقائيًا.', type: 'datetime-local', value: toLocalInput(item.unpublish_at), onChange: () => setDirty(true) });

 const header = el('div');
 const previewFrame = kind === 'pages' ? el('iframe', { class: 'live-preview', title: 'معاينة مباشرة', src: `/admin/preview/${meta.type}/${id}` }) : null;

 const payload = () => {
  const p = { title: fields.title.get(), slug: fields.slug.get(), seo_title: fields.seo_title.get(), seo_description: fields.seo_description.get(), og_image_path: fields.og_image_path.get(), noindex: fields.noindex.get(), publish_at: fromLocalInput(fields.publish_at.get()), unpublish_at: fromLocalInput(fields.unpublish_at.get()), updated_at: item.updated_at, create_redirect: redirectOpt.get() };
  if (kind === 'pages') p.blocks = blocks.get();
  if (kind === 'services') Object.assign(p, { tagline: fields.tagline.get(), body: body.get(), highlights: fields.highlights.get().split('\n'), icon_key: fields.icon_key.get(), accent: fields.accent.get(), service_status: fields.service_status.get(), cover_path: fields.cover_path.get(), sort: Number(fields.sort.get()) });
  if (kind === 'guides') Object.assign(p, { excerpt: fields.excerpt.get(), body: body.get(), cover_path: fields.cover_path.get() });
  return p;
 };

 const refresh = async () => {
  const d = await api.get(`/api/admin/${kind}/${id}`);
  item = d.item; merged = d.merged; revisions = d.revisions;
  renderHeader();
  if (previewFrame) previewFrame.src = `/admin/preview/${meta.type}/${id}?t=${Date.now()}`;
 };

 const save = async () => {
  if (blocks && blocks.hasOpenEditor()) { notify('أغلق نموذج الكتلة المفتوح بزر «تم» قبل الحفظ.', 'error'); return false; }
  try {
   const r = await api.put(`/api/admin/${kind}/${id}`, payload());
   item = r.item;
   setDirty(false);
   notify(r.warning ? `حُفظت المسودة. ${r.warning}` : 'حُفظت المسودة.', r.warning ? 'purple' : 'success');
   await refresh();
   return true;
  } catch (err) {
   const rest = applyErrors(fields, err.fields);
   notify([err.message, ...rest].join(' '), 'error');
   return false;
  }
 };

 const act = async (action, successText) => {
  try { await api.post(`/api/admin/${kind}/${id}/${action}`); notify(successText); await refresh(); } catch (err) { notify(err.message, 'error'); }
 };

 const revisionsPanel = el('div');
 const showRevisions = () => {
  revisionsPanel.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: 'سجل النسخ (آخر 30)' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => revisionsPanel.replaceChildren() })),
   table([
    { label: 'التاريخ', render: (rv) => fmtDate(rv.created_at) },
    { label: 'الكاتب', render: (rv) => rv.author || '' },
    { label: 'ملاحظة', render: (rv) => rv.note || '' },
    { label: '', render: (rv) => el('span', { class: 'inline-list' },
     button('معاينة', { style: 'quiet', small: true, onClick: async () => {
      const full = await api.get(`/api/admin/${kind}/${id}/revisions/${rv.id}`);
      const s = full.snapshot || {};
      const rows = Object.entries(s).filter(([, v]) => typeof v === 'string' && v).map(([k, v]) => el('p', {}, el('strong', { text: `${k}: ` }), String(v).slice(0, 300)));
      revisionsPanel.append(el('div', { class: 'inline-panel' }, el('h3', { text: `نسخة ${fmtDate(rv.created_at)}` }), ...rows, s.blocks ? el('p', { class: 'support muted', text: `${s.blocks.length} كتلة` }) : null, button('إغلاق', { style: 'quiet', small: true, onClick: (e) => e.currentTarget.parentElement.remove() })));
     } }),
     full ? button('استعادة كمسودة', { small: true, onClick: async () => { try { await api.post(`/api/admin/${kind}/${id}/restore-revision`, { revision_id: rv.id }); setDirty(false); await renderEditor(root, kind, meta, id); notify('استُعيدت النسخة كمسودة.'); } catch (err) { notify(err.message, 'error'); } } }) : null) }
   ], revisions, { empty: 'لا نسخ محفوظة بعد. تُحفظ نسخة عند كل نشر.' })));
 };

 const renderHeader = () => {
 const status = item.display_status;
 const actions = [];
 if (full) {
  actions.push(button('حفظ المسودة', { style: 'primary', onClick: save }));
  actions.push(button('معاينة', { onClick: async () => { if (await save()) window.open(`/admin/preview/${meta.type}/${id}`, '_blank', 'noopener'); } }));
  if (status === 'draft' || status === 'expired') actions.push(button('نشر', { onClick: () => act('publish', 'نُشر المحتوى.') }));
  if (status === 'pending') actions.push(button('نشر التغييرات', { onClick: () => act('publish', 'نُشرت التغييرات.') }), button('تجاهل التغييرات', { style: 'quiet', onClick: () => act('discard', 'أُلغيت التغييرات غير المنشورة.') }));
  if (status === 'scheduled') actions.push(button('نشر الآن', { onClick: () => act('publish', 'نُشر المحتوى.') }));
  if (['published', 'pending', 'scheduled'].includes(status)) actions.push(button('إلغاء النشر', { style: 'quiet', onClick: () => act('unpublish', 'أُلغي النشر.') }));
  if (!isSystem) actions.push(button('حذف', { style: 'quiet', onClick: () => { header.append(confirmBar(`تأكيد نقل هذه ال${meta.one} إلى سلة المحذوفات؟`, { onConfirm: async () => { await api.del(`/api/admin/${kind}/${id}`); setDirty(false); notify('نُقل إلى سلة المحذوفات.'); navigate(`#/${kind}`); } })); } }));
 } else actions.push(link('معاينة', `/admin/preview/${meta.type}/${id}`, { newTab: true }));
 actions.push(button('سجل النسخ', { style: 'quiet', onClick: showRevisions }));
 actions.push(link('رجوع', `#/${kind}`, { style: 'quiet' }));
 header.replaceChildren(
  pageHeader(item.title, ...actions),
  el('div', { class: 'inline-list status-line' }, statusChip(status), isSystem ? chip('صفحة نظام', 'teal') : null, el('span', { class: 'support muted', text: `آخر تحديث ${fmtDate(item.updated_at)}` }), item.published_at ? el('span', { class: 'support muted', text: `آخر نشر ${fmtDate(item.published_at)}` }) : null));
 };
 renderHeader();

 const editorCol = el('div', { class: 'editor-col' },
  section('الأساسيات', fields.title.wrap, fields.slug.wrap, redirectOpt.wrap),
  ...typeFields,
  section('السيو', fields.seo_title.wrap, fields.seo_description.wrap, snippet, og.wrap, fields.noindex.wrap),
  section('الجدولة', el('div', { class: 'form-grid' }, fields.publish_at.wrap, fields.unpublish_at.wrap)),
  full ? el('div', { class: 'inline-list sticky-actions' }, button('حفظ المسودة', { style: 'primary', onClick: save })) : null);
 if (!full) editorCol.querySelectorAll('input, textarea, select, button').forEach((n) => { if (!n.closest('.page-actions')) n.disabled = true; });

 root.replaceChildren(header, revisionsPanel, previewFrame ? el('div', { class: 'editor-with-preview' }, editorCol, el('div', { class: 'preview-col' }, el('p', { class: 'support muted', text: 'معاينة مباشرة للمسودة المحفوظة' }), previewFrame)) : editorCol);
}
