// قائمة الجوال وشريط الإعلان
(() => {
 document.documentElement.classList.add('js');
 const toggle = document.querySelector('[data-nav-toggle]');
 const nav = document.getElementById('site-nav');
 if (toggle && nav) {
  const setOpen = (open) => {
   nav.classList.toggle('is-open', open);
   toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
   toggle.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); } });
  const mq = window.matchMedia('(min-width: 1024px)');
  mq.addEventListener('change', () => { if (mq.matches) setOpen(false); });
 }
 const ann = document.querySelector('[data-announcement]');
 const annClose = document.querySelector('[data-announcement-close]');
 if (ann && annClose) {
  annClose.addEventListener('click', () => {
   ann.remove();
   document.cookie = `shurfah_ann=1; Max-Age=${7 * 24 * 3600}; Path=/; SameSite=Lax`;
  });
 }
})();
