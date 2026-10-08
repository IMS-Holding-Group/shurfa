// سجل الكتل: كل نوع كتلة يصدّر { type, label_ar, description_ar, icon, fields, defaults, render, load? }
// إضافة نوع كتلة جديد = ملف واحد يُضاف إلى إحدى المجموعات هنا، دون أي تعديل في اللوحة
import * as basic from './basic.js';
import * as media from './media.js';
import * as lists from './lists.js';
import * as interactive from './interactive.js';

export const BG_OPTIONS = [
 { value: 'cream', label_ar: 'الكريمي' },
 { value: 'white', label_ar: 'الأبيض' },
 { value: 'ink', label_ar: 'الأخضر الداكن' },
 { value: 'purple_soft', label_ar: 'البنفسجي الفاتح' },
 { value: 'gold_soft', label_ar: 'الذهبي الفاتح' }
];

export const BG_KEYS = BG_OPTIONS.map((b) => b.value);

const ALL = [...basic.blocks, ...media.blocks, ...lists.blocks, ...interactive.blocks];

export const BLOCKS = Object.fromEntries(ALL.map((b) => [b.type, b]));
export const BLOCK_TYPES = ALL.map((b) => b.type);

export function getBlock(type) { return BLOCKS[type] || null; }

// نسخة السجل التي تُرسل للوحة: الحقول والافتراضيات دون دوال الرسم
export function registryForClient() {
 return {
 backgrounds: BG_OPTIONS,
 blocks: ALL.map(({ type, label_ar, description_ar, icon, fields, defaults, summary }) => ({ type, label_ar, description_ar, icon, fields, defaults, summary_field: summary || 'title' }))
 };
}
