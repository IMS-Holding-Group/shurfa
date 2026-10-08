// تسجيل كل واجهات الإدارة تحت /api/admin
import { registerAuthApi } from './auth.js';
import { registerContentApi } from './content.js';
import { registerFaqsApi } from './faqs.js';
import { registerMenusApi } from './menus.js';
import { registerRedirectsApi } from './redirects.js';
import { registerTrashApi } from './trash.js';
import { registerMediaApi } from './media.js';
import { registerFormsApi } from './forms.js';
import { registerSubmissionsApi } from './submissions.js';
import { registerIntegrationsApi } from './integrations.js';
import { registerSettingsApi } from './settings.js';
import { registerAdminsApi } from './admins.js';
import { registerAuditApi } from './audit.js';
import { registerOverviewApi } from './overview.js';
import { registerPassportApi } from './passport.js';
import { registerPreviewRoutes } from './preview.js';

export function registerAdminApi(router) {
 registerAuthApi(router);
 registerOverviewApi(router);
 registerContentApi(router);
 registerFaqsApi(router);
 registerMenusApi(router);
 registerRedirectsApi(router);
 registerTrashApi(router);
 registerMediaApi(router);
 registerFormsApi(router);
 registerSubmissionsApi(router);
 registerIntegrationsApi(router);
 registerSettingsApi(router);
 registerAdminsApi(router);
 registerAuditApi(router);
 registerPassportApi(router);
 registerPreviewRoutes(router);
}
