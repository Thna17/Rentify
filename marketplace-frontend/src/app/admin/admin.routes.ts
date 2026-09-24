import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout.component';

export const ADMIN_ROUTES: Routes = [{
  path: '', component: AdminLayoutComponent, children: [
    { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    { path: 'dashboard',     loadComponent: () => import('./pages/dashboard.component').then(c => c.DashboardComponent) },
    { path: 'buyers',        loadComponent: () => import('./pages/buyers.component').then(c => c.BuyersComponent) },
    { path: 'sellers',       loadComponent: () => import('./pages/sellers.component').then(c => c.SellersComponent) },
    { path: 'products',      loadComponent: () => import('./pages/products.component').then(c => c.ProductsComponent) },
    { path: 'categories',    loadComponent: () => import('./pages/categories.component').then(c => c.CategoriesComponent) },
    { path: 'orders',        loadComponent: () => import('./pages/orders.component').then(c => c.OrdersComponent) },
    { path: 'reviews',       loadComponent: () => import('./pages/reviews.component').then(c => c.ReviewsComponent) },
    { path: 'payments',      loadComponent: () => import('./pages/payments.component').then(c => c.PaymentsComponent) },
    { path: 'transactions',  loadComponent: () => import('./pages/transactions.component').then(c => c.TransactionsComponent) },
    { path: 'payouts',       loadComponent: () => import('./pages/payouts.component').then(c => c.PayoutsComponent) },
    { path: 'reports',       loadComponent: () => import('./pages/reports.component').then(c => c.ReportsComponent) },
    { path: 'complaints',    loadComponent: () => import('./pages/complaints.component').then(c => c.ComplaintsComponent) },
    { path: 'activity-logs', loadComponent: () => import('./pages/activity-logs.component').then(c => c.ActivityLogsComponent) },
    { path: 'notifications', loadComponent: () => import('./pages/notifications.component').then(c => c.NotificationsComponent) },
    { path: 'settings',      loadComponent: () => import('./pages/settings.component').then(c => c.SettingsComponent) },
  ],
}];