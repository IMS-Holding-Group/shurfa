-- البيانات المرجعية والمحتوى الأولي لموقع شُرفة
-- يُشغَّل ثالثًا بعد policies.sql. قابل لإعادة التشغيل: لا يكرر الصفوف الموجودة.

-- ===== المحافظات =====
insert into governorates (name_ar, sort) values
  ('مسقط', 1), ('ظفار', 2), ('مسندم', 3), ('البريمي', 4), ('الداخلية', 5),
  ('شمال الباطنة', 6), ('جنوب الباطنة', 7), ('شمال الشرقية', 8), ('جنوب الشرقية', 9),
  ('الظاهرة', 10), ('الوسطى', 11)
on conflict (name_ar) do nothing;

-- ===== فئات الجواز التراثي (أرقام مبدئية) =====
insert into passport_tiers (code, name_ar, price_omr, duration_days, discount_min_pct, discount_max_pct, sort, is_active) values
  ('bronze', 'البرونزي', 9.000, 7, 5, 8, 1, true),
  ('silver', 'الفضي', 16.000, 15, 10, 15, 2, true),
  ('gold', 'الذهبي', 25.000, 30, 18, 25, 3, true)
on conflict (code) do nothing;

-- ===== الإعدادات =====
insert into site_settings (key, value, is_public) values
  ('app_status', '"coming_soon"'::jsonb, true),
  ('app_store_url', '""'::jsonb, true),
  ('play_store_url', '""'::jsonb, true),
  ('contact_email', '""'::jsonb, true),
  ('contact_phone', '""'::jsonb, true),
  ('social', '{"x":"","instagram":"","tiktok":"","snapchat":"","youtube":"","linkedin":""}'::jsonb, true),
  ('passport_free', 'true'::jsonb, true),
  ('commercial_registration', '""'::jsonb, false),
  ('tourism_permit', '""'::jsonb, false),
  ('maintenance_enabled', 'false'::jsonb, false),
  ('maintenance_text', '"نجهّز الموقع الآن. عُد بعد قليل."'::jsonb, false),
  ('site_noindex', 'false'::jsonb, false),
  ('default_og_image', '""'::jsonb, false),
  ('not_found_text', '"الصفحة التي تبحث عنها غير موجودة. تفضّل بالعودة إلى الرئيسية."'::jsonb, false),
  ('ga4_id', '""'::jsonb, false),
  ('gtm_id', '""'::jsonb, false),
  ('search_console_token', '""'::jsonb, false),
  ('meta_pixel_id', '""'::jsonb, false),
  ('snap_pixel_id', '""'::jsonb, false),
  ('tiktok_pixel_id', '""'::jsonb, false),
  ('clarity_id', '""'::jsonb, false),
  ('extra_csp_hosts', '""'::jsonb, false),
  ('consent_banner_enabled', 'true'::jsonb, false),
  ('whatsapp_enabled', 'false'::jsonb, false),
  ('whatsapp_number', '""'::jsonb, false),
  ('announcement', '{"enabled":false,"text":"","url":""}'::jsonb, false)
on conflict (key) do nothing;

