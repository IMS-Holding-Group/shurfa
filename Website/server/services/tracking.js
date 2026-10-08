// بناء إعدادات التتبع العامة وسياسة CSP الديناميكية والتحقق من معرّفات أدوات القياس
// هذا الملف وحده يحتوي جدول مضيفات CSP الخاصة بأدوات التتبع

export const TRACKING_PATTERNS = {
 ga4_id: /^G-[A-Z0-9]{6,12}$/,
 gtm_id: /^GTM-[A-Z0-9]{4,10}$/,
 search_console_token: /^[A-Za-z0-9_-]{20,100}$/,
 meta_pixel_id: /^[0-9]{10,20}$/,
 snap_pixel_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
 tiktok_pixel_id: /^[A-Z0-9]{10,30}$/,
 clarity_id: /^[a-z0-9]{8,12}$/,
 whatsapp_number: /^[1-9][0-9]{7,14}$/
};

export const TRACKING_LABELS = {
 ga4_id: 'Google Analytics 4',
 gtm_id: 'Google Tag Manager',
 meta_pixel_id: 'Meta Pixel',
 snap_pixel_id: 'Snapchat Pixel',
 tiktok_pixel_id: 'TikTok Pixel',
 clarity_id: 'Microsoft Clarity'
};

// يعيد رسالة خطأ عربية أو سلسلة فارغة إن كانت القيمة صالحة (الفراغ مسموح دائمًا)
export function validateTrackingId(key, value) {
 const v = String(value ?? '').trim();
 if (!v) return '';
 const pattern = TRACKING_PATTERNS[key];
 if (!pattern) return 'حقل غير معروف.';
 if (!pattern.test(v)) return 'صيغة المعرّف غير صحيحة. انسخه كما يظهر في لوحة المزوّد.';
 return '';
}

const HOST_RE = /^https:\/\/(\*\.)?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i;

// يفحص قائمة المضيفات الإضافية المفصولة بمسافات أو فواصل أو أسطر
export function parseExtraHosts(value) {
 const hosts = String(value || '').split(/[\s,]+/).map((h) => h.trim()).filter(Boolean);
 const bad = hosts.filter((h) => !HOST_RE.test(h));
 return { hosts, bad };
}

const CSP_HOSTS = {
 ga4_id: {
  script: ['https://www.googletagmanager.com'],
  connect: ['https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'],
  img: ['https://www.google-analytics.com', 'https://www.googletagmanager.com']
 },
 gtm_id: {
  script: ['https://www.googletagmanager.com'],
  connect: ['https://www.googletagmanager.com'],
  img: ['https://www.googletagmanager.com']
 },
 meta_pixel_id: { script: ['https://connect.facebook.net'], connect: ['https://www.facebook.com'], img: ['https://www.facebook.com'] },
 snap_pixel_id: { script: ['https://sc-static.net'], connect: ['https://tr.snapchat.com'], img: ['https://tr.snapchat.com'] },
 tiktok_pixel_id: { script: ['https://analytics.tiktok.com'], connect: ['https://analytics.tiktok.com'], img: ['https://analytics.tiktok.com'] },
 clarity_id: { script: ['https://www.clarity.ms'], connect: ['https://*.clarity.ms', 'https://c.bing.com'], img: ['https://*.clarity.ms', 'https://c.bing.com'] }
};

export const YOUTUBE_FRAME_HOST = 'https://www.youtube-nocookie.com';

function enabled(settings, key) {
 const v = String(settings?.[key] ?? '').trim();
 return v && !validateTrackingId(key, v);
}

// دالة نقية: تأخذ الإعدادات والنطاق وتعيد سلسلة ترويسة CSP
// scope: 'site' | 'admin' | 'preview'، وhasVideo يضيف إطار YouTube عند وجود كتلة فيديو في الصفحة
export function buildCsp(settings = {}, scope = 'site', { supabaseOrigin = '', hasVideo = false } = {}) {
 const script = new Set(["'self'"]);
 const connect = new Set(["'self'"]);
 const img = new Set(["'self'", 'data:']);
 const frame = new Set();
 if (supabaseOrigin) img.add(supabaseOrigin);
 if (scope === 'site' || scope === 'preview') {
  for (const key of Object.keys(CSP_HOSTS)) {
   if (!enabled(settings, key)) continue;
   CSP_HOSTS[key].script.forEach((h) => script.add(h));
   CSP_HOSTS[key].connect.forEach((h) => connect.add(h));
   CSP_HOSTS[key].img.forEach((h) => img.add(h));
  }
  const { hosts, bad } = parseExtraHosts(settings.extra_csp_hosts);
  if (bad.length === 0) hosts.forEach((h) => { script.add(h); connect.add(h); img.add(h); });
  if (hasVideo) frame.add(YOUTUBE_FRAME_HOST);
 }
 if (scope === 'admin') { frame.add("'self'"); if (supabaseOrigin) connect.add(supabaseOrigin); }
 const parts = [
  "default-src 'self'",
  `img-src ${[...img].join(' ')}`,
  "style-src 'self'",
  `script-src ${[...script].join(' ')}`,
  "font-src 'self'",
  `connect-src ${[...connect].join(' ')}`,
  frame.size ? `frame-src ${[...frame].join(' ')}` : "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  scope === 'preview' ? "frame-ancestors 'self'" : "frame-ancestors 'none'"
 ];
 return parts.join('; ');
}

// الإعدادات العامة التي تصل للمتصفح في كتلة site-config: المعرّفات المفعّلة فقط
export function publicTrackingConfig(settings = {}) {
 const out = {};
 const gtm = enabled(settings, 'gtm_id');
 for (const key of Object.keys(TRACKING_LABELS)) {
  if (!enabled(settings, key)) continue;
  if (key === 'ga4_id' && gtm) continue;
  out[key] = String(settings[key]).trim();
 }
 out.consent_banner_enabled = settings.consent_banner_enabled !== false;
 return out;
}

// أدوات القياس المفعّلة حاليًا لعرضها في صفحة الخصوصية
export function enabledToolLabels(settings = {}) {
 return Object.keys(TRACKING_LABELS).filter((k) => enabled(settings, k)).map((k) => TRACKING_LABELS[k]);
}

export function hasTrackingEnabled(settings = {}) {
 return Object.keys(TRACKING_LABELS).some((k) => enabled(settings, k));
}
