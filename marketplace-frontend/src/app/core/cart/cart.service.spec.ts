import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { CartService } from './cart.service';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { RentifyMarketplaceService } from '../rentify/rentify-marketplace.service';
import { Product } from '../catalog/catalog.models';
import { StoreCart } from '../rentify/rentify-marketplace.service';
import { Observable } from 'rxjs';

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
    carts: (): Observable<{ carts: StoreCart[] }> => of({ carts: [] }),
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

  it('keeps colors separate and changes/removes only the selected variant', async () => {
    const product: Product = { ...mockProduct, hasVariants: true, productVariants: [
      { id: 'blue', productId: mockProduct.id, sku: 'BLUE', price: 30, stockQuantity: 3, optionValues: { Color: 'Blue', Size: 'M' }, image: '/blue.png' },
      { id: 'red', productId: mockProduct.id, sku: 'RED', price: 35, stockQuantity: 5, optionValues: { Color: 'Red', Size: 'M' }, image: '/red.png' },
    ] };
    expect(await service.add(product, 1)).toBe(false);
    expect(await service.add(product, 2, 'blue')).toBe(true);
    expect(await service.add(product, 1, 'red')).toBe(true);
    expect(service.groups()[0].lines.map(line => [line.variantId, line.quantity, line.currentPrice])).toEqual([
      ['blue', 2, 30], ['red', 1, 35],
    ]);
    expect(service.quantityOf(product.id)).toBe(3);
    expect(service.groups()[0].lines[0].variantImage).toBe('/blue.png');
    expect(service.groups()[0].lines[0].optionValues).toEqual({ Color: 'Blue', Size: 'M' });
    await service.changeQuantity(product.id, 1, 'blue');
    expect(service.quantityOf(product.id, 'blue')).toBe(3);
    expect(service.quantityOf(product.id, 'red')).toBe(1);
    await service.remove(product.id, 'blue');
    expect(service.groups()[0].lines.map(line => line.variantId)).toEqual(['red']);
  });

  it('sends the selected variant to Commerce for authenticated cart mutations', async () => {
    const mutation = vi.spyOn(mockRentify, 'setQuantity');
    const product: Product = { ...mockProduct, hasVariants: true, productVariants: [
      { id: 'blue', productId: mockProduct.id, sku: 'BLUE', price: 30, stockQuantity: 3, optionValues: { Color: 'Blue' } },
    ] };
    isAuthSignal.set(true);
    expect(await service.add(product, 2, 'blue')).toBe(true);
    expect(mutation).toHaveBeenCalledWith(product.storeId, product.id, 2, 'blue');
    mutation.mockRestore();
  });

  it('does not report success or retain a guest item when the backend rejects it', async () => {
    const mutation = vi.spyOn(mockRentify, 'setQuantity').mockReturnValueOnce(throwError(() => ({ status: 403, error: { error: 'Cart unavailable' } })));
    expect(await service.add(mockProduct, 1)).toBe(false);
    expect(service.quantityOf(mockProduct.id)).toBe(0);
    expect(service.error()).toBeTruthy();
    mutation.mockRestore();
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
    expect(service.error()).toBe('cart.productOutOfStock');
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

  describe('P4-BUY-002: Store-Grouped & Channel-Safe Carts', () => {
    it('groups items strictly by Store and separates marketplace from storefront channels', async () => {
      isAuthSignal.set(true);

      const store1Id = '00000000-0000-4000-8000-000000000001';
      const store2Id = '00000000-0000-4000-8000-000000000002';

      vi.spyOn(mockRentify, 'carts').mockReturnValue(
        of({
          carts: [
            {
              id: 'cart-store-1',
              storeId: store1Id,
              channel: 'marketplace',
              items: [
                {
                  id: 'item-1',
                  productId: mockProduct.id,
                  quantity: 2,
                  unitPrice: '25.00',
                  currentPrice: '25.00',
                  available: true,
                },
              ],
              subtotal: '50.00',
              deliveryFee: '3.50',
              totalAmount: '53.50',
              checkoutReady: true,
              issues: [],
            },
            {
              id: 'cart-store-2',
              storeId: store2Id,
              channel: 'storefront',
              websiteId: 'web-boutique-001',
              items: [
                {
                  id: 'item-2',
                  productId: 'prod-002',
                  quantity: 1,
                  unitPrice: '60.00',
                  currentPrice: '60.00',
                  available: true,
                },
              ],
              subtotal: '60.00',
              deliveryFee: '0.00',
              totalAmount: '60.00',
              checkoutReady: true,
              issues: [],
            },
          ],
        }),
      );

      await service.refresh();

      const groups = service.groups();
      expect(groups.length).toBe(2);

      // Verify Store 1 (marketplace)
      const group1 = groups.find((g) => g.storeId === store1Id);
      expect(group1).toBeDefined();
      expect(group1?.channel).toBe('marketplace');
      expect(group1?.sellerName).toBe('Khmer Silk Co');
      expect(group1?.lines.length).toBe(1);
      expect(group1?.lines[0].product.id).toBe(mockProduct.id);
      expect(group1?.subtotal).toBe('50.00');
      expect(group1?.deliveryFee).toBe('3.50');
      expect(group1?.totalAmount).toBe('53.50');

      // Verify Store 2 (storefront)
      const group2 = groups.find((g) => g.storeId === store2Id);
      expect(group2).toBeDefined();
      expect(group2?.channel).toBe('storefront');
      expect(group2?.websiteId).toBe('web-boutique-001');
      expect(group2?.lines.length).toBe(1);
      expect(group2?.lines[0].product.id).toBe('prod-002');
      expect(group2?.subtotal).toBe('60.00');
      expect(group2?.deliveryFee).toBe('0.00');
      expect(group2?.totalAmount).toBe('60.00');
    });

    it('flags stale prices when quoted price diverges from current price and blocks checkout until acknowledged', async () => {
      isAuthSignal.set(true);

      const store1Id = '00000000-0000-4000-8000-000000000001';

      vi.spyOn(mockRentify, 'carts').mockReturnValue(
        of({
          carts: [
            {
              id: 'cart-stale-1',
              storeId: store1Id,
              channel: 'marketplace',
              items: [
                {
                  id: 'item-stale-1',
                  productId: mockProduct.id,
                  quantity: 1,
                  unitPrice: '20.00', // quoted earlier at $20.00
                  currentPrice: '25.00', // now updated to $25.00
                  available: true,
                },
              ],
              subtotal: '25.00',
              deliveryFee: '3.50',
              totalAmount: '28.50',
              checkoutReady: true, // Commerce reports true, but client requires price review
              issues: [],
            },
          ],
        }),
      );

      await service.refresh();

      let group = service.groups()[0];
      expect(group.hasStalePrices).toBe(true);
      expect(group.lines[0].isPriceStale).toBe(true);
      expect(group.lines[0].unitPrice).toBe(20.0);
      expect(group.lines[0].currentPrice).toBe(25.0);
      expect(group.checkoutReady).toBe(false); // blocked due to stale price

      // Acknowledge the price change
      service.acknowledgeStalePrices(store1Id);

      group = service.groups()[0];
      expect(group.hasStalePrices).toBe(false);
      expect(group.checkoutReady).toBe(true); // unblocked
    });

    it('surfaces stock changes and unavailable items with issues and blocks checkout readiness', async () => {
      isAuthSignal.set(true);

      const store1Id = '00000000-0000-4000-8000-000000000001';

      vi.spyOn(mockRentify, 'carts').mockReturnValue(
        of({
          carts: [
            {
              id: 'cart-oos-1',
              storeId: store1Id,
              channel: 'marketplace',
              items: [
                {
                  id: 'item-oos-1',
                  productId: mockProduct.id,
                  quantity: 5,
                  unitPrice: '25.00',
                  currentPrice: '25.00',
                  available: false, // out of stock / insufficient
                },
              ],
              subtotal: '125.00',
              deliveryFee: '3.50',
              totalAmount: null,
              checkoutReady: false,
              issues: ['Product prod-001 is unavailable or has insufficient stock'],
            },
          ],
        }),
      );

      await service.refresh();

      const group = service.groups()[0];
      expect(group.checkoutReady).toBe(false);
      expect(group.lines[0].available).toBe(false);
      expect(group.issues).toContain(
        'Product prod-001 is unavailable or has insufficient stock',
      );
    });

    it('preserves carts from other stores when checking out one store', async () => {
      isAuthSignal.set(true);

      const store1Id = '00000000-0000-4000-8000-000000000001';
      const store2Id = '00000000-0000-4000-8000-000000000002';

      vi.spyOn(mockRentify, 'carts').mockReturnValue(
        of({
          carts: [
            {
              id: 'cart-1',
              storeId: store1Id,
              items: [
                {
                  productId: mockProduct.id,
                  quantity: 1,
                  currentPrice: '25.00',
                  available: true,
                },
              ],
              subtotal: '25.00',
              deliveryFee: '3.50',
              totalAmount: '28.50',
              checkoutReady: true,
              issues: [],
            },
            {
              id: 'cart-2',
              storeId: store2Id,
              items: [
                {
                  productId: 'prod-002',
                  quantity: 2,
                  currentPrice: '15.00',
                  available: true,
                },
              ],
              subtotal: '30.00',
              deliveryFee: '3.50',
              totalAmount: '33.50',
              checkoutReady: true,
              issues: [],
            },
          ],
        }),
      );

      await service.refresh();
      expect(service.groups().length).toBe(2);

      // Checking out Store 1 empties ONLY Store 1
      service.markEmptied(store1Id);

      const remainingGroups = service.groups();
      expect(remainingGroups.length).toBe(1);
      expect(remainingGroups[0].storeId).toBe(store2Id);
      expect(remainingGroups[0].lines[0].product.id).toBe('prod-002');
      expect(service.getStoreCarts().length).toBe(1);
      expect(service.getStoreCarts()[0].storeId).toBe(store2Id);
    });

    it('tracks single-store checkout selection without corrupting state', () => {
      expect(service.activeCheckoutStoreId()).toBeNull();

      service.selectStoreForCheckout('store-target-123');
      expect(service.activeCheckoutStoreId()).toBe('store-target-123');

      service.selectStoreForCheckout(null);
      expect(service.activeCheckoutStoreId()).toBeNull();
    });
  });
});
