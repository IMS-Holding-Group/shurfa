// الكتل التفاعلية: جدول الجواز، حاسبة الجواز، نموذج، دعوة التطبيق، بيانات التواصل
import { escapeHtml, button, field, notice, attrs } from '../../render/components.js';
import { icon } from '../../render/icons.js';
import { getForm, getGovernorates } from '../content.js';
import { getActiveTiers } from '../../services/passport.js';
import { formatOmr, formatPct } from '../../services/format.js';
import { blockTitle } from './basic.js';

export const passport_tiers = {
 type: 'passport_tiers',
 label_ar: 'جدول الجواز',
 description_ar: 'جدول فئات الجواز التراثي من إعدادات الجواز.',
 icon: 'passport',
 fields: [{ key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 }],
 defaults: { bg: 'white', data: { title: 'فئات الجواز' } },
 async load() { return { tiers: await getActiveTiers() }; },
 render(data, ctx, loaded) {
  const free = ctx.settings.passport_free === true;
  const rows = (loaded.tiers || []).map((t) => `<tr><td>${escapeHtml(t.name_ar)}</td><td>${free ? 'مجاني عند الإطلاق' : escapeHtml(formatOmr(t.price_omr))}</td><td>${escapeHtml(String(t.duration_days))} يومًا</td><td>من ${escapeHtml(formatPct(t.discount_min_pct))} إلى ${escapeHtml(formatPct(t.discount_max_pct))}</td></tr>`).join('');
  return `${blockTitle(data.title)}<div class="table-wrap"><table class="table"><thead><tr><th scope="col">الفئة</th><th scope="col">السعر</th><th scope="col">المدة</th><th scope="col">الخصم على الخدمات المشاركة</th></tr></thead><tbody>${rows}</tbody></table></div>${free ? '<p class="support muted">الأسعار المعروضة مبدئية، والجواز مجاني عند الإطلاق.</p>' : '<p class="support muted">الأسعار المعروضة مبدئية.</p>'}`;
 }
};

export const passport_calculator = {
 type: 'passport_calculator',
 label_ar: 'حاسبة الجواز',
 description_ar: 'يدخل الزائر إنفاقه المتوقع ويرى التوفير الصافي وحد التعادل لكل فئة.',
 icon: 'passport',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'body', type: 'longtext', label_ar: 'النص', help_ar: 'جملة تشرح الحاسبة.', max_length: 300 }
 ],
 defaults: { bg: 'cream', data: { title: 'كم توفّر؟', body: '' } },
 async load() { return { tiers: await getActiveTiers() }; },
 render(data, ctx, loaded) {
  const tiers = loaded.tiers || [];
  const tierJson = escapeHtml(JSON.stringify(tiers.map((t) => ({ code: t.code, name_ar: t.name_ar, price_omr: Number(t.price_omr), duration_days: t.duration_days, discount_min_pct: Number(t.discount_min_pct), discount_max_pct: Number(t.discount_max_pct) }))));
  const spend = 200;
  const staticRows = tiers.map((t) => `<div class="calc-tier"><h3>${escapeHtml(t.name_ar)}</h3><p class="support">السعر ${escapeHtml(formatOmr(t.price_omr))} لمدة ${escapeHtml(String(t.duration_days))} يومًا، خصم من ${escapeHtml(formatPct(t.discount_min_pct))} إلى ${escapeHtml(formatPct(t.discount_max_pct))}.</p><p class="calc-saving" data-calc-saving></p><p class="support muted" data-calc-breakeven></p></div>`).join('');
  return `${blockTitle(data.title)}<div class="calculator" data-passport-calculator data-tiers="${tierJson}" data-track="passport_calc_used">${data.body ? `<p class="lead">${escapeHtml(data.body)}</p>` : ''}
${field({ id: 'calc-spend', name: 'spend', label: 'كم تتوقع أن تنفق خلال رحلتك؟ (بالريال العُماني)', type: 'text', value: String(spend), help: 'أدخل رقمًا تقريبيًا.' })}
<div class="calculator-results" aria-live="polite">${staticRows}</div>
<noscript><p class="support muted">فعّل الجافاسكربت لاستخدام الحاسبة.</p></noscript></div>`;
 }
};

