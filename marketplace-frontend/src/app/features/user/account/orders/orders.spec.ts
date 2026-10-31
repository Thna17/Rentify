import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Orders } from './orders';
import { RentifyMarketplaceService } from '../../../../core/rentify/rentify-marketplace.service';
import { CatalogService } from '../../../../core/catalog/catalog.service';
import { TranslateService } from '../../../../core/i18n/translate.service';
import { SeoService } from '../../../../core/seo/seo.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { CartService } from '../../../../core/cart/cart.service';
import { WishlistService } from '../../../../core/wishlist/wishlist.service';

describe('Orders Component (P4-BUY-004 Order list and filters)', () => {
  let fixture: ComponentFixture<Orders>;
  let component: Orders;

  const mockOrdersList = [
    {
      id: 'ord-1',
      orderNumber: 'ORD-2026-0001',
      storeId: 'store-1',
      status: 'pending',
      deliveryStatus: 'pending',
      subtotal: '50.00',
      deliveryFee: '2.50',
      totalAmount: '52.50',
      createdAt: '2026-10-20T10:00:00.000Z',
      customerInfo: { name: 'Dara Sok', phone: '012345678' },
      shippingInfo: { address: 'Street 240, Phnom Penh' },
      items: [{ productId: 'p1', name: 'Silk Scarf', quantity: 1, total: '50.00' }],
      payment: { status: 'pending', amountDue: '52.50', collectedAmount: '0.00', refundedAmount: '0.00' },
    },
    {
      id: 'ord-2',
      orderNumber: 'ORD-2026-0002',
      storeId: 'store-2',
      status: 'fulfilled',
      deliveryStatus: 'delivered',
      subtotal: '40.00',
      deliveryFee: '0.00',
      totalAmount: '40.00',
      createdAt: '2026-10-22T14:00:00.000Z',
      customerInfo: { name: 'Dara Sok', phone: '012345678' },
      shippingInfo: { address: 'Street 240, Phnom Penh' },
      items: [{ productId: 'p2', name: 'Ceramic Mug', quantity: 2, total: '40.00' }],
      payment: { status: 'paid', amountDue: '40.00', collectedAmount: '40.00', refundedAmount: '0.00' },
    },
    {
      id: 'ord-3',
      orderNumber: 'ORD-2026-0003',
      storeId: 'store-1',
      status: 'cancelled',
      deliveryStatus: 'failed',
      subtotal: '30.00',
      deliveryFee: '2.00',
      totalAmount: '32.00',
      createdAt: '2026-10-18T09:00:00.000Z',
      customerInfo: { name: 'Dara Sok', phone: '012345678' },
      shippingInfo: { address: 'Street 240, Phnom Penh' },
      items: [{ productId: 'p3', name: 'Woven Basket', quantity: 1, total: '30.00' }],
      payment: { status: 'refunded', amountDue: '32.00', collectedAmount: '32.00', refundedAmount: '32.00' },
    },
  ];

  const mockRentifyService = {
    myStore: vi.fn().mockReturnValue(of({ store: null })),
    orders: vi.fn().mockReturnValue(of({ orders: mockOrdersList })),
    report: vi.fn().mockReturnValue(of({ event: { id: 'rep-c', type: 'complaint' } })),
  };

  const mockCatalogService = {
    productById: (id: string) => ({ id, name: id === 'p1' ? 'Silk Scarf' : id === 'p2' ? 'Ceramic Mug' : 'Woven Basket', images: [] }),
    store: () => ({ id: 's1', name: 'Angkor Heritage' }),
  };

  const mockAuthService = {
    user: signal({ name: 'Dara Sok' }),
    isAuthenticated: signal(true),
    getLoginUrl: vi.fn(),
    getRegisterUrl: vi.fn(),
    logout: vi.fn(),
    loadCurrentUser: vi.fn().mockReturnValue(of(null)),
  };

  const mockCartService = {
    count: signal(0),
  };

  const mockWishlistService = {
    count: signal(0),
    isWishlisted: () => false,
  };

  beforeEach(async () => {
    mockRentifyService.orders.mockReset();
    mockRentifyService.report.mockReset();

    mockRentifyService.orders.mockReturnValue(of({ orders: mockOrdersList }));
    mockRentifyService.report.mockReturnValue(of({ event: { id: 'rep-c', type: 'complaint' } }));

    await TestBed.configureTestingModule({
      imports: [Orders],
      providers: [
        provideRouter([]),
        { provide: RentifyMarketplaceService, useValue: mockRentifyService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CartService, useValue: mockCartService },
        { provide: WishlistService, useValue: mockWishlistService },
        TranslateService,
        SeoService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Orders);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await component.loadPromise;
    fixture.detectChanges();
  });

  it('should load buyer orders and display correct initial list', () => {
    expect(mockRentifyService.orders).toHaveBeenCalled();
    expect(component.orders().length).toBe(3);
    expect(component.filteredOrders().length).toBe(3);

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ORD-2026-0001');
    expect(el.textContent).toContain('ORD-2026-0002');
    expect(el.textContent).toContain('ORD-2026-0003');
  });

  it('should filter orders by tabs: pending, delivered, completed, and issues', () => {
    // 1. Pending tab
    component.setTab('pending');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].orderNumber).toBe('ORD-2026-0001');

    // 2. Delivered tab
    component.setTab('delivered');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].orderNumber).toBe('ORD-2026-0002');

    // 3. Completed tab
    component.setTab('completed');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].orderNumber).toBe('ORD-2026-0002');

    // 4. Issues tab (failed / cancelled / refunded)
    component.setTab('issues');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].orderNumber).toBe('ORD-2026-0003');
  });

  it('should filter orders by search query', () => {
    component.searchQuery.set('Mug');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].orderNumber).toBe('ORD-2026-0002');

    component.searchQuery.set('0001');
    expect(component.filteredOrders().length).toBe(1);
    expect(component.filteredOrders()[0].orderNumber).toBe('ORD-2026-0001');

    component.searchQuery.set('nonexistent');
    expect(component.filteredOrders().length).toBe(0);
  });

  it('should only show cancel button for PENDING orders', () => {
    const el = fixture.nativeElement as HTMLElement;
    const articles = el.querySelectorAll('article.order');
    expect(articles.length).toBe(3);

    // Article 0 is PENDING -> has cancel button
    expect(articles[0].textContent).toContain('Cancel Order');

    // Article 1 is DELIVERED/FULFILLED -> no cancel button
    expect(articles[1].textContent).not.toContain('Cancel Order');

    // Article 2 is CANCELLED -> no cancel button
    expect(articles[2].textContent).not.toContain('Cancel Order');
  });

  it('should cancel pending order when cancel action is clicked', async () => {
    const pendingOrder = component.orders()[0];
    await component.cancel(pendingOrder);

    expect(mockRentifyService.report).toHaveBeenCalledWith(
      'ord-1',
      'complaint',
      'Customer requested cancellation',
      expect.stringMatching(/^rpt-cnl-ord-1-/),
    );
  });
});
