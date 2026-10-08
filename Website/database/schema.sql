-- مخطط قاعدة بيانات موقع شُرفة التعريفي ونظام إدارة المحتوى
-- يُشغَّل أولًا في محرر SQL داخل Supabase. قابل لإعادة التشغيل دون أخطاء.

create extension if not exists "pgcrypto";

-- ===== الأنواع =====
do $$ begin
  if not exists (select 1 from pg_type where typname = 'admin_role') then
    create type admin_role as enum ('super_admin', 'customer_service', 'marketing', 'finance', 'operations');
  end if;
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('draft', 'published', 'archived');
  end if;
  if not exists (select 1 from pg_type where typname = 'service_status') then
    create type service_status as enum ('available', 'coming_soon');
  end if;
  if not exists (select 1 from pg_type where typname = 'submission_status') then
    create type submission_status as enum ('new', 'in_review', 'accepted', 'rejected', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'module_group') then
    create type module_group as enum ('messages', 'applications');
  end if;
  if not exists (select 1 from pg_type where typname = 'page_kind') then
    create type page_kind as enum ('system', 'custom');
  end if;
end $$;

-- ===== الدوال المساعدة =====
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- مشغّل يمنع تعديل أو حذف سجلات التدقيق
create or replace function forbid_audit_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'سجل التدقيق لا يُعدَّل ولا يُحذف';
end $$;

-- ===== جداول الإدارة =====
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role admin_role not null,
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table profiles is 'ملفات حسابات الإدارة المرتبطة بمستخدمي Supabase Auth';
comment on column profiles.role is 'دور المسؤول الذي تُشتق منه الصلاحيات';
comment on column profiles.must_change_password is 'يُجبر على تغيير كلمة المرور عند أول دخول';

-- ===== المحتوى =====
create table if not exists pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind page_kind not null default 'custom',
  blocks jsonb not null default '[]'::jsonb,
  status content_status not null default 'draft',
  draft jsonb,
  publish_at timestamptz,
  unpublish_at timestamptz,
  published_at timestamptz,
  deleted_at timestamptz,
  seo_title text,
  seo_description text,
  og_image_path text,
  noindex boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table pages is 'صفحات الموقع المبنية من كتل مرتبة';
comment on column pages.blocks is 'الكتل المنشورة بصيغة JSON';
comment on column pages.draft is 'التعديلات غير المنشورة بعد';
comment on column pages.kind is 'system صفحة نظام لا تُحذف، custom صفحة مخصصة';

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  tagline text,
  body text not null default '',
  highlights text[] not null default '{}',
  icon_key text not null default 'activities',
  accent text not null default 'teal' check (accent in ('teal', 'brick', 'gold', 'purple', 'ink')),
  service_status service_status not null default 'coming_soon',
  cover_path text,
  sort integer not null default 0,
  status content_status not null default 'draft',
  draft jsonb,
  publish_at timestamptz,
  unpublish_at timestamptz,
  published_at timestamptz,
  deleted_at timestamptz,
  seo_title text,
  seo_description text,
  og_image_path text,
  noindex boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table services is 'الخدمات السبع التي يعرّف بها الموقع وأي خدمة تُضاف لاحقًا';
comment on column services.body is 'النص الأساسي بصيغة Markdown المبسّطة';
comment on column services.accent is 'لون القسم من الهوية';

create table if not exists guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text not null default '',
  cover_path text,
  is_demo boolean not null default false,
  status content_status not null default 'draft',
  draft jsonb,
  publish_at timestamptz,
  unpublish_at timestamptz,
  published_at timestamptz,
  deleted_at timestamptz,
  seo_title text,
  seo_description text,
  og_image_path text,
  noindex boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table guides is 'مقالات دليل المسافر';

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  group_name text not null default 'عام',
  sort integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table faqs is 'الأسئلة الشائعة ومجموعاتها';

create table if not exists menus (
  key text primary key check (key in ('main', 'footer_1', 'footer_2', 'footer_3', 'footer_4')),
  title text not null default '',
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
comment on table menus is 'قائمة الرأس وقوائم التذييل الأربع';

create table if not exists redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_url text not null,
  code integer not null default 301 check (code in (301, 302)),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table redirects is 'تحويلات الروابط الدائمة والمؤقتة';

create table if not exists content_revisions (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in ('page', 'service', 'guide')),
  entity_id uuid not null,
  snapshot jsonb not null,
  note text,
  created_by uuid,
  created_at timestamptz not null default now()
);
comment on table content_revisions is 'نسخ المحتوى عند كل نشر، يُحتفظ بآخر 30 نسخة لكل عنصر';

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  url text not null,
  kind text not null check (kind in ('image', 'pdf')),
  title text not null default '',
  alt_text text not null default '',
  mime text not null,
  size_bytes integer not null default 0,
  width integer,
  height integer,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
