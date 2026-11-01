import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckoutComponent } from './checkout.component';
import { CartService } from '../core/cart/cart.service';
import { CommerceApiService } from '../core/api/commerce-api.service';
import { AuthService } from '../core/auth/auth.service';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';
import { StoreCartGroup } from '../core/catalog/catalog.models';
import axe from 'axe-core';

describe('CheckoutComponent (P4-BUY-003 COD Checkout)', () => {
  let fixture: ComponentFixture<CheckoutComponent>;
  let component: CheckoutComponent;
  let router: Router;

  const mockGroups: StoreCartGroup[] = [
    {
      cartId: 'cart-1',
      storeId: 'store-1',
      sellerName: 'Phnom Penh Silk Co',
      channel: 'marketplace',
      lines: [
        {
          id: 'item-1',
          product: {
            id: 'prod-silk-1',
            name: 'Handwoven Silk Ikat',
            slug: 'handwoven-silk-ikat',
            price: 45.0,
            image: null,
            images: [],
            categorySlug: 'fashion',
            categoryName: 'Fashion',
            subcategory: 'Scarves',
            subcategorySlug: 'scarves',
            description: 'Silk ikat',
            sellerName: 'Phnom Penh Silk Co',
            storeId: 'store-1',
            rating: 5,
            reviewCount: 1,
            stock: 8,
            status: 'in-stock',
            soldCount: 10,
            createdAt: new Date().toISOString(),
            collections: [],
          },
          quantity: 2,
          unitPrice: 45.0,
          currentPrice: 45.0,
          isPriceStale: false,
          available: true,
          stockLimit: 8,
          lineTotal: 90.0,
        },
      ],
      subtotal: '90.00',
      deliveryFee: '3.50',
      totalAmount: '93.50',
      currency: 'USD',
      deliveryPolicyVersion: 1,
      checkoutReady: true,
      issues: [],
      hasStalePrices: false,
    },
    {
      cartId: 'cart-2',
      storeId: 'store-2',
      sellerName: 'Battambang Pottery',
      channel: 'marketplace',
      lines: [
        {
          id: 'item-2',
          product: {
            id: 'prod-pot-1',
            name: 'Glazed Ceramic Vase',
            slug: 'glazed-ceramic-vase',
            price: 35.0,
            image: null,
            images: [],
            categorySlug: 'home',
            categoryName: 'Home',
            subcategory: 'Pottery',
            subcategorySlug: 'pottery',
            description: 'Handmade vase',
            sellerName: 'Battambang Pottery',
            storeId: 'store-2',
            rating: 4.8,
            reviewCount: 3,
            stock: 2,
            status: 'in-stock',
            soldCount: 5,
            createdAt: new Date().toISOString(),
            collections: [],
          },
          quantity: 1,
          unitPrice: 35.0,
          currentPrice: 35.0,
          isPriceStale: false,
          available: true,
          stockLimit: 2,
          lineTotal: 35.0,
        },
      ],
      subtotal: '35.00',
      deliveryFee: '2.50',
      totalAmount: '37.50',
      currency: 'USD',
      deliveryPolicyVersion: 1,
      checkoutReady: true,
      issues: [],
      hasStalePrices: false,
    },
  ];

  const mockCartService = {
    isEmpty: signal(false),
    count: signal(3),
    groups: signal(mockGroups),
    subtotal: signal(125.0),
    shipping: signal(6.0),
    total: signal(131.0),
    activeCheckoutStoreId: signal<string | null>('store-1'),
    storeCart: (id: string) => ({
      subtotal: id === 'store-1' ? '90.00' : '35.00',
      deliveryFee: id === 'store-1' ? '3.50' : '2.50',
      totalAmount: id === 'store-1' ? '93.50' : '37.50',
    }),
    getStoreCarts: () => [
      {
        storeId: 'store-1',
        subtotal: '90.00',
        deliveryFee: '3.50',
        totalAmount: '93.50',
        items: [{ productId: 'prod-silk-1', quantity: 2, price: '45.00' }],
      },
      {
        storeId: 'store-2',
        subtotal: '35.00',
        deliveryFee: '2.50',
        totalAmount: '37.50',
        items: [{ productId: 'prod-pot-1', quantity: 1, price: '35.00' }],
      },
    ],
    markEmptied: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
  };

  const mockRentifyService = {
    myStore: vi.fn().mockReturnValue(of({ store: null })),
    checkout: vi.fn().mockReturnValue(
      of({
        order: {
          id: 'ord-123',
          orderNumber: 'ORD-2026-0001',
          storeId: 'store-1',
          totalAmount: '93.50',
          subtotal: '90.00',
          deliveryFee: '3.50',
          items: [{ name: 'Handwoven Silk Ikat', quantity: 2, total: '90.00' }],
        },
      }),
    ),
    orders: vi.fn().mockReturnValue(
      of({
        orders: [
          {
            id: 'ord-123',
            orderNumber: 'ORD-2026-0001',
            storeId: 'store-1',
            totalAmount: '93.50',
            subtotal: '90.00',
            deliveryFee: '3.50',
            createdAt: new Date().toISOString(),
            customerInfo: { name: 'Dara Sok', phone: '012345678' },
            shippingInfo: { address: 'House 12, Street 240, Chamkarmon, Phnom Penh' },
            items: [{ name: 'Handwoven Silk Ikat', quantity: 2, total: '90.00' }],
          },
        ],
      }),
    ),
  };

  const mockAuthService = {
    user: signal({ name: 'Dara Sok', phone: '012345678' }),
    isAuthenticated: signal(true),
    getLoginUrl: vi.fn().mockReturnValue('/login'),
    getRegisterUrl: vi.fn().mockReturnValue('/register'),
    logout: vi.fn(),
    loadCurrentUser: vi.fn().mockReturnValue(of({ name: 'Dara Sok', phone: '012345678' })),
  };

  beforeEach(async () => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    mockRentifyService.checkout.mockClear();
    mockRentifyService.orders.mockClear();
    mockCartService.markEmptied.mockClear();
    mockCartService.refresh.mockClear();

    await TestBed.configureTestingModule({
      imports: [CheckoutComponent],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: mockCartService },
        { provide: RentifyMarketplaceService, useValue: mockRentifyService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: WishlistService, useValue: { count: signal(0), isWishlisted: () => false, toggle: vi.fn(), isEmpty: () => true } },
        { provide: CommerceApiService, useValue: {} },
        TranslateService,
        SeoService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true as any);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  });

  it('should initialize with auth user profile and require policy acknowledgement', () => {
    expect(component['form'].get('fullName')?.value).toBe('Dara Sok');
    expect(component['form'].get('phone')?.value).toBe('012345678');
    expect(component['form'].get('policyAcknowledged')?.value).toBe(false);
    expect(component['form'].valid).toBe(false);
  });

  it('exposes COD as the only active Phase 4 buyer payment method', () => {
    expect(component['paymentOptions'].map((option) => option.value)).toEqual(['COD']);
    expect(component['method']()).toBe('COD');
  });

  it('has no serious or critical automated accessibility violations', async () => {
    const result = await axe.run(fixture.nativeElement, {
      rules: { 'color-contrast': { enabled: false } },
    });
    const blocking = result.violations.filter(
      (violation) => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(blocking).toEqual([]);
  }, 15_000);

  it('should prevent checkout when policy acknowledgement is not checked', async () => {
    component['form'].patchValue({
      province: 'Phnom Penh',
      city: 'Chamkarmon',
      address: 'House 12, Street 240',
      policyAcknowledged: false,
    });

    await component['placeOrder']();

    expect(component['form'].get('policyAcknowledged')?.invalid).toBe(true);
    expect(component['showValidationSummary']()).toBe(true);
    expect(mockRentifyService.checkout).not.toHaveBeenCalled();
  });

  it('offers province and district dropdowns and resets district when province changes', () => {
    const province = fixture.nativeElement.querySelector('select[formControlName="province"]') as HTMLSelectElement;
    const city = fixture.nativeElement.querySelector('select[formControlName="city"]') as HTMLSelectElement;
    expect(province.options.length).toBe(26);
    expect(city.options.length).toBe(1);

    province.value = 'Phnom Penh';
    province.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(city.options.length).toBeGreaterThan(1);
    const firstDistrict = component['districts']()[0].en;
    city.value = firstDistrict;
    city.dispatchEvent(new Event('change'));
    expect(component['form'].controls.city.value).toBe(firstDistrict);

    province.value = 'Kandal';
    province.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(component['form'].controls.city.value).toBe('');
    expect(component['form'].controls.city.invalid).toBe(true);
    expect(Array.from(city.options).slice(1).map((option) => option.value)).toEqual(component['districts']().map((district) => district.en));
    expect(component['invalid']('city')).toBe(false);
  });

  it('keeps untouched and blurred fields quiet until an order attempt', async () => {
    const address = component['form'].controls.address;
    address.markAsTouched();
    fixture.detectChanges();
    expect(component['invalid']('address')).toBe(false);
    const message = fixture.nativeElement.querySelector('#address-error');
    expect(message.classList.contains('error-hidden')).toBe(true);

    await component['placeOrder']();
    fixture.detectChanges();
    expect(component['invalid']('address')).toBe(true);
    expect(fixture.nativeElement.querySelector('#address-error')).toBe(message);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[formControlName="province"]'));
    expect(mockRentifyService.checkout).not.toHaveBeenCalled();

    component['form'].patchValue({
      province: 'Phnom Penh', city: 'Chamkarmon', address: 'Street 240', policyAcknowledged: true,
    });
    fixture.detectChanges();
    expect(component['showValidationSummary']()).toBe(false);
    expect(component['invalid']('address')).toBe(false);
  });

  it('updates the address review when delivery fields change', () => {
    expect(component['fullDeliveryAddress']()).toBe('');
    component['form'].patchValue({ address: 'Street 240', city: 'Chamkarmon', province: 'Phnom Penh' });
    expect(component['fullDeliveryAddress']()).toBe('Street 240, Chamkarmon, Phnom Penh');
  });

  it('should idempotently place order with preserved checkout key and clear on success', async () => {
    component['form'].patchValue({
      province: 'Phnom Penh',
      city: 'Chamkarmon',
      address: 'House 12, Street 240',
      policyAcknowledged: true,
    });

    const key1 = component.getOrInitCheckoutKey('store-1');
    const key2 = component.getOrInitCheckoutKey('store-1');
    expect(key1).toBe(key2); // Idempotency key is deterministic per pending store attempt

    await component['placeOrder']();

    expect(mockRentifyService.checkout).toHaveBeenCalledTimes(1);
    const checkoutArgs = mockRentifyService.checkout.mock.calls[0];
    expect(checkoutArgs[0]).toBe('store-1');
    expect(checkoutArgs[1]).toBe('93.50'); // Authoritative expected total
    expect(checkoutArgs[5]).toBe(key1); // Idempotency key passed

    // Successfully emptied targeted store cart only
    expect(mockCartService.markEmptied).toHaveBeenCalledWith('store-1');

    // Cleared checkout key after confirmed success
    const newKeyAfterSuccess = component.getOrInitCheckoutKey('store-1');
    expect(newKeyAfterSuccess).not.toBe(key1);

    expect(router.navigate).toHaveBeenCalledWith(['/order-success'], {
      queryParams: { orders: 'ORD-2026-0001', order: 'ORD-2026-0001' },
    });
  });

  it('should reuse pending checkout key from sessionStorage across reloads', () => {
    sessionStorage.setItem('rentify_pending_checkout_key_store-1', 'preserved-key-999');

    const key = component.getOrInitCheckoutKey('store-1');
    expect(key).toBe('preserved-key-999');
  });

  it('should prevent duplicate submission on double-click', async () => {
    component['form'].patchValue({
      province: 'Phnom Penh',
      city: 'Chamkarmon',
      address: 'House 12, Street 240',
      policyAcknowledged: true,
    });

    component['submitting'].set(true);
    await component['placeOrder']();

    expect(mockRentifyService.checkout).not.toHaveBeenCalled();
  });

  it('should handle 409 price change conflict with auto-refresh', async () => {
    component['form'].patchValue({
      province: 'Phnom Penh',
      city: 'Chamkarmon',
      address: 'House 12, Street 240',
      policyAcknowledged: true,
    });

    mockRentifyService.checkout.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Cart price or delivery fee changed; refresh before checkout' },
      })),
    );

    await component['placeOrder']();

    expect(component['error']()).toContain('prices or delivery fees have updated');
    expect(mockCartService.refresh).toHaveBeenCalled();
  });

  it('should handle 409 insufficient stock conflict with auto-refresh', async () => {
    component['form'].patchValue({
      province: 'Phnom Penh',
      city: 'Chamkarmon',
      address: 'House 12, Street 240',
      policyAcknowledged: true,
    });

    mockRentifyService.checkout.mockReturnValue(
      throwError(() => ({
        status: 409,
        error: { message: 'Insufficient stock' },
      })),
    );

    await component['placeOrder']();

    expect(component['error']()).toContain('insufficient stock');
    expect(mockCartService.refresh).toHaveBeenCalled();
  });

  it('should handle uncertain network timeout and offer safe status recovery', async () => {
    component['form'].patchValue({
      province: 'Phnom Penh',
      city: 'Chamkarmon',
      address: 'House 12, Street 240',
      policyAcknowledged: true,
    });

    // Simulate network drop / gateway timeout (504)
    mockRentifyService.checkout.mockReturnValue(
      throwError(() => ({
        status: 504,
        message: 'Gateway Timeout',
      })),
    );

    await component['placeOrder']();

    expect(component['uncertainSubmission']()).toBe(true);
    expect(component['error']()).toContain('network interruption occurred');

    // Trigger verifyOrderStatus recovery action
    await component['verifyOrderStatus']();

    // Since mockRentifyService.orders returns an existing order from recent minutes,
    // recovery navigates to order-success safely!
    expect(mockCartService.markEmptied).toHaveBeenCalledWith('store-1');
    expect(router.navigate).toHaveBeenCalledWith(['/order-success'], {
      queryParams: { orders: 'ORD-2026-0001', order: 'ORD-2026-0001' },
    });
  });

  it('should inform buyer when status check confirms no order was placed yet', async () => {
    mockRentifyService.orders.mockReturnValue(of({ orders: [] }));

    component['uncertainSubmission'].set(true);
    await component['verifyOrderStatus']();

    expect(component['uncertainSubmission']()).toBe(false);
    expect(component['recoveryMessage']()).toContain('No order was placed yet');
  });
});