-- ===== الخدمات السبع =====
insert into services (slug, title, tagline, body, highlights, icon_key, accent, service_status, sort, status, published_at) values
  ('activities', 'الأنشطة والمغامرات', 'الوديان والبحر والجبال، بسعر واضح قبل الحجز.',
   $md$## ماذا تجد هنا

تعرض شُرفة الأنشطة والمغامرات التي يقدّمها مزودون مرخصون في عُمان، وتحجزها من مكان واحد.

كل نشاط يُعرض بمدته وسعره النهائي وما يشمله السعر ومن يقدّمه. نتحقق من الخدمات لدى المنصات الأصلية قبل عرضها.

## كيف تحجز

تختار النشاط والتاريخ في التطبيق، وتدفع بسعر واضح، ويصلك التأكيد في اللحظة نفسها.$md$,
   array['مزودون مرخصون', 'السعر النهائي قبل الحجز', 'تأكيد فوري', 'شروط الإلغاء مكتوبة قبل الدفع'],
   'activities', 'teal', 'available', 1, 'published', now()),
  ('food', 'تجارب الطعام والمطبخ العُماني', 'المطبخ العُماني من أهله، في بيوتهم ومطابخهم.',
   $md$## ماذا تجد هنا

تعرّفك شُرفة على المطبخ العُماني وتجاربه، وتحجز لك التجارب المرتبطة به من طهاة منزليين ومزودين محليين.

تُكتب المدة والسعر وما يشمله صراحة، ويظهر اسم من يقدّم التجربة بجانبها.

## كيف تحجز

تختار التجربة والموعد في التطبيق، وتدفع بسعر واضح.$md$,
   array['طهاة منزليون ومزودون محليون', 'اسم مقدّم التجربة ظاهر', 'السعر النهائي أولًا'],
   'food', 'brick', 'available', 2, 'published', now()),
  ('vehicles', 'تأجير المركبات', 'مركبتك من منصات التأجير القائمة، بخطوة واحدة.',
   $md$## ماذا تجد هنا

تربط شُرفة مباشرة مع منصات تأجير المركبات القائمة في عُمان، فتحجز مركبتك من الحساب نفسه الذي تحجز به نشاطك وإقامتك.

## كيف تحجز

تختار المركبة والمدة في التطبيق، وتدفع بسعر واضح يشمل ما كُتب أمامك.$md$,
   array['ربط مباشر مع مكاتب التأجير', 'حساب واحد وسلة واحدة', 'السعر النهائي أولًا'],
   'vehicles', 'teal', 'available', 3, 'published', now()),
  ('stays', 'الإقامة في النزل التراثية وبيوت الضيافة', 'نم في بيت عُماني، لا في غرفة فندق.',
   $md$## ماذا تجد هنا

تعرض شُرفة في مرحلتها الأولى النزل التراثية وبيوت الضيافة، وليست الفنادق المصنفة. بيوت يديرها أهلها ويعرفون المكان.

## كيف تحجز

تختار البيت والتاريخ في التطبيق، وتدفع بسعر واضح.$md$,
   array['نزل تراثية وبيوت ضيافة', 'أصحاب البيوت يستقبلونك', 'شروط الإلغاء مكتوبة'],
   'stays', 'ink', 'available', 4, 'published', now()),
  ('passport', 'الجواز التراثي الرقمي', 'اجمع الأختام، واحصل على خصم.',
   $md$## ماذا تجد هنا

جواز السفر التراثي يجمع أختام المواقع التي زرتها، ويمنحك خصمًا في المتجر عند إكمال خمسة أختام.

للجواز فئات تمنح خصومات متدرجة على الخدمات المشاركة. وهو مجاني عند الإطلاق.

## كيف يعمل

تزور الموقع، تجمع الختم في التطبيق، وتستفيد من الخصم على الخدمات المشاركة.$md$,
   array['أختام تُجمع من المواقع', 'خصومات متدرجة على الخدمات المشاركة', 'مجاني عند الإطلاق'],
   'passport', 'purple', 'available', 5, 'published', now()),
  ('crafts', 'متجر الحرف اليدوية والمنتجات العُمانية', 'منتج عُماني، واسم صانعه عليه.',
   $md$## ماذا تجد هنا

متجر للحرف اليدوية والمنتجات العُمانية، يظهر فيه اسم الحرفي على منتجه.

هذه الخدمة قريبًا. سجّل اهتمامك لنخبرك عند الإطلاق.$md$,
   array['اسم الحرفي معروف على منتجه', 'منتجات عُمانية', 'قريبًا'],
   'crafts', 'purple', 'coming_soon', 6, 'published', now()),
  ('events', 'تذاكر الفعاليات والمهرجانات', 'تذكرتك للمهرجان من المكان نفسه.',
   $md$## ماذا تجد هنا

تذاكر المهرجانات والفعاليات بالتنسيق مع الجهات المنظمة، من الحساب نفسه.

هذه الخدمة قريبًا. سجّل اهتمامك لنخبرك عند الإطلاق.$md$,
   array['بالتنسيق مع الجهات المنظمة', 'حساب واحد وسلة واحدة', 'قريبًا'],
   'events', 'gold', 'coming_soon', 7, 'published', now())
on conflict (slug) do nothing;

