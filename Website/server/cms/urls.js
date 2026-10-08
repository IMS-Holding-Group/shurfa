// فحص الروابط الآمنة في الخادم: يعيد تصدير الدوال المشتركة ويضيف فحص صور المكتبة
import { supabaseConfig } from '../supabase.js';
import { isAllowedImage as sharedIsAllowedImage } from '../../assets/js/shared/urls.js';

export { isSafeUrl, isHttpsUrl, isExternal } from '../../assets/js/shared/urls.js';

export function storageOrigin() {
 try { return supabaseConfig()?.supabaseOrigin || ''; } catch { return ''; }
}

export function isAllowedImage(value) {
 return sharedIsAllowedImage(value, storageOrigin());
}