// يرسم نموذجًا كاملًا من تعريفه مع حالة الإرسال والأخطاء
export async function renderFormHtml(form, ctx, { title = '', intro = '' } = {}) {
 if (!form) return '<p class="muted">النموذج غير متاح حاليًا.</p>';
 const state = ctx.formState?.[form.slug] || {};
 const governorates = form.fields.some((f) => f.type === 'governorate') ? (await getGovernorates()).map((g) => g.name_ar) : [];
 const fields = form.fields.map((f) => field({
  id: `f-${form.slug}-${f.name}`,
  name: f.name,
  label: f.label,
  type: f.type === 'governorate' ? 'select' : f.type,
  options: f.type === 'governorate' ? governorates : (f.options || []),
  required: !!f.required,
  help: f.help || '',
  error: state.errors?.[f.name] || '',
  value: state.values?.[f.name] || '',
  maxLength: f.type === 'checkbox' || f.type === 'select' || f.type === 'governorate' ? undefined : (f.max_length || undefined),
  autocomplete: f.type === 'email' ? 'email' : (f.type === 'phone' ? 'tel' : (f.name === 'name' || f.name === 'contact_name' ? 'name' : undefined))
 })).join('');
 const sent = ctx.query?.get('sent') === form.slug;
 const status = sent ? notice(form.success_message, 'success') : (state.message ? notice(state.message, 'error') : '');
 return `<div class="form">${title ? `<h2 class="block-title">${escapeHtml(title)}</h2>` : ''}${intro ? `<p class="form-intro lead">${escapeHtml(intro)}</p>` : ''}
<div class="form-status" data-form-status aria-live="polite">${status}</div>
<form${attrs({ method: 'post', action: `/api/forms/${form.slug}`, 'data-form': form.slug, novalidate: true })}>
<input type="hidden" name="_return" value="${escapeHtml(ctx.path)}">
<div class="honeypot" aria-hidden="true"><label for="hp-${escapeHtml(form.slug)}">اتركه فارغًا</label><input type="text" id="hp-${escapeHtml(form.slug)}" name="website_url" tabindex="-1" autocomplete="off"></div>
${fields}
<div class="form-actions">${button({ label: form.submit_label || 'إرسال', type: 'submit', style: 'primary' })}</div>
</form></div>`;
}

export const form = {
 type: 'form',
 label_ar: 'نموذج',
 description_ar: 'نموذج من مكتبة النماذج مع عنوان ونص تمهيدي.',
 icon: 'mail',
 fields: [
  { key: 'form', type: 'form_select', label_ar: 'النموذج', help_ar: 'من وحدة النماذج.', required: true },
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 },
  { key: 'intro', type: 'longtext', label_ar: 'النص التمهيدي', help_ar: '', max_length: 300 }
 ],
 defaults: { bg: 'cream', data: { form: 'contact', title: '', intro: '' } },
 async load(data, ctx) {
  const def = await getForm(data.form);
  return { formHtml: await renderFormHtml(def, ctx, { title: data.title, intro: data.intro }) };
 },
 render(data, ctx, loaded) { return loaded.formHtml || ''; }
};