-- ===== القوائم =====
insert into menus (key, title, items) values
  ('main', 'القائمة الرئيسية', $json$[
    {"label":"الخدمات","target_type":"page","target":"services","new_tab":false},
    {"label":"الجواز","target_type":"page","target":"passport","new_tab":false},
    {"label":"دليل المسافر","target_type":"page","target":"guide","new_tab":false},
    {"label":"انضم كشريك","target_type":"page","target":"partners","new_tab":false},
    {"label":"عن شُرفة","target_type":"page","target":"about","new_tab":false}
  ]$json$::jsonb),
  ('footer_1', 'شُرفة', $json$[
    {"label":"عن شُرفة","target_type":"page","target":"about","new_tab":false},
    {"label":"تواصل معنا","target_type":"page","target":"contact","new_tab":false},
    {"label":"الأسئلة الشائعة","target_type":"page","target":"faq","new_tab":false}
  ]$json$::jsonb),
  ('footer_2', 'الخدمات', $json$[
    {"label":"الأنشطة والمغامرات","target_type":"service","target":"activities","new_tab":false},
    {"label":"تجارب الطعام","target_type":"service","target":"food","new_tab":false},
    {"label":"تأجير المركبات","target_type":"service","target":"vehicles","new_tab":false},
    {"label":"الإقامة التراثية","target_type":"service","target":"stays","new_tab":false},
    {"label":"الجواز التراثي الرقمي","target_type":"service","target":"passport","new_tab":false},
    {"label":"متجر الحرف","target_type":"service","target":"crafts","new_tab":false},
    {"label":"تذاكر الفعاليات","target_type":"service","target":"events","new_tab":false}
  ]$json$::jsonb),
  ('footer_3', 'قانوني', $json$[
    {"label":"سياسة الخصوصية","target_type":"page","target":"privacy","new_tab":false},
    {"label":"الشروط","target_type":"page","target":"terms","new_tab":false},
    {"label":"سياسة الإلغاء","target_type":"page","target":"cancellation","new_tab":false}
  ]$json$::jsonb),
  ('footer_4', '', '[]'::jsonb)
on conflict (key) do nothing;

-- ===== النماذج الثلاثة =====
insert into forms (slug, title, kind, module_group, fields, submit_label, success_message) values
  ('contact', 'تواصل معنا', 'system', 'messages', $json$[
    {"name":"name","type":"text","label":"الاسم","required":true,"max_length":80,"help":""},
    {"name":"contact","type":"text","label":"البريد أو الهاتف","required":true,"max_length":120,"help":"نرد عليك عبره."},
    {"name":"subject","type":"text","label":"الموضوع","required":true,"max_length":120,"help":""},
    {"name":"message","type":"textarea","label":"الرسالة","required":true,"max_length":2000,"help":"حتى 2000 حرف."}
  ]$json$::jsonb, 'أرسل الرسالة', 'وصلتنا رسالتك. نرد عليك خلال يومي عمل.'),
  ('waitlist', 'سجّل اهتمامك', 'system', 'messages', $json$[
    {"name":"name","type":"text","label":"الاسم","required":true,"max_length":80,"help":""},
    {"name":"contact","type":"text","label":"البريد أو الهاتف","required":true,"max_length":120,"help":"نخبرك عبره عند الإطلاق."}
  ]$json$::jsonb, 'سجّل اهتمامك', 'سجّلنا اهتمامك. نخبرك عند الإطلاق.'),
  ('partner', 'طلب الانضمام كشريك', 'system', 'applications', $json$[
    {"name":"business_name","type":"text","label":"اسم النشاط","required":true,"max_length":120,"help":""},
    {"name":"service_type","type":"select","label":"نوع الخدمة","required":true,"options":["أنشطة","طعام","مركبات","إقامة","حرف","فعاليات"],"help":""},
    {"name":"governorate","type":"governorate","label":"المحافظة","required":true,"help":""},
    {"name":"wilaya","type":"text","label":"الولاية","required":true,"max_length":60,"help":""},
    {"name":"contact_name","type":"text","label":"اسم المسؤول","required":true,"max_length":80,"help":""},
    {"name":"phone","type":"phone","label":"الهاتف","required":true,"help":"رقم عُماني أو دولي."},
    {"name":"email","type":"email","label":"البريد","required":true,"max_length":120,"help":""},
    {"name":"uses_platform","type":"select","label":"هل تعمل عبر منصة متخصصة؟","required":true,"options":["نعم","لا"],"help":""},
    {"name":"platform_name","type":"text","label":"اسم المنصة","required":false,"max_length":80,"help":"اختياري."},
    {"name":"bio","type":"textarea","label":"نبذة عن نشاطك","required":true,"max_length":1500,"help":"ماذا تقدّم ولمن."},
    {"name":"privacy_consent","type":"checkbox","label":"أوافق على سياسة الخصوصية","required":true,"help":""}
  ]$json$::jsonb, 'أرسل الطلب', 'وصلنا طلبك. نراجعه ونتواصل معك.')
