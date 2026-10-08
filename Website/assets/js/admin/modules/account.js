// حسابي: تغيير كلمة المرور، وإلزامي عند أول دخول بالحسابات الافتراضية
import { api } from '../api.js';
import { el, button, field, chip, pageHeader, section, notice, notify, applyErrors, setDirty } from '../ui.js';
import { state } from '../app.js';

export async function render(root) {
 const me = state.me;
 const f = {
  current_password: field({ label: 'كلمة المرور الحالية', type: 'password', required: true, onInput: () => setDirty(true) }),
  new_password: field({ label: 'كلمة المرور الجديدة', help: '10 أحرف فأكثر، فيها حرف كبير وصغير ورقم ورمز، ولا تساوي أي كلمة مرور افتراضية.', type: 'password', required: true, onInput: () => setDirty(true) }),
  confirm: field({ label: 'تأكيد كلمة المرور الجديدة', type: 'password', required: true, onInput: () => setDirty(true) })
 };
 f.current_password.input.autocomplete = 'current-password';
 f.new_password.input.autocomplete = 'new-password';
 f.confirm.input.autocomplete = 'new-password';
 const save = async (e) => {
  e.preventDefault();
  if (f.new_password.get() !== f.confirm.get()) { f.confirm.setError('كلمتا المرور غير متطابقتين.'); return; }
  try {
   await api.post('/api/admin/account/password', { current_password: f.current_password.get(), new_password: f.new_password.get() });
   setDirty(false);
   notify('غُيّرت كلمة المرور.');
   state.me = await api.get('/api/admin/me');
   if (!state.me.must_change_password) window.location.hash = '#/overview';
   Object.values(f).forEach((c) => c.set(''));
  } catch (err) { applyErrors(f, err.fields); notify(err.message, 'error'); }
 };
 root.replaceChildren(
  pageHeader('حسابي'),
  me.must_change_password ? notice('هذا أول دخول بكلمة مرور افتراضية. غيّرها الآن قبل استخدام أي وحدة أخرى.', 'purple') : null,
  section('بياناتي', el('p', {}, el('strong', { text: me.full_name }), ' ', chip(me.role_label, 'sand')), el('p', { class: 'support muted', text: me.email })),
  section('تغيير كلمة المرور', el('form', { on: { submit: save } }, f.current_password.wrap, f.new_password.wrap, f.confirm.wrap, button('حفظ كلمة المرور', { style: 'primary', type: 'submit' }))));
}
