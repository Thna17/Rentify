import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';

import { authInterceptor } from './core/auth/auth.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless. The storefront branch shipped zone.js, but the cart, wishlist
    // and auth state are all signal-based and Angular 21 no longer needs the
    // zone — keeping it would mean paying for zone patching we never use.
    provideZonelessChangeDetection(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      // Storefront pages are long; land at the top on navigation and restore
      // the previous position on back/forward.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
      // Cross-fades the outgoing/incoming page on every route change via the
      // browser's View Transitions API, instead of the new page just
      // snapping in. The actual look (fade + slight rise, timing, reduced-
      // motion fallback) is defined once in styles.css under
      // ::view-transition-old/new(root) rather than per navigation here.
      withViewTransitions({ skipInitialTransition: true }),
    ),
  ],
};
