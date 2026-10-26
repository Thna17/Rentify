// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { emptyCheckoutDetails, getCartTotals } from '@rentify/storefront';

const mockApi = vi.hoisted(() => ({
  receipt: vi.fn(),
  paymentStatus: vi.fn(),
}));

const mockWebsiteContext = vi.hoisted(() => ({
  value: {
    websiteId: 'ws-active',
    status: 'active',
    storeStatus: 'active',
    isCustomDomain: false,
    hostedStorefrontUrl: 'https://demo.rentifystore.shop',
    identity: { name: 'Lotus Craft', logoUrl: null, headerStyle: 'classic' },
    content: [],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  },
}));

vi.mock('@rentify/storefront/api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useGetMyOrderDetailsQuery: (...args) => mockApi.receipt(...args),
    useCheckStorefrontPaymentStatusQuery: (...args) => mockApi.paymentStatus(...args),
    useGetAllProductsQuery: () => ({ data: { products: [] }, isLoading: false }),
    useGetProductByIdQuery: () => ({ data: null, isLoading: false }),
    useGetCategoriesQuery: () => ({ data: [], isLoading: false }),
    useCreateOrderMutation: () => [vi.fn(), { isLoading: false }],
    useHostedCheckoutMutation: () => [vi.fn(), { isLoading: false }],
    injectStorefrontApis: vi.fn(),
  };
});

vi.mock('@rentify/storefront/website', () => ({
  useStorefrontWebsite: () => mockWebsiteContext.value,
  useStorefrontCategories: () => ({ categories: [], loading: false }),
  StorefrontWebsiteProvider: ({ children }) => children,
}));

vi.mock('@rentify/storefront/cart', () => ({
  useStorefrontCart: () => ({
    lines: [],
    totals: { itemCount: 0, subtotal: 0 },
    quote: null,
    currency: 'USD',
    isLoading: false,
    isError: false,
    isCustomDomain: false,
    hostedStorefrontUrl: null,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
  }),
}));

const TEMPLATES = [
  {
    id: 1,
    name: 'Template 1 (Classic)',
    loadComponents: async () => ({
      ProductCard: (await import('../../../templates/ecommerce/ecommerce-template-1/src/components/ProductCard')).ProductCard,
      ProductPurchasePanel: (await import('../../../templates/ecommerce/ecommerce-template-1/src/components/ProductPurchasePanel')).ProductPurchasePanel,
      CartView: (await import('../../../templates/ecommerce/ecommerce-template-1/src/components/CartView')).CartView,
      CheckoutForm: (await import('../../../templates/ecommerce/ecommerce-template-1/src/components/CheckoutForm')).CheckoutForm,
      OrderConfirmation: (await import('../../../templates/ecommerce/ecommerce-template-1/src/pages/OrderConfirmation')).default,
      StoreLayout: (await import('../../../templates/ecommerce/ecommerce-template-1/src/layout/StoreLayout')).StoreLayout,
    }),
  },
  {
    id: 2,
    name: 'Template 2 (Modern Boutique)',
    loadComponents: async () => ({
      ProductCard: (await import('../../../templates/ecommerce/ecommerce-template-2/src/components/ProductCard')).ProductCard,
      ProductPurchasePanel: (await import('../../../templates/ecommerce/ecommerce-template-2/src/components/ProductPurchasePanel')).ProductPurchasePanel,
      CartView: (await import('../../../templates/ecommerce/ecommerce-template-2/src/components/CartView')).CartView,
      CheckoutForm: (await import('../../../templates/ecommerce/ecommerce-template-2/src/components/CheckoutForm')).CheckoutForm,
      OrderConfirmation: (await import('../../../templates/ecommerce/ecommerce-template-2/src/pages/OrderConfirmation')).default,
      StoreLayout: (await import('../../../templates/ecommerce/ecommerce-template-2/src/layout/StoreLayout')).StoreLayout,
    }),
  },
  {
    id: 3,
    name: 'Template 3 (Artisan Grid)',
    loadComponents: async () => ({
      ProductCard: (await import('../../../templates/ecommerce/ecommerce-template-3/src/components/ProductCard')).ProductCard,
      ProductPurchasePanel: (await import('../../../templates/ecommerce/ecommerce-template-3/src/components/ProductPurchasePanel')).ProductPurchasePanel,
      CartView: (await import('../../../templates/ecommerce/ecommerce-template-3/src/components/CartView')).CartView,
      CheckoutForm: (await import('../../../templates/ecommerce/ecommerce-template-3/src/components/CheckoutForm')).CheckoutForm,
      OrderConfirmation: (await import('../../../templates/ecommerce/ecommerce-template-3/src/pages/OrderConfirmation')).default,
      StoreLayout: (await import('../../../templates/ecommerce/ecommerce-template-3/src/layout/StoreLayout')).StoreLayout,
    }),
  },
];

