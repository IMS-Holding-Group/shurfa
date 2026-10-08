// واجهات المحتوى الرئيسي: الصفحات والخدمات والمقالات (مسودة، نشر، نسخ، حذف ناعم)
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission } from '../../rbac.js';
import { cleanText, toBool, isUuid } from '../../security.js';
import { audit } from '../../services/audit.js';
import { slugify, isReserved, uniqueSlug } from '../../services/slug.js';
import { saveDraft, publish, unpublish, discardDraft, getRow, displayStatus, ENTITIES, withDraft } from '../../cms/drafts.js';
import { listRevisions, restoreRevision, getRevision } from '../../cms/revisions.js';
import { softDelete } from '../../cms/trash.js';
import { validateBlocks, primaryButtonWarning } from '../../cms/blocks/validate.js';
import { isAllowedImage } from '../../cms/urls.js';
import { hasIcon } from '../../render/icons.js';
import { createRedirect } from '../../cms/redirects.js';
import { invalidate } from '../../cache.js';
import { guarded, paging, pageResult } from './shared.js';

const ACCENTS = ['teal', 'brick', 'gold', 'purple', 'ink'];
const STATUSES = ['available', 'coming_soon'];

function isoOrNull(v, label, errors) {
 if (v === undefined) return undefined;
 if (v === null || v === '') return null;
 const d = new Date(v);
 if (Number.isNaN(d.getTime())) { errors[label] = 'التاريخ غير صالح.'; return undefined; }
 return d.toISOString();
}

// التحقق من حمولة الحفظ لكل نوع ويعيد { payload, errors, warning }
async function validatePayload(table, body, current) {
 const errors = {};
 const payload = {};
 let warning = '';
 if ('title' in body) {
  payload.title = cleanText(body.title, 120);
  if (!payload.title) errors.title = 'العنوان مطلوب.';
 }
 if ('seo_title' in body) { payload.seo_title = cleanText(body.seo_title, 70) || null; }
 if ('seo_description' in body) { payload.seo_description = cleanText(body.seo_description, 170) || null; }
 if ('og_image_path' in body) {
  const v = cleanText(body.og_image_path, 2048);
  if (v && !isAllowedImage(v)) errors.og_image_path = 'الصورة يجب أن تكون من مكتبة الوسائط.';
  payload.og_image_path = v || null;
 }
 if ('noindex' in body) payload.noindex = toBool(body.noindex);
 const pa = isoOrNull(body.publish_at, 'publish_at', errors);
 if (pa !== undefined) payload.publish_at = pa;
 const ua = isoOrNull(body.unpublish_at, 'unpublish_at', errors);
 if (ua !== undefined) payload.unpublish_at = ua;
 if (payload.publish_at && payload.unpublish_at && new Date(payload.unpublish_at) <= new Date(payload.publish_at)) errors.unpublish_at = 'تاريخ إلغاء النشر يجب أن يكون بعد تاريخ النشر.';
 if ('slug' in body && body.slug !== current.slug) {
  if (table === 'pages' && current.kind === 'system') errors.slug = 'رابط صفحة النظام لا يتغير.';
  else {
   const s = slugify(body.slug);
   if (!s) errors.slug = 'الرابط غير صالح.';
   else if (table === 'pages' && isReserved(s)) errors.slug = 'هذا الرابط محجوز للنظام.';
   else {
    const { data } = await db().from(table).select('id').eq('slug', s).neq('id', current.id).maybeSingle();
    if (data) errors.slug = 'الرابط مستخدم لعنصر آخر.';
    else payload.slug = s;
   }
  }
 }
 if (table === 'pages' && 'blocks' in body) {
  const r = validateBlocks(body.blocks);
  if (r.errors.length) errors.blocks = r.errors.join('\n');
  else { payload.blocks = r.blocks; warning = primaryButtonWarning(r.blocks); }
 }
 if (table === 'services') {
  if ('tagline' in body) payload.tagline = cleanText(body.tagline, 160);
  if ('body' in body) payload.body = cleanText(body.body, 20000);
  if ('highlights' in body) {
   const list = Array.isArray(body.highlights) ? body.highlights : String(body.highlights || '').split('\n');
   payload.highlights = list.map((h) => cleanText(h, 80)).filter(Boolean).slice(0, 8);
  }
  if ('icon_key' in body) { if (!hasIcon(body.icon_key)) errors.icon_key = 'الأيقونة غير معروفة.'; else payload.icon_key = body.icon_key; }
  if ('accent' in body) { if (!ACCENTS.includes(body.accent)) errors.accent = 'لون القسم غير مسموح.'; else payload.accent = body.accent; }
  if ('service_status' in body) { if (!STATUSES.includes(body.service_status)) errors.service_status = 'الحالة غير معروفة.'; else payload.service_status = body.service_status; }
  if ('cover_path' in body) { const v = cleanText(body.cover_path, 2048); if (v && !isAllowedImage(v)) errors.cover_path = 'الصورة من المكتبة فقط.'; payload.cover_path = v || null; }
  if ('sort' in body) payload.sort = Math.max(0, Math.min(999, Number(body.sort) || 0));
 }
 if (table === 'guides') {
  if ('excerpt' in body) payload.excerpt = cleanText(body.excerpt, 240);
  if ('body' in body) { payload.body = cleanText(body.body, 40000); if (!payload.body) errors.body = 'النص مطلوب.'; }
  if ('cover_path' in body) { const v = cleanText(body.cover_path, 2048); if (v && !isAllowedImage(v)) errors.cover_path = 'الصورة من المكتبة فقط.'; payload.cover_path = v || null; }
 }
 return { payload, errors, warning };
}

