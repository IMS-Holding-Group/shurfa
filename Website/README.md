# الوثيقة الرئيسية لموقع شُرفة

هذه الوثيقة تصف ما هو موجود في المجلد `Website` بتاريخ فحص الملفات، لا ما يُخطط له. مصدر الوصف هو الكود وملفات `database/*.sql` و`package.json`. لم يُفحص مشروع Supabase الحي لأن ملف `.env` غير موجود في المجلد، فلا يمكن تأكيد أن الجداول نُفّذت فعلًا على خادم.

إذا تعارضت جملة هنا مع ملف في المشروع، فالملف هو المرجع.

## الفهرس

1. [ما هو المشروع؟](#s1)
2. [لماذا يوجد؟](#s2)
3. [من يستخدمه؟](#s3)
4. [ماذا يستطيع أن يفعل؟](#s4)
5. [كيف يعمل؟](#s5)
6. [أمثلة واقعية](#s6)
7. [رحلة المستخدم](#s7)
8. [الوحدات والأقسام](#s8)
9. [الشركات والكيانات](#s9)
10. [الصلاحيات](#s10)
11. [الأتمتة](#s11)
12. [التكامل بين الوحدات](#s12)
13. [المصطلحات](#s13)
14. [الأسئلة الشائعة](#s14)
15. [المعمارية](#s15)
16. [التقنيات](#s16)
17. [بنية المجلدات](#s17)
18. [الواجهة](#s18)
19. [الخادم](#s19)
20. [مسار الطلب](#s20)
21. [قاعدة البيانات](#s21)
22. [الواجهات البرمجية](#s22)
23. [الدخول والصلاحيات](#s23)
24. [الحماية](#s24)
25. [الإعدادات](#s25)
26. [الخدمات الخارجية](#s26)
27. [المهام المجدولة](#s27)
28. [الملفات](#s28)
29. [السجلات والمراقبة](#s29)
30. [التثبيت](#s30)
31. [دليل المطوّر](#s31)
32. [النشر](#s32)
33. [النسخ الاحتياطي](#s33)
34. [تشخيص الأعطال](#s34)
35. [الاعتماديات](#s35)
36. [القيود المعروفة](#s36)
37. [حالة النظام](#s37)
38. [قرارات معمارية ظاهرة من الكود](#s38)
39. [سجل الإصدارات](#s39)
40. [نظرة النظام](#s40)
41. [مرجع سريع](#s41)
42. [أقصر تشغيل](#s42)
43. [لغير المتخصص](#s43)
44. [للمطوّر](#s44)

<a id="s1"></a>
## 1. ما هو المشروع؟

شُرفة، كما يصفها `package.json`، موقع تعريفي تجاري مع نظام إدارة محتوى. الزائر يفتح صفحات عربية من اليمين إلى اليسار تعرّف بالمنصة وخدماتها السبع والجواز التراثي، ويرسل رسالة أو طلب انضمام. فريق التشغيل يدخل لوحة على المسار `/admin` ويعدّل النصوص والصور والقوائم والنماذج دون تعديل ملفات HTML.

الموقع لا يحجز ولا يقبض ولا ينشئ حسابًا للزائر. هذا مثبت بغياب أي جدول أو مسار للحجز أو الدفع أو حسابات العملاء في `database/schema.sql` و`server/`.

<a id="s2"></a>
## 2. لماذا يوجد؟

النصوص الأولية في `database/seed.sql` تعرض المشكلة كما كُتبت في المحتوى، وليس كدراسة منفصلة داخل المجلد: الخدمات السياحية (أنشطة، طعام، مركبات، إقامة، حرف، فعاليات) والجواز التراثي تُقدَّم في مكان واحد، والحجز نفسه مؤجل إلى تطبيق لم يُبنَ في هذا المجلد. صفحة التطبيق وحالة `app_status` في الإعدادات (`coming_soon` أو `beta` أو `available`) تغيّر نص زر الدعوة في الرأس.

لا يوجد داخل المجلد ملف دراسة جدوى. أي تفصيل تجاري غير موجود في `seed.sql` أو في الكود غير موثّق هنا.

<a id="s3"></a>
## 3. من يستخدمه؟

نوعان فقط.

الزائر لا يسجّل دخولًا. يتصفح الصفحات ويرسل النماذج العامة `POST /api/forms/:slug`.

فريق الإدارة خمسة أدوار في النوع `admin_role` وفي `server/rbac.js`:

| الدور في القاعدة | الاسم في اللوحة | البريد الذي ينشئه `scripts/seed.js` |
|---|---|---|
| `super_admin` | المسؤول الأول | mithamahmed99@gmail.com |
| `customer_service` | خدمة العملاء | cs@shurfah.link |
| `marketing` | التسويق | marketing@shurfah.link |
| `finance` | المالية | finance@shurfah.link |
| `operations` | العمليات | operations@shurfah.link |

كلمات المرور الابتدائية مكتوبة في الثابت `ACCOUNTS` داخل `scripts/seed.js` ولا تُنسخ في هذه الوثيقة. أول دخول يفرض تغييرها عبر الحقل `must_change_password`.

لا يوجد دور «موظف موارد بشرية» ولا «عميل» ولا «شركة».

<a id="s4"></a>
## 4. ماذا يستطيع النظام أن يفعل؟

الموقع العام، من `server/api/site.js` و`database/seed.sql`:

- الصفحة الرئيسية `/` من الصفحة ذات الرابط `home`.
- صفحات النظام: `services` و`guide` و`passport` و`partners` و`app` و`about` و`contact` و`faq` و`privacy` و`terms` و`cancellation`.
- صفحة خدمة على `/services/:slug` وصفحة مقال على `/guide/:slug`.
- خدمات أولية مُدرجة في `seed.sql`: الأنشطة، الطعام، المركبات، الإقامة، الجواز، الحرف (قريبًا)، الفعاليات (قريبًا).
- حاسبة الجواز في المتصفح عبر `assets/js/site/passport.js` والدوال في `assets/js/shared/passport.js`.
- نماذج: تواصل `contact`، اهتمام `waitlist`، شريك `partner`، وأي نموذج ينشئه الفريق.
- `sitemap.xml` و`robots.txt` و`/favicon.ico` إن وُجد `assets/images/logo/logo-monogram.svg`. هذا الملف غير موجود في المجلد الآن، لذلك الأيقونة لا تُخدم حتى يُضاف الشعار.
- وضع صيانة يرد 503 مع الإبقاء على `/admin`.

اللوحة، من `assets/js/admin/app.js`: نظرة عامة، صفحات، خدمات، دليل، أسئلة، قوائم، جواز، وسائط، تحويلات، سلة، ردود، طلبات شركاء، نماذج، تكاملات، إعدادات، حسابات، سجل تدقيق، وحسابي.

<a id="s5"></a>
## 5. كيف يعمل؟

الخادم في `server/index.js` يبني HTML الصفحة على الجهاز قبل إرسالها. المحتوى المنشور يُقرأ من Supabase. التعديل في اللوحة يُحفظ أولًا في عمود `draft` ولا يراه الزائر. النشر يدمج المسودة في الأعمدة الظاهرة ويمسح الذاكرة المؤقتة في `server/cache.js` (60 ثانية).

الزائر الذي يرسل نموذجًا يكتب صفًا في `form_submissions`. إن وُجدت وجهة Webhook مفعّلة لحدث `form_submitted` يرسل `server/cms/webhooks.js` نسخة موقّعة إلى عنوان HTTPS يختاره المسؤول الأول.

<a id="s6"></a>
## 6. أمثلة واقعية

الأمثلة التالية مطابقة لمسارات موجودة. لا يوجد في المشروع إنشاء عقد أو عملية مالية أو خبر مستقل عن المقالات.

### إنشاء حساب إدارة

1. المسؤول الأول يفتح `#/admins` ويضغط «حساب جديد».
2. اللوحة ترسل `POST /api/admin/admins`.
3. `server/api/admin/admins.js` ينشئ المستخدم عبر `auth.admin.createUser` ثم صفًا في `profiles` مع `must_change_password = true`.
4. الشخص الجديد يدخل من `/admin/login`. اللوحة تحوله إلى `#/account` حتى يغيّر الكلمة عبر `POST /api/admin/account/password`.
5. بعد النجاح يستطيع فتح الوحدات التي يسمح بها دوره فقط.

### نشر صفحة جديدة

1. من `#/pages` يُنشأ سجل عبر `POST /api/admin/pages` بحالة `draft` وكتل فارغة إن كانت صفحة.
2. المحرر في `assets/js/admin/editors/blocks.js` يضيف كتلًا. الحفظ `PUT /api/admin/pages/:id` يكتب `draft` بعد فحص `validateBlocks` في `server/cms/blocks/validate.js`.
3. الموقع العام لا يتغير.
4. «معاينة» تفتح `/admin/preview/page/:id` وتعرض المسودة لجلسة الدخول فقط.
5. «نشر» يستدعي `POST /api/admin/pages/:id/publish`. الدالة `publish` في `server/cms/drafts.js` تدمج المسودة، تحفظ نسخة في `content_revisions`، وتطلق حدث `content_published`.
6. الزائر يفتح `/الرابط` ويرى الكتل.

### تقديم طلب شريك

1. الزائر يفتح `/partners` (الصفحة ضمن المحتوى الأولي وفيها نموذج `partner`).
2. الإرسال يذهب إلى `POST /api/forms/partner`.
3. `server/cms/forms.js` يتحقق من الحقول. حقل المصيدة `website_url` إن مُلئ يُهمل الطلب بصمت نجاح حتى لا يتعلم الروبوت.
4. الصف يُحفظ في `form_submissions` بحالة `new` ومجموعة النموذج `applications`.
5. يظهر في لوحة «طلبات الشركاء» `#/applications`. من يملك اعتمادًا يغيّر الحالة إلى `in_review` أو `accepted` أو `rejected` عبر `PUT /api/admin/submissions/:id`.
6. لا يُرسل بريد. الإشعار الخارجي، إن رُبط، هو Webhook فقط.

### رفع صورة واستخدامها

1. `#/media` يرسل الملف مشفّرًا base64 إلى `POST /api/admin/media`.
2. `server/services/media.js` يفحص البايتات: PNG أو JPEG أو WebP حتى 5 ميغابايت، أو PDF حتى 10 ميغابايت. النص البديل إلزامي للصورة.
3. الملف يُخزَّن في سلة Supabase ذات المعرّف `media`، ويُسجَّل صف في `media_assets`.
4. حقل الصورة في الكتلة يختار هذا الرابط. الحذف يُرفض برمز 409 إن كان الرابط مستخدمًا، وتعرض `findUsages` الأماكن.

<a id="s7"></a>
## 7. رحلة المستخدم

### الزائر

يفتح الموقع. الخادم يرد بصفحة HTML كاملة (رأس، كتل، تذييل). يستطيع إرسال النموذج حتى لو أوقف الجافاسكربت، فيعود إلى الصفحة مع `?sent=اسم-النموذج`. مع الجافاسكربت يرسل `assets/js/site/forms.js` الطلب بصيغة JSON ويظهر شريط النجاح دون إعادة تحميل كاملة. ليس له حساب ولا قائمة طلبات.

### أحد الفريق

1. يفتح `/admin`. بلا كوكي صالح يعاد توجيهه إلى `/admin/login` (انظر `server/index.js`).
2. يرسل البريد وكلمة المرور. النجاح يكتب الكوكيين `shurfah_at` (ساعة) و`shurfah_rt` (7 أيام).
3. إن كانت الكلمة افتراضية تبقى كل الوحدات مغلقة ما عدا حسابي وتسجيل الخروج وقراءة الجلسة (`enforcePasswordChange` في `server/api/admin/shared.js`).
4. يختار قسمًا من الشريط. الرابط مثل `#/guides/المعرّف` لا يطلب مستند HTML جديد. `app.js` يحمّل ملف الوحدة.
5. الحفظ يذهب إلى `/api/admin/...` مع الترويسة `X-Requested-With: shurfah`.
6. النتيجة تظهر في الجدول أو المحرر فورًا، وعلى الموقع العام فقط بعد النشر (للمحتوى) أو فور الحفظ (للإعدادات والقوائم والنماذج بعد إبطال الذاكرة).

<a id="s8"></a>
## 8. الوحدات والأقسام

التجميع الظاهر في الشريط من `GROUPS` داخل `assets/js/admin/app.js`.

### المحتوى

| المسار | الملف | ماذا يفعل المستخدم | الصلة |
|---|---|---|---|
| `#/overview` | `modules/overview.js` | يرى ردودًا جديدة ومشاهدات 7 و30 يومًا وأكثر الصفحات ومحتوى مجدولًا | يقرأ `analytics_daily` و`form_submissions` |
| `#/pages` | `modules/content.js` | يبني صفحة من كتل وينشرها | جدول `pages` |
| `#/services` | الملف نفسه | يعدّل الخدمات السبع أو يضيف خدمة | جدول `services` |
| `#/guides` | الملف نفسه | يكتب مقال Markdown | جدول `guides` |
| `#/faqs` | `modules/faqs.js` | أسئلة ومجموعات وترتيب | جدول `faqs`، وتظهر في كتلة `faq` |
| `#/menus` | `modules/menus.js` | رأس حتى 7 روابط وأربع مجموعات تذييل حتى 8 | جدول `menus` |
| `#/passport` | `modules/passport.js` | أسعار الفئات وخصومها وخيار المجاني | `passport_tiers` وإعداد `passport_free` |
| `#/media` | `modules/media.js` | رفع صور وPDF | `media_assets` وسلة `media` |
| `#/redirects` | `modules/redirects.js` | تحويل 301 أو 302، استيراد وتصدير CSV | يُطبَّق قبل رسم الصفحة |
| `#/trash` | `modules/trash.js` | استعادة محذوف أو حذفه نهائيًا | `deleted_at` على الصفحات والخدمات والمقالات |

### التفاعل

| المسار | الملف | الوظيفة |
|---|---|---|
| `#/messages` | `modules/submissions.js` | ردود النماذج ذات `module_group = messages` (تواصل واهتمام وما يُنشأ في هذه المجموعة). الحالات في الواجهة: جديد، قيد المراجعة، مغلق |
| `#/applications` | الملف نفسه | طلبات `applications`. الحالات: جديد، قيد المراجعة، مقبول، مرفوض |
| `#/forms` | `modules/forms.js` | بناء النموذج. نماذج النظام الثلاثة تُعدَّل ولا تُحذف |
| `#/integrations` | `modules/integrations.js` | معرّفات القياس، الموافقة، واتساب، روابط التواصل، شريط الإعلان، وWebhooks للمسؤول الأول |

### الإدارة

| المسار | الملف | الوظيفة |
|---|---|---|
| `#/settings` | `modules/settings.js` | حالة التطبيق وروابط المتجرين والتواصل والسجل التجاري ورقم اعتماد النشاط السياحي والصيانة ومنع فهرسة الموقع وصورة المشاركة ونص 404. للمسؤول الأول فقط |
| `#/admins` | `modules/admins.js` | إنشاء الحسابات وتعديل الدور وإيقافها وإعادة تعيين الكلمة. للمسؤول الأول |
| `#/audit` | `modules/audit.js` | قراءة سجل الكتابة. لا أزرار تعديل أو حذف |
| `#/account` | `modules/account.js` | تغيير كلمة مرور الجلسة الحالية |

كتل الصفحات المسجّلة في `server/cms/blocks/`: `hero` و`text` و`columns` و`steps` و`numbers` و`cta_band` و`alert_bar` و`spacer` و`image_text` و`gallery` و`video` و`downloads` و`feature_list` و`services_list` و`guides_list` و`faq` و`table` و`passport_tiers` و`passport_calculator` و`form` و`app_cta` و`contact_info`.

<a id="s9"></a>
## 9. الشركات والكيانات

غير موجود. لا يوجد جدول شركات ولا مفتاح شركة على الصفوف ولا تبديل كيان في اللوحة. النظام كيان واحد: موقع شُرفة وفريق إدارته.

<a id="s10"></a>
## 10. الصلاحيات

الصلاحية مستوى على وحدة، وليست قائمة أزرار مستقلة. المستويات في `server/rbac.js`: `none` لا شيء، `view` اطلاع، `approve` عرض وتغيير حالة الرد دون حذف، `full` كل الإجراءات بما فيها الحذف والتصدير.

| الوحدة | المسؤول الأول | خدمة العملاء | التسويق | المالية | العمليات |
|---|---|---|---|---|---|
| overview | full | view | view | view | view |
| content | full | none | full | none | view |
| media | full | none | full | none | view |
| passport | full | none | view | view | view |
| messages | full | full | view | none | view |
| applications | full | full | none | none | approve |
| forms | full | view | full | none | none |
| integrations | full | none | full | none | view |
| settings | full | none | none | none | none |
| admins | full | none | none | none | none |
| audit | full | none | none | none | none |

قيود إضافية في الكود وليست في الجدول: Webhooks وحقل `extra_csp_hosts` والحذف النهائي من السلة للمسؤول الأول فقط (`requireSuperAdmin`). آخر مسؤول أول مفعّل لا يُنزَع دوره ولا يُوقَف (`countActiveSupers` في `admins.js`). لا يستطيع المستخدم إيقاف حسابه الحالي.

إخفاء الرابط في الشريط لا يكفي. كل مسار إداري يمر على `requirePermission`.

<a id="s11"></a>
## 11. الأتمتة

لا يوجد محرّك سير عمل ولا موافقات متعددة الخطوات.

الموجود فعلًا:

- مسودة ثم نشر ثم جدولة بعمودي `publish_at` و`unpublish_at`. الظهور يحسبه `is_live` في `database/policies.sql` و`isLive` في `server/cms/content.js`.
- عند النشر يُرسل Webhook `content_published` إن وُجدت وجهة مفعّلة.
- عند إرسال نموذج يُرسل `form_submitted` للوجهات التي تضم هذا النموذج أو كل النماذج.
- إعادة المحاولة في `deliverWithRetry`: بعد 5 ثوانٍ ثم 30 ثانية ثم 5 دقائق، والمهلة 8 ثوانٍ.
- عدّاد المشاهدات يُفرَّغ كل 30 ثانية من ذاكرة العملية (`FLUSH_MS` في `pageviews.js`).
- الذاكرة المؤقتة تُمسح كل 60 ثانية وكلما حُفظ إعداد أو نُشر محتوى.
- تنظيف نوافذ تحديد المعدل كل 10 دقائق في `server/security.js`.

هذه المؤقتات تعيش داخل عملية Node. لا يوجد ملف cron في المشروع. إن أُوقف الخادم تتوقف.

<a id="s12"></a>
## 12. التكامل بين الوحدات

- كتلة `services_list` تقرأ الخدمات المنشورة. إخفاء خدمة أو وسم «قريبًا» يغيّر الصفحة التي تضم الكتلة بعد النشر.
- كتلة `faq` تقرأ `faqs` المنشورة، ويمكن حصرها بمجموعة.
- كتلة `form` تعرض نموذجًا من `forms`. ردوده تذهب إلى الرسائل أو الطلبات حسب `module_group`.
- كتلة `contact_info` وكتلة `app_cta` وتذييل الموقع تقرأ `site_settings`. تغيير البريد أو حالة التطبيق يظهر في الصفحات بعد انتهاء الذاكرة المؤقتة أو إبطالها.
- القوائم تشير إلى صفحة أو خدمة أو مقال. غير المنشور يُخفى في الموقع ويُعلَّم تحذيرًا في اللوحة (`menuWarnings`).
- تغيير رابط منشور يمكن أن ينشئ صفًا في `redirects` عبر `createRedirect` من `server/api/admin/content.js`.
- صورة المكتبة المرفوضة للحذف لأن صفحة أو مقالًا أو إعدادًا يستخدم رابطها.
- النظرة العامة تجمع المشاهدات والردود الجديدة والمسودات. لا تغيّر تلك الجداول.
- سجل التدقيق يُكتب بعد عمليات الكتابة ولا يغيّر المحتوى.

<a id="s13"></a>
## 13. المصطلحات

| المصطلح | المعنى هنا |
|---|---|
| كتلة | عنصر في مصفوفة `pages.blocks` مثل `hero` أو `text`. شكلها يحدده السجل وليس المستخدم |
| مسودة | كائن JSON في عمود `draft` لا يراه الزائر |
| نشر | دمج المسودة في الأعمدة الظاهرة |
| رابط slug | الجزء اللاتيني في العنوان، مثل `about` |
| جواز | فئات في `passport_tiers` وحاسبة توفير بالبيسة، وليست وثيقة سفر رسمية |
| مجموعة النموذج | `messages` أو `applications`، وهي التي تختار صندوق الردود |
| Webhook | طلب HTTPS صادر موقّع، وليس بريدًا |
| CSP | ترويسة تحدد نطاقات السكربتات المسموحة |
| موافقة الزائر | كوكي `shurfah_consent` بقيمة `granted` أو `denied` |
| عدّاد داخلي | صفوف `analytics_daily` بلا عنوان IP |
| بيسة | جزء الريال. الحساب في الحاسبة يضرب في 1000 |
| صفحة نظام | `kind = system`. لا يُحذف رابطها ولا تُحذف الصفحة |
| معاينة | مسار `/admin/preview/...` للمسودة، غير مفهرس ولا يُحسب مشاهدة |

<a id="s14"></a>
## 14. الأسئلة الشائعة

هذه إجابات من سلوك الكود، ليست صفحة الأسئلة المعروضة للزائر.

لماذا لا يظهر تعديلي في الموقع؟ لأنه في `draft` حتى يُضغط نشر، أو لأن موعد `publish_at` لم يحل.

لماذا رُفض الحفظ؟ إما حقل غير صالح، أو `updated_at` أقدم من النسخة المخزنة. الرسالة في `CONFLICT_MESSAGE` داخل `server/cms/drafts.js`: «عدّل مسؤول آخر هذا المحتوى أثناء عملك. حدّث الصفحة لرؤية تعديله.»

هل يصلني بريد عند الطلب؟ لا. الكود لا يستدعي خدمة بريد. اربط Webhook إن أردت إشعارًا خارجيًا.

هل يحجز الزائر من هنا؟ لا.

لماذا لا أرى وحدة الإعدادات؟ لأنها `full` للمسؤول الأول فقط.

لماذا لا يُحذف سجل التدقيق من اللوحة؟ لا يوجد مسار حذف. وعلى القاعدة، الدالة `forbid_audit_change` تمنع التعديل والحذف.

لماذا اختفت أداة القياس؟ المعرّف فارغ، أو الزائر لم يضغط «أوافق»، أو وُجد `gtm_id` مع `ga4_id` فيُدار GA4 من الحاوية ولا يُحمَّل مباشرة (`publicTrackingConfig`).

<a id="s15"></a>
## 15. المعمارية

```
الزائر أو الموظف
        |
        v
المتصفح
  صفحات عامة: HTML جاهز من الخادم + JS في assets/js/site
  اللوحة: admin/index.html + وحدات ES في assets/js/admin
        |
        |  HTTP فقط نحو هذا الخادم
        v
server/index.js   (node:http)
  طبقات معالجة الطلب (middleware): كوكيز، ملفات ثابتة، CSP، تحويلات، صيانة، جسم الطلب، عدّاد
  server/router.js
        |
        +-- server/render   يرسم HTML
        +-- server/cms      مسودات ونماذج وتحويلات وWebhooks
        +-- server/api      مسارات عامة وإدارة و /api/v1
        |
        v
@supabase/supabase-js بمفتاح الخدمة (على الخادم فقط)
        |
        +-- Postgres: الجداول في database/schema.sql
        +-- Auth: حسابات الإدارة
        +-- Storage: السلة media
        |
        v
وجهات Webhook خارجية (اختيارية، HTTPS فقط)
أدوات قياس في المتصفح بعد الموافقة (اختيارية)
```

لا يوجد داخل المجلد PHP ولا إطار واجهة ولا خادم ثانٍ.

<a id="s16"></a>
## 16. التقنيات

| الطبقة | الموجود |
|---|---|
| صفحات | HTML في `admin/*.html` وHTML يولّده `server/render` |
| تنسيق | CSS في `assets/css` بلا Sass |
| سلوك | JavaScript بنظام ES Modules (`"type": "module"`) |
| خادم | Node.js عبر `node:http` و`node:fs` و`node:zlib` و`node:crypto` و`node:dns`. بدون Express |
| بيانات ودخول وتخزين | Supabase عبر الحزمة الوحيدة `@supabase/supabase-js` |
| خط | ملفات IBM Plex Sans Arabic المحلية في `assets/fonts` (أوزان Light وRegular وMedium وSemiBold وBold) |
| اختبار | `node --test` على `scripts/core.test.js` |

غير موجود: PHP، React، Vue، Angular، TypeScript، أداة تجميع ملفات (bundler)، Tailwind، إطار CSS، مكتبة أيقونات، مكتبة بريد، Redis، طابور رسائل.

نسخة Node المطلوبة في `package.json` هي `>=20.6.0` لأن التشغيل يستخدم `--env-file`. حزمة `@supabase/auth-js` المقفلة عند 2.117.2 تذكر في ملفها `engines.node` القيمة `>=22.0.0`. القرار المعتمد: شغّل المشروع على Node 22 أو أحدث، لأنه يحقق الشرطين معًا. المشروع مختبر محليًا على Node 22.17.0. حقل `engines` في `package.json` لم يُغيَّر.

<a id="s17"></a>
## 17. بنية المجلدات

```
Website
  package.json          الاسم shurfah-website والسكربتات
  package-lock.json     تثبيت إصدارات الحزم المثبتة
  .env.example          أسماء المتغيرات بلا قيم سرية
  .gitignore            يستبعد node_modules و.env
  README.md             هذه الوثيقة
  admin/index.html      هيكل اللوحة
  admin/login.html      الدخول
  assets/css            tokens base components site admin
  assets/fonts          ملفات ttf الخمسة
  assets/images/logo    متوقع للشعار، غير موجود حاليًا
  assets/js/site        سلوك الزائر
  assets/js/admin       سلوك اللوحة
  assets/js/shared      دوال يستوردها الخادم والمتصفح
  database/schema.sql   جداول ودوال وعرض
  database/policies.sql سياسات الصفوف
  database/seed.sql     محتوى أولي
  scripts/seed.js       حسابات وردود تجريبية
  scripts/core.test.js  فحوص دوال نقية
  server                الخادم كما في القسم 19
```

<a id="s18"></a>
## 18. الواجهة

الموقع العام متعدد الصفحات: كل مسار يرد مستند HTML كامل من `renderLayout` في `server/render/layout.js`. ليس تطبيق صفحة واحدة.

اللوحة صفحة واحدة. التوجيه بعلامة `#` في `parseHash` داخل `app.js`. لا تُستخدم مكتبة توجيه.

المكوّنات ليست إطارًا. الدوال في `server/render/components.js` تبني أزرارًا وحقولًا. في اللوحة يبني `assets/js/admin/ui.js` العناصر بـ `document.createElement`. لا يُستخدم محرّك قوالب مثل Handlebars.

تحميل البيانات: الصفحة العامة تصل بياناتها داخل HTML. بعد التحميل تقرأ السكربتات `#site-config` وهي JSON لأدوات القياس فقط. اللوحة تجلب JSON بالدالة `request` في `assets/js/admin/api.js`.

السلوك المتجاوب في CSS: هوامش `--page-margin` تتغير عند 768 و1440 في `tokens.css`. شريط اللوحة يصبح عمودًا ثابتًا من 1024 في `admin.css`. تحت ذلك يفتح الزر `#nav-toggle` الشريط. ارتفاع الشعار 32 ثم 40 عند 1440. لا تُستخدم مكتبة لنقاط التوقف.

الجافاسكربت العام في `nav.js` و`forms.js` و`passport.js` و`video.js` و`consent.js` و`analytics.js` و`track.js`. الأساس يعمل بدون جافاسكربت: القائمة والنموذج يعملان بدونه، والحاسبة والفيديو وأدوات القياس تحتاجه.

<a id="s19"></a>
## 19. الخادم

لا يوجد PHP ولا Controllers باسم إطار.

| ملف | الدور |
|---|---|
| `server/index.js` | إنشاء الخادم وترتيب طبقات معالجة الطلب والمسارات |
| `server/config.js` | `loadConfig` يوقف العملية إن نقص متغير |
| `server/router.js` | مطابقة المسارات و`HttpError` وقراءة الجسم |
| `server/static.js` | ملفات `assets` مع منع `..` |
| `server/security.js` | ترويسات، حدود، تنقية، CSRF |
| `server/auth.js` | كوكيز وجلسة وكلمة المرور |
| `server/rbac.js` | `can` و`requirePermission` |
| `server/supabase.js` | `db()` بمفتاح الخدمة و`anonClient()` للدخول |
| `server/cache.js` | `cached` و`invalidate` |
| `server/cms/*` | قواعد المحتوى |
| `server/render/*` | HTML |
| `server/api/public.js` | الصحة والنماذج |
| `server/api/v1.js` | قراءة منشورة |
| `server/api/site.js` | صفحات وsitemap وrobots |
| `server/api/admin/*` | لوحة |
| `server/services/*` | تنسيق، حاسبة، وسائط، تتبع، عدّاد، تدقيق، روابط نصية |

الوصول إلى القاعدة يتم عبر دوال عميل Supabase (`.from().select()` وغيرها) وليس عبر SQL مضمّن في جافاسكربت الطلبات. ملفات SQL تُشغَّل يدويًا في محرر Supabase.

<a id="s20"></a>
## 20. مسار الطلب

مثال حقيقي: الزائر يرسل نموذج التواصل.

```
المتصفح
  النموذج في HTML له action=/api/forms/contact
        |
        v
server/index.js
  يقرأ الكوكيز، يتخطى الملفات الثابتة، يبني CSP،
  يتأكد أن الصيانة غير مفعّلة، يقرأ الجسم بحد 20 كيلوبايت
        |
        v
server/api/public.js  المسار POST /api/forms/:slug
        |
        v
server/cms/forms.js  validateSubmission
        |
        v
db().from('form_submissions').insert(...)
        |
        v
server/cms/webhooks.js  emit إن وُجدت وجهة
        |
        v
رد JSON { ok:true, data } أو إعادة توجيه 303 إن كان الإرسال بلا JSON
        |
        v
المتصفح يعرض رسالة النجاح
```

مثال اللوحة: `PUT /api/admin/pages/:id` يمر على `guarded` (حد المعدل، ثم فحص الترويسة، ثم الجلسة، ثم إجبار تغيير الكلمة) ثم `requirePermission('content','full')` ثم `saveDraft`.

<a id="s21"></a>
## 21. قاعدة البيانات

النوع: PostgreSQL عبر Supabase، كما تفترض ملفات `database/` واستدعاءات العميل. اسم القاعدة غير مكتوب في المشروع. عنوان الاتصال هو قيمة `SUPABASE_URL` وقت التشغيل.

لم يُنفَّذ اتصال من هذا الفحص، فالجداول التالية هي تعريف الملفات وليست لقطة من خادم حي.

الأنواع: `admin_role` و`content_status` (`draft` `published` `archived`) و`service_status` و`submission_status` و`module_group` و`page_kind`. القيمة `archived` معرّفة في النوع. واجهة اللوحة في `displayStatus` لا تعرض حالة باسم أرشيف. لا يوجد في الكود المفحوص مسار يضع `status = archived`. وجود القيمة في النوع لا يعني أن الأرشفة مسار مستخدم.

الجداول: `profiles` `pages` `services` `guides` `faqs` `menus` `redirects` `content_revisions` `media_assets` `passport_tiers` `governorates` `forms` `form_submissions` `site_settings` `webhooks` `webhook_deliveries` `analytics_daily` `audit_logs`.

العرض `public_settings` يُظهر مفاتيح `is_public`. الدالة `is_live` تحكم سياسات القراءة العامة. الدالة `increment_pageview` تزيد المشاهدات. الدالة `set_updated_at` تحدّث الوقت. الدالة `forbid_audit_change` تقفل سجل التدقيق.

مفاتيح ظاهرة: `profiles.id` يطابق مستخدم Auth. `form_submissions.form_id` يشير إلى `forms`. `webhook_deliveries.webhook_id` يشير إلى `webhooks`. `pages.slug` و`services.slug` و`guides.slug` فريدة. `menus.key` مفتاح أساسي نصي. `redirects.from_path` فريد. `media_assets.path` فريد. `analytics_daily` مفتاحه اليوم مع المسار (راجع تعريف الجدول قبل الاعتماد على اسم القيد).

لا يوجد مجلد migrations. التهيئة ثلاثة ملفات تُشغَّل بالترتيب: `schema.sql` ثم `policies.sql` ثم `seed.sql`. الملفات مكتوبة بأسلوب `if not exists` و`on conflict do nothing` حيث وُجد ذلك في بداياتها. `scripts/seed.js` خطوة رابعة اختيارية للحسابات والردود التجريبية، وهو ليس ملف SQL.

سلة التخزين: صف في `storage.buckets` بالمعرّف `media` و`public = true`.

<a id="s22"></a>
## 22. الواجهات البرمجية

رد النجاح المعتاد من `ctx.ok` هو JSON: `{ "ok": true, "data": ... }`. الفشل `{ "ok": false, "message": "...", "fields": { } }`. التصدير يرد `text/csv`. الصفحات ترد HTML.

ما لم يُذكر «عام»، المسار يحتاج جلسة إدارة وترويسة `X-Requested-With: shurfah` على الكتابة، ومستوى الصلاحية المذكور.

### عام، بلا جلسة

| الطريقة | المسار | الغرض | مدخلات | الرد |
|---|---|---|---|---|
| GET | `/api/health` | فحص الحياة | لا شيء | `{ status, time }` داخل data |
| POST | `/api/forms/:slug` | إرسال نموذج | JSON أو نموذج عادي. حقول النموذج زائد `_return` و`website_url` | JSON أو 303 |
| GET | `/api/v1/pages/:slug` | صفحة منشورة | slug | JSON |
| GET | `/api/v1/services` و`/:slug` | خدمات منشورة | slug عند الواحدة | JSON، ذاكرة 60 ثانية |
| GET | `/api/v1/guides` و`/:slug` | مقالات | | JSON |
| GET | `/api/v1/faqs` | أسئلة منشورة | | JSON |
| GET | `/api/v1/menus/:key` | قائمة | main أو footer_1 حتى footer_4 | JSON |
| GET | `/api/v1/passport-tiers` | فئات مفعّلة | | JSON |
| GET | `/api/v1/settings/public` | إعدادات عامة فقط | | JSON |
| GET | `/` `/:slug` `/services/:slug` `/guide/:slug` | HTML | | HTML |
| GET | `/sitemap.xml` `/robots.txt` `/favicon.ico` | سيو وأيقونة | | XML أو نص أو ملف |

`/api/v1` لا يعيد مسودة ولا محذوفًا ولا مجدولًا لم يحن وقته، لأنه يمر على دوال المحتوى الحي.

### دخول

| الطريقة | المسار | الجسم | الصلاحية |
|---|---|---|---|
| POST | `/api/admin/login` | `email` `password` | عام، مع حد المحاولات |
| POST | `/api/admin/logout` | فارغ | جلسة |
| GET | `/api/admin/me` | | جلسة |
| POST | `/api/admin/account/password` | `current_password` `new_password` | جلسة |

### محتوى: pages وservices وguides

نفس الأشكال تحت `/api/admin/pages` و`/services` و`/guides`. صلاحية `content`: القراءة view، والكتابة full.

| الطريقة | لاحقة | الغرض |
|---|---|---|
| GET | `` | قائمة مع `page` و`q` |
| GET | `/:id` | السجل والمسودة المدمجة والنسخ |
| POST | `` | إنشاء. الجسم `title` و`slug` اختياري |
| PUT | `/:id` | حفظ مسودة. الجسم حقول القسم زائد `updated_at` |
| POST | `/:id/publish` | نشر. `note` اختياري |
| POST | `/:id/unpublish` | إلغاء النشر |
| POST | `/:id/discard` | تجاهل المسودة |
| POST | `/:id/restore-revision` | `revision_id` |
| GET | `/:id/revisions/:rid` | لقطة نسخة |
| DELETE | `/:id` | حذف ناعم |

### بقية الإدارة

| الطريقة | المسار | الصلاحية | ملاحظة |
|---|---|---|---|
| GET | `/api/admin/overview` | overview view | |
| GET | `/api/admin/blocks/registry` | جلسة | سجل الكتل |
| GET POST | `/api/admin/faqs` | content | |
| PUT DELETE | `/api/admin/faqs/:id` | content full للكتابة | |
| POST | `/api/admin/faqs/reorder` | content full | جسم `ids` |
| GET | `/api/admin/menus` | content view | |
| PUT | `/api/admin/menus/:key` | content full | `title` و`items` |
| GET | `/api/admin/passport` | passport view | |
| PUT | `/api/admin/passport/free` | passport full | `passport_free` |
| PUT | `/api/admin/passport/:id` | passport full | حقول الفئة |
| GET POST | `/api/admin/media` | media | الرفع: `filename` `contentType` `dataBase64` `altText` `title` |
| PUT DELETE | `/api/admin/media/:id` | media full | |
| GET | `/api/admin/media/:id/usages` | media view | |
| GET POST | `/api/admin/redirects` | content | |
| GET | `/api/admin/redirects/export` | content view | CSV |
| POST | `/api/admin/redirects/import` | content full | جسم `csv` |
| PUT DELETE | `/api/admin/redirects/:id` | content full | |
| GET | `/api/admin/trash` | content view | |
| POST | `/api/admin/trash/:type/:id/restore` | content full | type هو page أو service أو guide |
| DELETE | `/api/admin/trash/:type/:id` | مسؤول أول | حذف نهائي |
| GET | `/api/admin/submissions` | messages أو applications view | استعلام `group` `form` `status` `q` `page` |
| GET | `/api/admin/submissions/counts` | جلسة | أعداد الجديد |
| GET PUT DELETE | `/api/admin/submissions/:id` | view / approve للكتابة / full للحذف | |
| GET | `/api/admin/export` | full على مجموعة النموذج | `type=submissions` و`form=slug` |
| GET POST PUT DELETE | `/api/admin/forms` و`/:id` | forms | |
| GET PUT | `/api/admin/integrations` | integrations | |
| GET POST | `/api/admin/webhooks` | مسؤول أول | |
| PUT DELETE | `/api/admin/webhooks/:id` | مسؤول أول | |
| POST | `/api/admin/webhooks/:id/rotate-secret` | مسؤول أول | يرد السر مرة واحدة |
| POST | `/api/admin/webhooks/:id/test` | مسؤول أول | |
| GET | `/api/admin/webhooks/:id/deliveries` | مسؤول أول | |
| GET PUT | `/api/admin/settings` | settings full | |
| GET POST | `/api/admin/admins` | admins full | |
| PUT | `/api/admin/admins/:id` | admins full | |
| GET | `/api/admin/audit` | audit view | `page` و`q` |
| GET | `/admin/preview/:type/:id` | content view | HTML للمسودة. type هو page أو service أو guide |

<a id="s23"></a>
## 23. الدخول والصلاحيات

اللوحة لا تتصل بـ Supabase من المتصفح. `login` في `server/auth.js` يستخدم `anonClient().auth.signInWithPassword` ثم يقرأ `profiles`. الحساب الموقوف `is_active = false` يُرفض. الكوكيز HttpOnly وSameSite=Strict. تصير Secure عندما `COOKIE_SECURE=true`.

`resolveSession` يقرأ رمز الوصول، وإن فشل يستخدم رمز التجديد. لا يُستخدم `localStorage` في كود الموقع أو اللوحة.

التحقق من الكلمة الجديدة في `passwordProblem`: 10 أحرف على الأقل، وحرف كبير وصغير ورقم ورمز، وليست إحدى كلمات `DEFAULT_PASSWORDS`.

Supabase Auth هو الذي يخزّن الكلمة. هذا المشروع لا يكتب كلمة مرور في جدول `profiles`. خوارزمية التجزئة هي ما يطبّقه Supabase، وهي غير معادة التنفيذ في هذا المجلد.

<a id="s24"></a>
## 24. الحماية

الموجود في الكود:

- جلسة بكوكيز HttpOnly.
- CSRF: الكتابة تحت `/api/admin` ترفض إن غابت `X-Requested-With: shurfah` أو لم يطابق ترويسة Origin اسم المضيف (`checkCsrf`).
- حدود: قفل الدخول بعد 5 إخفاقات خلال 15 دقيقة لكل بريد مع عنوان IP (`loginLocked`). مسار الدخول نفسه يرفض بعد 30 طلبًا خلال 15 دقيقة لنفس العنوان (`rateLimit` في `server/api/admin/auth.js`). النماذج 5 في الساعة، الإدارة 300 في الدقيقة، الواجهة العامة 120 في الدقيقة. التخزين في ذاكرة العملية (تعليق في `security.js`: تكفي لخادم واحد).
- تنقية النص بـ `cleanText` ورفض وسوم HTML في حقول النص وMarkdown داخل `validateField`.
- روابط `javascript:` مرفوضة في التحقق. `isSafeUrl` يسمح بـ https وhttp وmailto وtel والمسار الذي يبدأ بـ `/` أو `#`.
- استعلامات العميل ليست تركيب نص SQL من مدخل الزائر. لا توجد طبقة prepared statement مكتوبة يدويًا لأن SQL الطلبات ليس في جافاسكربت.
- رفع الملفات: مطابقة البايتات والحجم في `sniffType`.
- Webhook: رفض http والعناوين الخاصة عبر `isPrivateAddress` و`assertSafeDestination`، و`redirect: manual`، وتوقيع HMAC-SHA256.
- ترويسات أمان وCSP ديناميكية في `buildCsp`. إطار YouTube يُضاف فقط للصفحة التي فيها فيديو.
- سجل تدقيق مع `redact` لحقول الأسرار، ومشغّل يمنع تغيير السجل.
- معاينة الإدارة تتطلب جلسة و`noindex`.
- `robots.txt` لا يسرد مسار لوحة حساس كإعلان. صفحة الدخول واللوحة ترسل noindex.

غير موجود في المجلد: جدار حماية لتطبيقات الويب (WAF) مستقل، فحص ملفات ببرنامج خارجي، تشفير أعمدة الدفع (لا توجد بيانات دفع أصلًا)، تنبيهات أمنية إلى بريد.

<a id="s25"></a>
## 25. الإعدادات

ملف البيئة `.env` يُقرأ بعلم Node `--env-file=.env`. المثال في `.env.example`:

| المتغير | الدور |
|---|---|
| `PORT` | المنفذ، الافتراضي في الكود 3000 إن غاب |
| `NODE_ENV` | `production` يجعل `isProduction` صحيحًا |
| `SITE_URL` | أصل الروابط القانونية |
| `COOKIE_SECURE` | النص `true` فقط يفعّل علم Secure |
| `SUPABASE_URL` | عنوان المشروع. غيابه يمنع تشغيل الخادم |
| `SUPABASE_ANON_KEY` | لعملية الدخول فقط |
| `SUPABASE_SERVICE_ROLE_KEY` | للخادم فقط. غيابه يمنع تشغيل الخادم |

لا تُكتب قيم هذه المفاتيح في الوثيقة ولا في ملفات الواجهة. مفتاح الخدمة لا يظهر في `admin/` ولا في `assets/js`.

إعدادات المحتوى بعد التشغيل صفوف `site_settings` وتُعدَّل من اللوحة، وليس من ملف.

<a id="s26"></a>
## 26. الخدمات الخارجية

المستخدم فعلًا عند التعبئة، ومعطّل ما دام المعرّف فارغًا (وهذا حال `seed.sql`):

- Supabase: Postgres وAuth وStorage. إلزامي للتشغيل.
- Google Analytics 4 بالحقل `ga4_id`. النمط في `TRACKING_PATTERNS`.
- Google Tag Manager بالحقل `gtm_id`.
- Google Search Console بالحقل `search_console_token` (وسم تحقق، بلا موافقة زائر).
- Meta Pixel وSnapchat Pixel وTikTok Pixel وMicrosoft Clarity.
- رابط واتساب `wa.me` عند `whatsapp_enabled` ورقم `whatsapp_number`. ليس واجهة واتساب للأعمال.
- فيديو YouTube من النطاق `youtube-nocookie.com` بعد نقرة الزر في `video.js`.
- Webhooks إلى أي HTTPS يجتاز فحص العناوين.

غير موجود رغم شيوعه: إرسال بريد، رسائل SMS، نموذج ذكاء، Cloudflare داخل الكود، مراقبة مثل Sentry، دفع.

`analytics.js` هو الملف الوحيد في الواجهة الذي يحمّل سكربتات تلك الأدوات، وبعد الموافقة فقط.

<a id="s27"></a>
## 27. المهام المجدولة

لا يوجد Cron ولا عملية خلفية منفصلة ولا طابور مهام.

داخل العملية:

- تفريغ المشاهدات كل 30 ثانية وعند إشارات الإيقاف في `shutdown`.
- مسح الذاكرة المؤقتة كل 60 ثانية.
- تنظيف حدود المعدل كل 10 دقائق.
- إعادة محاولة Webhook على المؤقتات 5 ثوانٍ و30 ثانية و5 دقائق لكل عملية إرسال.

جدولة ظهور المحتوى ليست مهمة خادم. تُفحص عند كل قراءة بمقارنة الوقت مع `publish_at` و`unpublish_at`.

<a id="s28"></a>
## 28. الملفات

الرفع من اللوحة إلى `POST /api/admin/media` ثم إلى سلة `media`. الرابط العام يُحفظ في `media_assets.url`. الصور في الصفحات يجب أن تكون من هذا الرابط أو من مسار يبدأ بـ `/assets/` (`isAllowedImage`).

ملفات الشعار المتوقعة، وغير الموجودة في المجلد الآن:

- `assets/images/logo/logo-horizontal.svg`
- `assets/images/logo/logo-horizontal-white.svg`
- `assets/images/logo/logo-monogram.svg`
- `assets/images/logo/logo-monogram-white.svg`

`server/render/layout.js` يبدّل بين الأفقي والرمز حسب العرض عبر CSS، ولا يعيد تلوين الملف. إن غابا يظهر نص «شُرفة».

ملفات الخط تُخدم من `/assets/fonts/` كملفات ثابتة. لا يُكتب أي محتوى بشكل دائم على قرص الخادم. تعليق المشروع أن قرص الخادم ليس مخزن المحتوى.

<a id="s29"></a>
## 29. السجلات والمراقبة

- أخطاء الخادم غير المتوقعة تُطبع في الطرفية من `server/index.js` بصيغة عربية مختصرة مع المسار. لا يوجد ملف سجل (log) يُؤرشف تلقائيًا.
- سجل الأعمال في جدول `audit_logs`: الفاعل، الدور، الإجراء، الكيان، قبل، بعد، IP. اللوحة تعرضه في `#/audit`. كلمات المرور والأسرار تُحذف قبل الكتابة.
- تسليمات Webhook في `webhook_deliveries` بحد 200 لكل وجهة (`MAX_DELIVERIES`).
- الصحة: `GET /api/health` لا يفحص القاعدة. يرد أن العملية تعمل.
- لا توجد لوحة مراقبة ولا تنبيهات انقطاع في المشروع.

<a id="s30"></a>
## 30. التثبيت

1. ثبّت Node.js 22 أو أحدث (السبب في القسم 16).
2. افتح المجلد `Website` في الطرفية.
3. أنشئ مشروع Supabase. انسخ العنوان ومفتاح anon ومفتاح service_role إلى ملف `.env` منسوخ من `.env.example`. لا تضع المفاتيح في هذه الوثيقة.
4. في محرر SQL شغّل `database/schema.sql` ثم `database/policies.sql` ثم `database/seed.sql`.
5. `npm install`
6. `npm run seed` لإنشاء الحسابات الخمسة و10 ردود تجريبية (6 رسائل و4 طلبات) بعلامة `is_demo`. إن وُجد الحساب يُتخطى دون تغيير كلمته.
7. `npm start` ثم افتح `http://localhost:3000` و`http://localhost:3000/admin` إن بقي `PORT=3000` و`SITE_URL` مطابقًا.
8. غيّر كلمة المرور عند أول دخول.
9. ضع ملفات الشعار بالأسماء في القسم 28 إن أردت ظهوره.
10. لحذف الردود التجريبية فقط: `npm run seed:clear-demo`.
11. أثناء تعديل الملفات: `npm run dev` (`node --watch`).

لا توجد خطوة إعداد لخادم Apache أو Nginx داخل المشروع. الخادم هو عملية Node نفسها.

<a id="s31"></a>
## 31. دليل المطوّر

صفحة عامة جديدة: أنشئها من اللوحة كصفحة `custom`، أو أضفها إلى `seed.sql` إن كانت جزءًا من المحتوى الأولي. لا تنسخ HTML ثابتًا. الرسم يمر على `renderBlocks`.

كتلة جديدة: ملف في `server/cms/blocks` يصدّر `type` و`label_ar` و`fields` و`defaults` و`render`، ثم يُضاف إلى `registry.js`. اللوحة تقرأ `GET /api/admin/blocks/registry` وتبني النموذج من `fields`. أضف فحصًا في `scripts/core.test.js` إن كانت القاعدة غير بديهية.

مسار API: سجّله في الملف المناسب تحت `server/api` بـ `router.get` أو `post` أو `put` أو `delete`، ومرّره على `guarded` و`requirePermission` إن كان إداريًا. أعِد `ctx.ok` أو `ctx.fail`.

جدول جديد: أضفه في `schema.sql` بأسلوب قابل لإعادة التشغيل، ثم سياسة في `policies.sql` إن كان للقراءة العامة، ثم دوال في `server/cms` أو `server/api`. لا أداة ترحيل تلقائية، فالتعديل على قاعدة قائمة يتم يدويًا في محرر SQL. هذا غير موثّق كإجراء جاهز داخل المشروع.

صلاحية جديدة: أضف الوحدة إلى `MODULES` و`MATRIX` في `server/rbac.js`، ثم إلى `GROUPS` في `app.js` حتى تظهر في الشريط. الإخفاء في الشريط وحده لا يحمي المسار.

لا ترفع رقمًا في `package.json` إلا بطلب صريح. لا تضع مفتاحًا في ملف يصل إلى المتصفح.

<a id="s32"></a>
## 32. النشر

غير موثّق بملف في المشروع. لا يوجد `Dockerfile` ولا ملف منصة نشر ولا سكربت بناء.

ما يمكن استنتاجه من الكود للتشغيل الفعلي، وهو ليس دليل منصة:

- العملية تسمع على `config.port` من `PORT`.
- `SITE_URL` يجب أن يكون أصل الموقع العام لأن الروابط القانونية تُبنى منه.
- `COOKIE_SECURE=true` خلف HTTPS.
- `NODE_ENV=production` يضبط `isProduction`. لا يوجد في الكود المفحوص فرع يطفئ سجلات إضافية بناءً عليه سوى هذا العلم.
- المتغيرات الثلاثة لـ Supabase إلزامية.
- نظام الملفات ليس مخزن المحتوى.
- العداد والحدود والذاكرة المؤقتة لكل عملية على حدة. أكثر من نسخة يعني أرقامًا غير مدمجة. التعليق في `security.js` يذكر ذلك.

أي خطوات خاصة بمزوّد استضافة غير موجودة هنا.

<a id="s33"></a>
## 33. النسخ الاحتياطي

غير موجود في المشروع. لا يوجد سكربت نسخ ولا استعادة.

ما يمكن استعادته من الأدوات الموجودة، وليس نظام نسخ: سجل `content_revisions` يعيد آخر 30 نشرًا كمسودة، وسلة `deleted_at` تعيد المحذوف ناعمًا. الحذف النهائي ومسح سلة Supabase خارج هذا.

النسخ الاحتياطي لقاعدة Supabase، إن وُجد، هو من لوحة Supabase نفسها وهو غير موثّق في هذا المجلد.

<a id="s34"></a>
## 34. تشخيص الأعطال

| العرض | أين تنظر | ما يفعله الكود |
|---|---|---|
| يتوقف فورًا ويسمّي متغيرًا | `.env` | `loadConfig` في `config.js` |
| المنفذ مشغول | رسالة `EADDRINUSE` | `server/index.js` |
| الصفحات 500 ورسالة تعذر القراءة | مفاتيح Supabase أو أن SQL لم يُشغَّل | الاستعلامات ترمي `HttpError` عربيًا |
| الدخول مقفول 15 دقيقة | 5 إخفاقات | `loginLocked` |
| 401 من اللوحة | الكوكي انتهت | `api.js` يحوّل إلى `/admin/login` |
| 403 يجب تغيير الكلمة | `must_change_password` | يفتح `#/account` |
| 409 عند الحفظ | نسختان مفتوحتان | `saveDraft` |
| 409 عند حذف ملف | الملف مستخدم | `deleteMedia` |
| أداة لا تُحمَّل | المعرّف أو الموافقة أو CSP | `analytics.js` و`buildCsp` |
| الشعار نص فقط | ملفات القسم 28 غائبة | `detectLogos` |
| التعديل غير ظاهر | لم يُنشر أو الذاكرة 60 ثانية | `draft` و`cache.js` |
| الموقع 503 واللوحة تعمل | `maintenance_enabled` | طبقة الصيانة |

فحوص بلا قاعدة: `npm test`.

<a id="s35"></a>
## 35. الاعتماديات

من `package.json`: اعتماد إنتاج واحد، `@supabase/supabase-js` بالمدى `^2.45.0`.

من `package-lock.json` النسخة المقفلة المثبتة: `2.117.2`. تتسع معها حزمها الداخلية (`auth-js` و`functions-js` و`postgrest-js` و`realtime-js` و`storage-js` و`phoenix` و`tslib`) كما في ملف القفل. لا توجد اعتماديات تطوير مصرّح بها.

اختبارات Node مدمجة، بلا حزمة اختبار.

<a id="s36"></a>
## 36. القيود المعروفة

مثبتة من الكود، وليست تخمينًا:

- لا يوجد حجز ولا دفع ولا حساب زائر ولا بريد.
- حدود المعدل والمشاهدات والذاكرة المؤقتة لا تُنسَّق بين عدة عمليات. التعليق في `security.js` يقول ذلك.
- بحث الردود عند وجود `q` يحمّل آخر 1000 صفًا ويصفّيها في الذاكرة. التعليق في `server/api/admin/submissions.js` يسمّي هذا السقف.
- `GET /api/health` لا يتحقق من القاعدة.
- القيمة `archived` في النوع غير مربوطة بمسار لوحة.
- شعارات `assets/images/logo` غير موجودة في المجلد.
- لا نسخ احتياطي ولا ملف نشر ولا سجل إصدارات.
- شرط Node في `package.json` (`>=20.6.0`) أقل من شرط `@supabase/auth-js@2.117.2` (`>=22.0.0`). التشغيل المعتمد Node 22 أو أحدث.
- صيغتا تاريخ في الكود: `formatDateTime` في `server/services/format.js` و`fmtDate` في `assets/js/admin/ui.js` تعرضان `2026/1/3م 5:50ص` في اللوحة والجداول. أما `formatDay` و`formatDate` فتعرضان اليوم واسم الشهر العربي (مثل «2 أكتوبر 2026م») في نصوص الموقع العام. هذا هو السلوك الحالي ويبقى كما هو.

<a id="s37"></a>
## 37. حالة النظام

مكتمل ككود في المجلد ويمكن تشغيله بعد تهيئة Supabase: الموقع العام، اللوحة بوحداتها، النماذج، الوسائط، الصلاحيات، المعاينة، العدّاد، Webhooks، وأدوات القياس المعطّلة افتراضيًا.

يعمل عند ربط `.env` وتشغيل SQL ثم `npm run seed`. بدون ذلك يتوقف الخادم عند بدء التشغيل أو تفشل القراءة. هذا الفحص لم يشغّل SQL على مشروع حي.

غير مكتمل بالنسبة لتشغيل حقيقي لم يُجهَّز في الملفات: الشعار، قيم السجل التجاري والهاتف والبريد (فارغة في `seed.sql` وتُخفى)، روابط المتاجر، معرّفات القياس.

غير موثّق في المشروع أصلًا: اسم القاعدة الحي، نطاق الإنتاج، خطوات مزوّد الاستضافة، وسياسة النسخ الاحتياطي.

قرارات معتمدة لهذه الوثيقة:

- التشغيل على Node 22 أو أحدث.
- كلمات مرور الحسابات الأولى تبقى في `scripts/seed.js` فقط، وتُغيَّر إجباريًا عند أول دخول.
- القيمة `archived` تبقى في نوع القاعدة بلا مسار في اللوحة.
- صيغتا التاريخ تبقيان كما في القسم 36.

<a id="s38"></a>
## 38. قرارات معمارية ظاهرة من الكود

السبب يُذكر فقط حيث يشرحه تعليق أو هيكل الملف.

- خادم `node:http` بلا إطار، ومجلدات `cms` و`render` و`api` منفصلة. السبب التجاري غير مكتوب. النتيجة الظاهرة: مسار واحد من المتصفح إلى هذا الخادم.
- مفتاح الخدمة في `db()` فقط، واللوحة تتحدث مع `/api/admin`. هذا يمنع وصول المفتاح إلى المتصفح.
- الصفحات تُرسم على الخادم في `server/render` بينما اللوحة تُحمِّل وحدات في المتصفح. محركات البحث تستلم HTML الصفحات العامة. اللوحة موسومة noindex.
- الدوال النقية للحاسبة وMarkdown والروابط في `assets/js/shared` وتُستورد من الخادم حتى لا يختلف الحساب بين المعاينة والموقع.
- سجل الكتل يقود التحقق وتوليد نموذج اللوحة معًا (`fields` في كل كتلة و`registryForClient`).
- النشر منفصل عن الحفظ (`draft` ثم `publish`) حتى لا يظهر نصف التعديل.
- أدوات القياس معطّلة حتى يُملأ معرّف، ولا تُحمَّل قبل كوكي الموافقة.
- التعليق في `security.js` يبرر بقاء الحدود في الذاكرة: خادم واحد.

<a id="s39"></a>
## 39. سجل الإصدارات

غير موجود. `package.json` لا يحتوي حقل `version`. لا يوجد ملف سجل تغييرات في المجلد. لا تُخترع أرقام هنا.

<a id="s40"></a>
## 40. نظرة النظام

```
                    زائر                              فريق الإدارة
                      |                                     |
                 صفحات HTML                          /admin  لوحة #/
                      |                                     |
                      +------------------+------------------+
                                         |
                                  server/index.js
                          رسم | نماذج | لوحة | /api/v1 | عدّاد
                                         |
                          +--------------+--------------+
                          |              |              |
                     صفحات ومحتوى    حسابات Auth    سلة media
                     جداول Postgres   (Supabase)    (Supabase)
                          |
              +-----------+-----------+
              |                       |
        Webhooks HTTPS          أدوات قياس
        إن فعّلها المسؤول       بعد موافقة الزائر
```

<a id="s41"></a>
## 41. مرجع سريع

| الجزء | التقنية | الموقع | الوظيفة |
|---|---|---|---|
| صفحات الزائر | HTML من الخادم | `server/render` `server/api/site.js` | العرض العام |
| تنسيق | CSS | `assets/css` | الهوية والتخطيط |
| سلوك الزائر | JavaScript | `assets/js/site` | قائمة، نماذج، حاسبة، فيديو، موافقة، قياس |
| لوحة | HTML + JS | `admin/` `assets/js/admin` | التشغيل اليومي |
| خادم | Node `node:http` | `server/index.js` | التوجيه والحماية |
| محتوى | JavaScript | `server/cms` | مسودات ونماذج وتحويلات |
| بيانات | Postgres عبر Supabase | `database/*.sql` | الجداول والسياسات والمحتوى الأولي |
| دخول | Supabase Auth | `server/auth.js` | جلسة الإدارة |
| ملفات | Supabase Storage | سلة `media` | صور وPDF |
| قياس داخلي | ذاكرة ثم جدول | `server/services/pageviews.js` | مشاهدات بلا IP |
| إشعار خارجي | HTTPS موقّع | `server/cms/webhooks.js` | بديل البريد |
| فحوص | node:test | `scripts/core.test.js` | دوال نقية |
| حسابات أولى | سكربت | `scripts/seed.js` | خمسة أدوار وردود تجريبية |

<a id="s42"></a>
## 42. أقصر تشغيل

من مجلد `Website` بعد إنشاء `.env` وتشغيل ملفات SQL الثلاثة بالترتيب:

```
npm install
npm run seed
npm start
```

ثم `http://localhost:3000` و`http://localhost:3000/admin`. التفاصيل في القسم 30. كلمات المرور في `scripts/seed.js` فقط.

<a id="s43"></a>
## 43. لغير المتخصص

الموقع يعرّف بمنصة شُرفة ويستقبل رسائل الزوار وطلبات الشركاء. الحجز ليس هنا.

تفتح لوحة الفريق من `/admin`. تختار القسم من الشريط الجانبي. تعدّل ثم تحفظ. للصفحات والخدمات والمقالات لن يرى الزائر التغيير حتى تضغط نشر. الطلبات تصل إلى «الردود» أو «طلبات الشركاء». الصور من «مكتبة الوسائط». لا تنتظر بريدًا من النظام نفسه.

أهم الأقسام: الصفحات، الخدمات، دليل المسافر، الردود، طلبات الشركاء، الإعدادات (للمسؤول الأول)، حسابي لتغيير الكلمة.

<a id="s44"></a>
## 44. للمطوّر

التقنيات المستخدمة: Node وHTML وCSS وJavaScript وSupabase فقط. المعمارية في القسم 15. القاعدة في القسم 21 وهي تعريف ملفات وليست لقطة حية. المسارات في القسم 22. ابدأ من `server/index.js` ثم `server/api/admin/index.js` ثم `assets/js/admin/app.js`. أضف كتلة من سجل `server/cms/blocks/registry.js` ومسارًا عبر `router` مع `requirePermission`. شغّل `npm test` للدوال النقية و`npm run dev` أثناء التعديل. لا تكتب مفتاح الخدمة في أي ملف تحت `assets` أو `admin`.
