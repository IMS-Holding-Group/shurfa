// موجّه مسارات يدوي فوق node:http مع وسطاء متسلسلة
import { gzipSync } from 'node:zlib';

const MIME_JSON = 'application/json; charset=utf-8';
const MIME_HTML = 'text/html; charset=utf-8';

// يحوّل نمط المسار مثل /services/:slug إلى تعبير نمطي مع أسماء المعاملات
function compile(pattern) {
 const keys = [];
 const source = pattern
  .split('/')
  .map((part) => {
   if (part.startsWith(':')) { keys.push(part.slice(1)); return '([^/]+)'; }
   if (part === '*') { keys.push('wildcard'); return '(.*)'; }
   return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  })
  .join('/');
 return { regex: new RegExp(`^${source}/?$`), keys };
}

export class HttpError extends Error {
 constructor(status, message, fields) {
  super(message);
  this.status = status;
  this.fields = fields;
 }
}

// يبني كائن السياق الذي تتشاركه الوسطاء والمعالجات
function createContext(req, res) {
 const url = new URL(req.url || '/', 'http://localhost');
 const ctx = {
  req,
  res,
  method: req.method || 'GET',
  url,
  path: decodeURIComponent(url.pathname),
  query: url.searchParams,
  params: {},
  cookies: {},
  body: null,
  rawBody: null,
  user: null,
  profile: null,
  state: {},
  ip: clientIp(req),
  responded: false
 };
 ctx.setHeader = (name, value) => { if (!res.headersSent) res.setHeader(name, value); };
 ctx.send = (status, body, type, extraHeaders = {}) => {
  if (ctx.responded) return;
  ctx.responded = true;
  const headers = { 'Content-Type': type, ...extraHeaders };
  let payload = body;
  if (typeof body === 'string') payload = Buffer.from(body, 'utf8');
  const accepts = String(req.headers['accept-encoding'] || '');
  if (payload.length > 1024 && accepts.includes('gzip') && /text|json|xml|javascript/.test(type)) {
   payload = gzipSync(payload);
   headers['Content-Encoding'] = 'gzip';
   headers.Vary = 'Accept-Encoding';
  }
  headers['Content-Length'] = payload.length;
  res.writeHead(status, headers);
  if (ctx.method === 'HEAD') res.end(); else res.end(payload);
 };
 ctx.html = (status, html, extra) => ctx.send(status, html, MIME_HTML, { 'Cache-Control': 'no-cache', ...extra });
 ctx.json = (status, data, extra) => ctx.send(status, JSON.stringify(data), MIME_JSON, { 'Cache-Control': 'no-store', ...extra });
 ctx.ok = (data, extra) => ctx.json(200, { ok: true, data }, extra);
 ctx.fail = (status, message, fields) => ctx.json(status, { ok: false, message, ...(fields ? { fields } : {}) });
 ctx.text = (status, text, extra) => ctx.send(status, text, 'text/plain; charset=utf-8', extra);
 ctx.redirect = (status, location) => {
  if (ctx.responded) return;
  ctx.responded = true;
  res.writeHead(status, { Location: location, 'Cache-Control': 'no-store' });
  res.end();
 };
 return ctx;
}

function clientIp(req) {
 const fwd = req.headers['x-forwarded-for'];
 if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
 return req.socket?.remoteAddress || '';
}

export function createRouter() {
 const middlewares = [];
 const routes = [];
 let notFound = (ctx) => ctx.text(404, 'غير موجود');
 let onError = (ctx, err) => ctx.text(500, 'خطأ داخلي');

 const api = {
  use(fn) { middlewares.push(fn); return api; },
  add(method, pattern, handler, locals = []) {
   const { regex, keys } = compile(pattern);
   routes.push({ method, regex, keys, handler, locals });
   return api;
  },
  get(p, h, l) { return api.add('GET', p, h, l); },
  post(p, h, l) { return api.add('POST', p, h, l); },
  put(p, h, l) { return api.add('PUT', p, h, l); },
  delete(p, h, l) { return api.add('DELETE', p, h, l); },
  setNotFound(fn) { notFound = fn; return api; },
  setError(fn) { onError = fn; return api; },
  match(method, path) {
   const m = method === 'HEAD' ? 'GET' : method;
   for (const route of routes) {
    if (route.method !== m && route.method !== 'ALL') continue;
    const found = route.regex.exec(path);
    if (!found) continue;
    const params = {};
    route.keys.forEach((k, i) => { params[k] = found[i + 1]; });
    return { route, params };
   }
   return null;
  },
  async handle(req, res) {
   const ctx = createContext(req, res);
   try {
    const matched = api.match(ctx.method, ctx.path);
    if (matched) { ctx.params = matched.params; ctx.route = matched.route; }
    const chain = [...middlewares, ...(matched ? matched.route.locals : [])];
    let index = -1;
    const next = async () => {
     index += 1;
     if (ctx.responded) return;
     if (index < chain.length) { await chain[index](ctx, next); return; }
     if (matched) await matched.route.handler(ctx); else await notFound(ctx);
    };
    await next();
    if (!ctx.responded) await notFound(ctx);
   } catch (err) {
    if (err instanceof HttpError) {
     if (ctx.path.startsWith('/api/')) ctx.fail(err.status, err.message, err.fields);
     else await onError(ctx, err);
     return;
    }
    await onError(ctx, err);
   }
  }
 };
 return api;
}

// قراءة الكوكيز من الترويسة
export function parseCookies(header = '') {
 const out = {};
 for (const part of header.split(';')) {
  const idx = part.indexOf('=');
  if (idx < 0) continue;
  const k = part.slice(0, idx).trim();
  const v = part.slice(idx + 1).trim();
  if (k) out[k] = decodeURIComponent(v);
 }
 return out;
}

// قراءة جسم الطلب بحد أقصى للحجم مع دعم JSON وurlencoded
export function readBody(req, limit) {
 return new Promise((resolve, reject) => {
  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
   size += chunk.length;
   if (size > limit) { reject(new HttpError(413, 'حجم الطلب أكبر من المسموح.')); req.destroy(); return; }
   chunks.push(chunk);
  });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
 });
}

export function parseBody(raw, contentType = '') {
 if (!raw || raw.length === 0) return {};
 const type = contentType.split(';')[0].trim().toLowerCase();
 const text = raw.toString('utf8');
 if (type === 'application/json') {
  try { const parsed = JSON.parse(text); return parsed && typeof parsed === 'object' ? parsed : {}; } catch { throw new HttpError(400, 'صيغة JSON غير صالحة.'); }
 }
 if (type === 'application/x-www-form-urlencoded') {
  const out = {};
  for (const [k, v] of new URLSearchParams(text)) {
   if (k in out) { out[k] = Array.isArray(out[k]) ? [...out[k], v] : [out[k], v]; } else out[k] = v;
  }
  return out;
 }
 return {};
}
