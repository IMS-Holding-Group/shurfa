// التكاملات والتحليلات: أدوات القياس، الموافقة، واتساب، التواصل الاجتماعي، شريط الإعلان، Webhooks
import { api } from '../api.js';
import { el, button, field, chip, confirmBar, table, pageHeader, section, notice, notify, applyErrors, fmtDate, copyText, setDirty } from '../ui.js';
import { can, isSuper } from '../app.js';

const TRACKING = [
 ['ga4_id', 'Google Analytics 4', 'معرّف القياس بصيغة G-XXXXXXXXXX من إعدادات مجرى البيانات.'],
 ['gtm_id', 'Google Tag Manager', 'معرّف الحاوية بصيغة GTM-XXXXXXX. عند إدخاله يُدار GA4 من داخل GTM.'],
 ['search_console_token', 'Google Search Console', 'رمز التحقق من وسم google-site-verification (المحتوى فقط دون الوسم).'],
 ['meta_pixel_id', 'Meta Pixel', 'أرقام فقط، من 10 إلى 20 رقمًا.'],
 ['snap_pixel_id', 'Snapchat Pixel', 'بصيغة UUID كما يظهر في لوحة Snapchat.'],
 ['tiktok_pixel_id', 'TikTok Pixel', 'أحرف كبيرة وأرقام، من 10 إلى 30.'],
 ['clarity_id', 'Microsoft Clarity', 'معرّف المشروع، أحرف صغيرة وأرقام من 8 إلى 12.']
];
const SOCIAL = [['x', 'X'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'], ['snapchat', 'Snapchat'], ['youtube', 'YouTube'], ['linkedin', 'LinkedIn']];
const EVENT_LABELS = { form_submitted: 'إرسال نموذج', content_published: 'نشر محتوى' };

export async function render(root) {
 const full = can('integrations', 'full');
 const d = await api.get('/api/admin/integrations');
 const s = d.settings;
 const f = {};
 TRACKING.forEach(([k, label, help]) => { f[k] = field({ label, help: `${help} اتركه فارغًا للتعطيل.`, value: s[k] || '', maxLength: 120, onInput: () => setDirty(true) }); });
 f.consent_banner_enabled = field({ label: 'إظهار شريط الموافقة على أدوات القياس', help: 'يظهر فقط عندما تكون أداة تتبع واحدة على الأقل مفعّلة.', type: 'checkbox', value: s.consent_banner_enabled !== false, onChange: () => setDirty(true) });
 f.whatsapp_enabled = field({ label: 'إظهار زر واتساب الثابت', type: 'checkbox', value: !!s.whatsapp_enabled, onChange: () => setDirty(true) });
 f.whatsapp_number = field({ label: 'رقم واتساب', help: 'بصيغة دولية بدون + ولا مسافات، مثل 968XXXXXXXX.', value: s.whatsapp_number || '', maxLength: 20, inputmode: 'numeric', onInput: () => setDirty(true) });
 SOCIAL.forEach(([k, label]) => { f[`social.${k}`] = field({ label, help: 'رابط كامل يبدأ بـ https://. يُخفى إن كان فارغًا.', value: s.social?.[k] || '', maxLength: 300, onInput: () => setDirty(true) }); });
 f['announcement.enabled'] = field({ label: 'تفعيل شريط الإعلان أعلى الموقع', type: 'checkbox', value: !!s.announcement?.enabled, onChange: () => setDirty(true) });
 f['announcement.text'] = field({ label: 'نص الإعلان', help: 'جملة واحدة قصيرة.', value: s.announcement?.text || '', maxLength: 160, onInput: () => setDirty(true) });
 f['announcement.url'] = field({ label: 'رابط الإعلان (اختياري)', value: s.announcement?.url || '', maxLength: 2048, onInput: () => setDirty(true) });
 if (isSuper()) f.extra_csp_hosts = field({ label: 'مضيفات CSP إضافية (للمسؤول الأول)', help: 'مفصولة بمسافات، كل واحدة تبدأ بـ https://. تُستخدم فقط عند الحاجة لأداة غير مدرجة ضمن GTM.', type: 'textarea', rows: 2, value: s.extra_csp_hosts || '', onInput: () => setDirty(true) });

 const warn = el('div', {}, ...(d.warnings || []).map((w) => notice(w, 'purple')));
 const save = async () => {
  const body = { consent_banner_enabled: f.consent_banner_enabled.get(), whatsapp_enabled: f.whatsapp_enabled.get(), whatsapp_number: f.whatsapp_number.get(), social: Object.fromEntries(SOCIAL.map(([k]) => [k, f[`social.${k}`].get()])), announcement: { enabled: f['announcement.enabled'].get(), text: f['announcement.text'].get(), url: f['announcement.url'].get() } };
  TRACKING.forEach(([k]) => { body[k] = f[k].get(); });
  if (f.extra_csp_hosts) body.extra_csp_hosts = f.extra_csp_hosts.get();
  try {
   await api.put('/api/admin/integrations', body);
   setDirty(false);
   notify('حُفظت الإعدادات. تنعكس على الموقع خلال دقيقة.');
   const fresh = await api.get('/api/admin/integrations');
   warn.replaceChildren(...(fresh.warnings || []).map((w) => notice(w, 'purple')));
  } catch (e) { applyErrors(f, e.fields); notify(e.message, 'error'); }
 };

 const parts = [
  pageHeader('التكاملات والتحليلات', full ? button('حفظ الإعدادات', { style: 'primary', onClick: save }) : null),
  el('p', { class: 'support muted', text: 'كل تكامل معطّل افتراضيًا ويُفعَّل بإدخال معرّفه. سكربتات التتبع لا تعمل قبل موافقة الزائر.' }),
  warn,
  section('أدوات القياس والتتبع', el('div', { class: 'form-grid' }, ...TRACKING.map(([k]) => f[k].wrap)), f.consent_banner_enabled.wrap, f.extra_csp_hosts ? f.extra_csp_hosts.wrap : null),
  section('واتساب', el('div', { class: 'form-grid' }, f.whatsapp_enabled.wrap, f.whatsapp_number.wrap)),
  section('التواصل الاجتماعي', el('div', { class: 'form-grid' }, ...SOCIAL.map(([k]) => f[`social.${k}`].wrap))),
  section('شريط الإعلان', f['announcement.enabled'].wrap, el('div', { class: 'form-grid' }, f['announcement.text'].wrap, f['announcement.url'].wrap))
 ];
 if (isSuper()) parts.push(await webhooksSection(d.events));
 root.replaceChildren(...parts);
 if (!full) root.querySelectorAll('input, textarea').forEach((n) => { n.disabled = true; });
}

async function webhooksSection(events) {
 const slot = el('div');
 const box = el('div');
 const forms = (await api.get('/api/admin/forms')).items;
 let items = (await api.get('/api/admin/webhooks')).items;

 const showSecret = (hook) => slot.replaceChildren(el('div', { class: 'inline-panel' },
  el('h3', { text: `سر التوقيع لـ ${hook.name}` }),
  el('p', { class: 'support', text: 'يُعرض مرة واحدة فقط. احفظه الآن في النظام المستقبل للتحقق من ترويسة X-Shurfah-Signature.' }),
  el('code', { class: 'secret', text: hook.secret }),
  el('div', { class: 'inline-list' }, button('نسخ', { small: true, onClick: () => copyText(hook.secret) }), button('إغلاق', { style: 'quiet', small: true, onClick: () => slot.replaceChildren() }))));

 const openEditor = (hook) => {
  const f = {
   name: field({ label: 'الاسم', value: hook?.name || '', maxLength: 80, required: true, onInput: () => setDirty(true) }),
   url: field({ label: 'الرابط', help: 'https:// فقط، إلى خادم عام (لا عناوين داخلية).', value: hook?.url || '', maxLength: 2048, required: true, onInput: () => setDirty(true) }),
   is_active: field({ label: 'مفعّل', type: 'checkbox', value: hook ? hook.is_active : true, onChange: () => setDirty(true) })
  };
  const evChecks = events.map((e) => field({ label: EVENT_LABELS[e] || e, type: 'checkbox', value: hook ? (hook.events || []).includes(e) : e === 'form_submitted', onChange: () => setDirty(true) }));
  const formChecks = forms.map((fm) => field({ label: fm.title, type: 'checkbox', value: hook?.form_ids ? hook.form_ids.includes(fm.id) : false, onChange: () => setDirty(true) }));
  const evErr = el('p', { class: 'field-error' });
  slot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: hook ? 'تعديل الوجهة' : 'وجهة جديدة' }), button('إغلاق', { style: 'quiet', small: true, onClick: () => { setDirty(false); slot.replaceChildren(); } })),
   el('div', { class: 'form-grid' }, f.name.wrap, f.url.wrap, f.is_active.wrap),
   el('p', { class: 'field-label', text: 'الأحداث' }), ...evChecks.map((c) => c.wrap), evErr,
   el('p', { class: 'field-label', text: 'النماذج (اختياري: اتركها كلها بلا تحديد لتشمل الجميع)' }), ...formChecks.map((c) => c.wrap),
   button('حفظ', { style: 'primary', onClick: async () => {
    const body = { name: f.name.get(), url: f.url.get(), is_active: f.is_active.get(), events: events.filter((e, i) => evChecks[i].get()), form_ids: forms.filter((fm, i) => formChecks[i].get()).map((fm) => fm.id) };
    try {
     const saved = hook ? await api.put(`/api/admin/webhooks/${hook.id}`, body) : await api.post('/api/admin/webhooks', body);
     setDirty(false); notify('حُفظت الوجهة.'); await reload();
     if (saved.secret) showSecret(saved); else slot.replaceChildren();
    } catch (e) { applyErrors(f, e.fields); evErr.textContent = e.fields?.events || ''; notify(e.message, 'error'); }
   } })));
 };

 const showDeliveries = async (hook) => {
  const list = (await api.get(`/api/admin/webhooks/${hook.id}/deliveries`)).items;
  slot.replaceChildren(el('div', { class: 'inline-panel' },
   el('div', { class: 'inline-panel-head' }, el('h3', { text: `سجل الإرسال: ${hook.name}` }), button('إغلاق', { style: 'quiet', small: true, onClick: () => slot.replaceChildren() })),
   table([{ label: 'الوقت', render: (x) => fmtDate(x.created_at) }, { label: 'الحدث', render: (x) => EVENT_LABELS[x.event] || x.event }, { label: 'المحاولة', key: 'attempt' }, { label: 'النتيجة', render: (x) => (x.ok ? chip(`نجح ${x.status_code || ''}`, 'success') : chip(`فشل ${x.status_code || ''} ${x.error || ''}`.trim(), 'error')) }], list, { empty: 'لا محاولات بعد.' })));
 };

 const draw = () => box.replaceChildren(table([
  { label: 'الاسم', key: 'name' },
  { label: 'الرابط', render: (h) => el('code', { text: h.url }) },
  { label: 'الأحداث', render: (h) => (h.events || []).map((e) => EVENT_LABELS[e] || e).join('، ') },
  { label: 'الحالة', render: (h) => (h.is_active ? chip('مفعّل', 'success') : chip('متوقف', 'sand')) },
  { label: '', render: (h) => el('span', { class: 'inline-list' },
   button('تعديل', { small: true, onClick: () => openEditor(h) }),
   button('اختبار', { style: 'quiet', small: true, onClick: async () => { try { const r = await api.post(`/api/admin/webhooks/${h.id}/test`); notify(r.ok ? `نجح الإرسال التجريبي (${r.status || ''}).` : `فشل الإرسال التجريبي: ${r.error || r.status || ''}`, r.ok ? 'success' : 'error'); } catch (e) { notify(e.message, 'error'); } } }),
   button('السجل', { style: 'quiet', small: true, onClick: () => showDeliveries(h) }),
   button('تدوير السر', { style: 'quiet', small: true, onClick: (e) => e.currentTarget.closest('td').append(confirmBar('تدوير السر يُبطل السر القديم فورًا. تأكيد؟', { confirmLabel: 'تدوير', onConfirm: async () => { const r = await api.post(`/api/admin/webhooks/${h.id}/rotate-secret`); showSecret(r); } })) }),
   button('حذف', { style: 'quiet', small: true, onClick: (e) => e.currentTarget.closest('td').append(confirmBar('تأكيد حذف الوجهة؟', { onConfirm: async () => { await api.del(`/api/admin/webhooks/${h.id}`); notify('حُذفت.'); await reload(); } })) })) }
 ], items, { empty: 'لا وجهات بعد. أضف وجهة لاستقبال الردود والنشر في أنظمتك.' }));
 const reload = async () => { items = (await api.get('/api/admin/webhooks')).items; draw(); };
 draw();
 return section('Webhooks (للمسؤول الأول)', el('p', { class: 'support muted', text: 'إرسال صادر موقّع بـ HMAC-SHA256 عند إرسال نموذج أو نشر محتوى، مع إعادة المحاولة 3 مرات. يعوّض إرسال البريد.' }), el('div', { class: 'inline-list' }, button('وجهة جديدة', { onClick: () => openEditor(null) })), slot, box);
}
