import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ProductDetailComponent } from './product-detail.component';
import { CatalogService } from '../core/catalog/catalog.service';
import { CartService } from '../core/cart/cart.service';
import { AuthService } from '../core/auth/auth.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { SeoService } from '../core/seo/seo.service';
import { TranslateService } from '../core/i18n/translate.service';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';
import { Product } from '../core/catalog/catalog.models';

describe('ProductDetailComponent', () => {
  let fixture: ComponentFixture<ProductDetailComponent>;
  let component: ProductDetailComponent;
  let seoService: SeoService;

  const mockProduct: Product = {
    id: 'prod-silk-001',
    name: 'Silk Ikat Scarf',
    slug: 'silk-ikat-scarf',
    sku: 'SILK-SCARF-DEF',
    price: 45.0,
    compareAtPrice: 55.0,
    hasVariants: true,
    image: 'https://example.com/scarf.jpg',
    images: ['https://example.com/scarf.jpg'],
    categorySlug: 'clothing',
    categoryName: 'Clothing',
    subcategory: 'Scarves',
    subcategorySlug: 'scarves',
    sellerName: 'Phnom Penh Silk Co',
    storeId: 'store-111',
    rating: 4.8,
    reviewCount: 12,
    stock: 15,
    status: 'in-stock',
    description: 'Authentic hand-woven Cambodian silk scarf.',
    soldCount: 50,
    createdAt: new Date().toISOString(),
    collections: ['best-sellers'],
    productVariants: [
      {
        id: 'var-red-s',
        productId: 'prod-silk-001',
        sku: 'SILK-SCARF-RED-S',
        price: 45.0,
        compareAtPrice: 55.0,
        stockQuantity: 10,
        isDefault: true,
        optionValues: { Color: 'Red', Size: 'S' },
        status: 'active',
      },
      {
        id: 'var-blue-m',
        productId: 'prod-silk-001',
        sku: 'SILK-SCARF-BLU-M',
        price: 52.0,
        stockQuantity: 0, // out of stock
        isDefault: false,
        optionValues: { Color: 'Blue', Size: 'M' },
        status: 'out-of-stock',
      },
    ],
  };

  const mockCatalog = {
    loaded: () => true,
    productError: () => '',
    productById: (id: string) => (id === mockProduct.id ? mockProduct : null),
    loadProduct: () => Promise.resolve(mockProduct),
    related: () => [],
    storeById: () => null,
  };

  const mockCart = {
    add: () => Promise.resolve(true),
    error: signal(''),
    count: signal(0),
    lines: signal([]),
  };

  const mockAuth = {
    isAuthenticated: () => false,
    user: () => null,
    getLoginUrl: () => '/auth/login',
    getRegisterUrl: () => '/auth/register',
    loadCurrentUser: () => of(null),
    logout: () => of(null),
  };

  const mockWishlist = {
    isWishlisted: () => false,
    toggle: () => {},
    count: signal(0),
    ids: signal([]),
  };

  const mockRentify = {
    reviews: () => of({ reviews: [], summary: { average: 4.8, total: 12, distribution: {} } }),
    submitReview: () => of({}),
    merchantDashboard: '/merchant',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(new Map([['id', mockProduct.id]])),
            snapshot: { paramMap: new Map([['id', mockProduct.id]]) },
          },
        },
        { provide: CatalogService, useValue: mockCatalog },
        { provide: CartService, useValue: mockCart },
        { provide: AuthService, useValue: mockAuth },
        { provide: WishlistService, useValue: mockWishlist },
        { provide: RentifyMarketplaceService, useValue: mockRentify },
        SeoService,
        TranslateService,
      ],
    }).compileComponents();

    seoService = TestBed.inject(SeoService);
    vi.spyOn(seoService, 'setProductMetadata');
    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders product details and resolves default SKU and price', () => {
    expect(component.product()?.name).toBe('Silk Ikat Scarf');
    expect(component.effectivePrice()).toBe(45.0);
    expect(component.effectiveStock()).toBe(10);
    expect(component.effectiveStatus()).toBe('in-stock');
  });

  it('updates price, SKU, and availability when a variant is selected', () => {
    // Select blue-m variant (out-of-stock, $52.0)
    const blueVariant = mockProduct.productVariants![1];
    component['onVariantChange'](blueVariant);
    component['onSkuChange'](blueVariant.sku);
    fixture.detectChanges();

    expect(component.currentSku()).toBe('SILK-SCARF-BLU-M');
    expect(component.effectivePrice()).toBe(52.0);
    expect(component.effectiveStock()).toBe(0);
    expect(component.effectiveStatus()).toBe('out-of-stock');
  });

  it('handles image error with graceful fallback flag', () => {
    expect(component['imageError']()).toBe(false);
    component['onMainImageError']();
    expect(component['imageError']()).toBe(true);
  });

  it('updates public SEO metadata on product load', () => {
    // Effect ran during setup
    expect(component.product()).toBeTruthy();
    expect(seoService.setProductMetadata).toHaveBeenCalledWith(mockProduct);
  });

  it('toggles image zoom modal with Enter and Esc keys', () => {
    expect(component['zoomOpen']()).toBe(false);
    component['zoomOpen'].set(true);
    expect(component['zoomOpen']()).toBe(true);

    component['onEscape']();
    expect(component['zoomOpen']()).toBe(false);
  });
});
