// عدّاد المشاهدات الداخلي: يجمّع العدّ بالذاكرة ويفرّغه كل 30 ثانية بلا أي بيانات شخصية
import { db } from '../supabase.js';
import { muscatDay } from './format.js';
import { BOT_PATTERN } from '../security.js';

const FLUSH_MS = 30 * 1000;
const counts = new Map();
let timer = null;

// يقرر إن كان الطلب يُحتسب مشاهدة عامة
export function shouldCount(ctx, status) {
 if (status !== 200) return false;
 if (ctx.method !== 'GET') return false;
 const p = ctx.path;
 if (p.startsWith('/admin') || p.startsWith('/api') || p.startsWith('/assets')) return false;
 if (p === '/sitemap.xml' || p === '/robots.txt' || p === '/favicon.ico') return false;
 const purpose = String(ctx.req.headers.purpose || ctx.req.headers['sec-purpose'] || '');
 if (/prefetch|prerender/i.test(purpose)) return false;
 const ua = String(ctx.req.headers['user-agent'] || '');
 if (!ua || BOT_PATTERN.test(ua)) return false;
 return true;
}

export function record(path) {
 const key = `${muscatDay()}|${path.slice(0, 200)}`;
 counts.set(key, (counts.get(key) || 0) + 1);
}

// يرسل العدّادات المتراكمة إلى قاعدة البيانات عبر الدالة الذرية
export async function flush() {
 if (counts.size === 0) return;
 const batch = [...counts.entries()];
 counts.clear();
 for (const [key, n] of batch) {
  const [day, path] = key.split('|');
  const { error } = await db().rpc('increment_pageview', { p_day: day, p_path: path, p_n: n });
  if (error) console.error('Failed to save pageviews:', error.message);
 }
}

export function start() {
 if (timer) return;
 timer = setInterval(() => { flush().catch(() => {}); }, FLUSH_MS);
 timer.unref();
}

export async function stop() {
 if (timer) clearInterval(timer);
 timer = null;
 await flush();
}

export function pending() { return counts.size; }
