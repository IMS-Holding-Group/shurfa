// الهيكل العام لكل صفحة: الرأس، التذييل، شريط الإعلان، زر واتساب، شريط الموافقة، السكربتات
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeHtml, attrs, button, jsonForScript } from './components.js';
import { icon } from './icons.js';
import { headTags, jsonLd } from './seo.js';
import { publicTrackingConfig, hasTrackingEnabled } from '../services/tracking.js';
import { isSafeUrl } from '../cms/urls.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const LOGO_DIR = path.join(ROOT, 'assets', 'images', 'logo');
const LOGO_NAMES = ['logo-horizontal', 'logo-horizontal-white', 'logo-monogram', 'logo-monogram-white'];

// يفحص ملفات الشعار الموجودة فعلًا (svg أو png) مرة واحدة عند الإقلاع
export function detectLogos() {
 const out = {};
 for (const name of LOGO_NAMES) {
  for (const ext of ['svg', 'png']) {
   if (existsSync(path.join(LOGO_DIR, `${name}.${ext}`))) { out[name] = `/assets/images/logo/${name}.${ext}`; break; }
  }
 }
 return out;
}

let logos = detectLogos();
export function refreshLogos() { logos = detectLogos(); return logos; }
export function getLogos() { return logos; }

export const SOCIAL_LABELS = { x: 'إكس', instagram: 'إنستغرام', tiktok: 'تيك توك', snapchat: 'سناب شات', youtube: 'يوتيوب', linkedin: 'لينكدإن' };

// زر الدعوة الرئيسي حسب حالة التطبيق
export function appCtaButton(settings, location, style = 'primary') {
 const status = settings.app_status || 'coming_soon';
 if (status === 'available') return button({ label: 'حمّل التطبيق', href: '/app', style, track: 'cta_click', trackLabel: 'download_app', trackLocation: location });
 return button({ label: 'سجّل اهتمامك', href: '/app#get', style, track: 'cta_click', trackLabel: 'register_interest', trackLocation: location });
}

function renderLogo({ dark = false, link = true }) {
 const wide = dark ? logos['logo-horizontal-white'] : logos['logo-horizontal'];
 const mono = dark ? logos['logo-monogram-white'] : logos['logo-monogram'];
 if (!wide && !mono) {
  return link && !dark ? `<a class="logo logo-fallback" href="/">شُرفة</a>` : (dark ? '' : `<span class="logo logo-fallback">شُرفة</span>`);
 }
 const imgs = [
  wide ? `<img class="logo-wide" src="${escapeHtml(wide)}" alt="شُرفة" height="40">` : '',
  mono ? `<img class="logo-mono" src="${escapeHtml(mono)}" alt="شُرفة" height="32">` : ''
 ].join('');
 return link ? `<a class="logo" href="/" aria-label="شُرفة، الرئيسية">${imgs}</a>` : `<span class="logo">${imgs}</span>`;
}

function renderHeader(ctx) {
 const items = ctx.menus.main || [];
 const nav = items.map((it) => `<li><a${attrs({ href: it.href, 'aria-current': ctx.path === it.href ? 'page' : undefined, target: it.new_tab ? '_blank' : undefined, rel: it.new_tab ? 'noopener noreferrer' : undefined })}>${escapeHtml(it.label)}</a></li>`).join('');
 return `<header class="site-header"><div class="container header-inner">
${renderLogo({})}
<button class="nav-toggle btn btn-quiet btn-icon" type="button" aria-controls="site-nav" aria-expanded="false" aria-label="فتح القائمة" data-nav-toggle>${icon('menu', 24)}</button>
<nav class="site-nav" id="site-nav" aria-label="التنقل الرئيسي"><ul class="nav-list">${nav}</ul><div class="nav-cta">${appCtaButton(ctx.settings, 'header')}</div></nav>
</div></header>`;
}

function renderFooter(ctx) {
 const s = ctx.settings;
 const groups = ['footer_1', 'footer_2', 'footer_3', 'footer_4'].map((key) => {
  const g = ctx.menus[key];
  if (!g || !g.items.length) return '';
  const links = g.items.map((it) => `<li><a${attrs({ href: it.href, target: it.new_tab ? '_blank' : undefined, rel: it.new_tab ? 'noopener noreferrer' : undefined })}>${escapeHtml(it.label)}</a></li>`).join('');
  return `<div class="footer-group"><h2>${escapeHtml(g.title || '')}</h2><ul>${links}</ul></div>`;
 }).join('');
 const social = Object.entries(s.social || {}).filter(([k, v]) => SOCIAL_LABELS[k] && typeof v === 'string' && v.startsWith('https://'));
 const socialHtml = social.length ? `<ul class="social-list" aria-label="وسائل التواصل">${social.map(([k, v]) => `<li><a href="${escapeHtml(v)}" rel="noopener noreferrer" target="_blank">${escapeHtml(SOCIAL_LABELS[k])}</a></li>`).join('')}</ul>` : '';
 const meta = [];
 if (s.contact_email) meta.push(`<p><a href="mailto:${escapeHtml(s.contact_email)}">${escapeHtml(s.contact_email)}</a></p>`);
 if (s.contact_phone) meta.push(`<p><a href="tel:${escapeHtml(String(s.contact_phone).replace(/\s/g, ''))}">${escapeHtml(s.contact_phone)}</a></p>`);
 if (s.commercial_registration) meta.push(`<p>السجل التجاري: ${escapeHtml(s.commercial_registration)}</p>`);
 if (s.tourism_permit) meta.push(`<p>رقم اعتماد النشاط السياحي: ${escapeHtml(s.tourism_permit)}</p>`);
 const logo = renderLogo({ dark: true, link: false });
 return `<footer class="site-footer on-dark"><div class="container footer-inner">
<div class="footer-brand">${logo}<p>تجارب عُمان في مكان واحد</p>${socialHtml}<div class="footer-meta">${meta.join('')}</div></div>
<div class="footer-groups">${groups}<div class="footer-group"><h2>الموقع</h2><ul>
<li><button type="button" data-consent-open>إعدادات الخصوصية</button></li>
<li><a href="/admin/login">دخول الفريق</a></li></ul></div></div>
</div>
<div class="container"><p class="support footer-copy">© 2026م شُرفة. جميع الحقوق محفوظة.</p></div>
<div class="color-bars" aria-hidden="true"><span></span><span></span><span></span><span></span></div></footer>`;
}

