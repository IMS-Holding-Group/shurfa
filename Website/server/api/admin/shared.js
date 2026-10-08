// الوسطاء والأدوات المشتركة بين واجهات الإدارة
import { requireSession } from '../../auth.js';
import { checkCsrf, LIMITS, rateLimit } from '../../security.js';

// الوسطاء المشتركة لكل واجهة إدارية مصادَق عليها
export const adminGuards = [
 rateLimit('admin', LIMITS.admin),
 async (ctx, next) => { checkCsrf(ctx); await next(); },
 requireSession()
];

// حارس يرفض أي وحدة غير «حسابي» قبل تغيير كلمة المرور الإلزامي
export async function enforcePasswordChange(ctx, next) {
 if (ctx.profile?.must_change_password && !ctx.path.startsWith('/api/admin/account/') && ctx.path !== '/api/admin/me' && ctx.path !== '/api/admin/logout') {
  return ctx.fail(403, 'يجب تغيير كلمة المرور الافتراضية قبل المتابعة.', { must_change_password: 'true' });
 }
 await next();
}

export const guarded = [...adminGuards, enforcePasswordChange];

// ترقيم الصفحات الموحد: 20 عنصرًا في الصفحة
export function paging(ctx, size = 20) {
 const page = Math.max(1, Number(ctx.query.get('page') || 1));
 return { page, size, from: (page - 1) * size, to: page * size - 1, q: String(ctx.query.get('q') || '').trim().slice(0, 100) };
}

export function pageResult(items, count, paging) {
 return { items, total: count || 0, page: paging.page, size: paging.size, pages: Math.max(1, Math.ceil((count || 0) / paging.size)) };
}
