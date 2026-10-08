// مجموعة أيقونات SVG أصلية مرسومة وفق قواعد الهوية:
// كتل مسطحة بأطراف مقطوعة بزاوية، بلا خط محيط ولا تفاصيل داخلية ولا ظل،
// على شبكة 48px بهامش داخلي 4px، وبلونين كحد أقصى (ثلاثة لأيقونات الأقسام).
// الألوان تُقرأ من متغيرات الهوية عبر var() داخل fill.

const TEAL = 'var(--color-teal)';
const BRICK = 'var(--color-brick)';
const GOLD = 'var(--color-gold)';
const PURPLE = 'var(--color-purple)';
const INK = 'var(--color-ink)';
const CURRENT = 'currentColor';

// كل أيقونة: مجموعة مضلعات (points, fill)
const SHAPES = {
 activities: [
  ['4,40 18,12 26,26 32,18 44,40 40,44 8,44', TEAL],
  ['30,8 36,4 42,10 36,14', GOLD]
 ],
 food: [
  ['8,22 40,22 44,26 38,40 10,40 4,26', BRICK],
  ['20,6 24,4 28,6 26,16 22,16', GOLD]
 ],
 vehicles: [
  ['6,24 12,12 36,12 42,24 44,28 44,36 40,38 8,38 4,36 4,28', TEAL],
  ['10,38 16,38 16,44 10,44', INK],
  ['32,38 38,38 38,44 32,44', INK]
 ],
 stays: [
  ['4,24 24,6 44,24 40,28 24,14 8,28', INK],
  ['10,26 38,26 38,44 10,44', TEAL],
  ['20,32 28,32 28,44 20,44', INK]
 ],
 passport: [
  ['10,4 38,4 42,8 42,40 38,44 10,44 6,40 6,8', PURPLE],
  ['16,14 32,14 34,16 34,30 32,32 16,32 14,30 14,16', GOLD]
 ],
 crafts: [
  ['24,4 44,16 40,40 8,40 4,16', PURPLE],
  ['18,20 30,20 32,22 32,34 30,36 18,36 16,34 16,22', GOLD]
 ],
 tickets: [
  ['4,14 44,14 44,22 40,24 44,26 44,34 4,34 4,26 8,24 4,22', GOLD],
  ['28,16 32,16 32,32 28,32', INK]
 ],
 search: [
  ['8,6 30,6 34,10 34,30 30,34 8,34 4,30 4,10', CURRENT],
  ['30,28 36,28 44,38 40,44 30,34', CURRENT]
 ],
 menu: [
  ['4,8 44,8 44,14 4,14', CURRENT],
  ['4,21 44,21 44,27 4,27', CURRENT],
  ['4,34 44,34 44,40 4,40', CURRENT]
 ],
 close: [
  ['8,12 12,8 40,36 36,40', CURRENT],
  ['36,8 40,12 12,40 8,36', CURRENT]
 ],
 arrow: [
  ['44,21 16,21 26,10 22,6 4,24 22,42 26,38 16,27 44,27', CURRENT]
 ],
 chevron: [
  ['8,16 12,12 24,24 36,12 40,16 24,32', CURRENT]
 ],
 check: [
  ['6,26 12,20 20,28 36,10 42,16 20,40', CURRENT]
 ],
 phone: [
  ['6,6 16,4 20,16 14,20 20,30 28,34 32,28 44,32 42,42 36,44 20,38 8,22', CURRENT]
 ],
 mail: [
  ['4,10 44,10 44,38 4,38', CURRENT],
  ['4,10 44,10 24,28', INK]
 ],
 user: [
  ['16,4 32,4 36,8 36,20 32,24 16,24 12,20 12,8', CURRENT],
  ['4,44 8,30 40,30 44,44', CURRENT]
 ],
 location: [
  ['24,4 40,12 40,26 24,44 8,26 8,12', CURRENT],
  ['18,14 30,14 30,24 18,24', INK]
 ],
 clock: [
  ['14,4 34,4 44,14 44,34 34,44 14,44 4,34 4,14', CURRENT],
  ['22,12 26,12 26,26 34,30 32,34 22,28', INK]
 ],
 alert: [
  ['24,4 44,40 40,44 8,44 4,40', CURRENT],
  ['22,16 26,16 25,30 23,30', INK],
  ['22,34 26,34 26,38 22,38', INK]
 ],
 play: [
  ['14,6 40,24 14,42', CURRENT]
 ],
 download: [
  ['20,4 28,4 28,22 36,22 24,36 12,22 20,22', CURRENT],
  ['4,38 44,38 44,44 4,44', CURRENT]
 ],
 file: [
  ['10,4 30,4 40,14 40,44 10,44', CURRENT],
  ['30,4 40,14 30,14', INK]
 ],
 whatsapp: [
  ['14,4 34,4 44,14 44,32 36,40 20,40 6,46 10,34 4,28 4,14', CURRENT],
  ['16,14 22,14 24,20 20,24 26,30 30,28 34,32 30,36 22,34 14,26 12,18', TEAL]
 ],
 muscat: [
  ['4,44 4,24 10,20 16,24 16,44', INK],
  ['32,44 32,24 38,20 44,24 44,44', INK],
  ['16,30 32,30 32,44 16,44', GOLD],
  ['18,14 30,14 32,18 32,30 16,30 16,18', TEAL]
 ],
 sohar: [
  ['4,44 4,16 10,12 16,16 16,44', INK],
  ['32,44 32,16 38,12 44,16 44,44', INK],
  ['16,24 32,24 32,44 16,44', GOLD],
  ['20,30 28,30 28,44 20,44', INK]
 ],
 khaburah: [
  ['20,4 28,4 30,16 18,16', GOLD],
  ['14,16 34,16 36,20 12,20', INK],
  ['18,20 30,20 40,36 36,44 28,36 20,44 12,38', BRICK]
 ],
 saham: [
  ['20,30 28,30 28,44 20,44', INK],
  ['24,4 42,16 38,30 10,30 6,16', TEAL],
  ['18,14 26,10 30,16 26,22 18,20', GOLD]
 ]
};

