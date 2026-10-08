// المسودات والنشر والتحقق من تعارض التعديل بين مسؤولين
import { db } from '../supabase.js';
import { invalidate } from '../cache.js';
import { HttpError } from '../router.js';
import { saveRevision } from './revisions.js';
import { emit } from './webhooks.js';

export const CONFLICT_MESSAGE = 'عدّل مسؤول آخر هذا المحتوى أثناء عملك. حدّث الصفحة لرؤية تعديله.';

// الحقول التي تُحفظ في المسودة ثم تُدمج عند النشر، لكل جدول
export const ENTITIES = {
 pages: { type: 'page', fields: ['title', 'blocks', 'seo_title', 'seo_description', 'og_image_path'] },
 services: { type: 'service', fields: ['title', 'tagline', 'body', 'highlights', 'icon_key', 'accent', 'service_status', 'cover_path', 'sort', 'seo_title', 'seo_description', 'og_image_path'] },
 guides: { type: 'guide', fields: ['title', 'excerpt', 'body', 'cover_path', 'seo_title', 'seo_description', 'og_image_path'] }
};

// الحقول التي تُطبَّق فورًا دون المرور بالمسودة
export const DIRECT_FIELDS = ['publish_at', 'unpublish_at', 'noindex', 'slug'];

export async function getRow(table, id) {
 const { data, error } = await db().from(table).select('*').eq('id', id).maybeSingle();
 if (error) throw new HttpError(500, 'تعذر قراءة العنصر.');
 if (!data) throw new HttpError(404, 'العنصر غير موجود.');
 return data;
}

function sameInstant(a, b) {
 if (!a || !b) return false;
 return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 1000;
}

// يحفظ المسودة بعد التحقق من أن النسخة التي يعمل عليها المستخدم هي الأحدث
export async function saveDraft(table, id, payload, expectedUpdatedAt, userId) {
 const spec = ENTITIES[table];
 const row = await getRow(table, id);
 if (expectedUpdatedAt && !sameInstant(expectedUpdatedAt, row.updated_at)) throw new HttpError(409, CONFLICT_MESSAGE);
 const draft = { ...(row.draft || {}) };
 for (const f of spec.fields) if (f in payload) draft[f] = payload[f];
 const patch = { draft, updated_by: userId || null };
 for (const f of DIRECT_FIELDS) if (f in payload) patch[f] = payload[f];
 const { data, error } = await db().from(table).update(patch).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر حفظ المسودة.');
 if (DIRECT_FIELDS.some((f) => f in payload)) invalidate('');
 return data;
}

// يدمج المسودة في الأعمدة الفعلية ويحفظ نسخة ويفرّغ المسودة ويطلق الحدث
export async function publish(table, id, userId, note = '') {
 const spec = ENTITIES[table];
 const row = await getRow(table, id);
 const merged = {};
 for (const f of spec.fields) merged[f] = row.draft && f in row.draft ? row.draft[f] : row[f];
 const patch = { ...merged, draft: null, status: 'published', published_at: new Date().toISOString(), updated_by: userId || null };
 const { data, error } = await db().from(table).update(patch).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر النشر.');
 await saveRevision(spec.type, id, { ...merged, slug: data.slug }, note || 'نشر', userId);
 invalidate('');
 emit('content_published', { entity: spec.type, id: data.id, slug: data.slug, title: data.title }).catch(() => {});
 return data;
}

export async function unpublish(table, id, userId) {
 const row = await getRow(table, id);
 const { data, error } = await db().from(table).update({ status: 'draft', updated_by: userId || null }).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر إلغاء النشر.');
 invalidate('');
 return { before: row, after: data };
}

export async function discardDraft(table, id, userId) {
 const { data, error } = await db().from(table).update({ draft: null, updated_by: userId || null }).eq('id', id).select('*').single();
 if (error) throw new HttpError(500, 'تعذر تجاهل التغييرات.');
 return data;
}

// يعيد العنصر كما سيبدو بالمسودة المدمجة (للمعاينة)
export function withDraft(row) {
 if (!row) return row;
 if (!row.draft) return row;
 return { ...row, ...row.draft, draft: row.draft };
}

// حالة العرض في اللوحة: مسودة، منشور، مجدول، تغييرات غير منشورة
export function displayStatus(row, now = Date.now()) {
 if (row.deleted_at) return 'deleted';
 if (row.status !== 'published') return 'draft';
 if (row.publish_at && new Date(row.publish_at).getTime() > now) return 'scheduled';
 if (row.unpublish_at && new Date(row.unpublish_at).getTime() <= now) return 'expired';
 if (row.draft && Object.keys(row.draft).length > 0) return 'pending';
 return 'published';
}
