import { routes } from './app.routes';

describe('Phase 4 checkout routes', () => {
  it('redirects obsolete provider payment URLs to the COD checkout', () => {
    const legacyPaymentRoute = routes.find(
      (route) => route.path === 'checkout/pay/:orderNumber',
    );

    expect(legacyPaymentRoute?.redirectTo).toBe('checkout');
    expect(legacyPaymentRoute?.loadComponent).toBeUndefined();
  });
});
