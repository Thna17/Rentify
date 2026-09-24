import { Routes } from '@angular/router';
import { adminGuard } from './core/auth/admin.guard';
import { AdminLayoutComponent } from './layout/admin-layout.component';

export const routes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    component: AdminLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Platform Dashboard | Rentify Admin',
      },
      {
        path: 'websites',
        loadComponent: () => import('./pages/websites.component').then((m) => m.WebsitesComponent),
        title: 'Storefront Websites | Rentify Admin',
      },
      {
        path: 'templates',
        loadComponent: () => import('./pages/templates.component').then((m) => m.TemplatesComponent),
        title: 'Storefront Templates | Rentify Admin',
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./pages/subscriptions.component').then((m) => m.SubscriptionsComponent),
        title: 'Subscriptions & Packages | Rentify Admin',
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users.component').then((m) => m.UsersComponent),
        title: 'Platform Users | Rentify Admin',
      },
      {
        path: 'buyers',
        loadComponent: () => import('./pages/buyers.component').then((m) => m.BuyersComponent),
        title: 'Marketplace Buyers | Rentify Admin',
      },
      {
        path: 'sellers',
        loadComponent: () => import('./pages/sellers.component').then((m) => m.SellersComponent),
        title: 'Marketplace Sellers | Rentify Admin',
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/products.component').then((m) => m.ProductsComponent),
        title: 'Marketplace Products | Rentify Admin',
      },
      {
        path: 'categories',
        loadComponent: () => import('./pages/categories.component').then((m) => m.CategoriesComponent),
        title: 'Categories | Rentify Admin',
      },
      {
        path: 'orders',
        loadComponent: () => import('./pages/orders.component').then((m) => m.OrdersComponent),
        title: 'Marketplace Orders | Rentify Admin',
      },
      {
        path: 'reviews',
        loadComponent: () => import('./pages/reviews.component').then((m) => m.ReviewsComponent),
        title: 'Reviews | Rentify Admin',
      },
      {
        path: 'payments',
        loadComponent: () => import('./pages/payments.component').then((m) => m.PaymentsComponent),
        title: 'Payments | Rentify Admin',
      },
      {
        path: 'transactions',
        loadComponent: () => import('./pages/transactions.component').then((m) => m.TransactionsComponent),
        title: 'Transactions | Rentify Admin',
      },
      {
        path: 'payouts',
        loadComponent: () => import('./pages/payouts.component').then((m) => m.PayoutsComponent),
        title: 'Seller Payouts | Rentify Admin',
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports.component').then((m) => m.ReportsComponent),
        title: 'Reports | Rentify Admin',
      },
      {
        path: 'complaints',
        loadComponent: () => import('./pages/complaints.component').then((m) => m.ComplaintsComponent),
        title: 'Disputes & Complaints | Rentify Admin',
      },
      {
        path: 'activity-logs',
        loadComponent: () => import('./pages/activity-logs.component').then((m) => m.ActivityLogsComponent),
        title: 'Activity Logs | Rentify Admin',
      },
      {
        path: 'notifications',
        loadComponent: () => import('./pages/notifications.component').then((m) => m.NotificationsComponent),
        title: 'Notifications | Rentify Admin',
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings.component').then((m) => m.SettingsComponent),
        title: 'Settings | Rentify Admin',
      },
      // Clean backward compatibility redirects for /admin/* paths and legacy login bookmarks
      { path: 'login', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'admin/login', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'admin', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'admin/dashboard', redirectTo: 'dashboard' },
      { path: 'admin/websites', redirectTo: 'websites' },
      { path: 'admin/templates', redirectTo: 'templates' },
      { path: 'admin/subscriptions', redirectTo: 'subscriptions' },
      { path: 'admin/users', redirectTo: 'users' },
      { path: 'admin/buyers', redirectTo: 'buyers' },
      { path: 'admin/sellers', redirectTo: 'sellers' },
      { path: 'admin/products', redirectTo: 'products' },
      { path: 'admin/categories', redirectTo: 'categories' },
      { path: 'admin/orders', redirectTo: 'orders' },
      { path: 'admin/reviews', redirectTo: 'reviews' },
      { path: 'admin/payments', redirectTo: 'payments' },
      { path: 'admin/transactions', redirectTo: 'transactions' },
      { path: 'admin/payouts', redirectTo: 'payouts' },
      { path: 'admin/reports', redirectTo: 'reports' },
      { path: 'admin/complaints', redirectTo: 'complaints' },
      { path: 'admin/activity-logs', redirectTo: 'activity-logs' },
      { path: 'admin/notifications', redirectTo: 'notifications' },
      { path: 'admin/settings', redirectTo: 'settings' },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