on conflict (slug) do nothing;

-- ===== الأسئلة الشائعة =====
insert into faqs (question, answer, group_name, sort, is_published)
select q, a, g, s, true from (values
  ('هل أحتاج حسابًا لتصفح شُرفة؟', 'لا. التصفح مجاني دون حساب. تسجّل فقط عند الحجز في التطبيق.', 'عام', 1),
  ('هل السعر الذي أراه هو السعر النهائي؟', 'نعم. كل تجربة بسعرها النهائي ومدتها وما يشمله السعر، ولا مبالغ تظهر في آخر خطوة.', 'الحجز', 2),
  ('متى يصلني تأكيد الحجز؟', 'في اللحظة نفسها. إشعار الحجز يصل فور إتمام الدفع في التطبيق.', 'الحجز', 3),
  ('هل الدعم بالعربية؟', 'نعم. إنسان يرد عليك بالعربية، وليس ردًا آليًا مكررًا.', 'عام', 4),
  ('هل الجواز التراثي الرقمي مدفوع؟', 'الجواز مجاني عند الإطلاق. يجمع أختام المواقع التي زرتها ويمنحك خصمًا في المتجر عند إكمال خمسة أختام.', 'الجواز', 5),
  ('كيف أحجز؟', 'الحجز يتم عبر تطبيق شُرفة. هذا الموقع يعرّف بالمنصة وخدماتها ويحيلك إلى التطبيق.', 'الحجز', 6),
  ('في أي مناطق تعمل شُرفة؟', 'نبدأ من محافظة مسقط، ثم نتوسع إلى بقية المحافظات.', 'عام', 7),
  ('كيف أنضم كشريك؟', 'تقدّم الطلب من صفحة «انضم كشريك»، نراجعه ونتواصل معك، ثم تُفعَّل صفحتك.', 'الشركاء', 8)
) as t(q, a, g, s)
where not exists (select 1 from faqs f where f.question = t.q);

-- ===== مقالا دليل المسافر =====
insert into guides (slug, title, excerpt, body, status, published_at) values
  ('three-rules-before-wadi', 'ثلاث قواعد قبل نزول الوادي', 'اسأل، واحمل الحذاء المناسب، ولا تترك أثرًا.',
   $md$الوادي مكان جميل، وله قواعده. ثلاث قواعد تكفي قبل أن تنزل.

## 1. اسأل عن منسوب الماء قبل الرحلة

منسوب الماء يتغير بسرعة. اسأل منظّم الرحلة أو أهل المكان قبل أن تنطلق، ولا تعتمد على صورة قديمة.

## 2. احمل حذاءً يثبت على الصخر المبلل

الصخر في الوادي زلق. حذاء يثبت على الصخر المبلل يحميك ويجعل المشي أسهل.

## 3. لا تترك شيئًا وراءك عند الخروج

ما حملته معك يعود معك. الوادي يبقى نظيفًا لمن يأتي بعدك.$md$,
   'published', now()),
  ('plan-a-weekend-in-oman', 'كيف تخطط لعطلة نهاية الأسبوع داخل عُمان', 'خطوات بسيطة لعطلة قصيرة بلا مفاجآت.',
   $md$عطلة نهاية الأسبوع قصيرة، والتخطيط لها أبسط مما تظن.

## حدّد وجهة واحدة

يومان لا يكفيان لأكثر من وجهة. اختر مكانًا واحدًا واستمتع به.

## اعرف السعر قبل أن تنطلق

اقرأ المدة والسعر وما يشمله قبل الحجز. في شُرفة كل تجربة بسعرها النهائي.

## احجز الإقامة أولًا

الإقامة هي ما يحدد باقي الخطة. ثم أضف نشاطًا أو تجربة طعام قريبة منها.

## اترك وقتًا فارغًا

أجمل اللحظات لا تُخطَّط. اترك مساحة في اليوم الثاني للمفاجآت الطيبة.$md$,
   'published', now())