export const app_cta = {
 type: 'app_cta',
 label_ar: 'دعوة التطبيق',
 description_ar: 'تعرض نموذج الاهتمام عند «قريبًا» وروابط المتجرين عند «متاح»، تبعًا لحالة التطبيق.',
 icon: 'arrow',
 fields: [
  { key: 'title', type: 'text', label_ar: 'العنوان', help_ar: 'جمل قصيرة، الفعل أولًا، بدون مبالغة', required: true, max_length: 100 },
  { key: 'body', type: 'longtext', label_ar: 'النص', help_ar: '', max_length: 300 }
 ],
 defaults: { bg: 'ink', data: { title: 'رحلتك تبدأ بسعر تعرفه من أول خطوة', body: 'كل تجربة في شُرفة بسعرها النهائي ومدتها وما يشمله السعر.' } },
 async load(data, ctx) {
  if ((ctx.settings.app_status || 'coming_soon') === 'available') return {};
  const def = await getForm('waitlist');
  return { formHtml: await renderFormHtml(def, ctx) };
 },
 render(data, ctx, loaded) {
  const s = ctx.settings;
  const head = `<h2>${escapeHtml(data.title)}</h2>${data.body ? `<p class="lead">${escapeHtml(data.body)}</p>` : ''}`;
  if ((s.app_status || 'coming_soon') === 'available') {
   const links = [];
   if (s.app_store_url) links.push(button({ label: 'App Store', href: s.app_store_url, style: 'primary', track: 'app_store_click', trackLabel: 'apple', trackLocation: 'app_cta' }));
   if (s.play_store_url) links.push(button({ label: 'Google Play', href: s.play_store_url, style: links.length ? 'secondary' : 'primary', track: 'app_store_click', trackLabel: 'google', trackLocation: 'app_cta' }));
   return `<div class="app-cta">${head}${links.length ? `<div class="app-cta-links">${links.join('')}</div>` : '<p class="support">روابط التحميل تُضاف قريبًا.</p>'}</div>`;
  }
  const label = s.app_status === 'beta' ? 'التطبيق في مرحلة التجربة. سجّل اهتمامك لنخبرك عند الإطلاق.' : 'التطبيق قريبًا. سجّل اهتمامك لنخبرك عند الإطلاق.';
  return `<div class="app-cta">${head}<p class="support">${label}</p>${loaded.formHtml || ''}</div>`;
 }
};

export const contact_info = {
 type: 'contact_info',
 label_ar: 'بيانات التواصل',
 description_ar: 'البريد والهاتف ووسائل التواصل من الإعدادات، وتُخفى الفارغة.',
 icon: 'phone',
 fields: [{ key: 'title', type: 'text', label_ar: 'العنوان', help_ar: '', max_length: 100 }],
 defaults: { bg: 'cream', data: { title: 'بيانات التواصل' } },
 render(data, ctx) {
  const s = ctx.settings;
  const items = [];
  if (s.contact_email) items.push(`<li>${icon('mail', 24)}<a href="mailto:${escapeHtml(s.contact_email)}">${escapeHtml(s.contact_email)}</a></li>`);
  if (s.contact_phone) items.push(`<li>${icon('phone', 24)}<a href="tel:${escapeHtml(String(s.contact_phone).replace(/\s/g, ''))}">${escapeHtml(s.contact_phone)}</a></li>`);
  if (s.whatsapp_enabled && s.whatsapp_number) items.push(`<li>${icon('whatsapp', 24)}<a href="https://wa.me/${escapeHtml(s.whatsapp_number)}" rel="noopener noreferrer" target="_blank">واتساب</a></li>`);
  const labels = { x: 'إكس', instagram: 'إنستغرام', tiktok: 'تيك توك', snapchat: 'سناب شات', youtube: 'يوتيوب', linkedin: 'لينكدإن' };
  for (const [k, v] of Object.entries(s.social || {})) if (labels[k] && typeof v === 'string' && v.startsWith('https://')) items.push(`<li>${icon('location', 24)}<a href="${escapeHtml(v)}" rel="noopener noreferrer" target="_blank">${labels[k]}</a></li>`);
  if (!items.length) return `${blockTitle(data.title)}<p class="muted">اكتب لنا عبر النموذج أعلاه ونرد عليك.</p>`;
  return `${blockTitle(data.title)}<ul class="contact-list">${items.join('')}</ul>`;
 }
};

export const blocks = [passport_tiers, passport_calculator, form, app_cta, contact_info];
