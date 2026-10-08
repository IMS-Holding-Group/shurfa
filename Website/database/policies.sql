-- سياسات الأمان على مستوى الصفوف لموقع شُرفة
-- يُشغَّل ثانيًا بعد schema.sql. المتصفح لا يحمل أي مفتاح؛ هذه السياسات طبقة حماية إضافية
-- للاستهلاك المستقبلي عبر مفتاح anon (مثل تطبيق Flutter).

alter table profiles enable row level security;
alter table pages enable row level security;
alter table services enable row level security;
alter table guides enable row level security;
alter table faqs enable row level security;
alter table menus enable row level security;
alter table redirects enable row level security;
alter table content_revisions enable row level security;
alter table media_assets enable row level security;
alter table passport_tiers enable row level security;
alter table governorates enable row level security;
alter table forms enable row level security;
alter table form_submissions enable row level security;
alter table site_settings enable row level security;
alter table webhooks enable row level security;
alter table webhook_deliveries enable row level security;
alter table analytics_daily enable row level security;
alter table audit_logs enable row level security;

-- دالة تحسب الظهور الفعلي للمحتوى المنشور
create or replace function is_live(p_status content_status, p_deleted timestamptz, p_publish timestamptz, p_unpublish timestamptz)
returns boolean
language sql
immutable
set search_path = public
as $$
  select p_status = 'published'
    and p_deleted is null
    and (p_publish is null or p_publish <= now())
    and (p_unpublish is null or p_unpublish > now());
$$;

-- قراءة عامة للمحتوى المنشور فعليًا فقط
drop policy if exists "public_read_pages" on pages;
create policy "public_read_pages" on pages for select to anon, authenticated
  using (is_live(status, deleted_at, publish_at, unpublish_at));

drop policy if exists "public_read_services" on services;
create policy "public_read_services" on services for select to anon, authenticated
  using (is_live(status, deleted_at, publish_at, unpublish_at));

drop policy if exists "public_read_guides" on guides;
create policy "public_read_guides" on guides for select to anon, authenticated
  using (is_live(status, deleted_at, publish_at, unpublish_at));

drop policy if exists "public_read_faqs" on faqs;
create policy "public_read_faqs" on faqs for select to anon, authenticated
  using (is_published = true);

drop policy if exists "public_read_menus" on menus;
create policy "public_read_menus" on menus for select to anon, authenticated using (true);

drop policy if exists "public_read_passport_tiers" on passport_tiers;
create policy "public_read_passport_tiers" on passport_tiers for select to anon, authenticated
  using (is_active = true);

drop policy if exists "public_read_governorates" on governorates;
create policy "public_read_governorates" on governorates for select to anon, authenticated using (true);

-- العرض يعمل بصلاحيات المستدعي، والسياسة تمنع قراءة الإعدادات غير العامة
drop policy if exists "public_read_settings" on site_settings;
create policy "public_read_settings" on site_settings for select to anon, authenticated
  using (is_public = true);

-- منح Supabase الافتراضي يعطي الكتابة لكل الجداول. RLS يمنعها، والسحب هنا يمنعها حتى لو أُضيفت سياسة بالخطأ.
revoke all on all tables in schema public from anon, authenticated;
grant select on faqs, menus, passport_tiers, governorates, site_settings, public_settings to anon, authenticated;
grant select (id, slug, title, kind, blocks, status, publish_at, unpublish_at, published_at, seo_title, seo_description, og_image_path, noindex, created_at, updated_at) on pages to anon, authenticated;
grant select (id, slug, title, tagline, body, highlights, icon_key, accent, service_status, cover_path, sort, status, publish_at, unpublish_at, published_at, seo_title, seo_description, og_image_path, noindex, created_at, updated_at) on services to anon, authenticated;
grant select (id, slug, title, excerpt, body, cover_path, is_demo, status, publish_at, unpublish_at, published_at, seo_title, seo_description, og_image_path, noindex, created_at, updated_at) on guides to anon, authenticated;

-- بقية الجداول بلا أي سياسة: لا وصول عبر anon أو authenticated.
-- الخادم وحده يصل إليها بمفتاح service_role الذي يتجاوز هذه السياسات.
-- لا سياسة كتابة على storage.objects: الرفع بمفتاح الخدمة، والحد والحجم على الحاوية media.
