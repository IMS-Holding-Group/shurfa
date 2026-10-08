// صفحة الدخول: ترسل البريد وكلمة المرور إلى الخادم فقط
import { api } from './api.js';
import { notice } from './ui.js';

const form = document.getElementById('login-form');
const status = document.getElementById('login-status');
const submit = document.getElementById('login-submit');
const setErr = (name, text) => { const p = document.getElementById(`${name}-error`); if (p) p.textContent = text || ''; };

form.addEventListener('submit', async (e) => {
 e.preventDefault();
 status.replaceChildren();
 setErr('email', ''); setErr('password', '');
 const email = form.email.value.trim();
 const password = form.password.value;
 if (!email) { setErr('email', 'أدخل بريدك.'); form.email.focus(); return; }
 if (!password) { setErr('password', 'أدخل كلمة المرور.'); form.password.focus(); return; }
 submit.disabled = true;
 try {
  const r = await api.post('/api/admin/login', { email, password });
  window.location.href = r.must_change_password ? '/admin#/account' : '/admin#/overview';
 } catch (err) {
  Object.entries(err.fields || {}).forEach(([k, v]) => setErr(k, v));
  status.replaceChildren(notice(err.message || 'تعذر الدخول.', 'error'));
  submit.disabled = false;
 }
});