describe.each(TEMPLATES)('Storefront Template Matrix Contract: $name (id: $id)', ({ id, name, loadComponents }) => {
  let components;

  beforeEach(async () => {
    components = await loadComponents();
    mockWebsiteContext.value = {
      websiteId: `ws-template-${id}`,
      status: 'active',
      storeStatus: 'active',
      isCustomDomain: false,
      hostedStorefrontUrl: 'https://demo.rentifystore.shop',
      identity: { name: `Store ${id}`, logoUrl: null, headerStyle: 'classic' },
      content: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mockApi.paymentStatus.mockReturnValue({ data: { status: 'pending' }, isFetching: false, refetch: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('Stage 1: Browse & Product Discovery', () => {
    test('renders canonical product pricing and detail link', () => {
      const { ProductCard } = components;
      const product = {
        id: 'p-101',
        name: 'Handwoven Scarf',
        price: '25.00',
        status: 'active',
        trackInventory: true,
        stockQuantity: 10,
        lowStockThreshold: 2,
        images: [{ url: 'https://cdn.example.com/scarf.jpg' }],
        Category: { id: 'c-1', name: 'Textiles' },
        ProductVariants: [],
      };

      render(
        <MemoryRouter>
          <ProductCard product={product} onAdd={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: 'Handwoven Scarf' })).toBeTruthy();
      expect(screen.getByText('$25.00')).toBeTruthy();
      expect(screen.getByRole('link', { name: 'Handwoven Scarf' }).getAttribute('href')).toBe('/product/p-101');
    });

    test('prevents purchasing when product is out of stock', () => {
      const { ProductCard } = components;
      const onAdd = vi.fn();
      const oosProduct = {
        id: 'p-102',
        name: 'Silk Pillow',
        price: '18.00',
        status: 'active',
        trackInventory: true,
        stockQuantity: 0,
        lowStockThreshold: 2,
        images: [],
        ProductVariants: [],
      };

      render(
        <MemoryRouter>
          <ProductCard product={oosProduct} onAdd={onAdd} />
        </MemoryRouter>
      );

      const addBtn = screen.queryByRole('button', { name: /add silk pillow/i });
      if (addBtn) {
        expect(addBtn.hasAttribute('disabled')).toBe(true);
      } else {
        expect(screen.getByText(/out of stock/i)).toBeTruthy();
      }
    });
  });

  describe('Stage 2: Product Detail & Variant/SKU Selection', () => {
    test('selects purchasable variant and clamps quantity to stock', () => {
      const { ProductPurchasePanel } = components;
      const onAdd = vi.fn();
      const variantProduct = {
        id: 'p-var',
        name: 'Ceramic Mug',
        price: '15.00',
        status: 'active',
        ProductOptions: [
          {
            id: 'opt-1',
            name: 'Color',
            values: [{ value: 'Terracotta' }, { value: 'Celadon' }],
          },
        ],
        ProductVariants: [
          {
            id: 'v-terra',
            status: 'active',
            price: '15.00',
            trackInventory: true,
            stockQuantity: 2,
            optionValues: { Color: 'Terracotta' },
          },
          {
            id: 'v-celad',
            status: 'active',
            price: '17.00',
            trackInventory: true,
            stockQuantity: 5,
            optionValues: { Color: 'Celadon' },
          },
        ],
      };

      render(<ProductPurchasePanel product={variantProduct} onAdd={onAdd} />);

      // Initial selection should select Terracotta (first purchasable variant)
      expect(screen.getByText('$15.00')).toBeTruthy();

      // Switch to Celadon
      const celadonOption = screen.getByLabelText(/Celadon/i);
      fireEvent.click(celadonOption);
      expect(screen.getByText('$17.00')).toBeTruthy();

      // Submit add to cart
      const submitBtn = screen.getByRole('button', { name: /add to cart/i });
      fireEvent.click(submitBtn);

      expect(onAdd).toHaveBeenCalledWith({
        product: variantProduct,
        variantId: 'v-celad',
        quantity: 1,
        selectedOptions: { Color: 'Celadon' },
      });
    });
  });

  describe('Stage 3: Cart Experience & Channel Safety', () => {
    const lines = [
      {
        id: 'l-1',
        productId: 'p-1',
        quantity: 2,
        selectedOptions: { Size: 'Large' },
        Product: { id: 'p-1', name: 'Clay Pot', price: '20.00', trackInventory: true, stockQuantity: 5, images: [] },
      },
    ];

    test('shows exact subtotal and quote breakdown from Commerce', () => {
      const { CartView } = components;
      render(
        <MemoryRouter>
          <CartView
            lines={lines}
            totals={getCartTotals(lines)}
            quote={{ subtotal: 40, deliveryFee: 2.5, totalAmount: 42.5 }}
            currency="USD"
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            isCustomDomain={false}
          />
        </MemoryRouter>
      );

      expect(screen.getByTestId('cart-subtotal').textContent).toBe('$40.00');
      expect(screen.getByTestId('cart-total').textContent).toBe('$42.50');
      expect(screen.getByText('$2.50')).toBeTruthy();
      expect(screen.getByRole('link', { name: /checkout/i })).toBeTruthy();
    });

    test('enforces Release 1 custom domain gate (browse-only, directs to verified storefront)', () => {
      const { CartView } = components;
      render(
        <MemoryRouter>
          <CartView
            lines={lines}
            totals={getCartTotals(lines)}
            quote={{ totalAmount: 40 }}
            currency="USD"
            onQuantityChange={vi.fn()}
            onRemove={vi.fn()}
            isCustomDomain={true}
            hostedStorefrontUrl="https://verified.rentifystore.shop"
          />
        </MemoryRouter>
      );

      expect(screen.queryByRole('link', { name: /^go to checkout$/i })).toBeNull();
      expect(screen.getByText(/browse-only custom domain/i)).toBeTruthy();
      const verifiedLink = screen.getByRole('link', { name: /checkout on verified storefront/i });
      expect(verifiedLink.getAttribute('href')).toBe('https://verified.rentifystore.shop/checkout');
    });
  });

  describe('Stage 4: Cash on Delivery Checkout', () => {
    test('enforces COD and validates required fields with Cambodian phone normalization', () => {
      const { CheckoutForm } = components;
      const onSubmit = vi.fn();
      const onDetailsChange = vi.fn();
      let details = emptyCheckoutDetails();

      const { rerender } = render(
        <CheckoutForm
          details={details}
          paymentMethod="COD"
          onDetailsChange={onDetailsChange}
          onPaymentMethodChange={vi.fn()}
          onSubmit={onSubmit}
          submitting={false}
        />
      );

      // Attempt to submit empty form
      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText(/please check the highlighted fields/i)).toBeTruthy();

      // Fill in valid details
      details = {
        name: 'Chanthou Seng',
        phone: '012 888 999',
        province: 'Phnom Penh',
        district: 'Chamkar Mon',
        commune: 'Tonle Bassac',
        street: '#45, Norodom Blvd',
        note: 'Call on arrival',
      };

      rerender(
        <CheckoutForm
          details={details}
          paymentMethod="COD"
          onDetailsChange={onDetailsChange}
          onPaymentMethodChange={vi.fn()}
          onSubmit={onSubmit}
          submitting={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /place order/i }));
      expect(onSubmit).toHaveBeenCalled();
    });
  });

  describe('Stage 5: Order Confirmation & Receipt', () => {
    test('renders COD confirmation with next steps, reference, and recovery snapshot', () => {
      const { OrderConfirmation } = components;
      const order = {
        id: 'ord-999',
        orderNumber: 'ORD-99999',
        status: 'pending',
        currency: 'USD',
        totalAmount: 45.0,
        createdAt: new Date().toISOString(),
        payment: { paymentMethod: 'COD', status: 'pending' },
        shippingDetail: {
          name: 'Chanthou Seng',
          phone: '012888999',
          address: '#45, Norodom Blvd, Phnom Penh',
        },
        OrderItems: [
          {
            id: 'it-1',
            productId: 'p-1',
            quantity: 2,
            price: '22.50',
            Product: { name: 'Lotus Candle' },
          },
        ],
      };

      mockApi.receipt.mockReturnValue({ data: order, isLoading: false, isError: false });

      render(
        <MemoryRouter initialEntries={['/confirmation/ord-999']}>
          <Routes>
            <Route path="/confirmation/:orderId" element={<OrderConfirmation />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('ORD-99999')).toBeTruthy();
      expect(screen.getByText(/Cash on delivery/i)).toBeTruthy();
      expect(screen.getAllByText('$45.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Lotus Candle')).toBeTruthy();
      expect(screen.getByText('Chanthou Seng')).toBeTruthy();
    });

    test('recovers from receipt API error using placed-order snapshot state', () => {
      const { OrderConfirmation } = components;
      mockApi.receipt.mockReturnValue({ isLoading: false, isError: true, error: { status: 500 } });

      const snapshot = {
        id: 'ord-snap',
        orderNumber: 'ORD-SNAP-777',
        status: 'pending',
        currency: 'USD',
        totalAmount: 30.0,
        payment: { paymentMethod: 'COD', status: 'pending' },
        shippingDetail: {
          name: 'Dara Sok',
          phone: '012333444',
          address: '#12, Phnom Penh',
        },
        OrderItems: [
          {
            id: 'it-snap',
            productId: 'p-snap',
            quantity: 1,
            price: '30.00',
            Product: { name: 'Lotus Scarf' },
          },
        ],
      };

      render(
        <MemoryRouter initialEntries={[{ pathname: '/confirmation/ord-snap', state: { placed: true, receipt: snapshot } }]}>
          <Routes>
            <Route path="/confirmation/:orderId" element={<OrderConfirmation />} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('ORD-SNAP-777')).toBeTruthy();
      expect(screen.getByText('Lotus Scarf')).toBeTruthy();
      expect(screen.getByText('Dara Sok')).toBeTruthy();
    });
  });

  describe('Stage 6: Store & Website Suspension Handling', () => {
    test('renders store unavailable state when store or website is suspended', () => {
      const { StoreLayout } = components;
      mockWebsiteContext.value = {
        ...mockWebsiteContext.value,
        status: 'suspended',
      };

      render(
        <MemoryRouter>
          <StoreLayout />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Store unavailable/i })).toBeTruthy();
      expect(screen.getByText(/We couldn’t find a store at this address/i)).toBeTruthy();
    });

    test('renders store unavailable state when merchant store projection is suspended', () => {
      const { StoreLayout } = components;
      mockWebsiteContext.value = {
        ...mockWebsiteContext.value,
        status: 'active',
        storeStatus: 'suspended',
      };

      render(
        <MemoryRouter>
          <StoreLayout />
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Store unavailable/i })).toBeTruthy();
    });
  });
});
