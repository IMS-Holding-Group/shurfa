// واجهات النماذج العامة وفحص الصحة
import { db } from '../supabase.js';
import { HttpError } from '../router.js';
import { LIMITS, rateLimit } from '../security.js';
import { getForm } from '../cms/content.js';
import { validateSubmission } from '../cms/forms.js';
import { emit } from '../cms/webhooks.js';
import { renderPath } from './site.js';

const FORM_BODY_LIMIT = 20 * 1024;

function wantsJson(ctx) {
 const ct = String(ctx.req.headers['content-type'] || '');
 const accept = String(ctx.req.headers.accept || '');
 return ct.includes('application/json') || accept.includes('application/json');
}

function safeReturn(value, fallback = '/') {
 const s = String(value || '');
 if (!s.startsWith('/') || s.startsWith('//') || s.includes('\n')) return fallback;
 return s.split('#')[0].split('?')[0] || fallback;
}

export function registerPublicApi(router) {
 router.get('/api/health', (ctx) => ctx.ok({ status: 'ok', time: new Date().toISOString() }));

 router.post('/api/forms/:slug', async (ctx) => {
  if (ctx.rawBody && ctx.rawBody.length > FORM_BODY_LIMIT) throw new HttpError(413, 'حجم الطلب أكبر من المسموح.');
  const form = await getForm(ctx.params.slug);
  if (!form) throw new HttpError(404, 'النموذج غير موجود.');
  const json = wantsJson(ctx);
  const input = ctx.body || {};
  const returnTo = safeReturn(input._return);
  if (input.website_url) {
   if (json) return ctx.ok({ sent: true });
   return ctx.redirect(303, `${returnTo}?sent=${encodeURIComponent(form.slug)}`);
  }
  const { data, fields } = await validateSubmission(form, input);
  if (Object.keys(fields).length) {
   if (json) return ctx.fail(400, 'راجع الحقول المحددة.', fields);
   const formState = { [form.slug]: { errors: fields, values: input, message: 'راجع الحقول المحددة ثم أعد الإرسال.' } };
   const rendered = await renderPath(ctx, returnTo, formState);
   if (!rendered) return ctx.redirect(303, returnTo);
   return ctx.html(400, rendered.html);
  }
  const { data: saved, error } = await db().from('form_submissions').insert({ form_id: form.id, data }).select('id, created_at').single();
  if (error) throw new HttpError(500, 'تعذر حفظ الرسالة. حاول مجددًا.');
  emit('form_submitted', { form: { slug: form.slug, title: form.title }, submission: { id: saved.id, data } }, form.id).catch(() => {});
  if (json) return ctx.ok({ sent: true, message: form.success_message });
  return ctx.redirect(303, `${returnTo}?sent=${encodeURIComponent(form.slug)}`);
 }, [rateLimit('form', LIMITS.form, (ctx) => `${ctx.params.slug}:${ctx.ip}`)]);
}
