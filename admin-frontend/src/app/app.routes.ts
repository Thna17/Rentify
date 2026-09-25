import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

const operations = () => import('./pages/operations.component').then((m) => m.OperationsComponent);
const sections = ['stores', 'users', 'websites', 'templates', 'subscriptions', 'packages',
  'plan-payments', 'products', 'orders', 'payments', 'reviews', 'reports', 'billing'];

export const routes: Routes = [
  { path: '', canActivate: [adminGuard], component: AdminLayoutComponent, children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard', loadComponent: operations, data: { section: 'dashboard' }, title: 'Overview | Rentify Admin' },
    ...sections.map((section) => ({ path: section, loadComponent: operations,
      data: { section }, title: `${section} | Rentify Admin` })),
    { path: 'sellers', redirectTo: 'stores' },
    { path: 'buyers', redirectTo: 'users' },
    { path: 'categories', redirectTo: 'products' },
    { path: 'transactions', redirectTo: 'payments' },
    { path: 'payouts', redirectTo: 'billing' },
    { path: 'complaints', redirectTo: 'reports' },
    { path: 'activity-logs', redirectTo: 'stores' },
    { path: 'notifications', redirectTo: 'dashboard' },
    { path: 'settings', redirectTo: 'dashboard' },
    { path: 'admin', redirectTo: 'dashboard' },
    { path: 'admin/dashboard', redirectTo: 'dashboard' },
    { path: 'login', redirectTo: 'dashboard' },
  ] },
  { path: '**', redirectTo: '' },
];
