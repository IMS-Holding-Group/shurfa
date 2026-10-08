// ترتيب الكتل ورسم الصفحة: كل كتلة تُغلَّف بقسم بعرض كامل بخلفيتها المختارة
import { escapeHtml, chip, button, img } from './components.js';
import { icon } from './icons.js';
import { renderMarkdown, firstParagraph } from './markdown.js';
import { renderLayout, appCtaButton } from './layout.js';
import { pageTitle, organizationLd, websiteLd, articleLd, faqLd } from './seo.js';
import { getBlock, BG_KEYS } from '../cms/blocks/registry.js';
import { serviceRow, guideRow, SERVICE_STATUS_LABEL } from '../cms/blocks/lists.js';
import { renderFormHtml } from '../cms/blocks/interactive.js';
import { getForm } from '../cms/content.js';
import { formatDay } from '../services/format.js';
import { enabledToolLabels } from '../services/tracking.js';
import { getLogos } from './layout.js';

function sectionOpen(block, extraClass = '') {
 const bg = BG_KEYS.includes(block.bg) ? block.bg : 'cream';
 const classes = ['block', `block-${block.type}`, `bg-${bg}`, bg === 'ink' ? 'on-dark' : '', extraClass].filter(Boolean).join(' ');
 const id = block.anchor ? ` id="${escapeHtml(block.anchor)}"` : '';
 return `<section class="${classes}"${id}>`;
}

// يرسم قائمة الكتل ويعيد HTML وبيانات JSON-LD المجمّعة
export async function renderBlocks(blocks, ctx) {
 ctx.jsonLd = ctx.jsonLd || [];
 ctx.firstHero = true;
 const visible = (blocks || []).filter((b) => b && !b.hidden);
 const prepared = await Promise.all(visible.map(async (block, i) => {
  const spec = getBlock(block.type);
  if (!spec) return null;
  if (!spec.load) return { block, spec, loaded: {}, i };
  try { return { block, spec, loaded: await spec.load(block.data, ctx), i }; } catch (err) {
   console.error(`Failed to load block ${block.type}:`, err?.message || err);
   return null;
  }
 }));
 const parts = [];
 let hasVideo = false;
 let prevBg = null;
 for (const item of prepared) {
  if (!item) continue;
  const { block, spec, loaded, i } = item;
  ctx.isFirstBlock = i === 0;
  if (block.type === 'video') hasVideo = true;
  if (block.type === 'spacer') { parts.push(`<div class="block-spacer-${block.data.size === '96' ? '96' : '48'} bg-${escapeHtml(block.bg)}"></div>`); continue; }
  let inner = '';
  try { inner = spec.render(block.data, ctx, loaded); } catch (err) { console.error(`Failed to render block ${block.type}:`, err?.message || err); continue; }
  const sameBg = prevBg === block.bg ? 'same-bg' : '';
  parts.push(`${sectionOpen(block, sameBg)}<div class="container">${inner}</div></section>`);
  prevBg = block.bg;
 }
 return { html: parts.join('\n'), hasVideo };
}

function collectJsonLd(ctx, extra = []) {
 const items = [...extra];
 for (const j of ctx.jsonLd || []) if (j.kind === 'faq') items.push(faqLd(j.items));
 return items;
}

// صفحة من جدول pages بكتلها
export async function renderPage(ctx, page, { preview = false } = {}) {
 ctx.isHome = page.slug === 'home';
 let blocks = page.blocks || [];
 if (page.slug === 'privacy') blocks = await withPrivacyTools(blocks, ctx);
 const { html, hasVideo } = await renderBlocks(blocks, ctx);
 ctx.hasVideo = hasVideo;
 const logos = getLogos();
 const extra = ctx.isHome ? [
  organizationLd({ siteUrl: ctx.siteUrl, logoUrl: logos['logo-horizontal'] ? `${ctx.siteUrl}${logos['logo-horizontal']}` : '', social: ctx.settings.social, email: ctx.settings.contact_email, phone: ctx.settings.contact_phone }),
  websiteLd({ siteUrl: ctx.siteUrl })
 ] : [];
 const description = page.seo_description || firstParagraph(firstTextOf(blocks));
 return renderLayout(ctx, {
  title: pageTitle(page.title, page.seo_title),
  description,
  ogImage: page.og_image_path,
  noindex: page.noindex,
  bodyHtml: html || '<section class="block bg-cream"><div class="container"><p class="muted">لا محتوى منشور في هذه الصفحة بعد.</p></div></section>',
  jsonLdItems: collectJsonLd(ctx, extra),
  preview
 });
}

function firstTextOf(blocks) {
 for (const b of blocks || []) {
  if (b.hidden) continue;
  if (b.data?.lead) return b.data.lead;
  if (b.data?.body) return b.data.body;
 }
 return '';
}

