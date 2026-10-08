// واجهة مكتبة الوسائط: الرفع والبحث والتعديل والحذف المحمي
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { cleanText, isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { uploadMedia, findUsages, deleteMedia } from '../../services/media.js';
import { guarded, paging, pageResult } from './shared.js';

export function registerMediaApi(router) {
 const view = [...guarded, requirePermission('media', 'view')];
 const full = [...guarded, requirePermission('media', 'full')];

 router.get('/api/admin/media', async (ctx) => {
  const p = paging(ctx, 24);
  let q = db().from('media_assets').select('*', { count: 'exact' }).order('created_at', { ascending: false });
  const kind = ctx.query.get('kind');
  if (kind === 'image' || kind === 'pdf') q = q.eq('kind', kind);
  if (p.q) { const s = p.q.replace(/[%,()]/g, ''); q = q.or(`title.ilike.%${s}%,alt_text.ilike.%${s}%`); }
  const { data, error, count } = await q.range(p.from, p.to);
  if (error) throw new HttpError(500, 'تعذر قراءة المكتبة.');
  ctx.ok(pageResult(data || [], count, p));
 }, view);

 router.post('/api/admin/media', async (ctx) => {
  const b = ctx.body || {};
  const asset = await uploadMedia(ctx, { filename: cleanText(b.filename, 160), contentType: cleanText(b.contentType, 60), dataBase64: b.dataBase64, altText: b.altText, title: b.title });
  await audit(ctx, 'upload', 'media', asset.id, null, { path: asset.path, kind: asset.kind, size: asset.size_bytes });
  ctx.ok(asset);
 }, full);

 router.put('/api/admin/media/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: before } = await db().from('media_assets').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!before) throw new HttpError(404, 'الملف غير موجود.');
  const alt = cleanText(ctx.body?.alt_text, 300);
  if (before.kind === 'image' && !alt) throw new HttpError(400, 'النص البديل إلزامي للصور.', { alt_text: 'اكتب نصًا بديلًا.' });
  const { data, error } = await db().from('media_assets').update({ title: cleanText(ctx.body?.title, 160), alt_text: alt }).eq('id', ctx.params.id).select('*').single();
  if (error) throw new HttpError(500, 'تعذر الحفظ.');
  await audit(ctx, 'update', 'media', data.id, before, data);
  ctx.ok(data);
 }, full);

 router.get('/api/admin/media/:id/usages', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: asset } = await db().from('media_assets').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!asset) throw new HttpError(404, 'الملف غير موجود.');
  ctx.ok({ usages: await findUsages(asset) });
 }, view);

 router.delete('/api/admin/media/:id', async (ctx) => {
  if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
  const { data: asset } = await db().from('media_assets').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!asset) throw new HttpError(404, 'الملف غير موجود.');
  const usages = await findUsages(asset);
  if (usages.length) return ctx.json(409, { ok: false, message: 'الملف مستخدم في محتوى منشور أو مسودة. أزل استخدامه أولًا.', usages });
  await deleteMedia(asset);
  await audit(ctx, 'delete', 'media', asset.id, { path: asset.path }, null);
  ctx.ok({ deleted: true });
 }, full);
}
