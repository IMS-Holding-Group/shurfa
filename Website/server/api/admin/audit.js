// واجهة سجل التدقيق: قراءة فقط
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { guarded, paging, pageResult } from './shared.js';

export function registerAuditApi(router) {
 router.get('/api/admin/audit', async (ctx) => {
  const p = paging(ctx, 30);
  let q = db().from('audit_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  if (p.q) { const s = p.q.replace(/[%,()]/g, ''); q = q.or(`actor_email.ilike.%${s}%,action.ilike.%${s}%,entity.ilike.%${s}%`); }
  const { data, error, count } = await q.range(p.from, p.to);
  if (error) throw new HttpError(500, 'تعذر قراءة السجل.');
  ctx.ok(pageResult(data || [], count, p));
 }, [...guarded, requirePermission('audit', 'view')]);
}