on conflict (slug) do nothing;

-- ===== صفحات النظام =====
insert into pages (slug, title, kind, blocks, status, published_at, seo_description) values
('home', 'الرئيسية', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000101","type":"hero","hidden":false,"anchor":"","bg":"ink","data":{
    "title":"اكتشف عُمان","lead":"أنشطة وطعام وإقامة وحرف وفعاليات، بسعر واضح قبل الحجز.","align":"start","image":"","image_alt":"",
    "buttons":[{"kind":"app_cta","label":"","url":"","style":"primary"},{"kind":"link","label":"تعرّف على الخدمات","url":"/services","style":"secondary"}]}},
  {"id":"00000000-0000-4000-8000-000000000102","type":"services_list","hidden":false,"anchor":"services","bg":"cream","data":{
    "title":"سبع خدمات في منصة واحدة","lead":"من النشاط إلى الحرفة، بحساب واحد وسلة واحدة.","mode":"all","services":[]}},
  {"id":"00000000-0000-4000-8000-000000000103","type":"steps","hidden":false,"anchor":"how","bg":"white","data":{
    "title":"كيف تعمل المنصة","items":[
      {"title":"يبحث","text":"يختار التجربة والتاريخ."},
      {"title":"يحجز","text":"يدفع بسعر واضح."},
      {"title":"يعيش التجربة","text":"ويجمع ختمًا في جوازه."}]}},
  {"id":"00000000-0000-4000-8000-000000000104","type":"columns","hidden":false,"anchor":"promises","bg":"cream","data":{
    "title":"وعودنا لك","items":[
      {"title":"السعر النهائي أولًا","text":"لا مبالغ تظهر في آخر خطوة."},
      {"title":"تأكيد فوري","text":"إشعار الحجز يصل في اللحظة نفسها."},
      {"title":"دعم بالعربية","text":"إنسان يرد، وليس ردًا آليًا مكررًا."},
      {"title":"إلغاء واضح","text":"شروط الإلغاء مكتوبة قبل الدفع."}]}},
  {"id":"00000000-0000-4000-8000-000000000105","type":"cta_band","hidden":false,"anchor":"passport","bg":"purple_soft","data":{
    "title":"الجواز التراثي الرقمي","body":"جواز السفر التراثي يجمع أختام المواقع التي زرتها، ويمنحك خصمًا في المتجر عند إكمال خمسة أختام.","button_label":"اعرف المزيد","button_url":"/passport","button_style":"secondary"}},
  {"id":"00000000-0000-4000-8000-000000000106","type":"feature_list","hidden":false,"anchor":"wilayat","bg":"cream","data":{
    "title":"من كل ولاية رمزها","lead":"","layout":"icons","items":[
      {"icon":"muscat","title":"مسقط","text":"قصر العلم","url":""},
      {"icon":"sohar","title":"صحار","text":"القلعة","url":""},
      {"icon":"khaburah","title":"الخابورة","text":"الخنجر","url":""},
      {"icon":"saham","title":"صحم","text":"شجرة الليمون","url":""}]}},
  {"id":"00000000-0000-4000-8000-000000000107","type":"cta_band","hidden":false,"anchor":"partners","bg":"white","data":{
    "title":"هل تقدّم خدمة سياحية في عُمان؟","body":"لوحة تحكم بسيطة، شروط مكتوبة، واسمك ظاهر بجانب تجربتك.","button_label":"انضم كشريك","button_url":"/partners","button_style":"secondary"}},
  {"id":"00000000-0000-4000-8000-000000000108","type":"hero","hidden":false,"anchor":"start","bg":"ink","data":{
    "title":"رحلتك تبدأ بسعر تعرفه من أول خطوة","lead":"كل تجربة في شُرفة بسعرها النهائي ومدتها وما يشمله السعر.","align":"center","image":"","image_alt":"",
    "buttons":[{"kind":"app_cta","label":"","url":"","style":"primary"}]}}
]$json$::jsonb, 'published', now(), 'شُرفة منصة سياحية عُمانية تجمع سبع خدمات في حساب واحد وسلة واحدة وحجز واحد، بسعر واضح قبل الحجز.'),

