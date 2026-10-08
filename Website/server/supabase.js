// إنشاء عملاء Supabase: عميل الخدمة للخادم وعميل مجهول مؤقت لتسجيل الدخول
import { createClient } from '@supabase/supabase-js';

let config = null;
let serviceClient = null;

export function initSupabase(cfg) {
 config = cfg;
 serviceClient = createClient(cfg.supabaseUrl, cfg.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
 });
 return serviceClient;
}

// عميل بمفتاح الخدمة يتجاوز سياسات الصفوف، يُستخدم في الخادم فقط
export function db() {
 if (!serviceClient) throw new Error('لم يُهيأ عميل Supabase بعد');
 return serviceClient;
}

// عميل مجهول بلا جلسة محفوظة، يُنشأ لكل عملية دخول أو تحقق من رمز
export function anonClient() {
 return createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
 });
}

export function supabaseConfig() { return config; }
