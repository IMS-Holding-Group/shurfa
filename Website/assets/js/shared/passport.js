// حاسبة الجواز التراثي: دوال نقية تُستخدم في الخادم والمتصفح
// الحساب بالبيسة (أعداد صحيحة) لتجنب أخطاء الفاصلة العشرية، والريال ينقسم إلى 1000 بيسة

export function toBaisa(omr) {
 return Math.round(Number(omr || 0) * 1000);
}

export function toOmr(baisa) {
 return Number(baisa || 0) / 1000;
}

// حد التعادل: الإنفاق الذي يساوي عنده الخصم سعر الجواز
export function breakEvenSpend(price, ratePct) {
 const rate = Number(ratePct || 0);
 if (rate <= 0) return Infinity;
 const priceBaisa = toBaisa(price);
 return toOmr(Math.round(priceBaisa / (rate / 100)));
}

// التوفير الصافي: الخصم المحقق على الإنفاق ناقص سعر الجواز
export function netSaving(spend, ratePct, price) {
 const spendBaisa = toBaisa(spend);
 const priceBaisa = toBaisa(price);
 const discountBaisa = Math.round(spendBaisa * Number(ratePct || 0) / 100);
 return toOmr(discountBaisa - priceBaisa);
}

// يحسب لكل فئة: الصافي عند أقل خصم وأعلى خصم، وحد التعادل عند أقل خصم
export function calculateTiers(spend, tiers) {
 return (tiers || []).map((t) => {
  const price = Number(t.price_omr || 0);
  const min = Number(t.discount_min_pct || 0);
  const max = Number(t.discount_max_pct || 0);
  return {
   code: t.code,
   name_ar: t.name_ar,
   price_omr: price,
   duration_days: Number(t.duration_days || 0),
   discount_min_pct: min,
   discount_max_pct: max,
   saving_min: netSaving(spend, min, price),
   saving_max: netSaving(spend, max, price),
   break_even: breakEvenSpend(price, min)
  };
 });
}

// تنسيق الريال وفق أسلوب الهوية: ريال واحد، ريالان، 3 إلى 10 ريالات، وغير ذلك ريالًا
export function formatOmr(value) {
 const n = Number(value || 0);
 const abs = Math.abs(n);
 const whole = Math.floor(abs);
 const baisa = Math.round((abs - whole) * 1000);
 if (whole === 0 && baisa > 0) return `${(abs).toFixed(3)} ر.ع`;
 let word;
 if (whole === 1) word = 'ريال واحد';
 else if (whole === 2) word = 'ريالان';
 else if (whole >= 3 && whole <= 10) word = `${whole} ريالات`;
 else word = `${whole} ريالًا`;
 if (baisa > 0) return `${word} و${String(baisa).padStart(3, '0')} بيسة`;
 return word;
}
