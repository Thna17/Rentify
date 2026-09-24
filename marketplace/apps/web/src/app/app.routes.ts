import { Routes } from '@angular/router';
import { buyerGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard';
import { sellerGuard } from './core/auth/seller.guard';

/**
 * Everything is lazy-loaded. The storefront branch imported all 19 page
 * components eagerly, which put the whole site in the initial bundle.
 */
export const routes: Routes = [
  {
    path: 'rentify-preview',
    loadComponent: () => import('./pages/rentify-preview.component').then((m) => m.RentifyPreviewComponent),
    title: 'Rentify marketplace pilot',
  },
  // ---------------------------------------------------------------- storefront
  {
    path: '',
    loadComponent: () =>
      import('./pages/home.component').then((m) => m.HomeComponent),
    title: 'KhmerCraft — Cambodia’s local-first marketplace',
  },
  {
    path: 'products',
    loadComponent: () =>
      import('./pages/products.component').then((m) => m.ProductsComponent),
    title: 'Products | KhmerCraft',
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
    title: 'Categories | KhmerCraft',
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
    title: 'Stores | KhmerCraft',
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
    title: 'Your cart | KhmerCraft',
  },
  {
    path: 'wishlist',
    loadComponent: () =>
      import('./pages/wishlist.component').then((m) => m.WishlistComponent),
    title: 'Your wishlist | KhmerCraft',
  },

  // ------------------------------------------------------------------ checkout
  // Guarded: an anonymous visitor is sent to /login with a returnUrl rather
  // than filling in a delivery address they cannot submit.
  // One real checkout page replaces the four-step mock chain: the server
  // prices the order, so there is no intermediate state worth three extra
  // navigations. The old step URLs still resolve so no link breaks.
  {
    path: 'checkout',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/checkout.component').then((m) => m.CheckoutComponent),
    title: 'Checkout | KhmerCraft',
  },
  {
    // Where an ABA_PAYWAY order goes to actually be paid: the KHQR from ABA,
    // plus polling that settles the order once ABA confirms the transaction.
    path: 'checkout/pay/:orderNumber',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./pages/payway-payment.component').then(
        (m) => m.PaywayPaymentComponent,
      ),
    title: 'Pay with ABA | KhmerCraft',
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
    title: 'Order confirmed | KhmerCraft',
  },

  // ----------------------------------------------------------------- marketing
  {
    path: 'about',
    loadComponent: () =>
      import('./pages/about.component').then((m) => m.AboutComponent),
    title: 'About | KhmerCraft',
  },
  {
    // Seller landing, onboarding and dashboard are Seypa47's work from
    // origin/prototype, ported into this tree's structure.
    //
    // Why Sell / Explore / Pricing / FAQ are separate routes rather than
    // anchors on one long page — clicking a nav item takes you to that
    // page, not to a spot further down whatever page you were already on.
    path: 'become-a-seller',
    loadComponent: () =>
      import('./features/seller/landing/seller-landing').then(
        (m) => m.SellerPage,
      ),
    title: 'Become a seller | KhmerCraft',
  },
  {
    path: 'become-a-seller/explore',
    loadComponent: () =>
      import('./features/seller/explore/seller-explore').then(
        (m) => m.SellerExplore,
      ),
    title: 'See KhmerCraft in action | KhmerCraft',
  },
  {
    path: 'become-a-seller/pricing',
    loadComponent: () =>
      import('./features/seller/pricing/seller-pricing').then(
        (m) => m.SellerPricing,
      ),
    title: 'Seller pricing | KhmerCraft',
  },
  {
    path: 'become-a-seller/faq',
    loadComponent: () =>
      import('./features/seller/faq/seller-faq').then((m) => m.SellerFaq),
    title: 'Seller FAQ | KhmerCraft',
  },
  // The spec uses /become-seller; keep both spellings working.
  { path: 'become-seller', pathMatch: 'full', redirectTo: 'become-a-seller' },

  // ------------------------------------------------------------------- account
  {
    path: 'profile',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/user/account/profile/profile').then((m) => m.Profile),
    title: 'My profile | KhmerCraft',
  },
  {
    path: 'orders',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/user/account/orders/orders').then((m) => m.Orders),
    title: 'My orders | KhmerCraft',
  },

  // ------------------------------------------------------------------- seller
  {
    path: 'seller/login',
    loadComponent: () =>
      import('./features/authentication/seller/login/seller-login').then(
        (m) => m.SellerLogin,
      ),
    title: 'Seller sign in | KhmerCraft',
  },
  {
    path: 'seller/onboarding',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import('./features/seller/onboarding/seller-onboarding').then(
        (m) => m.SellerOnboardingPage,
      ),
    title: 'Seller onboarding | KhmerCraft',
  },
  {
    path: 'seller/dashboard',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./pages/seller-dashboard/seller-dashboard').then(
        (m) => m.SellerDashboardPage,
      ),
    title: 'Seller dashboard | KhmerCraft',
  },
  {
    path: 'seller/orders',
    canActivate: [sellerGuard],
    loadComponent: () =>
      import('./features/seller/orders/seller-orders').then(
        (m) => m.SellerOrders,
      ),
    title: 'Incoming orders | KhmerCraft',
  },

  // ---------------------------------------------------------------------- auth
  {
    path: 'login',
    loadComponent: () =>
      import('./features/authentication/buyer/login/login').then(
        (module) => module.Login,
      ),
    title: 'Sign in | KhmerCraft',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/authentication/buyer/register/register').then(
        (module) => module.Register,
      ),
    title: 'Create buyer account | KhmerCraft',
  },
  // The storefront nav links to /signup; route it at the real register page.
  { path: 'signup', pathMatch: 'full', redirectTo: 'register' },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import(
        './features/authentication/buyer/forgot-password/forgot-password'
      ).then(
        (module) => module.ForgotPassword,
      ),
    title: 'Forgot password | KhmerCraft',
  },
  // Retired simulated reset-code screens. Password reset now happens only
  // through the secure token link produced by /forgot-password.
  { path: 'verify', pathMatch: 'full', redirectTo: 'forgot-password' },
  { path: 'verify-code', pathMatch: 'full', redirectTo: 'forgot-password' },
  {
    // Registration's own verification step — separate from the password-reset
    // /verify placeholder above, and actually wired to the API.
    path: 'verify-email',
    loadComponent: () =>
      import('./features/authentication/buyer/verify-email/verify-email').then(
        (m) => m.VerifyEmail,
      ),
    title: 'Verify your email | KhmerCraft',
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/authentication/buyer/reset-password/reset-password').then(
        (module) => module.ResetPassword,
      ),
    title: 'Reset password | KhmerCraft',
  },
  {
    path: 'account/change-password',
    canActivate: [buyerGuard],
    loadComponent: () =>
      import(
        './features/authentication/buyer/change-password/change-password'
      ).then(
        (module) => module.ChangePassword,
      ),
    title: 'Change password | KhmerCraft',
  },
  {
    // Khemara's admin area, lazily loaded as a child route tree behind
    // adminGuard. The guard is ours: the branch this came from had no route
    // protection on it at all.
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    title: 'Administration | KhmerCraft',
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./features/admin/authentication/login/admin-login').then(
        (module) => module.AdminLogin,
      ),
    title: 'Admin sign in | KhmerCraft',
  },

  // ------------------------------------------------------------- support pages
  // One component driven by route data — these differ only in copy.
  {
    path: 'help',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'help' },
    title: 'Help centre | KhmerCraft',
  },
  {
    path: 'contact',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'contact' },
    title: 'Contact us | KhmerCraft',
  },
  {
    path: 'shipping',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'shipping' },
    title: 'Shipping information | KhmerCraft',
  },
  {
    path: 'terms',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'terms' },
    title: 'Terms of service | KhmerCraft',
  },
  {
    path: 'privacy',
    loadComponent: () =>
      import('./pages/info.component').then((m) => m.InfoComponent),
    data: { page: 'privacy' },
    title: 'Privacy policy | KhmerCraft',
  },

  // A real 404 rather than a silent redirect, so a broken link stays visible
  // instead of quietly dumping the visitor on the homepage.
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found.component').then((m) => m.NotFoundComponent),
    title: 'Page not found | KhmerCraft',
  },
];
