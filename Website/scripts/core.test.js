// فحوص الدوال النقية: الحاسبة، الروابط، Markdown، الكتل، CSP، وعناوين الشبكات الخاصة
import test from 'node:test';
import assert from 'node:assert/strict';
import { netSaving, breakEvenSpend, calculateTiers, formatOmr } from '../assets/js/shared/passport.js';
import { isSafeUrl, isAllowedImage } from '../assets/js/shared/urls.js';
import { renderMarkdown, escapeHtml } from '../assets/js/shared/markdown.js';
import { validateBlocks, primaryButtonWarning } from '../server/cms/blocks/validate.js';
import { buildCsp, validateTrackingId } from '../server/services/tracking.js';
import { isPrivateAddress, sign } from '../server/cms/webhooks.js';
import { formatDateTime } from '../server/services/format.js';
import { can } from '../server/rbac.js';

const bronze = { code: 'bronze', name_ar: 'برونزي', price_omr: 9, duration_days: 7, discount_min_pct: 5, discount_max_pct: 8 };

test('التوفير الصافي وحد التعادل بالبيسة', () => {
 assert.equal(netSaving(200, 5, 9), 1);
 assert.equal(Math.round(breakEvenSpend(9, 7) * 10) / 10, 128.6);
 const [row] = calculateTiers(200, [bronze]);
 assert.equal(row.saving_min, 1);
 assert.equal(row.saving_max, 7);
});

test('صيغة الريال', () => {
 assert.equal(formatOmr(1), 'ريال واحد');
 assert.equal(formatOmr(2), 'ريالان');
 assert.equal(formatOmr(5), '5 ريالات');
 assert.equal(formatOmr(11), '11 ريالًا');
 assert.equal(formatOmr(0.2), '0.200 ر.ع');
});

test('الروابط وMarkdown لا تنفّذ HTML ولا javascript', () => {
 assert.equal(isSafeUrl('javascript:alert(1)'), false);
 assert.equal(isSafeUrl('/services'), true);
 assert.equal(isSafeUrl('https://shurfah.example/a'), true);
 assert.equal(isAllowedImage('/assets/images/logo/logo-monogram.svg'), true);
 assert.equal(isAllowedImage('https://evil.example/a.png'), false);
 const html = renderMarkdown('مرحبًا <script>alert(1)</script>\n\n[اضغط](javascript:alert(1))');
 assert.equal(html.includes('<script>'), false);
 assert.equal(html.includes('javascript:'), false);
 assert.equal(html.includes('&lt;script&gt;'), true);
 assert.equal(escapeHtml('<b>').includes('<'), false);
});

test('الكتل ترفض HTML وروابط javascript وتقبل النص السليم', () => {
 const bad = validateBlocks([{ id: 'b1', type: 'text', bg: 'cream', data: { title: 'عنوان', body: '<script>alert(1)</script>', width: 'normal' } }]);
 assert.ok(bad.errors.some((e) => e.includes('HTML')));
 const js = validateBlocks([{ id: 'b2', type: 'text', bg: 'cream', data: { title: 'عنوان', body: '[رابط](javascript:alert(1))', width: 'normal' } }]);
 assert.ok(js.errors.some((e) => e.includes('الرابط غير مسموح')));
 const ok = validateBlocks([{ id: 'b3', type: 'text', bg: 'cream', data: { title: 'عنوان', body: 'فقرة قصيرة.', width: 'normal' } }]);
 assert.equal(ok.errors.length, 0);
 assert.equal(ok.blocks[0].data.body, 'فقرة قصيرة.');
 const warn = primaryButtonWarning([{ type: 'form', hidden: false, data: {} }, { type: 'app_cta', hidden: false, data: {} }]);
 assert.match(warn, /زر أساسي واحد/);
});

test('CSP فارغة بلا مضيفات، وGA4 يضيف مضيفه، والمعرّف الخاطئ يُرفض', () => {
 const empty = buildCsp({}, 'site', { supabaseOrigin: 'https://example.supabase.co' });
 assert.equal(empty.includes('googletagmanager'), false);
 assert.equal(empty.includes('youtube'), false);
 const ga = buildCsp({ ga4_id: 'G-ABC123' }, 'site', { supabaseOrigin: 'https://example.supabase.co' });
 assert.equal(ga.includes('https://www.googletagmanager.com'), true);
 const video = buildCsp({}, 'site', { supabaseOrigin: 'https://example.supabase.co', hasVideo: true });
 assert.equal(video.includes('https://www.youtube-nocookie.com'), true);
 assert.equal(validateTrackingId('ga4_id', 'G-ABC123'), '');
 assert.ok(validateTrackingId('ga4_id', '<script>'));
 assert.equal(validateTrackingId('ga4_id', ''), '');
});

test('عناوين الشبكات الخاصة والتوقيع والصلاحيات والتاريخ', () => {
 assert.equal(isPrivateAddress('127.0.0.1'), true);
 assert.equal(isPrivateAddress('10.1.2.3'), true);
 assert.equal(isPrivateAddress('192.168.1.1'), true);
 assert.equal(isPrivateAddress('8.8.8.8'), false);
 assert.equal(isPrivateAddress('224.0.0.1'), true);
 assert.equal(isPrivateAddress('192.0.0.8'), true);
 assert.equal(isPrivateAddress('198.18.0.1'), true);
 assert.equal(isPrivateAddress('::1'), true);
 assert.equal(isPrivateAddress('ff02::1'), true);
 assert.equal(isPrivateAddress('2002:0a01:0203::'), true);
 assert.equal(isPrivateAddress('2002:0808:0808::'), false);
 assert.match(sign('{"a":1}', 'secret'), /^sha256=[0-9a-f]{64}$/);
 assert.equal(can('customer_service', 'messages', 'delete'), true);
 assert.equal(can('customer_service', 'content', 'view'), false);
 assert.equal(can('operations', 'applications', 'approve'), true);
 assert.equal(can('operations', 'applications', 'delete'), false);
 const stamp = formatDateTime('2026-01-03T01:50:00Z');
 assert.equal(stamp, '2026/1/3م 5:50ص');
});
