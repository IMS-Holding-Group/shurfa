// حاسبة الجواز في المتصفح: تستخدم الدوال المشتركة نفسها التي يستخدمها الخادم
import { calculateTiers, formatOmr } from '../shared/passport.js';

const root = document.querySelector('[data-passport-calculator]');
if (root) {
 let tiers = [];
 try { tiers = JSON.parse(root.dataset.tiers || '[]'); } catch { tiers = []; }
 const input = root.querySelector('input[name="spend"]');
 const rows = root.querySelectorAll('.calc-tier');
 let tracked = false;

 const render = () => {
  const spend = Number(String(input.value || '').replace(/[^\d.]/g, ''));
  const safeSpend = Number.isFinite(spend) && spend >= 0 ? Math.min(spend, 1000000) : 0;
  const results = calculateTiers(safeSpend, tiers);
  results.forEach((r, i) => {
   const row = rows[i];
   if (!row) return;
   const saving = row.querySelector('[data-calc-saving]');
   const breakEven = row.querySelector('[data-calc-breakeven]');
   if (saving) {
    if (r.saving_min >= 0) saving.textContent = `توفيرك الصافي من ${formatOmr(r.saving_min)} إلى ${formatOmr(r.saving_max)}`;
    else if (r.saving_max >= 0) saving.textContent = `قد توفر حتى ${formatOmr(r.saving_max)} عند أعلى خصم`;
    else saving.textContent = `لا يغطي هذا الإنفاق سعر الجواز بعد. ينقصك ${formatOmr(Math.abs(r.saving_max))} على الأقل`;
   }
   if (breakEven) breakEven.textContent = Number.isFinite(r.break_even) ? `حد التعادل: ${formatOmr(r.break_even)} من الإنفاق` : '';
  });
  if (!tracked && safeSpend > 0) {
   tracked = true;
   document.dispatchEvent(new CustomEvent('shurfah:track', { detail: { event: 'passport_calc_used' } }));
  }
 };

 if (input) {
  input.setAttribute('inputmode', 'decimal');
  input.addEventListener('input', render);
  render();
 }
}
