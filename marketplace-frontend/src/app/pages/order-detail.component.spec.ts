import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrderDetailComponent } from './order-detail.component';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';
import { AuthService } from '../core/auth/auth.service';
import { CartService } from '../core/cart/cart.service';
import { WishlistService } from '../core/wishlist/wishlist.service';

describe('OrderDetailComponent (P4-BUY-004 Order History & Detail)', () => {
  let fixture: ComponentFixture<OrderDetailComponent>;
  let component: OrderDetailComponent;

  const mockOrder = {
    id: 'ord-uuid-123',
    orderNumber: 'ORD-2026-8888',
    storeId: 'store-1',
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    subtotal: '90.00',
    deliveryFee: '3.50',
    totalAmount: '93.50',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (within 7-day window)
    customerInfo: { name: 'Dara Sok', phone: '012345678' },
    shippingInfo: { address: 'House 12, Street 240, Phnom Penh' },
    items: [
      { productId: 'prod-silk-1', name: 'Handwoven Silk Ikat', quantity: 2, total: '90.00' },
    ],
    payment: {
      status: 'paid',
      amountDue: '93.50',
      collectedAmount: '93.50',
      refundedAmount: '0.00',
    },
  };

  const mockEvents = [
    {
      id: 'ev-1',
      type: 'delivered',
      amount: null,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      details: {},
    },
    {
      id: 'ev-2',
      type: 'collect_cod',
      amount: '93.50',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
      details: {},
    },
  ];

  const mockRentifyService = {
    order: vi.fn().mockReturnValue(of({ order: mockOrder })),
    orderEvents: vi.fn().mockReturnValue(of({ events: mockEvents })),
    report: vi.fn().mockReturnValue(of({ event: { id: 'rep-1', type: 'return_requested' } })),
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
    mockRentifyService.order.mockReset();
    mockRentifyService.orderEvents.mockReset();
    mockRentifyService.report.mockReset();

    mockRentifyService.order.mockReturnValue(of({ order: mockOrder }));
    mockRentifyService.orderEvents.mockReturnValue(of({ events: mockEvents }));
    mockRentifyService.report.mockReturnValue(of({ event: { id: 'rep-1', type: 'return_requested' } }));

    await TestBed.configureTestingModule({
      imports: [OrderDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? 'ord-uuid-123' : null),
              },
            },
          },
        },
        { provide: RentifyMarketplaceService, useValue: mockRentifyService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CartService, useValue: mockCartService },
        { provide: WishlistService, useValue: mockWishlistService },
        TranslateService,
        SeoService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OrderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await component.loadPromise;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockRentifyService.order.mockReturnValue(of({ order: mockOrder }));
    mockRentifyService.orderEvents.mockReturnValue(of({ events: mockEvents }));
    component.forbidden.set(false);
    component.error.set('');
    component.order.set(mockOrder);
    component.events.set(mockEvents);
  });

  it('should load authoritative order details and display COD payment facts', () => {
    expect(mockRentifyService.order).toHaveBeenCalledWith('ord-uuid-123');
    expect(mockRentifyService.orderEvents).toHaveBeenCalledWith('ord-uuid-123');

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('ORD-2026-8888');
    expect(el.textContent).toContain('Handwoven Silk Ikat');
    expect(el.textContent).toContain('93.50');
    expect(el.textContent).toContain('Collected (Paid)');
    expect(el.textContent).toContain('House 12, Street 240, Phnom Penh');
  });

  it('should handle authorization failure (404/403) and render forbidden state', async () => {
    mockRentifyService.order.mockReturnValue(
      throwError(() => ({
        status: 404,
        error: { message: 'Order not found' },
      })),
    );

    await component.loadOrder();
    fixture.detectChanges();

    expect(component.forbidden()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Order Not Accessible');
  });

  it('should build event-derived timeline without inventing transitions', () => {
    const timeline = component.timelineEntries();
    expect(timeline.length).toBe(3); // Order Placed + Parcel Delivered + COD Payment Collected
    expect(timeline[0].title).toBe('Order Placed');
    expect(timeline[1].title).toBe('Parcel Delivered');
    expect(timeline[2].title).toBe('COD Payment Collected');
    expect(timeline[2].amount).toBe('93.50');
  });

  it('should enforce 7-day return eligibility policy window (DEC-008)', () => {
    // 2 days ago -> eligible
    expect(component.returnEligible()).toBe(true);

    // 10 days ago -> expired
    const expiredDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    component.order.set({
      ...mockOrder,
      createdAt: expiredDate,
    });
    component.events.set([
      {
        id: 'ev-del',
        type: 'delivered',
        amount: null,
        createdAt: expiredDate,
        details: {},
      },
    ]);

    expect(component.returnEligible()).toBe(false);
  });

  it('should submit return request with safe reason, evidence, and idempotency key', async () => {
    component.toggleReportForm('return_requested');
    expect(component.showReportForm()).toBe(true);

    component.reportForm.patchValue({
      reasonSelect: 'Damaged on arrival',
      notes: 'The silk fabric arrived with a noticeable tear along the edge.',
      evidenceUrl: 'https://images.rentifymarket.com/evidence/tear.jpg',
    });

    await component.submitReport();

    expect(mockRentifyService.report).toHaveBeenCalledTimes(1);
    const args = mockRentifyService.report.mock.calls[0];
    expect(args[0]).toBe('ord-uuid-123');
    expect(args[1]).toBe('return_requested');
    expect(args[2]).toContain('Damaged on arrival');
    expect(args[3]).toMatch(/^rpt-ret-ord-uuid-123-/); // Idempotency key
    expect(args[4]).toEqual(['https://images.rentifymarket.com/evidence/tear.jpg']);

    expect(component.showReportForm()).toBe(false);
  });

  it('should allow support escalation for active claim after SLA window', () => {
    component.events.set([
      {
        id: 'claim-1',
        type: 'return_requested',
        amount: null,
        createdAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(), // 50 hours ago (> 48h)
        details: { reason: 'Defective item' },
      },
    ]);
    fixture.detectChanges();

    expect(component.activeClaimEvent()).toBeTruthy();
    expect(component.escalated()).toBe(false);

    component.escalateToSupport();
    fixture.detectChanges();

    expect(component.escalated()).toBe(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Case escalated to Rentify Support team');
  });

  it('should allow retry following network error', async () => {
    mockRentifyService.order.mockReturnValue(
      throwError(() => ({
        status: 504,
        message: 'Gateway Timeout',
      })),
    );

    await component.loadOrder();
    fixture.detectChanges();

    expect(component.error()).toContain('Gateway Timeout');

    // Restore success and retry
    mockRentifyService.order.mockReturnValue(of({ order: mockOrder }));
    await component.loadOrder();

    expect(component.error()).toBe('');
    expect(component.order()?.orderNumber).toBe('ORD-2026-8888');
  });
});
