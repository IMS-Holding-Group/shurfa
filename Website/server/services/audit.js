// سجل التدقيق: يُكتب بعد كل كتابة ناجحة وبعد الدخول والخروج، ولا يُعدَّل ولا يُحذف
import { db } from '../supabase.js';

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'access_token', 'refresh_token', 'current_password', 'new_password'];

// يحذف أي قيمة حساسة قبل التخزين
export function redact(value) {
 if (!value || typeof value !== 'object') return value;
 if (Array.isArray(value)) return value.map(redact);
 const out = {};
 for (const [k, v] of Object.entries(value)) {
  if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) out[k] = '[محجوب]';
  else out[k] = typeof v === 'object' ? redact(v) : v;
 }
 return out;
}

export async function audit(ctx, action, entity, entityId, before = null, after = null) {
 try {
  await db().from('audit_logs').insert({
   actor_id: ctx.user?.id || null,
   actor_email: ctx.user?.email || null,
   actor_role: ctx.profile?.role || null,
   action,
   entity,
   entity_id: entityId ? String(entityId) : null,
   before: before ? redact(before) : null,
   after: after ? redact(after) : null,
   ip: ctx.ip || null
  });
 } catch (err) {
  console.error('Failed to write audit log:', err?.message || err);
 }
}
