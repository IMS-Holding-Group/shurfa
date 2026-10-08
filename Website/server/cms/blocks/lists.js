// كتل القوائم: قائمة مزايا، قائمة الخدمات، قائمة المقالات، الأسئلة الشائعة، جدول
import { escapeHtml, chip, button, img } from '../../render/components.js';
import { renderMarkdown } from '../../render/markdown.js';
import { icon } from '../../render/icons.js';
import { getServices, getGuides, getFaqs } from '../content.js';
import { formatDay } from '../../services/format.js';
import { blockTitle } from './basic.js';

export const SERVICE_STATUS_LABEL = { available: 'متاحة', coming_soon: 'قريبًا' };

// صف خدمة واحد بالنمط المعتمد: أيقونة + عنوان + وصف + رابط
export function serviceRow(s) {
 const statusChip = s.slug === 'passport' ? chip('مجاني عند الإطلاق', 'purple') : chip(SERVICE_STATUS_LABEL[s.service_status] || '', s.service_status === 'available' ? s.accent : 'sand');
 return `<li class="feature-row">${icon(s.icon_key, 48)}<div class="feature-head"><h3><a href="/services/${escapeHtml(s.slug)}">${escapeHtml(s.title)}</a></h3>${statusChip}</div><p>${escapeHtml(s.tagline || '')}</p></li>`;
}

export const feature_list = {
 type: 'feature_list',
 label_ar: 'قائمة مزايا',
 description_ar: 'عناصر بأيقونة وعنوان ونص ورابط، بتخطيط صفوف أو أعمدة أو أيقونات.',
 icon: 'check',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: 'جمل قصيرة، الفعل أولًا، بدون مبالغة', max_length: 100 },
  { key: 'lead', type: 'longtext', label_ar: 'السطر', help_ar: '', max_length: 240 },
  { key: 'layout', type: 'select', label_ar: 'التخطيط', help_ar: '', options: [{ value: 'rows', label_ar: 'صفوف' }, { value: 'columns', label_ar: 'أعمدة' }, { value: 'icons', label_ar: 'أيقونات' }], default: 'rows' },
  { key: 'items', type: 'list', label_ar: 'العناصر', help_ar: 'حتى 12 عنصرًا.', min_items: 1, max_items: 12, fields: [
   { key: 'icon', type: 'icon', label_ar: 'الأيقونة', help_ar: 'من سجل الأيقونات.', required: true },
   { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', required: true, max_length: 60 },
   { key: 'text', type: 'longtext', label_ar: 'النص', help_ar: 'سطر واحد.', max_length: 240 },
   { key: 'url', type: 'url', label_ar: 'رابط (اختياري)', help_ar: '' }
  ] }
 ],
 defaults: { bg: 'cream', data: { title: '', lead: '', layout: 'rows', items: [] } },
 render(data) {
  const head = `${blockTitle(data.title)}${data.lead ? `<p class="lead block-lead">${escapeHtml(data.lead)}</p>` : ''}`;
  const titleOf = (it) => (it.url ? `<a href="${escapeHtml(it.url)}">${escapeHtml(it.title)}</a>` : escapeHtml(it.title));
  if (data.layout === 'rows') {
   return `${head}<ul class="feature-rows">${data.items.map((it) => `<li class="feature-row">${icon(it.icon, 48)}<h3>${titleOf(it)}</h3>${it.text ? `<p>${escapeHtml(it.text)}</p>` : ''}</li>`).join('')}</ul>`;
  }
  const n = Math.min(4, Math.max(2, data.items.length));
  const cls = data.layout === 'icons' ? 'feature-icons' : 'feature-cols';
  return `${head}<div class="grid cols-${n} ${cls}">${data.items.map((it) => `<div class="feature-item">${icon(it.icon, 48)}<h3>${titleOf(it)}</h3>${it.text ? `<p>${escapeHtml(it.text)}</p>` : ''}</div>`).join('')}</div>`;
 }
};

export const services_list = {
 type: 'services_list',
 label_ar: 'قائمة الخدمات',
 description_ar: 'تعرض الخدمات المنشورة كلها أو مختارة منها بصفوف.',
 icon: 'activities',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'lead', type: 'longtext', label_ar: 'السطر', help_ar: '', max_length: 240 },
  { key: 'mode', type: 'select', label_ar: 'الوضع', help_ar: '', options: [{ value: 'all', label_ar: 'كل الخدمات' }, { value: 'selected', label_ar: 'خدمات مختارة' }], default: 'all' },
  { key: 'services', type: 'list', label_ar: 'الخدمات المختارة', help_ar: 'تُستخدم عند اختيار «خدمات مختارة».', min_items: 0, max_items: 12, fields: [
   { key: 'slug', type: 'service_select', label_ar: 'الخدمة', help_ar: '', required: true }
  ] }
 ],
 defaults: { bg: 'cream', data: { title: '', lead: '', mode: 'all', services: [] } },
 async load() { return { services: await getServices() }; },
 render(data, ctx, loaded) {
  let list = loaded.services || [];
  if (data.mode === 'selected') {
   const wanted = (data.services || []).map((x) => x.slug);
   list = wanted.map((slug) => list.find((s) => s.slug === slug)).filter(Boolean);
  }
  return `${blockTitle(data.title)}${data.lead ? `<p class="lead block-lead">${escapeHtml(data.lead)}</p>` : ''}<ul class="feature-rows">${list.map(serviceRow).join('')}</ul>`;
 }
};

