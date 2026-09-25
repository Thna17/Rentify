import { TestBed } from '@angular/core/testing';
import { AdminService } from './admin-data.service';

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AdminService],
    });
    service = TestBed.inject(AdminService);
  });

  it('initializes with seed data for marketplace and platform operations', () => {
    expect(service.buyers().length).toBeGreaterThan(0);
    expect(service.sellers().length).toBeGreaterThan(0);
    expect(service.products().length).toBeGreaterThan(0);
    expect(service.websites().length).toBeGreaterThan(0);
    expect(service.templates().length).toBeGreaterThan(0);
    expect(service.subscriptions().length).toBeGreaterThan(0);
    expect(service.users().length).toBeGreaterThan(0);
  });

  it('approves and verifies a seller', () => {
    const pendingSeller = service.sellers().find((s) => s.status === 'pending');
    expect(pendingSeller).toBeDefined();

    service.approveSeller(pendingSeller!.id);
    const updated = service.sellers().find((s) => s.id === pendingSeller!.id);
    expect(updated?.status).toBe('active');
    expect(updated?.verification).toBe('verified');
  });

  it('updates product status and updates product details', () => {
    const product = service.products()[0];
    service.setProductStatus(product.id, 'hidden');
    expect(service.products().find((p) => p.id === product.id)?.status).toBe('hidden');

    service.updateProduct(product.id, { price: 99.99, stock: 15 });
    const updated = service.products().find((p) => p.id === product.id);
    expect(updated?.price).toBe(99.99);
    expect(updated?.stock).toBe(15);
  });

  it('manages categories (add and toggle)', () => {
    const initialCount = service.categories().length;
    service.addCategory('Handicrafts');
    expect(service.categories().length).toBe(initialCount + 1);

    const added = service.categories().find((c) => c.name === 'Handicrafts');
    expect(added?.status).toBe('active');

    service.toggleCategory(added!.id);
    expect(service.categories().find((c) => c.id === added!.id)?.status).toBe('hidden');
  });

  it('updates order status', () => {
    const order = service.orders()[0];
    service.setOrderStatus(order.id, 'cancelled');
    expect(service.orders().find((o) => o.id === order.id)?.status).toBe('cancelled');
  });

  it('manages website status and quotas', () => {
    const website = service.websites()[0];
    service.setWebsiteStatus(website.id, 'suspended');
    expect(service.websites().find((w) => w.id === website.id)?.status).toBe('suspended');

    service.updateWebsiteLimits(website.id, { products: 100, storage: 2048 });
    const updated = service.websites().find((w) => w.id === website.id);
    expect(updated?.limits.products).toBe(100);
    expect(updated?.limits.storage).toBe(2048);
  });

  it('manages template visibility and creation', () => {
    const template = service.templates()[0];
    const initialStatus = template.status;
    service.toggleTemplateStatus(template.id);
    expect(service.templates().find((t) => t.id === template.id)?.status).not.toBe(initialStatus);

    const beforeCount = service.templates().length;
    service.addTemplate({
      name: 'Custom Artisan Theme',
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4700',
      description: 'Handmade craft showcase',
      features: ['Artisan Story', 'KHQR Checkout'],
      colorPalette: { primary: '#111', secondary: '#222', background: '#fff' },
      status: 'active',
    });
    expect(service.templates().length).toBe(beforeCount + 1);
  });

  it('manages subscriptions plan and status', () => {
    const sub = service.subscriptions()[0];
    service.updateSubscriptionPlan(sub.id, 'Enterprise', 99);
    let updated = service.subscriptions().find((s) => s.id === sub.id);
    expect(updated?.plan).toBe('Enterprise');
    expect(updated?.price).toBe(99);

    service.setSubscriptionStatus(sub.id, 'cancelled');
    updated = service.subscriptions().find((s) => s.id === sub.id);
    expect(updated?.status).toBe('cancelled');
  });

  it('manages platform user status and role', () => {
    const user = service.users().find((u) => u.role === 'user');
    expect(user).toBeDefined();

    service.setUserRole(user!.id, 'admin');
    expect(service.users().find((u) => u.id === user!.id)?.role).toBe('admin');

    service.setUserStatus(user!.id, 'suspended');
    expect(service.users().find((u) => u.id === user!.id)?.status).toBe('suspended');
  });

  it('manages finance, reports, and complaints workflows', () => {
    // Payment refund
    const payment = service.payments()[0];
    service.refundPayment(payment.id);
    expect(service.payments().find((p) => p.id === payment.id)?.status).toBe('refunded');

    // Payout completion
    const pendingPayout = service.payouts().find((p) => p.status === 'pending');
    expect(pendingPayout).toBeDefined();
    service.completePayout(pendingPayout!.id);
    expect(service.payouts().find((p) => p.id === pendingPayout!.id)?.status).toBe('completed');

    // Report workflow
    const report = service.reports()[0];
    service.setReportStatus(report.id, 'resolved');
    expect(service.reports().find((r) => r.id === report.id)?.status).toBe('resolved');
    service.addReportNote(report.id, 'Action verified by administrator.');
    expect(service.reports().find((r) => r.id === report.id)?.notes.length).toBeGreaterThan(0);

    // Complaint workflow
    const complaint = service.complaints()[0];
    service.setComplaintStatus(complaint.id, 'resolved');
    expect(service.complaints().find((c) => c.id === complaint.id)?.status).toBe('resolved');

    // System notices
    const beforeCount = service.notices().length;
    service.sendNotice({ title: 'Platform Update', body: 'System healthy', audience: 'All' });
    expect(service.notices().length).toBe(beforeCount + 1);

    // Computed series & metrics
    expect(service.revenue()).toBeGreaterThan(0);
    expect(service.revenueSeries().length).toBe(6);
    expect(service.ordersSeries().length).toBe(6);
  });
});
