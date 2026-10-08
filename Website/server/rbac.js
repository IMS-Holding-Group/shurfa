// مصفوفة الصلاحيات: دور ← وحدة ← مستوى، مأخوذة من جدول الصلاحيات المعتمد
import { HttpError } from './router.js';

export const ROLES = ['super_admin', 'customer_service', 'marketing', 'finance', 'operations'];
export const MODULES = ['overview', 'content', 'media', 'passport', 'messages', 'applications', 'forms', 'integrations', 'settings', 'admins', 'audit'];

export const MATRIX = {
 super_admin: { overview: 'full', content: 'full', media: 'full', passport: 'full', messages: 'full', applications: 'full', forms: 'full', integrations: 'full', settings: 'full', admins: 'full', audit: 'full' },
 customer_service: { overview: 'view', content: 'none', media: 'none', passport: 'none', messages: 'full', applications: 'full', forms: 'view', integrations: 'none', settings: 'none', admins: 'none', audit: 'none' },
 marketing: { overview: 'view', content: 'full', media: 'full', passport: 'view', messages: 'view', applications: 'none', forms: 'full', integrations: 'full', settings: 'none', admins: 'none', audit: 'none' },
 finance: { overview: 'view', content: 'none', media: 'none', passport: 'view', messages: 'none', applications: 'none', forms: 'none', integrations: 'none', settings: 'none', admins: 'none', audit: 'none' },
 operations: { overview: 'view', content: 'view', media: 'view', passport: 'view', messages: 'view', applications: 'approve', forms: 'none', integrations: 'view', settings: 'none', admins: 'none', audit: 'none' }
};

const LEVEL_RANK = { none: 0, view: 1, approve: 2, full: 3 };

export function levelOf(role, module) {
 return MATRIX[role]?.[module] || 'none';
}

// الإجراءات: view, create, update, publish, delete, export, approve
export function can(role, module, action = 'view') {
 const level = levelOf(role, module);
 if (level === 'full') return true;
 if (level === 'approve') return action === 'view' || action === 'approve';
 if (level === 'view') return action === 'view';
 return false;
}

export function hasLevel(role, module, required) {
 return LEVEL_RANK[levelOf(role, module)] >= LEVEL_RANK[required];
}

// وسيط يرفض الطلب إن لم يملك الدور المستوى المطلوب على الوحدة
export function requirePermission(module, level = 'view') {
 return async (ctx, next) => {
  const role = ctx.profile?.role;
  if (!role || !hasLevel(role, module, level)) throw new HttpError(403, 'ليست لديك صلاحية لهذا الإجراء.');
  await next();
 };
}

export function requireSuperAdmin() {
 return async (ctx, next) => {
  if (ctx.profile?.role !== 'super_admin') throw new HttpError(403, 'هذا الإجراء للمسؤول الأول فقط.');
  await next();
 };
}

// يعيد الصلاحيات كاملة لدور معيّن لتستخدمها اللوحة في إخفاء العناصر
export function permissionsFor(role) {
 return { ...(MATRIX[role] || {}) };
}

export const ROLE_LABELS = {
 super_admin: 'المسؤول الأول',
 customer_service: 'خدمة العملاء',
 marketing: 'التسويق',
 finance: 'المالية',
 operations: 'العمليات'
};
