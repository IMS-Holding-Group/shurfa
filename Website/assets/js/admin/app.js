// نواة اللوحة: الجلسة، الشريط الجانبي حسب الصلاحيات، التوجيه بعلامة #، وتحميل الوحدات
import { api } from './api.js';
import { el, button, notify, clearNotify, isDirty, setDirty, confirmBar } from './ui.js';

let lastHash = '';

const GROUPS = [
 { title: 'المحتوى', items: [
  ['overview', 'نظرة عامة', 'overview', 'view'],
  ['pages', 'الصفحات', 'content', 'view'],
  ['services', 'الخدمات', 'content', 'view'],
  ['guides', 'دليل المسافر', 'content', 'view'],
  ['faqs', 'الأسئلة الشائعة', 'content', 'view'],
  ['menus', 'القوائم', 'content', 'view'],
  ['passport', 'الجواز التراثي', 'passport', 'view'],
  ['media', 'مكتبة الوسائط', 'media', 'view'],
  ['redirects', 'التحويلات', 'content', 'view'],
  ['trash', 'سلة المحذوفات', 'content', 'view']
 ] },
 { title: 'التفاعل', items: [
  ['messages', 'الردود', 'messages', 'view'],
  ['applications', 'طلبات الشركاء', 'applications', 'view'],
  ['forms', 'النماذج', 'forms', 'view'],
  ['integrations', 'التكاملات والتحليلات', 'integrations', 'view']
 ] },
 { title: 'الإدارة', items: [
  ['settings', 'إعدادات الموقع', 'settings', 'full'],
  ['admins', 'حسابات الإدارة', 'admins', 'full'],
  ['audit', 'سجل التدقيق', 'audit', 'view'],
  ['account', 'حسابي', null, null]
 ] }
];
const LEVELS = { none: 0, view: 1, approve: 2, full: 3 };
const MODULE_FILES = { messages: 'submissions', applications: 'submissions', pages: 'content', services: 'content', guides: 'content' };

export const state = { me: null, counts: { messages: 0, applications: 0 }, registry: null };

export function can(module, level = 'view') {
 if (!module) return true;
 return (LEVELS[state.me?.permissions?.[module] || 'none'] || 0) >= (LEVELS[level] || 0);
}
export function isSuper() { return state.me?.role === 'super_admin'; }

function badge(n) { return n > 0 ? el('span', { class: 'nav-badge', text: String(n), 'aria-label': `${n} جديد` }) : null; }

function renderSidebar(active) {
 const nav = document.getElementById('side-nav');
 const groups = GROUPS.map((g) => {
  const items = g.items.filter(([, , module, level]) => can(module, level)).map(([key, label]) => el('li', {}, el('a', { href: `#/${key}`, class: active === key ? 'is-active' : undefined, 'aria-current': active === key ? 'page' : undefined }, label, key === 'messages' || key === 'applications' ? badge(state.counts[key]) : null)));
  return items.length ? el('div', { class: 'nav-group' }, el('p', { class: 'nav-group-title', text: g.title }), el('ul', {}, ...items)) : null;
 }).filter(Boolean);
 nav.replaceChildren(...groups);
}

async function refreshCounts() {
 try { state.counts = await api.get('/api/admin/submissions/counts'); } catch { state.counts = { messages: 0, applications: 0 }; }
}

export function parseHash() {
 const h = window.location.hash.replace(/^#\/?/, '');
 const [path, qs] = h.split('?');
 const parts = path.split('/').filter(Boolean);
 return { module: parts[0] || 'overview', parts: parts.slice(1), query: new URLSearchParams(qs || '') };
}

export function navigate(hash) { window.location.hash = hash; }

let current = null;
async function route() {
 const r = parseHash();
 if (isDirty()) {
  const target = window.location.hash;
  history.replaceState(null, '', lastHash || '#/overview');
  const bar = document.getElementById('app-messages');
  bar.replaceChildren(confirmBar('لديك تغييرات غير محفوظة. هل تريد المغادرة دون حفظ؟', { confirmLabel: 'مغادرة', onConfirm: () => { setDirty(false); window.location.hash = target; } }));
  return;
 }
 lastHash = window.location.hash;
 setDirty(false);
 clearNotify();
 if (state.me.must_change_password && r.module !== 'account') { navigate('#/account'); return; }
 const allowed = GROUPS.flatMap((g) => g.items).find(([k]) => k === r.module);
 if (!allowed || !can(allowed[2], allowed[3])) { navigate('#/overview'); return; }
 renderSidebar(r.module);
 const main = document.getElementById('module-root');
 main.replaceChildren(el('p', { class: 'muted', text: 'يُحمَّل...' }));
 try {
  const file = MODULE_FILES[r.module] || r.module;
  const mod = await import(`./modules/${file}.js`);
  current = r.module;
  await mod.render(main, { ...r, module: r.module });
  document.getElementById('main-content').focus();
 } catch (e) {
  main.replaceChildren(el('p', { class: 'notice notice-error', text: e.message || 'تعذر فتح الوحدة.' }));
 }
 const sidebar = document.querySelector('.admin-sidebar');
 if (sidebar.classList.contains('is-open')) sidebar.classList.remove('is-open');
}

async function boot() {
 try { state.me = await api.get('/api/admin/me'); } catch { return; }
 document.getElementById('user-name').textContent = state.me.full_name;
 document.getElementById('user-role').textContent = state.me.role_label;
 document.getElementById('logout-btn').addEventListener('click', async () => { setDirty(false); try { await api.post('/api/admin/logout'); } finally { window.location.href = '/admin/login'; } });
 const toggle = document.getElementById('nav-toggle');
 const sidebar = document.querySelector('.admin-sidebar');
 toggle.addEventListener('click', () => { const open = sidebar.classList.toggle('is-open'); toggle.setAttribute('aria-expanded', open ? 'true' : 'false'); });
 await refreshCounts();
 window.addEventListener('hashchange', route);
 if (!window.location.hash) window.location.hash = '#/overview';
 await route();
 setInterval(async () => { await refreshCounts(); renderSidebar(current); }, 60000);
}

// تحديث عدّاد الجديد بعد تغيير حالة الردود
export async function bumpCounts() { await refreshCounts(); renderSidebar(current); }

export { notify, button };
boot();
