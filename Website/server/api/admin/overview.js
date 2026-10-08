// واجهة النظرة العامة: الأرقام والمشاهدات وأكثر الصفحات والمحتوى المجدول وسجل الكتل
import { db } from '../../supabase.js';
import { HttpError } from '../../router.js';
import { requirePermission, hasLevel } from '../../rbac.js';
import { muscatDay } from '../../services/format.js';
import { registryForClient } from '../../cms/blocks/registry.js';
import { ICON_KEYS, ICON_LABELS } from '../../render/icons.js';
import { listForms } from '../../cms/forms.js';
import { guarded } from './shared.js';

function daysAgo(n) {
 const d = new Date();
 d.setUTCDate(d.getUTCDate() - n);
 return muscatDay(d);
}

export function registerOverviewApi(router) {
 router.get('/api/admin/overview', async (ctx) => {
  const role = ctx.profile.role;
  const since30 = daysAgo(29);
  const since7 = daysAgo(6);
  const now = new Date().toISOString();
  const contentRole = hasLevel(role, 'content', 'view');
  const [forms, analytics, gaRes, contentStats] = await Promise.all([
   listForms(),
   db().from('analytics_daily').select('day, path, views').gte('day', since30).order('day'),
   db().from('site_settings').select('value').eq('key', 'ga4_id').maybeSingle(),
   contentRole ? Promise.all(['pages', 'services', 'guides'].map(async (table) => {
    const [pendingRes, scheduledRes] = await Promise.all([
     db().from(table).select('id', { count: 'exact', head: true }).is('deleted_at', null).not('draft', 'is', null),
     db().from(table).select('id, title, slug, publish_at').is('deleted_at', null).gt('publish_at', now).order('publish_at').limit(5)
    ]);
    return { count: pendingRes.count || 0, rows: (scheduledRes.data || []).map((r) => ({ ...r, table })) };
   })) : []
  ]);
  if (analytics.error) throw new HttpError(500, 'تعذر قراءة الإحصاءات.');
  const rows = analytics.data;
  const daily = {};
  const byPath = {};
  let views7 = 0; let views30 = 0;
  for (const r of rows || []) {
   daily[r.day] = (daily[r.day] || 0) + r.views;
   byPath[r.path] = (byPath[r.path] || 0) + r.views;
   views30 += r.views;
   if (r.day >= since7) views7 += r.views;
  }
  const series = [];
  for (let i = 29; i >= 0; i -= 1) { const day = daysAgo(i); series.push({ day, views: daily[day] || 0 }); }
  const topPages = Object.entries(byPath).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, views]) => ({ path, views }));
  const visibleForms = forms.filter((f) => hasLevel(role, f.module_group, 'view'));
  const newByForm = await Promise.all(visibleForms.map(async (f) => {
   const { count } = await db().from('form_submissions').select('id', { count: 'exact', head: true }).eq('form_id', f.id).eq('status', 'new');
   return { slug: f.slug, title: f.title, module_group: f.module_group, count: count || 0 };
  }));
  const pending = contentStats.reduce((sum, row) => sum + row.count, 0);
  const scheduled = contentStats.flatMap((row) => row.rows).sort((a, b) => new Date(a.publish_at) - new Date(b.publish_at)).slice(0, 5);
  const ga = gaRes.data;
  ctx.ok({ views7, views30, series, topPages, newByForm, newTotal: newByForm.reduce((s, f) => s + f.count, 0), pending, scheduled, ga4Enabled: !!(ga?.value) });
 }, [...guarded, requirePermission('overview', 'view')]);

 // سجل الكتل والأيقونات لبناء نماذج المحرر في اللوحة
 router.get('/api/admin/blocks/registry', async (ctx) => {
  ctx.ok({ ...registryForClient(), icons: ICON_KEYS.map((k) => ({ value: k, label_ar: ICON_LABELS[k] })) });
 }, guarded);
}
