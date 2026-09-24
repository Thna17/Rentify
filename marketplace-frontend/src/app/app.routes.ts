import { Routes } from '@angular/router';
import { buyerGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { sellerGuard } from './core/auth/seller.guard';
import { externalAuthRedirectGuard } from './pages/auth-redirect.component';

/**
 * Everything is lazy-loaded. The storefront branch imported all 19 page
 * components eagerly, which put the whole site in the initial bundle.
 */
export const routes: Routes = [
  // ---------------------------------------------------------------- storefront
  {
    path: '',
    loadComponent: () =>
      import('./pages/home.component').then((m) => m.HomeComponent),
    title: 'Rentify Marketplace',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products.component').then((m) => m.ProductsComponent),
    title: 'Products | Rentify Marketplace',
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./pages/product-detail.component').then(
        (m) => m.ProductDetailComponent,
      ),
  },
  {
    path: 'categories',
    loadComponent: () =>
      import('./pages/categories.component').then((m) => m.CategoriesComponent),
    title: 'Categories | Rentify Marketplace',
  },
  {
    path: 'categories/:slug',
    loadComponent: () =>
      import('./pages/category-detail.component').then(
        (m) => m.CategoryDetailComponent,
      ),
  },
  {
    path: 'stores',
    loadComponent: () =>
      import('./pages/stores.component').then((m) => m.StoresComponent),
    title: 'Stores | Rentify Marketplace',
  },
  {
    path: 'stores/:id',
    loadComponent: () =>
      import('./pages/store-detail.component').then(
        (m) => m.StoreDetailComponent,
      ),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./pages/cart.component').then((m) => m.CartComponent),
    title: 'Your cart | Rentify Marketplace',
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist.component').then((m) => m.WishlistComponent),
    title: 'Your wishlist | Rentify Marketplace',
  },

  // ------------------------------------------------------------------ checkout
  // Guarded: an anonymous visitor is redirected to Rentify Auth with a returnUrl rather
  // than filling in a delivery address they cannot submit.
  {
    path: 'checkout',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/checkout.component').then((m) => m.CheckoutComponent),
    title: 'Checkout | Rentify Marketplace',
  },
  {
    path: 'checkout/pay/:orderNumber',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/payway-payment.component').then(
        (m) => m.PaywayPaymentComponent,
      ),
    title: 'Pay with ABA | Rentify Marketplace',
  },
  { path: 'checkout/shipping', pathMatch: 'full', redirectTo: 'checkout' },
  { path: 'checkout/payment', pathMatch: 'full', redirectTo: 'checkout' },
  { path: 'checkout/review', pathMatch: 'full', redirectTo: 'checkout' },
  {
    path: 'order-success',
    loadComponent: () =>
      import('./pages/order-success.component').then(
        (m) => m.OrderSuccessComponent,
      ),
    title: 'Order confirmed | Rentify Marketplace',
  },

  // ----------------------------------------------------------------- marketing
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about.component').then((m) => m.AboutComponent),
    title: 'About | Rentify Marketplace',
  },
  {
    path: 'become-a-seller',
    loadComponent: () =>
      import('./features/seller/landing/seller-landing').then(
        (m) => m.SellerPage,
      ),
    title: 'Become a seller | Rentify Marketplace',
  },
  {
    path: 'become-a-seller/explore',
    loadComponent: () =>
      import('./features/seller/explore/seller-explore').then(
        (m) => m.SellerExplore,
      ),
    title: 'See Rentify Marketplace in action | Rentify Marketplace',
  },
  {
    path: 'become-a-seller/pricing',
    loadComponent: () =>
      import('./features/seller/pricing/seller-pricing').then(
        (m) => m.SellerPricing,
      ),
    title: 'Seller pricing | Rentify Marketplace',
  },
  {
    path: 'become-a-seller/faq',
    loadComponent: () =>
      import('./features/seller/faq/seller-faq').then((m) => m.SellerFaq),
    title: 'Seller FAQ | Rentify Marketplace',
  },
  { path: 'become-seller', pathMatch: 'full', redirectTo: 'become-a-seller' },

  // ------------------------------------------------------------------- account
  {
    path: 'profile',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/user/account/profile/profile').then((m) => m.Profile),
    title: 'My profile | Rentify Marketplace',
  },
  {
    path: 'orders',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/user/account/orders/orders').then((m) => m.Orders),
    title: 'My orders | Rentify Marketplace',
  },
  {
    path: 'my-orders',
    pathMatch: 'full',
    redirectTo: 'orders',
  },

  // ------------------------------------------------------------------- seller
  {
    path: 'seller/login',
    canActivate: [externalAuthRedirectGuard('login', '/seller/dashboard')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'login', defaultReturn: '/seller/dashboard' },
    title: 'Seller sign in | Rentify Marketplace',
  },
  {
    path: 'seller/onboarding',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/seller/onboarding/seller-onboarding').then(
        (m) => m.SellerOnboardingPage,
      ),
    title: 'Seller onboarding | Rentify Marketplace',
  },
  {
    path: 'seller/dashboard',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./pages/seller-dashboard/seller-dashboard').then(
        (m) => m.SellerDashboardPage,
      ),
    title: 'Seller dashboard | Rentify Marketplace',
  },
  {
    path: 'seller/orders',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./features/seller/orders/seller-orders').then(
        (m) => m.SellerOrders,
      ),
    title: 'Incoming orders | Rentify Marketplace',
  },

  // ---------------------------------------------------------------------- auth
  // Auth is handled by the unified Rentify Auth portal. Direct route visits
  // are forwarded with returnUrl preserved.
  {
    path: 'login',
    canActivate: [externalAuthRedirectGuard('login', '/')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'login', defaultReturn: '/' },
    title: 'Sign in | Rentify Marketplace',
  },
  {
    path: 'register',
    canActivate: [externalAuthRedirectGuard('signup', '/')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'signup', defaultReturn: '/' },
    title: 'Create buyer account | Rentify Marketplace',
  },
  { path: 'signup', pathMatch: 'full', redirectTo: 'register' },
  {
    path: 'forgot-password',
    canActivate: [externalAuthRedirectGuard('forgot-password', '/')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'forgot-password', defaultReturn: '/' },
    title: 'Forgot password | Rentify Marketplace',
  },
  { path: 'verify', pathMatch: 'full', redirectTo: 'forgot-password' },
  { path: 'verify-code', pathMatch: 'full', redirectTo: 'forgot-password' },
  {
    path: 'verify-email',
    canActivate: [externalAuthRedirectGuard('login', '/')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'login', defaultReturn: '/' },
    title: 'Verify email | Rentify Marketplace',
  },
  {
    path: 'reset-password',
    canActivate: [externalAuthRedirectGuard('forgot-password', '/')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'forgot-password', defaultReturn: '/' },
    title: 'Reset password | Rentify Marketplace',
  },
  { path: 'account/change-password', pathMatch: 'full', redirectTo: 'forgot-password' },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    title: 'Administration | Rentify Marketplace',
  },
  {
    path: 'admin/login',
    canActivate: [externalAuthRedirectGuard('login', '/admin')],
    loadComponent: () =>
      import('./pages/auth-redirect.component').then((m) => m.AuthRedirectComponent),
    data: { mode: 'login', defaultReturn: '/admin' },
    title: 'Admin sign in | Rentify Marketplace',
  },

  // ------------------------------------------------------------- support pages
  // One component driven by route data — these differ only in copy.
  {
    path: 'help',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'help' },
    title: 'Help centre | Rentify Marketplace',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'contact' },
    title: 'Contact us | Rentify Marketplace',
  },
  {
    path: 'shipping',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'shipping' },
    title: 'Shipping information | Rentify Marketplace',
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'terms' },
    title: 'Terms of service | Rentify Marketplace',
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'privacy' },
    title: 'Privacy policy | Rentify Marketplace',
  },

  // A real 404 rather than a silent redirect, so a broken link stays visible
  // instead of quietly dumping the visitor on the homepage.
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found | Rentify Marketplace',
  },
];
