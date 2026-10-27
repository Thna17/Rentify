import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { CartComponent } from './cart.component';
import { CartService } from '../core/cart/cart.service';
import { CatalogService } from '../core/catalog/catalog.service';
import { AuthService } from '../core/auth/auth.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';
import { StoreCartGroup } from '../core/catalog/catalog.models';

describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;
  let component: CartComponent;
  let router: Router;

  const mockStoreGroups: StoreCartGroup[] = [
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
      channel: 'storefront',
      websiteId: 'web-pottery-01',
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
          unitPrice: 30.0, // Stale price
          currentPrice: 35.0,
          isPriceStale: true,
          available: true,
          stockLimit: 2,
          lineTotal: 35.0,
        },
      ],
      subtotal: '35.00',
      deliveryFee: '2.50',
      totalAmount: '37.50',
      currency: 'USD',
      deliveryPolicyVersion: 2,
      checkoutReady: false,
      issues: [],
      hasStalePrices: true,
    },
  ];

  const mockGroupsSignal = signal<StoreCartGroup[]>(mockStoreGroups);
  const mockCountSignal = signal<number>(3);
  const mockSubtotalSignal = signal<number>(125.0);
  const mockShippingSignal = signal<number>(6.0);
  const mockTotalSignal = signal<number>(131.0);
  const mockErrorSignal = signal<string>('');

  const mockCartService = {
    groups: mockGroupsSignal,
    count: mockCountSignal,
    subtotal: mockSubtotalSignal,
    shipping: mockShippingSignal,
    total: mockTotalSignal,
    error: mockErrorSignal,
    isEmpty: () => mockCountSignal() === 0,
    lines: () => mockGroupsSignal().flatMap((g) => g.lines),
    selectStoreForCheckout: vi.fn(),
    acknowledgeStalePrices: vi.fn(),
    changeQuantity: vi.fn(),
    remove: vi.fn(),
    retry: vi.fn(),
  };

  const mockCatalogService = {
    allProducts: () => [],
    productById: () => null,
    storeById: () => null,
  };

  const mockWishlistService = {
    isWishlisted: () => false,
    toggle: vi.fn(),
    isEmpty: () => true,
    count: signal(0),
  };

  const mockAuthService = {
    isAuthenticated: signal(false),
    user: signal(null),
    getLoginUrl: () => '/auth/login',
    getRegisterUrl: () => '/auth/register',
    logout: () => of(null),
    loadCurrentUser: () => of(null),
  };

  beforeEach(async () => {
    mockGroupsSignal.set(mockStoreGroups);
    mockCountSignal.set(3);
    mockErrorSignal.set('');

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [
        provideRouter([]),
        { provide: CartService, useValue: mockCartService },
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: WishlistService, useValue: mockWishlistService },
        { provide: AuthService, useValue: mockAuthService },
        TranslateService,
        SeoService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders multi-vendor educational banner explaining independent orders', () => {
    const banner = fixture.nativeElement.querySelector('.multi-vendor-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Multi-vendor marketplace');
    expect(banner.textContent).toContain('ship separately');
  });

  it('renders separate store groups with distinct channel badges and Commerce totals', () => {
    const groups = fixture.nativeElement.querySelectorAll('.store-group');
    expect(groups.length).toBe(2);

    // Group 1: Marketplace channel
    const group1 = groups[0];
    expect(group1.textContent).toContain('Phnom Penh Silk Co');
    expect(group1.querySelector('.channel-badge').textContent).toContain('Marketplace');
    expect(group1.textContent).toContain('$90.00'); // subtotal
    expect(group1.textContent).toContain('$3.50'); // delivery fee
    expect(group1.textContent).toContain('$93.50'); // exact total
    expect(group1.textContent).toContain('Ready for checkout');

    // Group 2: Storefront channel with stale price
    const group2 = groups[1];
    expect(group2.textContent).toContain('Battambang Pottery');
    expect(group2.querySelector('.channel-badge.storefront').textContent).toContain('Storefront');
    expect(group2.textContent).toContain('Prices have been updated');
  });

  it('navigates to checkout for a single selected store without losing other stores', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component['checkoutStore']('store-1');

    expect(mockCartService.selectStoreForCheckout).toHaveBeenCalledWith('store-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/checkout'], {
      queryParams: { storeId: 'store-1' },
    });
  });

  it('renders empty cart state when cart count is zero', () => {
    mockGroupsSignal.set([]);
    mockCountSignal.set(0);
    fixture.detectChanges();

    const empty = fixture.nativeElement.querySelector('.empty-cart');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('Your cart is empty');
  });
});
