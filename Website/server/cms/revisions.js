// سجل النسخ: حفظ نسخة عند كل نشر والاحتفاظ بآخر 30 نسخة والاستعادة كمسودة
import { db } from '../supabase.js';
import { HttpError } from '../router.js';

export const MAX_REVISIONS = 30;

export async function saveRevision(entityType, entityId, snapshot, note, userId) {
 const { error } = await db().from('content_revisions').insert({ entity_type: entityType, entity_id: entityId, snapshot, note, created_by: userId || null });
 if (error) { console.error('Failed to save revision:', error.message); return; }
 await pruneRevisions(entityType, entityId);
}

// يحذف ما زاد على الحد الأقصى من الأقدم
export async function pruneRevisions(entityType, entityId) {
 const { data } = await db().from('content_revisions').select('id').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
 const extra = (data || []).slice(MAX_REVISIONS).map((r) => r.id);
 if (extra.length) await db().from('content_revisions').delete().in('id', extra);
}

export async function listRevisions(entityType, entityId) {
 const { data, error } = await db().from('content_revisions').select('id, note, created_by, created_at').eq('entity_type', entityType).eq('entity_id', entityId).order('created_at', { ascending: false });
 if (error) throw new HttpError(500, 'تعذر قراءة سجل النسخ.');
 const ids = [...new Set((data || []).map((r) => r.created_by).filter(Boolean))];
 let names = {};
 if (ids.length) {
  const { data: profiles } = await db().from('profiles').select('id, full_name').in('id', ids);
  names = Object.fromEntries((profiles || []).map((p) => [p.id, p.full_name]));
 }
 return (data || []).map((r) => ({ ...r, author: names[r.created_by] || '' }));
}

export async function getRevision(id) {
 const { data, error } = await db().from('content_revisions').select('*').eq('id', id).maybeSingle();
 if (error || !data) throw new HttpError(404, 'النسخة غير موجودة.');
 return data;
}

// يضع محتوى النسخة في المسودة دون نشر
export async function restoreRevision(table, entityId, revisionId, fields, userId) {
 const rev = await getRevision(revisionId);
 if (rev.entity_id !== entityId) throw new HttpError(400, 'النسخة لا تخص هذا العنصر.');
 const draft = {};
 for (const f of fields) if (f in rev.snapshot) draft[f] = rev.snapshot[f];
 const { data, error } = await db().from(table).update({ draft, updated_by: userId || null }).eq('id', entityId).select('*').single();
 if (error) throw new HttpError(500, 'تعذر استعادة النسخة.');
 return data;
}
