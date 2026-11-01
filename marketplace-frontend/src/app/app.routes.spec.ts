import { routes } from './app.routes';

describe('DEC-029 checkout routes', () => {
  it('loads KHQR payment component on checkout/pay/:orderId and redirects legacy ABA route', () => {
    const khqrPaymentRoute = routes.find(
      (route) => route.path === 'checkout/pay/:orderId',
    );

    expect(khqrPaymentRoute?.loadComponent).toBeDefined();

    const legacyAbaRoute = routes.find(
      (route) => route.path === 'checkout/aba/:orderId',
    );

    expect(legacyAbaRoute?.redirectTo).toBe('checkout/pay/:orderId');
  });
});