function renderAnnouncement(ctx) {
 const a = ctx.settings.announcement;
 if (!a || !a.enabled || !a.text) return '';
 if (ctx.cookies?.shurfah_ann === '1') return '';
 const link = a.url && isSafeUrl(a.url) ? ` <a href="${escapeHtml(a.url)}">المزيد</a>` : '';
 return `<div class="announcement" data-announcement role="region" aria-label="إعلان"><p>${escapeHtml(a.text)}${link}</p><button class="btn btn-quiet btn-small btn-icon" type="button" aria-label="إغلاق الإعلان" data-announcement-close>${icon('close', 24)}</button></div>`;
}

function renderWhatsapp(ctx) {
 const s = ctx.settings;
 if (!s.whatsapp_enabled || !s.whatsapp_number) return '';
 return `<a class="whatsapp-btn" href="https://wa.me/${escapeHtml(s.whatsapp_number)}" rel="noopener noreferrer" target="_blank" aria-label="تواصل عبر واتساب" data-track="cta_click" data-track-label="whatsapp" data-track-location="floating">${icon('whatsapp', 32)}</a>`;
}

function renderConsent(ctx) {
 if (!hasTrackingEnabled(ctx.settings) || ctx.settings.consent_banner_enabled === false) return '';
 return `<div class="consent-bar on-dark" data-consent-bar hidden role="region" aria-label="الموافقة على أدوات القياس">
<p>نستخدم أدوات قياس لنفهم كيف يُستخدم الموقع ونحسّنه. تعمل بعد موافقتك. <a href="/privacy">سياسة الخصوصية</a></p>
<div class="consent-actions"><button class="btn" type="button" data-consent="granted">أوافق</button><button class="btn btn-secondary" type="button" data-consent="denied">رفض غير الضروري</button></div>
</div>`;
}

// يبني صفحة كاملة حول محتوى main
export function renderLayout(ctx, { title, description, ogImage, noindex, bodyHtml, jsonLdItems = [], type, preview = false, bodyClass = '' }) {
 const s = ctx.settings;
 const config = publicTrackingConfig(s);
 const favicon = logos['logo-monogram'] ? '/favicon.ico' : '/favicon.ico';
 const head = headTags({
  siteUrl: ctx.siteUrl,
  path: ctx.path,
  title,
  description,
  ogImage: ogImage || (s.default_og_image ? s.default_og_image : ''),
  noindex: noindex || s.site_noindex === true || preview,
  searchConsoleToken: s.search_console_token,
  type
 });
 const scripts = ['nav.js', 'forms.js', 'video.js', 'consent.js', 'analytics.js', 'track.js'].map((f) => `<script src="/assets/js/site/${f}" defer></script>`).join('\n');
 return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
<link rel="icon" href="${favicon}">
<link rel="stylesheet" href="/assets/css/tokens.css">
<link rel="stylesheet" href="/assets/css/base.css">
<link rel="stylesheet" href="/assets/css/components.css">
<link rel="stylesheet" href="/assets/css/site.css">
${jsonLdItems.map(jsonLd).join('\n')}
</head>
<body class="site${bodyClass ? ` ${bodyClass}` : ''}">
<a class="skip-link" href="#main">تخطَّ إلى المحتوى</a>
${preview ? '<div class="preview-bar" role="status">معاينة: هذا المحتوى غير منشور بعد</div>' : ''}
${renderAnnouncement(ctx)}
${renderHeader(ctx)}
<main id="main" tabindex="-1">
${bodyHtml}
</main>
${renderFooter(ctx)}
${renderWhatsapp(ctx)}
${renderConsent(ctx)}
<script type="application/json" id="site-config">${jsonForScript(config)}</script>
${scripts}
<script type="module" src="/assets/js/site/passport.js"></script>
</body>
</html>`;
}

// صفحة حالة مسطحة (404 و500 والصيانة)
export function renderStatusPage(ctx, { code, title, text, showHome = true }) {
 const body = `<section class="status-page"><p class="status-code" aria-hidden="true">${code}</p><h1>${escapeHtml(title)}</h1><p class="lead">${escapeHtml(text)}</p>${showHome ? button({ label: 'العودة إلى الرئيسية', href: '/', style: 'secondary' }) : ''}</section>`;
 return renderLayout(ctx, { title: `${title} | شُرفة`, description: text, noindex: true, bodyHtml: body });
}
