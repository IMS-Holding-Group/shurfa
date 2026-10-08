// إرسال النماذج بدون إعادة تحميل، مع عرض أخطاء الحقول والعدّاد
(() => {
 const forms = document.querySelectorAll('form[data-form]');
 if (!forms.length) return;

 const makeNotice = (text, kind) => {
  const box = document.createElement('div');
  box.className = `notice notice-${kind}`;
  box.setAttribute('role', 'status');
  const p = document.createElement('p');
  p.textContent = text;
  box.append(p);
  return box;
 };

 const setError = (form, name, text) => {
  const control = form.elements[name];
  if (!control) return;
  const el = control.length && !control.tagName ? control[0] : control;
  const err = document.getElementById(`${el.id}-error`);
  if (err) err.textContent = text || '';
  if (text) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
 };

 const clearErrors = (form) => {
  form.querySelectorAll('.field-error').forEach((e) => { e.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach((e) => e.removeAttribute('aria-invalid'));
 };

 const attachCounter = (control) => {
  const max = Number(control.getAttribute('maxlength'));
  if (!max || control.tagName !== 'TEXTAREA') return;
  const counter = document.createElement('p');
  counter.className = 'counter support';
  counter.setAttribute('aria-live', 'polite');
  const update = () => {
   const left = max - control.value.length;
   counter.textContent = `${left} حرف متبقٍ`;
   counter.classList.toggle('near', left <= Math.ceil(max * 0.1) && left >= 0);
   counter.classList.toggle('over', left < 0);
  };
  control.insertAdjacentElement('afterend', counter);
  control.addEventListener('input', update);
  update();
 };

 forms.forEach((form) => {
  form.querySelectorAll('textarea').forEach(attachCounter);
  const status = form.parentElement.querySelector('[data-form-status]');
  const submit = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
   e.preventDefault();
   clearErrors(form);
   if (status) status.replaceChildren();
   const data = {};
   new FormData(form).forEach((v, k) => { data[k] = v; });
   form.querySelectorAll('input[type="checkbox"]').forEach((c) => { data[c.name] = c.checked; });
   if (submit) submit.disabled = true;
   try {
    const res = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    const body = await res.json().catch(() => ({ ok: false, message: 'تعذر قراءة الرد.' }));
    if (res.ok && body.ok) {
     form.reset();
     form.querySelectorAll('.counter').forEach((c) => c.dispatchEvent(new Event('input')));
     if (status) status.replaceChildren(makeNotice(body.data?.message || 'تم الإرسال.', 'success'));
     document.dispatchEvent(new CustomEvent('shurfah:track', { detail: { event: 'generate_lead', form: form.dataset.form } }));
     status?.scrollIntoView({ block: 'nearest' });
    } else {
     Object.entries(body.fields || {}).forEach(([name, text]) => setError(form, name, text));
     if (status) status.replaceChildren(makeNotice(body.message || 'تعذر الإرسال.', 'error'));
     const firstBad = form.querySelector('[aria-invalid="true"]');
     if (firstBad) firstBad.focus();
    }
   } catch {
    if (status) status.replaceChildren(makeNotice('تعذر الاتصال بالخادم. حاول مجددًا.', 'error'));
   } finally {
    if (submit) submit.disabled = false;
   }
  });
 });
})();
