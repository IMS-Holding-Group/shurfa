// النظرة العامة: الأرقام، رسم الأعمدة، أكثر الصفحات، المحتوى المجدول
import { api } from '../api.js';
import { el, link, pageHeader, section, stats, table, fmtDate, fmtNumber, STATUS_LABELS } from '../ui.js';
import { can } from '../app.js';

const SVG = 'http://www.w3.org/2000/svg';

// رسم أعمدة SVG مسطح بألوان الهوية
function barChart(series) {
 const w = 600; const h = 160; const pad = 24;
 const max = Math.max(1, ...series.map((s) => s.views));
 const svg = document.createElementNS(SVG, 'svg');
 svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
 svg.setAttribute('class', 'bar-chart');
 svg.setAttribute('role', 'img');
 svg.setAttribute('aria-label', `مشاهدات آخر 30 يومًا، أعلى يوم ${fmtNumber(max)} مشاهدة`);
 const bw = (w - pad * 2) / series.length;
 series.forEach((s, i) => {
  const bh = Math.round((s.views / max) * (h - pad * 2));
  const r = document.createElementNS(SVG, 'rect');
  r.setAttribute('x', pad + i * bw + 2);
  r.setAttribute('y', h - pad - bh);
  r.setAttribute('width', Math.max(2, bw - 4));
  r.setAttribute('height', bh);
  r.setAttribute('fill', i === series.length - 1 ? 'var(--color-brick)' : 'var(--color-teal)');
  const t = document.createElementNS(SVG, 'title');
  t.textContent = `${s.day}: ${fmtNumber(s.views)}`;
  r.append(t);
  svg.append(r);
 });
 const axis = document.createElementNS(SVG, 'rect');
 axis.setAttribute('x', pad); axis.setAttribute('y', h - pad); axis.setAttribute('width', w - pad * 2); axis.setAttribute('height', 2); axis.setAttribute('fill', 'var(--color-sand)');
 svg.append(axis);
 return svg;
}

const TABLE_HASH = { pages: 'pages', services: 'services', guides: 'guides' };

export async function render(root) {
 const d = await api.get('/api/admin/overview');
 const figures = [
  { label: 'ردود جديدة', value: fmtNumber(d.newTotal) },
  { label: 'مشاهدات 7 أيام', value: fmtNumber(d.views7) },
  { label: 'مشاهدات 30 يومًا', value: fmtNumber(d.views30) }
 ];
 if (can('content')) figures.push({ label: 'تغييرات غير منشورة', value: fmtNumber(d.pending) });
 const actions = [];
 if (d.ga4Enabled) actions.push(link('افتح تقارير Google Analytics', 'https://analytics.google.com/', { newTab: true }));
 root.replaceChildren(
  pageHeader('نظرة عامة', ...actions),
  stats(figures),
  section('المشاهدات اليومية (العدّاد الداخلي، بلا كوكيز)', el('div', { class: 'chart-row' }, barChart(d.series), el('div', { class: 'chart-side' }, table([{ label: 'الصفحة', key: 'path' }, { label: 'المشاهدات', render: (r) => fmtNumber(r.views) }], d.topPages, { empty: 'لا مشاهدات مسجلة بعد.' })))),
  section('الردود الجديدة حسب النموذج', table([{ label: 'النموذج', key: 'title' }, { label: 'المجموعة', render: (r) => (r.module_group === 'applications' ? 'طلبات' : 'رسائل') }, { label: 'جديد', render: (r) => fmtNumber(r.count) }, { label: '', render: (r) => el('a', { href: `#/${r.module_group}?form=${r.slug}`, text: 'افتح' }) }], d.newByForm, { empty: 'لا نماذج متاحة لدورك.' })),
  can('content') ? section('محتوى مجدول قريبًا', table([{ label: 'العنوان', key: 'title' }, { label: 'النوع', render: (r) => ({ pages: 'صفحة', services: 'خدمة', guides: 'مقال' })[r.table] }, { label: 'يُنشر في', render: (r) => fmtDate(r.publish_at) }, { label: 'الحالة', render: () => STATUS_LABELS.scheduled }, { label: '', render: (r) => el('a', { href: `#/${TABLE_HASH[r.table]}/${r.id}`, text: 'تعديل' }) }], d.scheduled, { empty: 'لا يوجد محتوى مجدول.' })) : null
 );
}
