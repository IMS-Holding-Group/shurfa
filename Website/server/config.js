// قراءة متغيرات البيئة والتحقق منها قبل إقلاع الخادم

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

// يعيد كائن الإعدادات أو يوقف العملية برسالة عربية واضحة تسمّي المتغير الناقص
export function loadConfig(env = process.env) {
 for (const name of REQUIRED) {
  if (!env[name] || !String(env[name]).trim()) {
   console.error(`Missing ${name} in .env. Copy .env.example to .env, set the value, then start again.`);
   process.exit(1);
  }
 }
 let supabaseOrigin = '';
 try { supabaseOrigin = new URL(env.SUPABASE_URL).origin; } catch {
  console.error('SUPABASE_URL is not a valid URL. Copy the Project URL from the Supabase project settings.');
  process.exit(1);
 }
 const port = Number(env.PORT || 3000);
 if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT must be an integer between 1 and 65535.');
  process.exit(1);
 }
 return {
  port,
  nodeEnv: env.NODE_ENV || 'development',
  isProduction: env.NODE_ENV === 'production',
  siteUrl: (env.SITE_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  cookieSecure: env.COOKIE_SECURE === 'true',
  supabaseUrl: env.SUPABASE_URL,
  supabaseOrigin,
  supabaseAnonKey: env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
 };
}
