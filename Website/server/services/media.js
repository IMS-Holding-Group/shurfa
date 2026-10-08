// رفع الملفات: التحقق من البايتات السحرية وقراءة أبعاد الصور ورفعها إلى حاوية media
import { randomUUID } from 'node:crypto';
import { db, supabaseConfig } from '../supabase.js';
import { HttpError } from '../router.js';

export const IMAGE_LIMIT = 5 * 1024 * 1024;
export const PDF_LIMIT = 10 * 1024 * 1024;

const TYPES = {
 'image/png': { ext: 'png', kind: 'image', limit: IMAGE_LIMIT },
 'image/jpeg': { ext: 'jpg', kind: 'image', limit: IMAGE_LIMIT },
 'image/webp': { ext: 'webp', kind: 'image', limit: IMAGE_LIMIT },
 'application/pdf': { ext: 'pdf', kind: 'pdf', limit: PDF_LIMIT }
};

// يكشف النوع الحقيقي من أول بايتات الملف بدل الاعتماد على الامتداد
export function sniffType(buf) {
 if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
 if (buf.length >= 3 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg';
 if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
 if (buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
 return null;
}

// قراءة الأبعاد من رأس الملف لصيغ PNG وJPEG وWebP
export function readDimensions(buf, mime) {
 try {
  if (mime === 'image/png') return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (mime === 'image/jpeg') {
   let i = 2;
   while (i < buf.length) {
    if (buf[i] !== 0xFF) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xD8 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7) || (marker >= 0xC9 && marker <= 0xCB) || (marker >= 0xCD && marker <= 0xCF)) {
     return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
   }
   return null;
  }
  if (mime === 'image/webp') {
   const chunk = buf.toString('ascii', 12, 16);
   if (chunk === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3FFF, height: buf.readUInt16LE(28) & 0x3FFF };
   if (chunk === 'VP8L') {
    const b0 = buf[21]; const b1 = buf[22]; const b2 = buf[23]; const b3 = buf[24];
    return { width: 1 + (((b1 & 0x3F) << 8) | b0), height: 1 + (((b3 & 0x0F) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6)) };
   }
   if (chunk === 'VP8X') {
    return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
   }
  }
 } catch { return null; }
 return null;
}

export function publicUrl(path) {
 return `${supabaseConfig().supabaseOrigin}/storage/v1/object/public/media/${path}`;
}

// يتحقق من الملف ويرفعه ويسجّله في مكتبة الوسائط
export async function uploadMedia(ctx, { filename, contentType, dataBase64, altText, title }) {
 if (typeof dataBase64 !== 'string' || !dataBase64) throw new HttpError(400, 'لم يصل محتوى الملف.');
 const buf = Buffer.from(dataBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
 if (buf.length === 0) throw new HttpError(400, 'الملف فارغ.');
 const real = sniffType(buf);
 if (!real || !TYPES[real]) throw new HttpError(400, 'نوع الملف غير مسموح. المسموح: PNG وJPEG وWebP وPDF.');
 if (contentType && contentType !== real) throw new HttpError(400, 'محتوى الملف لا يطابق نوعه المعلن.');
 const spec = TYPES[real];
 if (buf.length > spec.limit) throw new HttpError(400, `حجم الملف أكبر من المسموح (${Math.round(spec.limit / 1024 / 1024)} ميغابايت).`);
 const alt = String(altText || '').trim();
 if (spec.kind === 'image' && !alt) throw new HttpError(400, 'النص البديل إلزامي لكل صورة.', { altText: 'اكتب نصًا بديلًا يصف الصورة.' });
 const dims = spec.kind === 'image' ? readDimensions(buf, real) : null;
 const path = `${new Date().getUTCFullYear()}/${randomUUID()}.${spec.ext}`;
 const { error: upErr } = await db().storage.from('media').upload(path, buf, { contentType: real, upsert: false, cacheControl: '604800' });
 if (upErr) throw new HttpError(500, 'تعذر رفع الملف إلى التخزين.');
 const row = {
  path,
  url: publicUrl(path),
  kind: spec.kind,
  title: String(title || filename || '').trim().slice(0, 160),
  alt_text: alt.slice(0, 300),
  mime: real,
  size_bytes: buf.length,
  width: dims?.width || null,
  height: dims?.height || null,
  uploaded_by: ctx.user?.id || null
 };
 const { data, error } = await db().from('media_assets').insert(row).select('*').single();
 if (error) {
  await db().storage.from('media').remove([path]);
  throw new HttpError(500, 'تعذر تسجيل الملف في المكتبة.');
 }
 return data;
}

// يبحث عن استخدامات الملف في كل المحتوى قبل السماح بحذفه
export async function findUsages(asset) {
 const needle = asset.url;
 const usages = [];
 const client = db();
 const [pages, services, guides, settings] = await Promise.all([
  client.from('pages').select('id, title, slug, blocks, draft, og_image_path').is('deleted_at', null),
  client.from('services').select('id, title, slug, body, cover_path, draft, og_image_path').is('deleted_at', null),
  client.from('guides').select('id, title, slug, body, cover_path, draft, og_image_path').is('deleted_at', null),
  client.from('site_settings').select('key, value')
 ]);
 const contains = (obj) => JSON.stringify(obj || '').includes(needle) || JSON.stringify(obj || '').includes(asset.path);
 for (const p of pages.data || []) if (contains(p.blocks) || contains(p.draft) || p.og_image_path === needle) usages.push({ type: 'page', title: p.title, slug: p.slug });
 for (const s of services.data || []) if (contains(s.body) || contains(s.draft) || s.cover_path === needle || s.og_image_path === needle) usages.push({ type: 'service', title: s.title, slug: s.slug });
 for (const g of guides.data || []) if (contains(g.body) || contains(g.draft) || g.cover_path === needle || g.og_image_path === needle) usages.push({ type: 'guide', title: g.title, slug: g.slug });
 for (const s of settings.data || []) if (contains(s.value)) usages.push({ type: 'setting', title: s.key, slug: '' });
 return usages;
}

export async function deleteMedia(asset) {
 await db().storage.from('media').remove([asset.path]);
 const { error } = await db().from('media_assets').delete().eq('id', asset.id);
 if (error) throw new HttpError(500, 'تعذر حذف الملف.');
}
