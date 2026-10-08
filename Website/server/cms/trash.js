// سلة المحذوفات: الحذف الناعم والاستعادة والحذف النهائي
import { db } from '../supabase.js';
import { invalidate } from '../cache.js';
import { HttpError } from '../router.js';

const TABLES = { page: 'pages', service: 'services', guide: 'guides' };

export async function softDelete(table, id, userId) {
 const { data: row } = await db().from(table).select('*').eq('id', id).maybeSingle();
 if (!row) throw new HttpError(404, 'العنصر غير موجود.');
 if (table === 'pages' && row.kind === 'system') throw new HttpError(400, 'صفحات النظام لا تُحذف. يمكنك تعديل محتواها فقط.');
 const { data, error } = await db().from(table).update({ deleted_at: new Date().toISOString(), updated_by: userId || null }).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر الحذف.');
 invalidate('');
 return { before: row, after: data };
}

export async function listTrash() {
 const out = [];
 for (const [type, table] of Object.entries(TABLES)) {
  const { data } = await db().from(table).select('id, slug, title, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  for (const r of data || []) out.push({ ...r, entity_type: type });
 }
 return out.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
}

export async function restore(type, id, userId) {
 const table = TABLES[type];
 if (!table) throw new HttpError(400, 'نوع غير معروف.');
 const { data, error } = await db().from(table).update({ deleted_at: null, updated_by: userId || null }).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر الاستعادة.');
 invalidate('');
 return data;
}

// الحذف النهائي للمسؤول الأول فقط، ويحذف النسخ المرتبطة
export async function purge(type, id) {
 const table = TABLES[type];
 if (!table) throw new HttpError(400, 'نوع غير معروف.');
 const { data: row } = await db().from(table).select('*').eq('id', id).maybeSingle();
 if (!row) throw new HttpError(404, 'العنصر غير موجود.');
 if (!row.deleted_at) throw new HttpError(400, 'انقل العنصر إلى سلة المحذوفات أولًا.');
 await db().from('content_revisions').delete().eq('entity_type', type).eq('entity_id', id);
 const { error } = await db().from(table).delete().eq('id', id);
 if (error) throw new HttpError(500, 'تعذر الحذف النهائي.');
 return row;
}