('services', 'الخدمات', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000201","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"خدمات شُرفة","body":"سبع خدمات في منصة واحدة: من النشاط إلى الحرفة، بحساب واحد وسلة واحدة. كل خدمة بسعرها النهائي ومدتها وما يشمله السعر.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000202","type":"services_list","hidden":false,"anchor":"all","bg":"white","data":{
    "title":"","lead":"","mode":"all","services":[]}}
]$json$::jsonb, 'published', now(), 'الخدمات السبع في شُرفة: الأنشطة والطعام والمركبات والإقامة والجواز التراثي والحرف والفعاليات.'),

('guide', 'دليل المسافر', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000301","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"دليل المسافر","body":"نصائح قصيرة قبل الرحلة، من أهل المكان. اقرأ ثم انطلق.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000302","type":"guides_list","hidden":false,"anchor":"articles","bg":"white","data":{
    "title":"","limit":12,"show_all_button":false}}
]$json$::jsonb, 'published', now(), 'دليل المسافر في شُرفة: نصائح قصيرة قبل كل رحلة داخل عُمان.'),

('passport', 'الجواز التراثي الرقمي', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000401","type":"text","hidden":false,"anchor":"","bg":"purple_soft","data":{
    "title":"الجواز التراثي الرقمي","body":"جواز يجمع أختام المواقع التي زرتها، ويمنحك خصومات متدرجة على الخدمات المشاركة. مجاني عند الإطلاق.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000402","type":"passport_tiers","hidden":false,"anchor":"tiers","bg":"white","data":{"title":"فئات الجواز"}},
  {"id":"00000000-0000-4000-8000-000000000403","type":"passport_calculator","hidden":false,"anchor":"calculator","bg":"cream","data":{
    "title":"كم توفّر؟","body":"أدخل ما تنوي إنفاقه خلال رحلتك، ونخبرك كم توفّر مع كل فئة."}},
  {"id":"00000000-0000-4000-8000-000000000404","type":"text","hidden":false,"anchor":"stamps","bg":"white","data":{
    "title":"الأختام","body":"جواز السفر التراثي يجمع أختام المواقع التي زرتها، ويمنحك خصمًا في المتجر عند إكمال خمسة أختام.","width":"normal"}}
]$json$::jsonb, 'published', now(), 'الجواز التراثي الرقمي من شُرفة: أختام تُجمع وخصومات متدرجة. مجاني عند الإطلاق.'),

('partners', 'انضم كشريك', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000501","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"انضم كشريك","body":"هل تقدّم خدمة سياحية في عُمان؟ لوحة تحكم بسيطة، شروط مكتوبة، واسمك ظاهر بجانب تجربتك. وتصلك رسالة تأكيد بكل حجز جديد في اللحظة نفسها.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000502","type":"steps","hidden":false,"anchor":"how","bg":"white","data":{
    "title":"خطوات الانضمام","items":[
      {"title":"تقدّم الطلب","text":"املأ النموذج أدناه."},
      {"title":"نراجعه ونتواصل معك","text":"نقرأ طلبك ونتصل بك."},
      {"title":"تُفعَّل صفحتك","text":"تظهر تجربتك باسمك في التطبيق."}]}},
  {"id":"00000000-0000-4000-8000-000000000503","type":"form","hidden":false,"anchor":"apply","bg":"cream","data":{
    "form":"partner","title":"نموذج الطلب","intro":"املأ البيانات، ونعود إليك."}}
]$json$::jsonb, 'published', now(), 'انضم إلى شُرفة كشريك مزوّد: لوحة تحكم بسيطة وشروط مكتوبة واسمك ظاهر بجانب تجربتك.'),

