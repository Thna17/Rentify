import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

const operations = () => import('./pages/operations.component').then((m) => m.OperationsComponent);
const security = () => import('./pages/security.component').then((m) => m.SecurityComponent);
const sessions = () => import('./pages/sessions.component').then((m) => m.SessionsComponent);
const supportWorkspace = () => import('./pages/support/support-workspace.component').then((m) => m.SupportWorkspaceComponent);
const catalogModeration = () => import('./pages/moderation/catalog-moderation.component').then((m) => m.CatalogModerationComponent);
const makerChecker = () => import('./pages/maker-checker/maker-checker.component').then((m) => m.MakerCheckerComponent);
const analytics = () => import('./pages/analytics/platform-analytics.component').then((m) => m.PlatformAnalyticsComponent);

const sections = ['stores', 'users', 'websites', 'templates', 'subscriptions', 'packages',
  'plan-payments', 'products', 'orders', 'payments', 'reviews', 'billing'];

export const routes: Routes = [
  { path: '', canActivate: [adminGuard], component: AdminLayoutComponent, children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', loadComponent: operations, data: { section: 'dashboard' }, title: 'Overview | Rentify Admin' },
    { path: 'campaigns', loadComponent: () => import('./pages/campaigns/campaigns.component').then(m => m.CampaignsComponent), title: 'Campaigns | Rentify Admin' },
    { path: 'analytics', loadComponent: analytics, title: 'Platform Analytics | Rentify Admin' },
    { path: 'security', loadComponent: security, title: 'Security & MFA | Rentify Admin' },
    { path: 'sessions', loadComponent: sessions, title: 'Active Sessions | Rentify Admin' },

    // Phase 5 Support, Moderation, and Maker-Checker consoles
    { path: 'support/cases', loadComponent: supportWorkspace, title: 'Support Operations | Rentify Admin' },
    { path: 'reports', loadComponent: supportWorkspace, title: 'Support & Buyer Reports | Rentify Admin' },
    { path: 'operations/catalog', loadComponent: catalogModeration, title: 'Catalog Moderation | Rentify Admin' },
    { path: 'moderation', redirectTo: 'operations/catalog' },
    { path: 'operations/maker-checker', loadComponent: makerChecker, title: 'Maker-Checker Approvals | Rentify Admin' },
    { path: 'maker-checker', redirectTo: 'operations/maker-checker' },

    ...sections.map((section) => ({ path: section, loadComponent: operations,
      data: { section }, title: `${section} | Rentify Admin` })),
    { path: 'sellers', redirectTo: 'stores' },
    { path: 'buyers', redirectTo: 'users' },
    { path: 'categories', redirectTo: 'products' },
    { path: 'transactions', redirectTo: 'payments' },
    { path: 'payouts', redirectTo: 'billing' },
    { path: 'complaints', redirectTo: 'support/cases' },
    { path: 'activity-logs', redirectTo: 'stores' },
    { path: 'notifications', redirectTo: 'dashboard' },
    { path: 'settings', redirectTo: 'dashboard' },
    { path: 'admin', redirectTo: 'dashboard' },
    { path: 'admin/dashboard', redirectTo: 'dashboard' },
    { path: 'login', redirectTo: 'dashboard' },
  ] },
  { path: '**', redirectTo: '' },
];
