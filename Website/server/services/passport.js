// حاسبة الجواز التراثي في الخادم: تعيد تصدير الدوال النقية المشتركة مع المتصفح
// وتضيف قراءة الفئات الفعالة من قاعدة البيانات
import { db } from '../supabase.js';
import { cached } from '../cache.js';

export { toBaisa, toOmr, breakEvenSpend, netSaving, calculateTiers, formatOmr } from '../../assets/js/shared/passport.js';

export async function getActiveTiers() {
 return cached('passport:tiers', async () => {
  const { data, error } = await db().from('passport_tiers').select('*').eq('is_active', true).order('sort');
  if (error) throw new Error('تعذر قراءة فئات الجواز');
  return data || [];
 });
}