('app', 'التطبيق', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000601","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"تطبيق شُرفة","body":"الحجز والدفع والجواز التراثي كلها في التطبيق. حساب واحد وسلة واحدة وحجز واحد.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000602","type":"app_cta","hidden":false,"anchor":"get","bg":"ink","data":{
    "title":"رحلتك تبدأ بسعر تعرفه من أول خطوة","body":"كل تجربة في شُرفة بسعرها النهائي ومدتها وما يشمله السعر."}}
]$json$::jsonb, 'published', now(), 'تطبيق شُرفة: احجز الأنشطة والطعام والإقامة والمركبات من حساب واحد.'),

('about', 'عن شُرفة', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000701","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"عن شُرفة","body":"شُرفة منصة رقمية عُمانية تجمع الخدمات السياحية المتفرقة في سلطنة عُمان في واجهة واحدة. لا ننشئ خدمات جديدة، بل نجمع خدمات قائمة موزعة على منصات متخصصة، لتصل إليها من نقطة واحدة بدل التنقل بين خمس واجهات وخمس عمليات دفع.\n\nمنصة سياحية عربية أولًا تجمع سبع خدمات في حساب واحد وسلة واحدة وحجز واحد، مبنية من داخل عُمان.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000702","type":"text","hidden":false,"anchor":"name","bg":"white","data":{
    "title":"لماذا «شُرفة»؟","body":"الشُرفة هي المكان المرتفع المفتوح الذي تُطل منه على المكان قبل أن تدخله. هذا بالضبط دور المنصة: نظرة واضحة قبل الحجز.","width":"narrow"}},
  {"id":"00000000-0000-4000-8000-000000000703","type":"columns","hidden":false,"anchor":"vision","bg":"cream","data":{
    "title":"الرؤية والرسالة والطموح","items":[
      {"title":"الرؤية","text":"أن تكون شُرفة أول ما يفتحه الزائر عند التخطيط لأي تجربة في عُمان."},
      {"title":"الرسالة","text":"نجمع خدمات السياحة المتناثرة في منصة واحدة واضحة بالعربية، تجعل الحجز خطوة واحدة بدل عشر خطوات."},
      {"title":"الطموح","text":"نبدأ من محافظة مسقط، ثم نتوسع إلى بقية المحافظات."}]}},
  {"id":"00000000-0000-4000-8000-000000000704","type":"feature_list","hidden":false,"anchor":"values","bg":"white","data":{
    "title":"قيمنا","lead":"","layout":"rows","items":[
      {"icon":"check","title":"الوضوح","text":"السعر والمدة وما يشمله السعر مكتوبة قبل الحجز.","url":""},
      {"icon":"location","title":"القُرب","text":"نخاطبك بالعربية، ومن داخل عُمان.","url":""},
      {"icon":"user","title":"الإتاحة للجميع","text":"منصة شعبية عملية بسيطة، لا فاخرة نخبوية.","url":""},
      {"icon":"alert","title":"الأمانة في الوصف","text":"نكتب ما هو موجود فعلًا، بلا مبالغة.","url":""},
      {"icon":"crafts","title":"دعم المجتمع المحلي","text":"اسم المزوّد والحرفي ظاهر بجانب تجربته ومنتجه.","url":""}]}},
  {"id":"00000000-0000-4000-8000-000000000705","type":"columns","hidden":false,"anchor":"promises","bg":"cream","data":{
    "title":"وعودنا","items":[
      {"title":"السعر النهائي أولًا","text":"لا مبالغ تظهر في آخر خطوة."},
      {"title":"تأكيد فوري","text":"إشعار الحجز يصل في اللحظة نفسها."},
      {"title":"دعم بالعربية","text":"إنسان يرد، وليس ردًا آليًا مكررًا."},
      {"title":"إلغاء واضح","text":"شروط الإلغاء مكتوبة قبل الدفع."}]}},
  {"id":"00000000-0000-4000-8000-000000000706","type":"columns","hidden":false,"anchor":"positioning","bg":"white","data":{
    "title":"أين تقف شُرفة","items":[
      {"title":"مقابل مكاتب السفر","text":"تحجز بنفسك، بسعر تراه قبل أي خطوة، دون وسيط."},
      {"title":"مقابل الحجز المباشر","text":"حساب واحد وسلة واحدة لسبع خدمات بدل خمس واجهات وخمس عمليات دفع."},
      {"title":"مقابل المنصات العالمية","text":"عربية أولًا، ومبنية من داخل عُمان، وتعرف المكان وأهله."}]}}
]$json$::jsonb, 'published', now(), 'قصة شُرفة ورؤيتها ورسالتها وقيمها: منصة سياحية عربية أولًا مبنية من داخل عُمان.'),

