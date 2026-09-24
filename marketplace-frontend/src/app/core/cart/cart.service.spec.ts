import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { CartService } from './cart.service';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { RentifyMarketplaceService } from '../rentify/rentify-marketplace.service';
import { Product } from '../catalog/catalog.models';

describe('CartService', () => {
  let service: CartService;
  let authSignal = signal<any>(null);
  let isAuthSignal = signal<boolean>(false);

  const mockProduct: Product = {
    id: 'prod-001',
    name: 'Handmade Silk Scarf',
    slug: 'handmade-silk-scarf',
    image: 'https://example.com/scarf.jpg',
    images: ['https://example.com/scarf.jpg'],
    price: 25.0,
    categorySlug: 'fashion',
    categoryName: 'Fashion',
    subcategory: 'Scarves',
    subcategorySlug: 'scarves',
    sellerName: 'Khmer Silk Co',
    storeId: '00000000-0000-4000-8000-000000000001',
    rating: 4.8,
    reviewCount: 12,
    stock: 10,
    status: 'in-stock',
    description: 'Beautiful silk scarf',
    soldCount: 5,
    createdAt: new Date().toISOString(),
    collections: [],
  };

  const mockRentify = {
    carts: () => of({ carts: [] }),
    setQuantity: (storeId: string, productId: string, quantity: number) =>
      of({
        carts: [
          {
            id: 'cart-1',
            storeId,
            items: [
              {
                productId,
                quantity,
                currentPrice: '25.00',
                available: true,
              },
            ],
            subtotal: (25.0 * quantity).toFixed(2),
            deliveryFee: '3.50',
            totalAmount: (25.0 * quantity + 3.5).toFixed(2),
            checkoutReady: true,
            issues: [],
          },
        ],
      }),
    addItem: (productId: string, quantity = 1, storeId?: string) =>
      of({
        carts: [
          {
            id: 'cart-1',
            storeId: storeId || '00000000-0000-4000-8000-000000000001',
            items: [
              {
                productId,
                quantity,
                currentPrice: '25.00',
                available: true,
              },
            ],
            subtotal: (25.0 * quantity).toFixed(2),
            deliveryFee: '3.50',
            totalAmount: (25.0 * quantity + 3.5).toFixed(2),
            checkoutReady: true,
            issues: [],
          },
        ],
      }),
    removeItem: (storeId: string, productId: string) => of({ carts: [] }),
    clearCart: () => of({ carts: [] }),
    mergeCart: () => of({ carts: [] }),
  };

  const mockCatalog = {
    productById: (id: string) => (id === mockProduct.id ? mockProduct : undefined),
    storeById: (_id: string) => ({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Khmer Silk Co',
      slug: 'khmer-silk-co',
      primaryCategory: 'Fashion',
    }),
    loadProduct: async (_id: string) => null,
  };

  beforeEach(() => {
    localStorage.clear();
    authSignal = signal(null);
    isAuthSignal = signal(false);

    const mockAuth = {
      user: authSignal.asReadonly(),
      isAuthenticated: isAuthSignal.asReadonly(),
    };

    TestBed.configureTestingModule({
      providers: [
        CartService,
        { provide: AuthService, useValue: mockAuth },
        { provide: CatalogService, useValue: mockCatalog },
        { provide: RentifyMarketplaceService, useValue: mockRentify },
      ],
    });

    service = TestBed.inject(CartService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('adds an item to guest cart and reflects in lines and counts', async () => {
    expect(service.isEmpty()).toBe(true);
    expect(service.count()).toBe(0);

    const success = await service.add(mockProduct, 2);
    expect(success).toBe(true);
    expect(service.isEmpty()).toBe(false);
    expect(service.count()).toBe(2);
    expect(service.subtotal()).toBe(50.0);
    expect(service.shipping()).toBe(0); // >= 50 free delivery threshold
    expect(service.total()).toBe(50.0);

    const lines = service.lines();
    expect(lines.length).toBe(1);
    expect(lines[0].product.id).toBe(mockProduct.id);
    expect(lines[0].quantity).toBe(2);
    expect(lines[0].lineTotal).toBe(50.0);
  });

  it('keeps product in cart even if CatalogService has not indexed it', async () => {
    const unindexedProduct: Product = {
      ...mockProduct,
      id: 'prod-unknown-999',
      name: 'Ceramic Bowl',
      price: 15.0,
    };

    // mockCatalog.productById('prod-unknown-999') returns undefined
    expect(mockCatalog.productById(unindexedProduct.id)).toBeUndefined();

    const success = await service.add(unindexedProduct, 1);
    expect(success).toBe(true);

    const lines = service.lines();
    expect(lines.length).toBe(1);
    expect(lines[0].product.id).toBe('prod-unknown-999');
    expect(lines[0].product.name).toBe('Ceramic Bowl');
    expect(lines[0].lineTotal).toBe(15.0);
    expect(service.count()).toBe(1);
  });

  it('rejects adding out of stock products', async () => {
    const oosProduct: Product = {
      ...mockProduct,
      id: 'prod-oos',
      status: 'out-of-stock',
    };

    const added = await service.add(oosProduct, 1);
    expect(added).toBe(false);
    expect(service.error()).toBe('This product is out of stock.');
    expect(service.lines().length).toBe(0);
  });

  it('updates quantity and removes item when decremented to zero', async () => {
    await service.add(mockProduct, 2);
    expect(service.quantityOf(mockProduct.id)).toBe(2);

    await service.changeQuantity(mockProduct.id, 1);
    expect(service.quantityOf(mockProduct.id)).toBe(3);

    await service.changeQuantity(mockProduct.id, -3);
    expect(service.quantityOf(mockProduct.id)).toBe(0);
    expect(service.isEmpty()).toBe(true);
  });

  it('removes item explicitly', async () => {
    await service.add(mockProduct, 1);
    expect(service.contains(mockProduct.id)).toBe(true);

    await service.remove(mockProduct.id);
    expect(service.contains(mockProduct.id)).toBe(false);
    expect(service.lines().length).toBe(0);
  });

  it('clears all items from cart', async () => {
    await service.add(mockProduct, 2);
    expect(service.lines().length).toBe(1);

    await service.clear();
    expect(service.lines().length).toBe(0);
    expect(service.count()).toBe(0);
    expect(service.isEmpty()).toBe(true);
  });
});
