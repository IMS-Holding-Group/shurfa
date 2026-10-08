// أحداث التتبع المخصصة: نقرات data-track، ومعالجة ?sent= بعد الإرسال بلا جافاسكربت
(() => {
 const emit = (event, params) => document.dispatchEvent(new CustomEvent('shurfah:track', { detail: { event, ...params } }));

 document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-track]');
  if (!el || el.hasAttribute('data-passport-calculator')) return;
  const params = {};
  if (el.dataset.trackLabel) params.label = el.dataset.trackLabel;
  if (el.dataset.trackLocation) params.location = el.dataset.trackLocation;
  if (el.tagName === 'A' && el.href) params.link_url = el.href;
  emit(el.dataset.track, params);
 });

 document.querySelectorAll('details.faq-item, .faq details').forEach((d) => {
  d.addEventListener('toggle', () => { if (d.open) emit('faq_open', { label: (d.querySelector('summary')?.textContent || '').trim().slice(0, 80) }); });
 });

 const url = new URL(window.location.href);
 const sent = url.searchParams.get('sent');
 if (sent) {
  emit('generate_lead', { form: sent });
  const status = document.querySelector(`form[data-form="${CSS.escape(sent)}"]`)?.parentElement.querySelector('[data-form-status]');
  if (status) status.scrollIntoView({ block: 'center' });
  url.searchParams.delete('sent');
  window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
 }
})();