export function guideRow(g) {
 const cover = g.cover_path ? img({ src: g.cover_path, alt: '' }) : '';
 return `<li class="guide-row${cover ? ' has-cover' : ''}">${cover}<div><h3><a href="/guide/${escapeHtml(g.slug)}">${escapeHtml(g.title)}</a></h3>${g.published_at ? `<time datetime="${escapeHtml(g.published_at)}">${escapeHtml(formatDay(g.published_at))}</time>` : ''}${g.excerpt ? `<p>${escapeHtml(g.excerpt)}</p>` : ''}</div></li>`;
}

export const guides_list = {
 type: 'guides_list',
 label_ar: 'قائمة المقالات',
 description_ar: 'أحدث مقالات دليل المسافر المنشورة.',
 icon: 'file',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'limit', type: 'number', label_ar: 'عدد المقالات', help_ar: 'من 3 إلى 12.', min: 3, max: 12, default: 6 },
  { key: 'show_all_button', type: 'toggle', label_ar: 'زر «كل المقالات»', help_ar: 'يقود إلى صفحة دليل المسافر.' }
 ],
 defaults: { bg: 'white', data: { title: '', limit: 6, show_all_button: true } },
 async load(data) { return { guides: await getGuides(Number(data.limit || 6)) }; },
 render(data, ctx, loaded) {
  const list = loaded.guides || [];
  const empty = list.length ? '' : '<p class="muted">لا مقالات منشورة بعد.</p>';
  return `${blockTitle(data.title)}<ul class="guide-rows">${list.map(guideRow).join('')}</ul>${empty}${data.show_all_button ? `<div class="form-actions">${button({ label: 'كل المقالات', href: '/guide', style: 'secondary' })}</div>` : ''}`;
 }
};

export const faq = {
 type: 'faq',
 label_ar: 'الأسئلة الشائعة',
 description_ar: 'أسئلة مجموعة معينة أو كلها، قابلة للطي، مع بيانات FAQPage لمحركات البحث.',
 icon: 'alert',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'group', type: 'faq_group_select', label_ar: 'المجموعة', help_ar: 'اتركها فارغة لعرض الكل.' }
 ],
 defaults: { bg: 'white', data: { title: '', group: '' } },
 async load(data) { return { faqs: await getFaqs(data.group || '') }; },
 render(data, ctx, loaded) {
  const list = loaded.faqs || [];
  if (list.length) ctx.jsonLd.push({ kind: 'faq', items: list.map((f) => ({ question: f.question, answerText: f.answer.replace(/[#*>\-]/g, '').trim() })) });
  return `${blockTitle(data.title)}<div class="faq-list">${list.map((f) => `<details class="faq-item"><summary><span>${escapeHtml(f.question)}</span>${icon('chevron', 24)}</summary><div class="prose">${renderMarkdown(f.answer)}</div></details>`).join('')}</div>`;
 }
};

export const table = {
 type: 'table',
 label_ar: 'جدول',
 description_ar: 'جدول بيانات حتى 5 أعمدة و30 صفًا.',
 icon: 'menu',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'columns', type: 'list', label_ar: 'الأعمدة', help_ar: 'حتى 5 أعمدة.', min_items: 1, max_items: 5, fields: [
   { key: 'label', type: 'text', label_ar: 'عنوان العمود', help_ar: '', required: true, max_length: 60 }
  ] },
  { key: 'rows', type: 'list', label_ar: 'الصفوف', help_ar: 'حتى 30 صفًا، خلية لكل عمود.', min_items: 1, max_items: 30, fields: [
   { key: 'c1', type: 'text', label_ar: 'الخلية 1', help_ar: '', max_length: 200 },
   { key: 'c2', type: 'text', label_ar: 'الخلية 2', help_ar: '', max_length: 200 },
   { key: 'c3', type: 'text', label_ar: 'الخلية 3', help_ar: '', max_length: 200 },
   { key: 'c4', type: 'text', label_ar: 'الخلية 4', help_ar: '', max_length: 200 },
   { key: 'c5', type: 'text', label_ar: 'الخلية 5', help_ar: '', max_length: 200 }
  ] }
 ],
 defaults: { bg: 'white', data: { title: '', columns: [{ label: '' }], rows: [{ c1: '' }] } },
 render(data) {
  const n = data.columns.length;
  const head = data.columns.map((c) => `<th scope="col">${escapeHtml(c.label)}</th>`).join('');
  const body = data.rows.map((r) => `<tr>${Array.from({ length: n }, (_, i) => `<td>${escapeHtml(r[`c${i + 1}`] || '')}</td>`).join('')}</tr>`).join('');
  return `${blockTitle(data.title)}<div class="table-wrap"><table class="table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
 }
};

export const blocks = [feature_list, services_list, guides_list, faq, table];