function decorate(row) {
 return { ...row, display_status: displayStatus(row), has_draft: !!(row.draft && Object.keys(row.draft).length) };
}

function entityTable(kind) {
 if (!ENTITIES[kind]) throw new HttpError(404, 'غير موجود.');
 return kind;
}

export function registerContentApi(router) {
 for (const kind of ['pages', 'services', 'guides']) {
  const base = `/api/admin/${kind}`;
  const view = [...guarded, requirePermission('content', 'view')];
  const full = [...guarded, requirePermission('content', 'full')];
  const spec = ENTITIES[kind];

  router.get(base, async (ctx) => {
   const p = paging(ctx);
   let q = db().from(entityTable(kind)).select('id, slug, title, status, publish_at, unpublish_at, published_at, updated_at, deleted_at, draft, noindex' + (kind === 'pages' ? ', kind' : '') + (kind === 'services' ? ', service_status, sort, accent, icon_key' : '') + (kind === 'guides' ? ', is_demo, excerpt' : ''), { count: 'exact' }).is('deleted_at', null);
   if (p.q) q = q.or(`title.ilike.%${p.q.replace(/[%,()]/g, '')}%,slug.ilike.%${p.q.replace(/[%,()]/g, '')}%`);
   q = kind === 'services' ? q.order('sort') : q.order('updated_at', { ascending: false });
   const { data, error, count } = await q.range(p.from, p.to);
   if (error) throw new HttpError(500, 'تعذر قراءة القائمة.');
   ctx.ok(pageResult((data || []).map(decorate), count, p));
  }, view);

  router.get(`${base}/:id`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const row = await getRow(kind, ctx.params.id);
   const revisions = await listRevisions(spec.type, row.id);
   ctx.ok({ item: decorate(row), merged: withDraft(row), revisions });
  }, view);

  router.post(base, async (ctx) => {
   const body = ctx.body || {};
   const title = cleanText(body.title, 120);
   if (!title) throw new HttpError(400, 'العنوان مطلوب.', { title: 'العنوان مطلوب.' });
   let slug = slugify(body.slug || title) || 'item';
   if (kind === 'pages' && isReserved(slug)) throw new HttpError(400, 'هذا الرابط محجوز للنظام.', { slug: 'هذا الرابط محجوز.' });
   slug = await uniqueSlug(slug, async (s) => { const { data } = await db().from(kind).select('id').eq('slug', s).maybeSingle(); return !!data; });
   const row = { slug, title, status: 'draft', created_by: ctx.user.id, updated_by: ctx.user.id };
   if (kind === 'pages') { row.kind = 'custom'; row.blocks = []; }
   if (kind === 'services') { row.body = ''; row.icon_key = 'activities'; row.accent = 'teal'; row.service_status = 'coming_soon'; }
   if (kind === 'guides') { row.body = ''; }
   const { data, error } = await db().from(kind).insert(row).select('*').single();
   if (error) throw new HttpError(500, 'تعذر الإنشاء.');
   await audit(ctx, 'create', spec.type, data.id, null, data);
   ctx.ok(decorate(data));
  }, full);

  router.put(`${base}/:id`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const current = await getRow(kind, ctx.params.id);
   const body = ctx.body || {};
   const { payload, errors, warning } = await validatePayload(kind, body, current);
   if (Object.keys(errors).length) throw new HttpError(400, 'راجع الحقول المحددة.', errors);
   const saved = await saveDraft(kind, current.id, payload, body.updated_at, ctx.user.id);
   if (payload.slug && payload.slug !== current.slug && current.status === 'published' && toBool(body.create_redirect ?? true)) {
    const prefix = kind === 'pages' ? '/' : (kind === 'services' ? '/services/' : '/guide/');
    try { await createRedirect({ from_path: `${prefix}${current.slug}`, to_url: `${prefix}${payload.slug}`, code: 301 }); } catch { /* قد يكون التحويل موجودًا */ }
   }
   await audit(ctx, 'save_draft', spec.type, saved.id, { draft: current.draft }, { draft: saved.draft });
   ctx.ok({ item: decorate(saved), warning });
  }, full);

  router.post(`${base}/:id/publish`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const before = await getRow(kind, ctx.params.id);
   if (kind === 'pages' && before.draft?.blocks) {
    const r = validateBlocks(before.draft.blocks);
    if (r.errors.length) throw new HttpError(400, 'المسودة تحتوي كتلًا غير صالحة.', { blocks: r.errors.join('\n') });
   }
   const after = await publish(kind, before.id, ctx.user.id, cleanText(ctx.body?.note, 200));
   await audit(ctx, 'publish', spec.type, after.id, before, after);
   ctx.ok(decorate(after));
  }, full);

  router.post(`${base}/:id/unpublish`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const { before, after } = await unpublish(kind, ctx.params.id, ctx.user.id);
   await audit(ctx, 'unpublish', spec.type, after.id, before, after);
   ctx.ok(decorate(after));
  }, full);

  router.post(`${base}/:id/discard`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const after = await discardDraft(kind, ctx.params.id, ctx.user.id);
   await audit(ctx, 'discard_draft', spec.type, after.id);
   ctx.ok(decorate(after));
  }, full);

  router.post(`${base}/:id/restore-revision`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const revisionId = Number(ctx.body?.revision_id);
   if (!Number.isInteger(revisionId)) throw new HttpError(400, 'اختر نسخة.');
   const after = await restoreRevision(kind, ctx.params.id, revisionId, spec.fields, ctx.user.id);
   await audit(ctx, 'restore_revision', spec.type, after.id, null, { revision_id: revisionId });
   ctx.ok(decorate(after));
  }, full);

  router.get(`${base}/:id/revisions/:rid`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const rev = await getRevision(Number(ctx.params.rid));
   if (rev.entity_id !== ctx.params.id) throw new HttpError(404, 'النسخة غير موجودة.');
   ctx.ok(rev);
  }, view);

  router.delete(`${base}/:id`, async (ctx) => {
   if (!isUuid(ctx.params.id)) throw new HttpError(404, 'غير موجود.');
   const { before, after } = await softDelete(kind, ctx.params.id, ctx.user.id);
   await audit(ctx, 'soft_delete', spec.type, after.id, before, after);
   invalidate('');
   ctx.ok(decorate(after));
  }, full);
 }
}