comment on table media_assets is 'مكتبة الوسائط: الصور وملفات PDF المرفوعة إلى التخزين';
comment on column media_assets.alt_text is 'النص البديل، إلزامي للصور';

create table if not exists passport_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('bronze', 'silver', 'gold')),
  name_ar text not null,
  price_omr numeric(10,3) not null default 0,
  duration_days integer not null default 7,
  discount_min_pct numeric(5,2) not null default 0,
  discount_max_pct numeric(5,2) not null default 0,
  sort integer not null default 0,
  is_active boolean not null default true
);
comment on table passport_tiers is 'فئات الجواز التراثي الرقمي وأسعارها المبدئية بالريال العُماني';

create table if not exists governorates (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null unique,
  sort integer not null default 0
);
comment on table governorates is 'محافظات سلطنة عُمان الإحدى عشرة';

-- ===== النماذج والردود =====
create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind page_kind not null default 'custom',
  module_group module_group not null default 'messages',
  fields jsonb not null default '[]'::jsonb,
  submit_label text not null default 'إرسال',
  success_message text not null default 'وصلتنا رسالتك. نرد عليك قريبًا.',
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
comment on table forms is 'تعريفات النماذج العامة وحقولها';
comment on column forms.module_group is 'يحدد الوحدة التي تظهر فيها الردود: رسائل أو طلبات';

create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status submission_status not null default 'new',
  internal_note text,
  handled_by uuid,
  handled_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table form_submissions is 'ردود الزوار على النماذج، بلا عناوين IP ولا وكلاء مستخدم';

-- ===== التكاملات والتحليلات والإدارة =====
create table if not exists site_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
comment on table site_settings is 'إعدادات الموقع، العامة منها فقط تُعرض عبر الواجهة العامة';

create table if not exists webhooks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  secret text not null,
  events text[] not null default '{form_submitted}',
  form_ids uuid[],
  is_active boolean not null default true,
  last_status_code integer,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table webhooks is 'وجهات الإرسال الصادر الموقّع عند الأحداث';

create table if not exists webhook_deliveries (
  id bigint generated always as identity primary key,
  webhook_id uuid not null references webhooks(id) on delete cascade,
  event text not null,
  status_code integer,
  ok boolean not null default false,
  error text,
  attempt integer not null default 1,
  created_at timestamptz not null default now()
);
comment on table webhook_deliveries is 'سجل محاولات الإرسال، آخر 200 لكل وجهة';

create table if not exists analytics_daily (
  day date not null,
  path text not null,
  views integer not null default 0,
  primary key (day, path)
);
comment on table analytics_daily is 'عدّاد المشاهدات اليومي بلا أي بيانات شخصية';

-- تُنشأ بعد الجدول لأن جسمها يتحقق من وجوده وقت التعريف
create or replace function increment_pageview(p_day date, p_path text, p_n integer)
returns void
language sql
security definer
set search_path = public
as $$
  insert into analytics_daily (day, path, views)
  values (p_day, p_path, p_n)
  on conflict (day, path) do update set views = analytics_daily.views + p_n;
$$;

create table if not exists audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  actor_role text,
  action text not null,
  entity text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamptz not null default now()
);
comment on table audit_logs is 'سجل التدقيق غير القابل للتعديل أو الحذف';

-- ===== المشغّلات =====
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_audit_forbid') then
    create trigger trg_audit_forbid before update or delete on audit_logs
      for each row execute function forbid_audit_change();
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['pages', 'services', 'guides', 'faqs', 'menus', 'forms', 'site_settings']
  loop
    if not exists (select 1 from pg_trigger where tgname = 'trg_updated_at_' || t) then
      execute format('create trigger trg_updated_at_%I before update on %I for each row execute function set_updated_at()', t, t);
    end if;
  end loop;
end $$;

-- ===== الفهارس =====
create index if not exists idx_pages_slug on pages(slug);
create index if not exists idx_services_slug on services(slug);
create index if not exists idx_guides_status_published on guides(status, published_at);
create index if not exists idx_faqs_group_sort on faqs(group_name, sort);
create index if not exists idx_submissions_form_status_created on form_submissions(form_id, status, created_at);
create index if not exists idx_redirects_from on redirects(from_path);
create index if not exists idx_revisions_entity on content_revisions(entity_type, entity_id, created_at);

-- ===== عرض الإعدادات العامة =====
create or replace view public_settings
with (security_invoker = true) as
  select key, value from site_settings where is_public = true;

-- ===== الصلاحيات على مستوى الأدوار =====
revoke all on function increment_pageview(date, text, integer) from public;
revoke all on function increment_pageview(date, text, integer) from anon;
revoke all on function increment_pageview(date, text, integer) from authenticated;
grant execute on function increment_pageview(date, text, integer) to service_role;

-- ===== حاوية التخزين العامة =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