export const ICON_KEYS = Object.keys(SHAPES);
export const SERVICE_ICON_KEYS = ['activities', 'food', 'vehicles', 'stays', 'passport', 'crafts', 'tickets'];
export const ICON_LABELS = {
 activities: 'أنشطة', food: 'طعام', vehicles: 'مركبات', stays: 'إقامة', passport: 'جواز تراثي', crafts: 'حرف', tickets: 'تذاكر',
 search: 'بحث', menu: 'قائمة', close: 'إغلاق', arrow: 'سهم', chevron: 'سهم لأسفل', check: 'صح', phone: 'هاتف', mail: 'بريد', user: 'مستخدم',
 location: 'موقع', clock: 'ساعة', alert: 'تنبيه', play: 'تشغيل', download: 'تنزيل', file: 'ملف', whatsapp: 'واتساب',
 muscat: 'قصر العلم (مسقط)', sohar: 'قلعة (صحار)', khaburah: 'خنجر (الخابورة)', saham: 'شجرة ليمون (صحم)'
};

const SIZES = new Set([24, 32, 48]);

// يعيد وسم SVG للأيقونة بحجم 24 أو 32 أو 48 فقط
export function icon(name, size = 24, { label = '', className = '' } = {}) {
 const shapes = SHAPES[name] || SHAPES.alert;
 const s = SIZES.has(size) ? size : 24;
 const aria = label ? ` role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"` : ' aria-hidden="true"';
 const polys = shapes.map(([points, fill]) => `<polygon points="${points}" fill="${fill}"/>`).join('');
 return `<svg class="icon${className ? ` ${className}` : ''}" width="${s}" height="${s}" viewBox="0 0 48 48" focusable="false"${aria}>${polys}</svg>`;
}

export function hasIcon(name) { return Object.prototype.hasOwnProperty.call(SHAPES, name); }
