// إنشاء الحسابات الافتراضية والردود التجريبية، أو حذف التجريبية بخيار --clear-demo
import { loadConfig } from '../server/config.js';
import { initSupabase, db } from '../server/supabase.js';

const ACCOUNTS = [
 { role: 'super_admin', full_name: 'ميثم بن أحمد بن خميس الشيدي', email: 'mithamahmed99@gmail.com', passwordEnv: 'SEED_SUPER_ADMIN_PASSWORD' },
 { role: 'customer_service', full_name: 'مسؤول خدمة العملاء', email: 'cs@shurfah.link', passwordEnv: 'SEED_CS_PASSWORD' },
 { role: 'marketing', full_name: 'مسؤول التسويق', email: 'marketing@shurfah.link', passwordEnv: 'SEED_MARKETING_PASSWORD' },
 { role: 'finance', full_name: 'مسؤول المالية', email: 'finance@shurfah.link', passwordEnv: 'SEED_FINANCE_PASSWORD' },
 { role: 'operations', full_name: 'مسؤول العمليات', email: 'operations@shurfah.link', passwordEnv: 'SEED_OPS_PASSWORD' }
];

function accountPassword(account) {
 const value = process.env[account.passwordEnv] || '';
 if (value.length < 10) throw new Error(`Set ${account.passwordEnv} in .env (at least 10 characters) before creating accounts.`);
 return value;
}

const MESSAGES = {
 contact: [
  { status: 'new', data: { name: 'سالم بن راشد', contact: 'salem.example@mail.com', subject: 'استفسار عن الخدمات', message: 'أريد معرفة الخدمات المتاحة في مسقط.' } },
  { status: 'in_review', data: { name: 'فاطمة البلوشية', contact: '96890000001', subject: 'الجواز التراثي', message: 'هل الجواز مجاني عند الإطلاق؟' } },
  { status: 'closed', data: { name: 'خالد المعمري', contact: 'khalid.example@mail.com', subject: 'اقتراح', message: 'أضيفوا جولات مسائية في مطرح.' } }
 ],
 waitlist: [
  { status: 'new', data: { name: 'مريم الحارثية', contact: 'mariam.example@mail.com' } },
  { status: 'in_review', data: { name: 'يوسف الرواحي', contact: '96890000002' } },
  { status: 'new', data: { name: 'ليلى السيابية', contact: 'laila.example@mail.com' } }
 ]
};

const PARTNERS = [
 { status: 'new', data: { business_name: 'رحلات الساحل', service_type: 'أنشطة', governorate: 'مسقط', wilaya: 'مسقط', contact_name: 'أحمد العامري', phone: '96890000011', email: 'ahmad.example@mail.com', uses_platform: 'لا', platform_name: '', bio: 'جولات قوارب قصيرة لعائلات مسقط.', privacy_consent: true } },
 { status: 'in_review', data: { business_name: 'مطبخ البيت', service_type: 'طعام', governorate: 'مسقط', wilaya: 'السيب', contact_name: 'نورة الكندية', phone: '96890000012', email: 'noura.example@mail.com', uses_platform: 'نعم', platform_name: 'منصة طعام', bio: 'وجبات عُمانية منزلية بطلب مسبق.', privacy_consent: true } },
 { status: 'accepted', data: { business_name: 'بيت الضيافة', service_type: 'إقامة', governorate: 'الداخلية', wilaya: 'نزوى', contact_name: 'حمد الغافري', phone: '96890000013', email: 'hamad.example@mail.com', uses_platform: 'لا', platform_name: '', bio: 'غرف ضيافة في بيت تراثي.', privacy_consent: true } },
 { status: 'rejected', data: { business_name: 'ورشة النقش', service_type: 'حرف', governorate: 'مسقط', wilaya: 'مطرح', contact_name: 'سعاد الحبسية', phone: '96890000014', email: 'suad.example@mail.com', uses_platform: 'لا', platform_name: '', bio: 'منتجات فضية محدودة.', privacy_consent: true } }
];

const config = loadConfig();
initSupabase(config);
const clear = process.argv.includes('--clear-demo');

async function listUsers() {
 const found = [];
 for (let page = 1; page <= 10; page += 1) {
  const { data, error } = await db().auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw new Error('Failed to read auth users.');
  found.push(...(data?.users || []));
  if (!data?.users || data.users.length < 200) break;
 }
 return found;
}

async function seedAccounts() {
 const users = await listUsers();
 for (const account of ACCOUNTS) {
  const existing = users.find((u) => (u.email || '').toLowerCase() === account.email);
  if (existing) {
   const { data: profile } = await db().from('profiles').select('id').eq('id', existing.id).maybeSingle();
   if (!profile) {
    const { error } = await db().from('profiles').insert({ id: existing.id, full_name: account.full_name, role: account.role, is_active: true, must_change_password: true });
    if (error) throw new Error(`Failed to save profile for ${account.email}.`);
    console.log(`Added the missing profile for ${account.email} without changing the password.`);
   } else console.log(`Account ${account.email} already exists. Password was left unchanged.`);
   continue;
  }
  const { data, error } = await db().auth.admin.createUser({ email: account.email, password: accountPassword(account), email_confirm: true });
  if (error || !data?.user) throw new Error(`Failed to create account ${account.email}.`);
  const { error: pErr } = await db().from('profiles').insert({ id: data.user.id, full_name: account.full_name, role: account.role, is_active: true, must_change_password: true });
  if (pErr) { await db().auth.admin.deleteUser(data.user.id); throw new Error(`Failed to save profile for ${account.email}.`); }
  console.log(`Created ${account.email} with role ${account.role}.`);
 }
}

async function seedDemo() {
 const { count } = await db().from('form_submissions').select('id', { count: 'exact', head: true }).eq('is_demo', true);
 if (count) { console.log(`Demo submissions already exist (${count}). To remove them run: npm run seed:clear-demo`); return; }
 const { data: forms, error } = await db().from('forms').select('id, slug').in('slug', ['contact', 'waitlist', 'partner']);
 if (error || !forms || forms.length < 3) throw new Error('Forms are missing. Run schema.sql, then policies.sql, then seed.sql in Supabase first.');
 const bySlug = Object.fromEntries(forms.map((f) => [f.slug, f.id]));
 const rows = [];
 for (const [slug, list] of Object.entries(MESSAGES)) rows.push(...list.map((r) => ({ form_id: bySlug[slug], status: r.status, data: r.data, is_demo: true })));
 rows.push(...PARTNERS.map((r) => ({ form_id: bySlug.partner, status: r.status, data: r.data, is_demo: true })));
 const { error: ins } = await db().from('form_submissions').insert(rows);
 if (ins) throw new Error('Failed to insert demo submissions.');
 console.log(`Inserted ${rows.length} demo submissions. To remove them: npm run seed:clear-demo`);
}

async function clearDemo() {
 const { error, count } = await db().from('form_submissions').delete({ count: 'exact' }).eq('is_demo', true);
 if (error) throw new Error('Failed to delete demo submissions.');
 console.log(`Deleted ${count || 0} demo submissions.`);
}

try {
 if (clear) await clearDemo();
 else { await seedAccounts(); await seedDemo(); console.log('Seed complete. Change the password on first login.'); }
} catch (err) {
 console.error(err.message || 'Seed failed.');
 process.exit(1);
}