// صفحة الخصوصية: إلحاق قائمة أدوات القياس المفعّلة حاليًا بنص الكتلة الأولى
async function withPrivacyTools(blocks, ctx) {
 const tools = enabledToolLabels(ctx.settings);
 const list = tools.length ? tools.map((t) => `<li>${escapeHtml(t)}</li>`).join('') : '<li>لا أدوات قياس مفعّلة حاليًا.</li>';
 const extraHtml = `<h2>أدوات القياس المفعّلة حاليًا</h2><ul class="prose">${list}</ul>`;
 ctx.extraHtml = extraHtml;
 return blocks;
}

// صفحة خدمة واحدة
export async function renderServicePage(ctx, service, allServices, { preview = false } = {}) {
 const s = service;
 const others = (allServices || []).filter((x) => x.slug !== s.slug);
 const statusChip = s.slug === 'passport' && ctx.settings.passport_free ? chip('مجاني عند الإطلاق', 'purple') : chip(SERVICE_STATUS_LABEL[s.service_status] || '', s.service_status === 'available' ? s.accent : 'sand');
 const highlights = (s.highlights || []).length ? `<ul class="service-highlights">${s.highlights.map((h) => `<li>${icon('check', 24)}<span>${escapeHtml(h)}</span></li>`).join('')}</ul>` : '';
 const cover = s.cover_path ? img({ src: s.cover_path, alt: s.title, cls: 'service-cover', lazy: false }) : '';
 let ctaSection = '';
 if (s.service_status === 'coming_soon') {
  const def = await getForm('waitlist');
  ctaSection = `<section class="block bg-purple_soft"><div class="container"><h2>هذه الخدمة قريبًا. سجّل اهتمامك لنخبرك عند الإطلاق.</h2>${await renderFormHtml(def, ctx)}</div></section>`;
 } else {
  ctaSection = `<section class="block bg-ink on-dark"><div class="container"><div class="cta-band"><div><h2>احجز من التطبيق</h2><p class="lead">كل تجربة في شُرفة بسعرها النهائي ومدتها وما يشمله السعر.</p></div><div>${appCtaButton(ctx.settings, 'service')}</div></div></div></section>`;
 }
 const body = `<section class="block bg-cream"><div class="container">
<div class="service-head">${icon(s.icon_key, 48)}${statusChip}</div>
<h1>${escapeHtml(s.title)}</h1>${s.tagline ? `<p class="lead">${escapeHtml(s.tagline)}</p>` : ''}${highlights}${cover}</div></section>
<section class="block bg-white"><div class="container narrow prose">${renderMarkdown(s.body || '')}</div></section>
${ctaSection}
<section class="block bg-cream"><div class="container"><h2 class="block-title">خدمات أخرى</h2><ul class="feature-rows">${others.map(serviceRow).join('')}</ul></div></section>`;
 return renderLayout(ctx, {
  title: pageTitle(s.title, s.seo_title),
  description: s.seo_description || s.tagline || firstParagraph(s.body),
  ogImage: s.og_image_path || s.cover_path,
  noindex: s.noindex,
  bodyHtml: body,
  jsonLdItems: collectJsonLd(ctx),
  preview
 });
}

// صفحة مقال
export async function renderGuidePage(ctx, guide, others, { preview = false } = {}) {
 const g = guide;
 const rest = (others || []).filter((x) => x.slug !== g.slug).slice(0, 3);
 const cover = g.cover_path ? img({ src: g.cover_path, alt: g.title, cls: 'guide-cover', lazy: false }) : '';
 const body = `<article><section class="block bg-cream"><div class="container narrow">
<h1>${escapeHtml(g.title)}</h1>
<p class="article-meta">${g.published_at ? `<time datetime="${escapeHtml(g.published_at)}">${escapeHtml(formatDay(g.published_at))}</time>` : ''}</p>
${g.excerpt ? `<p class="lead">${escapeHtml(g.excerpt)}</p>` : ''}${cover}</div></section>
<section class="block bg-white"><div class="container narrow prose">${renderMarkdown(g.body || '')}</div></section></article>
${rest.length ? `<section class="block bg-cream"><div class="container"><h2 class="block-title">مقالات أخرى</h2><ul class="guide-rows">${rest.map(guideRow).join('')}</ul><div class="form-actions">${button({ label: 'كل المقالات', href: '/guide', style: 'secondary' })}</div></div></section>` : ''}`;
 const description = g.seo_description || g.excerpt || firstParagraph(g.body);
 const ld = articleLd({ siteUrl: ctx.siteUrl, path: ctx.path, title: g.title, description, published: g.published_at, modified: g.updated_at, image: g.og_image_path || g.cover_path });
 return renderLayout(ctx, {
  title: pageTitle(g.title, g.seo_title),
  description,
  ogImage: g.og_image_path || g.cover_path,
  noindex: g.noindex,
  bodyHtml: body,
  jsonLdItems: collectJsonLd(ctx, [ld]),
  type: 'article',
  preview
 });
}
