// الملف الوحيد الذي يعرف نطاقات أدوات القياس. لا تُحمَّل أي أداة قبل تفعيلها من اللوحة وموافقة الزائر
(() => {
 const el = document.getElementById('site-config');
 let cfg = {};
 try { cfg = JSON.parse(el ? el.textContent : '{}') || {}; } catch { cfg = {}; }
 const hasAny = ['ga4_id', 'gtm_id', 'meta_pixel_id', 'snap_pixel_id', 'tiktok_pixel_id', 'clarity_id'].some((k) => cfg[k]);
 if (!hasAny) return;

 let loaded = false;
 const addScript = (src) => {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.append(s);
 };

 // وضع الموافقة الإصدار 2: الافتراضي مرفوض حتى يوافق الزائر
 window.dataLayer = window.dataLayer || [];
 window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
 window.gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied', wait_for_update: 500 });

 const grantGoogle = () => window.gtag('consent', 'update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' });

 const loadAll = () => {
  if (loaded) return;
  loaded = true;
  grantGoogle();
  if (cfg.gtm_id) {
   window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
   addScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cfg.gtm_id)}`);
  } else if (cfg.ga4_id) {
   addScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga4_id)}`);
   window.gtag('js', new Date());
   window.gtag('config', cfg.ga4_id, { allow_google_signals: false, allow_ad_personalization_signals: false });
  }
  if (cfg.meta_pixel_id) {
   if (!window.fbq) {
    const n = function fbq() { if (n.callMethod) n.callMethod.apply(n, arguments); else n.queue.push(arguments); };
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    window.fbq = n; window._fbq = n;
   }
   addScript('https://connect.facebook.net/en_US/fbevents.js');
   window.fbq('init', cfg.meta_pixel_id);
   window.fbq('track', 'PageView');
  }
  if (cfg.snap_pixel_id) {
   if (!window.snaptr) {
    const a = function snaptr() { if (a.handleRequest) a.handleRequest.apply(a, arguments); else a.queue.push(arguments); };
    a.queue = [];
    window.snaptr = a;
   }
   addScript('https://sc-static.net/scevent.min.js');
   window.snaptr('init', cfg.snap_pixel_id);
   window.snaptr('track', 'PAGE_VIEW');
  }
  if (cfg.tiktok_pixel_id) {
   if (!window.ttq) {
    const t = [];
    t.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
    t.setAndDefer = (obj, method) => { obj[method] = function () { obj.push([method].concat(Array.prototype.slice.call(arguments, 0))); }; };
    t.methods.forEach((m) => t.setAndDefer(t, m));
    t.load = (id) => { t._i = t._i || {}; t._i[id] = []; t._t = t._t || {}; t._t[id] = Date.now(); addScript(`https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(id)}&lib=ttq`); };
    window.TiktokAnalyticsObject = 'ttq';
    window.ttq = t;
   }
   window.ttq.load(cfg.tiktok_pixel_id);
   window.ttq.page();
  }
  if (cfg.clarity_id) {
   window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
   addScript(`https://www.clarity.ms/tag/${encodeURIComponent(cfg.clarity_id)}`);
  }
 };

 // إرسال الأحداث المخصصة إلى الأدوات المحمَّلة فقط
 const send = (detail) => {
  if (!loaded || !detail || !detail.event) return;
  const { event, ...params } = detail;
  const lead = event === 'generate_lead';
  const click = event === 'cta_click' || event === 'app_store_click';
  window.gtag('event', event, params);
  if (window.fbq) { if (lead) window.fbq('track', 'Lead'); else window.fbq('trackCustom', event, params); }
  if (window.snaptr) window.snaptr('track', lead ? 'SIGN_UP' : 'CUSTOM_EVENT_1', { description: event });
  if (window.ttq) window.ttq.track(lead ? 'SubmitForm' : (click ? 'ClickButton' : event), params);
 };
 document.addEventListener('shurfah:track', (e) => send(e.detail));

 const consentNow = window.shurfahConsent ? window.shurfahConsent.get() : '';
 const bannerOff = cfg.consent_banner_enabled === false;
 if (consentNow === 'granted' || (bannerOff && consentNow !== 'denied')) loadAll();
 document.addEventListener('shurfah:consent', (e) => { if (e.detail && e.detail.value === 'granted') loadAll(); });
})();
