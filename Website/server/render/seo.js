// العناوين والوصف وOpen Graph وJSON-LD
import { escapeHtml, jsonForScript } from './components.js';

const SITE_NAME = 'شُرفة';

export function pageTitle(title, custom) {
 if (custom) return custom;
 if (!title || title === 'الرئيسية') return `${SITE_NAME} | تجارب عُمان في مكان واحد`;
 return `${title} | ${SITE_NAME}`;
}

// يبني وسوم head الخاصة بالسيو لصفحة واحدة
export function headTags({ siteUrl, path, title, description, ogImage, noindex, searchConsoleToken, type = 'website' }) {
 const canonical = `${siteUrl}${path === '/' ? '/' : path}`;
 const desc = description || 'منصة سياحية عربية أولًا تجمع سبع خدمات في حساب واحد وسلة واحدة وحجز واحد، مبنية من داخل عُمان.';
 const tags = [
  `<title>${escapeHtml(title)}</title>`,
  `<meta name="description" content="${escapeHtml(desc)}">`,
  `<link rel="canonical" href="${escapeHtml(canonical)}">`,
  `<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}">`,
  `<meta property="og:type" content="${escapeHtml(type)}">`,
  `<meta property="og:site_name" content="${SITE_NAME}">`,
  `<meta property="og:locale" content="ar_OM">`,
  `<meta property="og:title" content="${escapeHtml(title)}">`,
  `<meta property="og:description" content="${escapeHtml(desc)}">`,
  `<meta property="og:url" content="${escapeHtml(canonical)}">`
 ];
 if (ogImage) tags.push(`<meta property="og:image" content="${escapeHtml(ogImage)}">`);
 if (searchConsoleToken) tags.push(`<meta name="google-site-verification" content="${escapeHtml(searchConsoleToken)}">`);
 return tags.join('\n');
}

export function jsonLd(obj) {
 return `<script type="application/ld+json">${jsonForScript(obj)}</script>`;
}

export function organizationLd({ siteUrl, logoUrl, social = {}, email, phone }) {
 const sameAs = Object.values(social || {}).filter((v) => typeof v === 'string' && v.startsWith('https://'));
 const org = { '@context': 'https://schema.org', '@type': 'Organization', name: SITE_NAME, url: siteUrl, slogan: 'تجارب عُمان في مكان واحد' };
 if (logoUrl) org.logo = logoUrl;
 if (sameAs.length) org.sameAs = sameAs;
 if (email) org.email = email;
 if (phone) org.telephone = phone;
 return org;
}

export function websiteLd({ siteUrl }) {
 return { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE_NAME, url: siteUrl, inLanguage: 'ar' };
}

export function articleLd({ siteUrl, path, title, description, published, modified, image }) {
 const a = { '@context': 'https://schema.org', '@type': 'Article', headline: title, description, inLanguage: 'ar', url: `${siteUrl}${path}`, datePublished: published, dateModified: modified || published, author: { '@type': 'Organization', name: SITE_NAME }, publisher: { '@type': 'Organization', name: SITE_NAME } };
 if (image) a.image = image;
 return a;
}

export function faqLd(items) {
 return {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answerText } }))
 };
}
