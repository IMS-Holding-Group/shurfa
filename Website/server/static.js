// خدمة الملفات الثابتة مع الضغط والتخزين المؤقت والحماية من اجتياز المسارات
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const MIME = {
 '.html': 'text/html; charset=utf-8',
 '.css': 'text/css; charset=utf-8',
 '.js': 'text/javascript; charset=utf-8',
 '.mjs': 'text/javascript; charset=utf-8',
 '.json': 'application/json; charset=utf-8',
 '.svg': 'image/svg+xml',
 '.png': 'image/png',
 '.jpg': 'image/jpeg',
 '.jpeg': 'image/jpeg',
 '.webp': 'image/webp',
 '.ico': 'image/x-icon',
 '.ttf': 'font/ttf',
 '.woff': 'font/woff',
 '.woff2': 'font/woff2',
 '.pdf': 'application/pdf',
 '.txt': 'text/plain; charset=utf-8',
 '.xml': 'application/xml; charset=utf-8'
};

const LONG_CACHE = new Set(['.ttf', '.woff', '.woff2', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico']);
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.txt', '.xml']);

// يعيد المسار المطلق داخل الجذر أو null إن حاول الطلب الخروج منه
export function resolveSafe(rootDir, relative) {
 const cleaned = decodeURIComponent(relative).replace(/\\/g, '/');
 if (cleaned.includes('\0')) return null;
 const full = path.normalize(path.join(rootDir, cleaned));
 const root = path.normalize(rootDir + path.sep);
 if (!full.startsWith(root) && full !== path.normalize(rootDir)) return null;
 return full;
}

export function cacheControlFor(ext) {
 if (LONG_CACHE.has(ext)) return 'public, max-age=604800, immutable';
 if (ext === '.css' || ext === '.js' || ext === '.mjs') return 'public, max-age=3600';
 return 'no-cache';
}

export async function serveFile(ctx, filePath) {
 let stat;
 try { stat = await fs.stat(filePath); } catch { return false; }
 if (!stat.isFile()) return false;
 const ext = path.extname(filePath).toLowerCase();
 const type = MIME[ext] || 'application/octet-stream';
 const etag = `W/"${createHash('sha1').update(`${stat.size}-${stat.mtimeMs}`).digest('hex')}"`;
 const headers = {
  'Content-Type': type,
  'Cache-Control': cacheControlFor(ext),
  ETag: etag,
  'Last-Modified': stat.mtime.toUTCString()
 };
 if (ctx.req.headers['if-none-match'] === etag) {
  ctx.responded = true;
  ctx.res.writeHead(304, headers);
  ctx.res.end();
  return true;
 }
 let data = await fs.readFile(filePath);
 const accepts = String(ctx.req.headers['accept-encoding'] || '');
 if (COMPRESSIBLE.has(ext) && accepts.includes('gzip') && data.length > 1024) {
  data = gzipSync(data);
  headers['Content-Encoding'] = 'gzip';
  headers.Vary = 'Accept-Encoding';
 }
 headers['Content-Length'] = data.length;
 ctx.responded = true;
 ctx.res.writeHead(200, headers);
 if (ctx.method === 'HEAD') ctx.res.end(); else ctx.res.end(data);
 return true;
}

// يبني معالجًا يخدم مجلدًا تحت بادئة مسار واحدة
export function staticHandler(rootDir, prefix) {
 return async (ctx) => {
  const relative = ctx.path.slice(prefix.length);
  const filePath = resolveSafe(rootDir, relative);
  if (!filePath) { ctx.text(403, 'مسار غير مسموح'); return true; }
  return serveFile(ctx, filePath);
 };
}