('contact', 'تواصل معنا', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000801","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"تواصل معنا","body":"اكتب لنا، وإنسان يرد عليك بالعربية.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000802","type":"form","hidden":false,"anchor":"form","bg":"white","data":{
    "form":"contact","title":"","intro":""}},
  {"id":"00000000-0000-4000-8000-000000000803","type":"contact_info","hidden":false,"anchor":"info","bg":"cream","data":{"title":"بيانات التواصل"}}
]$json$::jsonb, 'published', now(), 'تواصل مع فريق شُرفة.'),

('faq', 'الأسئلة الشائعة', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000901","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"الأسئلة الشائعة","body":"إجابات قصيرة عن أكثر ما يُسأل عنه.","width":"normal"}},
  {"id":"00000000-0000-4000-8000-000000000902","type":"faq","hidden":false,"anchor":"all","bg":"white","data":{"title":"","group":""}}
]$json$::jsonb, 'published', now(), 'الأسئلة الشائعة عن شُرفة: التصفح والحجز والجواز والدعم.'),

('privacy', 'سياسة الخصوصية', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000a01","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"سياسة الخصوصية","body":"## ما نجمعه ولماذا\n\nنجمع ما تكتبه في نماذج الموقع: اسمك ووسيلة التواصل ورسالتك أو طلبك. نستخدمها للرد عليك فقط.\n\n## التصفح بلا حساب\n\nتتصفح الموقع دون حساب. التسجيل يكون عند الحجز في التطبيق.\n\n## أدوات القياس\n\nنستخدم أدوات قياس لنفهم كيف يُستخدم الموقع ونحسّنه. تعمل بعد موافقتك فقط، ويمكنك تغيير خيارك من «إعدادات الخصوصية» في أسفل الصفحة. القائمة أدناه تعرض الأدوات المفعّلة حاليًا.\n\n## الأمان\n\nنحفظ بياناتك في قاعدة بيانات محمية، ولا يصل إليها إلا فريق الإدارة المخوّل.","width":"normal"}}
]$json$::jsonb, 'published', now(), 'سياسة الخصوصية في موقع شُرفة.'),

('terms', 'الشروط', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000b01","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"الشروط","body":"## الموقع\n\nهذا الموقع يعرّف بمنصة شُرفة وخدماتها. الحجز والدفع يتمان في التطبيق.\n\n## المحتوى\n\nنكتب ما هو موجود فعلًا. المدة والسعر وما يشمله السعر ومن يقدّمه تُكتب صراحة قبل الحجز.\n\n## الشركاء\n\nالشريك المزوّد يقدّم خدماته بشروط مكتوبة، واسمه ظاهر بجانب تجربته.","width":"normal"}}
]$json$::jsonb, 'published', now(), 'شروط استخدام موقع شُرفة.'),

('cancellation', 'سياسة الإلغاء', 'system', $json$[
  {"id":"00000000-0000-4000-8000-000000000c01","type":"text","hidden":false,"anchor":"","bg":"cream","data":{
    "title":"سياسة الإلغاء","body":"## إلغاء واضح\n\nشروط الإلغاء مكتوبة قبل الدفع، لكل تجربة على حدة، في التطبيق.\n\n## قبل أن تحجز\n\nاقرأ شروط الإلغاء الخاصة بالتجربة قبل إتمام الدفع. لا شروط مخفية.","width":"normal"}}
]$json$::jsonb, 'published', now(), 'سياسة الإلغاء في شُرفة: شروط مكتوبة قبل الدفع.')
on conflict (slug) do nothing;
