// محوّل Markdown المبسّط الآمن: يُستخدم في الخادم وفي معاينة اللوحة
// المسموح: ## و### عناوين، فقرات، **عريض**، *مائل*، قوائم - و1.، روابط [نص](رابط)، صور ![بديل](رابط)
import { isSafeUrl, isAllowedImage, isExternal } from './urls.js';

export function escapeHtml(value) {
 return String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
}

// التنسيقات داخل السطر: الصور ثم الروابط ثم العريض ثم المائل، على نص مهرَّب مسبقًا
function inline(text, ctx) {
 let out = text;
 out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (m, alt, src) => {
  if (!isAllowedImage(src, ctx.storageOrigin)) return escapeHtml(alt);
  return `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy">`;
 });
 out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => {
  if (!isSafeUrl(href)) return label;
  const rel = isExternal(href) ? ' rel="noopener noreferrer" target="_blank"' : '';
  return `<a href="${escapeHtml(href)}"${rel}>${label}</a>`;
 });
 out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
 out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
 return out;
}

// الخطوة الأولى: تهريب كل HTML، ثم التقسيم إلى كتل بالأسطر الفارغة
export function renderMarkdown(source, ctx = {}) {
 const safe = escapeHtml(String(source || '').replace(/\r\n?/g, '\n'));
 const blocks = safe.split(/\n{2,}/);
 const html = [];
 for (const raw of blocks) {
  const block = raw.trim();
  if (!block) continue;
  const lines = block.split('\n');
  if (/^### /.test(block)) { html.push(`<h3>${inline(block.slice(4).trim(), ctx)}</h3>`); continue; }
  if (/^## /.test(block)) { html.push(`<h2>${inline(block.slice(3).trim(), ctx)}</h2>`); continue; }
  if (lines.every((l) => /^- /.test(l))) {
   html.push(`<ul>${lines.map((l) => `<li>${inline(l.slice(2).trim(), ctx)}</li>`).join('')}</ul>`);
   continue;
  }
  if (lines.every((l) => /^\d+\. /.test(l))) {
   html.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\d+\. /, '').trim(), ctx)}</li>`).join('')}</ol>`);
   continue;
  }
  const soloImage = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(block);
  if (soloImage) {
   const img = inline(block, ctx);
   html.push(img.startsWith('<img') ? `<figure>${img}</figure>` : `<p>${img}</p>`);
   continue;
  }
  html.push(`<p>${lines.map((l) => inline(l.trim(), ctx)).join('<br>')}</p>`);
 }
 return html.join('\n');
}

// يستخرج أول فقرة نصية خالية من التنسيق لاستخدامها وصفًا افتراضيًا للسيو
export function firstParagraph(source, max = 155) {
 const blocks = String(source || '').replace(/\r\n?/g, '\n').split(/\n{2,}/);
 for (const b of blocks) {
  const t = b.trim();
  if (!t || /^#{2,3} /.test(t) || /^- /.test(t) || /^\d+\. /.test(t) || /^!\[/.test(t)) continue;
  const plain = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?/g, '').replace(/\n/g, ' ');
  return plain.length > max ? `${plain.slice(0, max - 1).trim()}…` : plain;
 }
 return '';
}
