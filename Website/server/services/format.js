// تنسيق الأرقام والتواريخ وفق الهوية: أرقام لاتينية وتقويم ميلادي وتوقيت مسقط
export { formatOmr } from '../../assets/js/shared/passport.js';

const LOCALE = 'ar-OM-u-nu-latn-ca-gregory';
const TZ = 'Asia/Muscat';

const dayFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
const fullFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });
const partsFormatter = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: false });

// مثل: الجمعة 2 أكتوبر
export function formatDay(value) {
 const d = value instanceof Date ? value : new Date(value);
 if (Number.isNaN(d.getTime())) return '';
 return dayFormatter.format(d);
}

// مثل: 2 أكتوبر 2026م
export function formatDate(value) {
 const d = value instanceof Date ? value : new Date(value);
 if (Number.isNaN(d.getTime())) return '';
 return `${fullFormatter.format(d)}م`;
}

// صيغة التاريخ والوقت الموحدة: 2026/1/3م 5:50ص
export function formatDateTime(value) {
 const d = value instanceof Date ? value : new Date(value);
 if (Number.isNaN(d.getTime())) return '';
 const parts = Object.fromEntries(partsFormatter.formatToParts(d).map((p) => [p.type, p.value]));
 let hour = Number(parts.hour) % 24;
 const suffix = hour >= 12 ? 'م' : 'ص';
 hour = hour % 12;
 if (hour === 0) hour = 12;
 return `${parts.year}/${Number(parts.month)}/${Number(parts.day)}م ${hour}:${parts.minute}${suffix}`;
}

// اليوم الحالي بتوقيت مسقط بصيغة YYYY-MM-DD لعدّاد المشاهدات
export function muscatDay(date = new Date()) {
 const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
 return f.format(date);
}

export function formatNumber(n) {
 return new Intl.NumberFormat('en-US').format(Number(n || 0));
}

export function formatPct(n) {
 return `${Number(n || 0)}%`;
}
