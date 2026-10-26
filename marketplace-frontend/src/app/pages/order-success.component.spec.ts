import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrderSuccessComponent } from './order-success.component';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';
import { AuthService } from '../core/auth/auth.service';
import { CartService } from '../core/cart/cart.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { signal } from '@angular/core';

describe('OrderSuccessComponent (P4-BUY-003 Refresh-safe confirmation)', () => {
  let fixture: ComponentFixture<OrderSuccessComponent>;
  let component: OrderSuccessComponent;

  const mockOrdersResponse = {
    orders: [
      {
        id: 'ord-101',
        orderNumber: 'ORD-2026-9999',
        storeId: 'store-1',
        totalAmount: '45.00',
        subtotal: '40.00',
        deliveryFee: '5.00',
        createdAt: new Date().toISOString(),
        customerInfo: { name: 'Chanthou Seng', phone: '098765432' },
        shippingInfo: { address: 'House 55, Street 19, Daun Penh, Phnom Penh' },
        items: [{ productId: 'p1', name: 'Handmade Silk Scarf', quantity: 1, total: '40.00' }],
      },
    ],
  };

  const mockRentifyService = {
    orders: vi.fn().mockReturnValue(of(mockOrdersResponse)),
  };

  const mockAuthService = {
    user: signal(null),
    isAuthenticated: signal(true),
    getLoginUrl: vi.fn().mockReturnValue('/login'),
    getRegisterUrl: vi.fn().mockReturnValue('/register'),
    logout: vi.fn(),
    loadCurrentUser: vi.fn().mockReturnValue(of(null)),
  };

  const mockCartService = {
    count: signal(0),
    groups: signal([]),
    isEmpty: signal(true),
  };

  beforeEach(async () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    mockRentifyService.orders.mockClear();

    await TestBed.configureTestingModule({
      imports: [OrderSuccessComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => {
                  if (key === 'order') return 'ORD-2026-9999';
                  if (key === 'orders') return 'ORD-2026-9999';
                  return null;
                },
              },
            },
          },
        },
        { provide: RentifyMarketplaceService, useValue: mockRentifyService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CartService, useValue: mockCartService },
        { provide: WishlistService, useValue: { count: signal(0), isWishlisted: () => false, toggle: vi.fn(), isEmpty: () => true } },
        TranslateService,
        SeoService,
      ],
    }).compileComponents();
  });

  afterEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('should load order details from sessionStorage when available', () => {
    const stored = [
      {
        orderNumber: 'ORD-2026-1111',
        storeId: 'store-1',
        sellerName: 'Angkor Heritage Crafts',
        total: '75.00',
        itemCount: 2,
        recipientName: 'Borey Kem',
        recipientPhone: '012111222',
        deliveryAddress: 'Street 63, BKK1, Phnom Penh',
        items: [{ name: 'Silver Box', quantity: 2, price: 37.5 }],
      },
    ];
    sessionStorage.setItem('rentify_placed_orders', JSON.stringify(stored));

    fixture = TestBed.createComponent(OrderSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.orders().length).toBe(1);
    expect(component.primaryOrderNumber()).toBe('ORD-2026-1111');
    expect(component.primaryTotal()).toBe('75.00');
    expect(component.primaryPhone()).toBe('012111222');
  });

  it('should recover order details via live API lookup when reloaded or sessionStorage empty', async () => {
    fixture = TestBed.createComponent(OrderSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mockRentifyService.orders).toHaveBeenCalled();
    expect(component.primaryOrderNumber()).toBe('ORD-2026-9999');
    expect(component.primaryTotal()).toBe('45.00');
    expect(component.primaryPhone()).toBe('098765432');
  });

  it('should display COD status and amount due upon delivery in template', () => {
    const stored = [
      {
        orderNumber: 'ORD-2026-7777',
        storeId: 'store-1',
        sellerName: 'Khmer Ceramic Center',
        total: '55.00',
        itemCount: 1,
        recipientName: 'Sokha Ly',
        recipientPhone: '077889900',
        deliveryAddress: 'Sangkat Toul Kork, Phnom Penh',
        items: [{ name: 'Ceramic Tea Set', quantity: 1, price: 55.0 }],
      },
    ];
    sessionStorage.setItem('rentify_placed_orders', JSON.stringify(stored));

    fixture = TestBed.createComponent(OrderSuccessComponent);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('ORD-2026-7777');
    expect(element.textContent).toContain('55.00');
    expect(element.textContent).toContain('Pending Cash on Delivery');
    expect(element.textContent).toContain('COD');
  });
});
