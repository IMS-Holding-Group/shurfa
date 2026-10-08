// شريط الموافقة على أدوات القياس: كوكي واحد لمدة 180 يومًا، بلا تخزين محلي
(() => {
 const NAME = 'shurfah_consent';
 const bar = document.querySelector('[data-consent-bar]');
 const openers = document.querySelectorAll('[data-consent-open]');

 const read = () => {
  const m = document.cookie.match(new RegExp(`(?:^|; )${NAME}=(granted|denied)`));
  return m ? m[1] : '';
 };
 const write = (value) => { document.cookie = `${NAME}=${value}; Max-Age=${180 * 24 * 3600}; Path=/; SameSite=Lax`; };

 window.shurfahConsent = { get: read };

 if (!bar) {
  openers.forEach((b) => { const li = b.closest('li'); (li || b).remove(); });
  return;
 }

 const show = () => { bar.hidden = false; };
 const hide = () => { bar.hidden = true; };

 bar.querySelectorAll('[data-consent]').forEach((btn) => {
  btn.addEventListener('click', () => {
   const before = read();
   const value = btn.dataset.consent === 'granted' ? 'granted' : 'denied';
   write(value);
   hide();
   if (before === 'granted' && value === 'denied') { window.location.reload(); return; }
   document.dispatchEvent(new CustomEvent('shurfah:consent', { detail: { value } }));
  });
 });
 openers.forEach((b) => b.addEventListener('click', show));
 if (!read()) show();
})();
