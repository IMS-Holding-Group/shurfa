// الدخول والخروج وبيانات الحساب وتغيير كلمة المرور
import { login, logout, changePassword, requireSession } from '../../auth.js';
import { checkCsrf, LIMITS, rateLimit } from '../../security.js';
import { permissionsFor, ROLE_LABELS } from '../../rbac.js';
import { audit } from '../../services/audit.js';
import { adminGuards } from './shared.js';

export function registerAuthApi(router) {
 router.post('/api/admin/login', async (ctx) => {
  const { email, password } = ctx.body || {};
  const { user, profile } = await login(ctx, email, password);
  ctx.user = user; ctx.profile = profile;
  await audit(ctx, 'login', 'session', user.id);
  ctx.ok({ must_change_password: profile.must_change_password, role: profile.role });
 }, [rateLimit('login-ip', { max: 30, windowMs: 15 * 60 * 1000 }), async (ctx, next) => { checkCsrf(ctx); await next(); }]);

 router.post('/api/admin/logout', async (ctx) => {
  await audit(ctx, 'logout', 'session', ctx.user?.id);
  await logout(ctx);
  ctx.ok({ loggedOut: true });
 }, adminGuards);

 router.get('/api/admin/me', async (ctx) => {
  const p = ctx.profile;
  ctx.ok({ id: p.id, email: ctx.user.email, full_name: p.full_name, role: p.role, role_label: ROLE_LABELS[p.role], must_change_password: p.must_change_password, permissions: permissionsFor(p.role), last_login_at: p.last_login_at });
 }, [rateLimit('admin', LIMITS.admin), requireSession()]);

 router.post('/api/admin/account/password', async (ctx) => {
  const { current_password, new_password } = ctx.body || {};
  await changePassword(ctx, current_password, new_password);
  await audit(ctx, 'change_password', 'profile', ctx.user.id);
  ctx.ok({ changed: true });
 }, adminGuards);
}
