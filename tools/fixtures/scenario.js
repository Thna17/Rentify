// tools/fixtures/scenario.js - Pure, deterministic data scenario specification for Rentify platform tests

/**
 * Generates an immutable, deterministic scenario object for Core and Commerce integration tests.
 * All identifiers and values are stable and repeatable across runs.
 *
 * @param {object} [options]
 * @param {string} [options.idPrefix] - Optional prefix to avoid collisions during parallel test runs
 * @param {object} [options.overrides] - Custom overrides for scenario components
 * @returns {object} Canonical platform scenario
 */
function createPlatformScenario(options = {}) {
  const prefix = options.idPrefix || '';
  const makeId = (base) => (prefix ? `${prefix}-${base}` : base);

  // 1. Stable, explicit IDs
  const IDS = {
    // Users
    merchantMarketplaceUserId: makeId('20000000-0000-4000-8000-000000000001'),
    merchantStorefrontUserId: makeId('20000000-0000-4000-8000-000000000002'),
    staffUserId: makeId('20000000-0000-4000-8000-000000000003'),
    buyerUserId: makeId('20000000-0000-4000-8000-000000000004'),
    adminUserId: makeId('20000000-0000-4000-8000-000000000005'),

    // Stores
    marketplaceStoreId: makeId('10000000-0000-4000-8000-000000000001'),
    storefrontStoreId: makeId('10000000-0000-4000-8000-000000000002'),

    // Websites & Templates
    storefrontWebsiteId: makeId('30000000-0000-4000-8000-000000000002'),
    templateId: makeId('40000000-0000-4000-8000-000000000001'),

    // Staff
    staffId: makeId('50000000-0000-4000-8000-000000000001'),

    // Customers (Commerce Buyer Profile)
    customerId: makeId('60000000-0000-4000-8000-000000000001'),

    // Packages & Subscriptions
    packageId: makeId('70000000-0000-4000-8000-000000000001'),
    subscriptionId: makeId('70000000-0000-4000-8000-000000000002'),

    // Categories
    potteryCategoryId: makeId('80000000-0000-4000-8000-000000000001'),
    silkCategoryId: makeId('80000000-0000-4000-8000-000000000002'),

    // Products & Variants
    simpleProductId: makeId('90000000-0000-4000-8000-000000000001'),
    variantProductId: makeId('90000000-0000-4000-8000-000000000002'),
    variantRubyId: makeId('91000000-0000-4000-8000-000000000001'),
    variantSapphireId: makeId('91000000-0000-4000-8000-000000000002'),

    // Carts
    marketplaceCartId: makeId('a0000000-0000-4000-8000-000000000001'),
    storefrontCartId: makeId('a0000000-0000-4000-8000-000000000002'),
    marketplaceCartItemId: makeId('a1000000-0000-4000-8000-000000000001'),
    storefrontCartItemId: makeId('a1000000-0000-4000-8000-000000000002'),

    // Orders
    marketplaceCodOrderId: makeId('b0000000-0000-4000-8000-000000000001'),
    storefrontDeliveredOrderId: makeId('b0000000-0000-4000-8000-000000000002'),
    storefrontRefundedOrderId: makeId('b0000000-0000-4000-8000-000000000003'),

    // Order Items
    orderItemMarketplaceId: makeId('b1000000-0000-4000-8000-000000000001'),
    orderItemDeliveredId: makeId('b1000000-0000-4000-8000-000000000002'),
    orderItemRefundedId: makeId('b1000000-0000-4000-8000-000000000003'),

    // Payments
    paymentMarketplaceId: makeId('b2000000-0000-4000-8000-000000000001'),
    paymentDeliveredId: makeId('b2000000-0000-4000-8000-000000000002'),
    paymentRefundedId: makeId('b2000000-0000-4000-8000-000000000003'),

    // Invoices
    invoiceDeliveredId: makeId('c0000000-0000-4000-8000-000000000001'),

    // Shipping Details
    shippingMarketplaceId: makeId('c1000000-0000-4000-8000-000000000001'),
    shippingDeliveredId: makeId('c1000000-0000-4000-8000-000000000002'),
    shippingRefundedId: makeId('c1000000-0000-4000-8000-000000000003'),

    // Order Events
    orderEventRefundId: makeId('d0000000-0000-4000-8000-000000000001'),

    // Seller Application
    sellerAppMarketplaceId: makeId('e0000000-0000-4000-8000-000000000001'),
    sellerAppStorefrontId: makeId('e0000000-0000-4000-8000-000000000002'),
  };

  // 2. Core Users
  const users = {
    marketplaceMerchant: {
      id: IDS.merchantMarketplaceUserId,
      name: 'Kosal Ceramicist',
      email: prefix ? `${prefix}.kosal@rentify.test` : 'kosal.pottery@rentify.test',
      phoneNumber: '+85512999888',
      role: 'user',
      isVerified: true,
    },
    storefrontMerchant: {
      id: IDS.merchantStorefrontUserId,
      name: 'Bopha Weaver',
      email: prefix ? `${prefix}.bopha@rentify.test` : 'bopha.silk@rentify.test',
      phoneNumber: '+85512777666',
      role: 'user',
      isVerified: true,
    },
    staffMember: {
      id: IDS.staffUserId,
      name: 'Dara POS Staff',
      email: prefix ? `${prefix}.dara@rentify.test` : 'dara.pos@rentify.test',
      phoneNumber: '+85512555444',
      role: 'user',
      isVerified: true,
    },
    buyer: {
      id: IDS.buyerUserId,
      name: 'Sokha Buyer',
      email: prefix ? `${prefix}.buyer@rentify.test` : 'sokha.buyer@rentify.test',
      phoneNumber: '+85512345678',
      role: 'user',
      isVerified: true,
    },
    admin: {
      id: IDS.adminUserId,
      name: 'Platform Ops Admin',
      email: prefix ? `${prefix}.admin@rentify.test` : 'ops.admin@rentify.test',
      role: 'admin',
      isVerified: true,
    },
  };

  // 3. Two Clearly Different Stores
  const stores = {
    // Store A: Marketplace-only merchant (NO website, primary category 'Handicrafts & Pottery')
    marketplaceOnly: {
      id: IDS.marketplaceStoreId,
      ownerUserId: IDS.merchantMarketplaceUserId,
      name: 'Angkor Artisan Pottery',
      slug: makeId('angkor-artisan-pottery'),
      primaryCategory: 'Handicrafts & Pottery',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      marketplaceEntitlement: 'pilot',
      projectionVersion: 1,
      websiteId: null, // Critical platform invariant: marketplace-only Store has NO Website
    },
    // Store B: Storefront merchant (Linked Website, primary category 'Fashion & Textiles')
    storefrontAndMarketplace: {
      id: IDS.storefrontStoreId,
      ownerUserId: IDS.merchantStorefrontUserId,
      name: 'Mekong Silk Heritage',
      slug: makeId('mekong-silk-heritage'),
      primaryCategory: 'Fashion & Textiles',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      marketplaceEntitlement: 'standard',
      projectionVersion: 1,
      websiteId: IDS.storefrontWebsiteId, // Distinct from storeId
    },
  };

  // 4. Website Template & Optional Website
  const template = {
    id: IDS.templateId,
    name: 'Boutique Silk & Fashion Template',
    slug: makeId('boutique-fashion-template'),
    description: 'High-end artisan fashion template with responsive layout',
  };

  const websites = {
    storefront: {
      id: IDS.storefrontWebsiteId,
      userId: IDS.merchantStorefrontUserId,
      storeId: IDS.storefrontStoreId,
      templateId: IDS.templateId,
      name: 'Mekong Silk Storefront',
      domain: makeId('mekong-silk.rentifymarket.test'),
      subdomain: makeId('mekong-silk'),
      status: 'published',
    },
  };

  // 5. Staff Member with Limited Permissions
  const staff = {
    posStaff: {
      id: IDS.staffId,
      merchantId: IDS.merchantStorefrontUserId,
      websiteId: IDS.storefrontWebsiteId,
      name: 'Dara POS Staff',
      email: users.staffMember.email,
      phoneNumber: users.staffMember.phoneNumber,
      permissions: ['manage_pos', 'manage_products'], // Limited permissions: cannot access orders, staff, settings
      isActive: true,
      isVerified: true,
    },
  };

  // 6. Core Packages & Subscriptions
  const coreBilling = {
    package: {
      id: IDS.packageId,
      name: 'Storefront Starter Plan',
      price: 29.00,
      duration: 'monthly',
      features: ['custom_subdomain', 'catalog_management', 'pos_integration', 'standard_support'],
      limits: { maxProducts: 500, maxStaff: 5 },
    },
    subscription: {
      id: IDS.subscriptionId,
      userId: IDS.merchantStorefrontUserId,
      websiteId: IDS.storefrontWebsiteId,
      packageId: IDS.packageId,
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-11-01T00:00:00.000Z'),
      status: 'active',
    },
  };

  // 7. Seller Applications (Core)
  const sellerApplications = {
    marketplaceStore: {
      id: IDS.sellerAppMarketplaceId,
      storeId: IDS.marketplaceStoreId,
      status: 'approved',
      submittedAt: new Date('2026-10-01T00:00:00.000Z'),
      reviewedAt: new Date('2026-10-02T00:00:00.000Z'),
    },
    storefrontStore: {
      id: IDS.sellerAppStorefrontId,
      storeId: IDS.storefrontStoreId,
      status: 'approved',
      submittedAt: new Date('2026-10-01T00:00:00.000Z'),
      reviewedAt: new Date('2026-10-02T00:00:00.000Z'),
    },
  };

  // 8. Commerce Categories
  const categories = {
    pottery: {
      id: IDS.potteryCategoryId,
      storeId: IDS.marketplaceStoreId,
      websiteId: null,
      name: 'Handcrafted Ceramics',
      slug: makeId('handcrafted-ceramics'),
      description: 'Authentic clay and celadon pottery from Cambodian artisans',
    },
    silk: {
      id: IDS.silkCategoryId,
      storeId: IDS.storefrontStoreId,
      websiteId: IDS.storefrontWebsiteId,
      name: 'Traditional Textiles',
      slug: makeId('traditional-textiles'),
      description: 'Handwoven golden silk scarves and wall hangings',
    },
  };

  // 9. Products & Variants
  const products = {
    // Simple product belonging to Store A (Marketplace-only)
    simpleVase: {
      id: IDS.simpleProductId,
      storeId: IDS.marketplaceStoreId,
      websiteId: null,
      categoryId: IDS.potteryCategoryId,
      name: 'Handmade Celadon Tea Pot',
      slug: makeId('handmade-celadon-tea-pot'),
      description: 'Traditional wood-fired celadon ceramic teapot with bamboo handle',
      price: 35.00,
      stockQuantity: 20,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      trackInventory: true,
      status: 'active',
      marketplaceCategory: 'Handicrafts & Pottery',
      marketplaceVisibility: true,
    },
    // Variant product belonging to Store B (Storefront & Marketplace)
    variantScarf: {
      id: IDS.variantProductId,
      storeId: IDS.storefrontStoreId,
      websiteId: IDS.storefrontWebsiteId,
      categoryId: IDS.silkCategoryId,
      name: 'Golden Silk Ikat Scarf',
      slug: makeId('golden-silk-ikat-scarf'),
      description: 'Masterfully dyed 100% pure Cambodian mulberry silk scarf',
      price: 60.00,
      stockQuantity: 25, // Total aggregate inventory
      productType: 'physical',
      websiteNiche: 'fashion',
      trackInventory: true,
      status: 'active',
      marketplaceCategory: 'Fashion & Textiles',
      marketplaceVisibility: true,
    },
  };

  const productVariants = {
    rubyStandard: {
      id: IDS.variantRubyId,
      productId: IDS.variantProductId,
      sku: makeId('SILK-IKAT-RUBY'),
      price: 60.00,
      stockQuantity: 10,
      trackInventory: true,
      optionValues: { Color: 'Ruby Red', Pattern: 'Diamond Weave' },
    },
    sapphireStandard: {
      id: IDS.variantSapphireId,
      productId: IDS.variantProductId,
      sku: makeId('SILK-IKAT-SAPH'),
      price: 65.00,
      stockQuantity: 15,
      trackInventory: true,
      optionValues: { Color: 'Sapphire Blue', Pattern: 'Peacock Feather' },
    },
  };

  // 10. Commerce Customer (Buyer)
  const customers = {
    buyer: {
      id: IDS.customerId,
      email: users.buyer.email,
      name: users.buyer.name,
      phone: users.buyer.phoneNumber,
      tenantStoreId: IDS.storefrontStoreId,
      storeId: IDS.storefrontWebsiteId,
    },
  };

  // 11. Carts (Isolated by Tenant / Store)
  const carts = {
    // Marketplace cart: Buyer purchasing simple vase from Store A
    marketplaceCart: {
      id: IDS.marketplaceCartId,
      customerId: IDS.customerId,
      storeId: IDS.marketplaceStoreId,
      websiteId: null,
      status: 'active',
    },
    // Storefront cart: Buyer purchasing silk variant from Store B
    storefrontCart: {
      id: IDS.storefrontCartId,
      customerId: IDS.customerId,
      storeId: IDS.storefrontStoreId,
      websiteId: IDS.storefrontWebsiteId,
      status: 'active',
    },
  };

  const cartItems = {
    marketplaceItem: {
      id: IDS.marketplaceCartItemId,
      cartId: IDS.marketplaceCartId,
      productId: IDS.simpleProductId,
      variantId: null,
      quantity: 1,
      price: 35.00,
    },
    storefrontItem: {
      id: IDS.storefrontCartItemId,
      cartId: IDS.storefrontCartId,
      productId: IDS.variantProductId,
      variantId: IDS.variantRubyId,
      quantity: 2,
      price: 60.00,
    },
  };

  // 12. COD Orders, Invoices, and Returns
  const orders = {
    // Order 1: Store A Marketplace COD Order (Pending delivery & payment)
    marketplaceCod: {
      id: IDS.marketplaceCodOrderId,
      orderNumber: makeId('ORD-MKT-1001'),
      storeId: IDS.marketplaceStoreId,
      websiteId: null,
      customerId: IDS.customerId,
      salesChannel: 'marketplace',
      orderNiche: 'ecommerce',
      status: 'pending',
      orderType: 'online',
      subtotal: 35.00,
      shippingFee: 0.00,
      totalAmount: 35.00,
      currency: 'USD',
      deliveryStatus: 'pending',
    },
    // Order 2: Store B Storefront COD Order (Delivered & Paid, with Invoice)
    storefrontDelivered: {
      id: IDS.storefrontDeliveredOrderId,
      orderNumber: makeId('ORD-SF-2002'),
      storeId: IDS.storefrontStoreId,
      websiteId: IDS.storefrontWebsiteId,
      customerId: IDS.customerId,
      salesChannel: 'storefront',
      orderNiche: 'fashion',
      status: 'completed',
      orderType: 'online',
      subtotal: 120.00,
      shippingFee: 3.00,
      totalAmount: 123.00,
      currency: 'USD',
      deliveryStatus: 'delivered',
    },
    // Order 3: Store B Storefront COD Order (Returned & Refunded)
    storefrontRefunded: {
      id: IDS.storefrontRefundedOrderId,
      orderNumber: makeId('ORD-SF-2003'),
      storeId: IDS.storefrontStoreId,
      websiteId: IDS.storefrontWebsiteId,
      customerId: IDS.customerId,
      salesChannel: 'storefront',
      orderNiche: 'fashion',
      status: 'refunded',
      orderType: 'online',
      subtotal: 65.00,
      shippingFee: 0.00,
      totalAmount: 65.00,
      currency: 'USD',
      deliveryStatus: 'returned',
    },
  };

  const orderItems = {
    marketplaceItem: {
      id: IDS.orderItemMarketplaceId,
      orderId: IDS.marketplaceCodOrderId,
      productId: IDS.simpleProductId,
      variantId: null,
      quantity: 1,
      price: 35.00,
      total: 35.00,
    },
    deliveredItem: {
      id: IDS.orderItemDeliveredId,
      orderId: IDS.storefrontDeliveredOrderId,
      productId: IDS.variantProductId,
      variantId: IDS.variantRubyId,
      quantity: 2,
      price: 60.00,
      total: 120.00,
    },
    refundedItem: {
      id: IDS.orderItemRefundedId,
      orderId: IDS.storefrontRefundedOrderId,
      productId: IDS.variantProductId,
      variantId: IDS.variantSapphireId,
      quantity: 1,
      price: 65.00,
      total: 65.00,
    },
  };

  const payments = {
    marketplacePayment: {
      id: IDS.paymentMarketplaceId,
      orderId: IDS.marketplaceCodOrderId,
      storeId: IDS.marketplaceStoreId,
      amount: 35.00,
      paymentMethod: 'cod',
      status: 'pending',
      currency: 'USD',
      collectedAmount: 0.00,
      refundedAmount: 0.00,
      version: 0,
    },
    deliveredPayment: {
      id: IDS.paymentDeliveredId,
      orderId: IDS.storefrontDeliveredOrderId,
      storeId: IDS.storefrontStoreId,
      amount: 123.00,
      paymentMethod: 'cod',
      status: 'completed',
      currency: 'USD',
      collectedAmount: 123.00,
      collectedAt: new Date('2026-10-18T14:30:00.000Z'),
      refundedAmount: 0.00,
      version: 1,
    },
    refundedPayment: {
      id: IDS.paymentRefundedId,
      orderId: IDS.storefrontRefundedOrderId,
      storeId: IDS.storefrontStoreId,
      amount: 65.00,
      paymentMethod: 'cod',
      status: 'refunded',
      currency: 'USD',
      collectedAmount: 65.00,
      collectedAt: new Date('2026-10-17T10:00:00.000Z'),
      refundedAmount: 65.00,
      version: 2,
    },
  };

  const invoices = {
    deliveredInvoice: {
      id: IDS.invoiceDeliveredId,
      orderId: IDS.storefrontDeliveredOrderId,
      storeId: IDS.storefrontStoreId,
      websiteId: IDS.storefrontWebsiteId,
      paymentId: IDS.paymentDeliveredId,
      invoiceNumber: makeId('INV-SF-2002'),
      status: 'paid',
      dueDate: '2026-10-18',
      version: 1,
    },
  };

  const shippingDetails = {
    marketplaceShipping: {
      id: IDS.shippingMarketplaceId,
      orderId: IDS.marketplaceCodOrderId,
      address: 'No 12, St 178, Chey Chumneah, Phnom Penh',
      city: 'Phnom Penh',
      phoneNumber: '+85512345678',
      deliveryFee: 0.00,
      status: 'pending',
    },
    deliveredShipping: {
      id: IDS.shippingDeliveredId,
      orderId: IDS.storefrontDeliveredOrderId,
      address: 'Villa 45, St 310, Boeng Keng Kang, Phnom Penh',
      city: 'Phnom Penh',
      phoneNumber: '+85512345678',
      deliveryFee: 3.00,
      status: 'delivered',
    },
    refundedShipping: {
      id: IDS.shippingRefundedId,
      orderId: IDS.storefrontRefundedOrderId,
      address: 'Villa 45, St 310, Boeng Keng Kang, Phnom Penh',
      city: 'Phnom Penh',
      phoneNumber: '+85512345678',
      deliveryFee: 0.00,
      status: 'returned',
    },
  };

  const orderEvents = {
    refundConfirmed: {
      id: IDS.orderEventRefundId,
      orderId: IDS.storefrontRefundedOrderId,
      eventType: 'refund_confirmed',
      actorType: 'merchant',
      actorId: IDS.merchantStorefrontUserId,
      eventData: {
        amount: 65.00,
        currency: 'USD',
        reason: 'damaged_in_transit',
        refundMethod: 'cash',
        confirmedBy: 'Bopha Weaver',
      },
    },
  };

  // 13. Cross-Service Projections & ID Mappings
  const projections = {
    // StoreAccess (Commerce representation of Core Store)
    storeAccessMarketplace: {
      storeId: IDS.marketplaceStoreId,
      ownerUserId: IDS.merchantMarketplaceUserId,
      websiteId: null, // Marketplace-only store has NO website
      primaryCategory: 'Handicrafts & Pottery',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      marketplaceEntitlement: 'pilot',
      version: 1,
    },
    storeAccessStorefront: {
      storeId: IDS.storefrontStoreId,
      ownerUserId: IDS.merchantStorefrontUserId,
      websiteId: IDS.storefrontWebsiteId,
      primaryCategory: 'Fashion & Textiles',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      marketplaceEntitlement: 'standard',
      version: 1,
    },
    // WebsiteData (Commerce projection of Core Website)
    websiteDataStorefront: {
      id: makeId('31000000-0000-4000-8000-000000000001'),
      websiteId: IDS.storefrontWebsiteId,
      storeId: IDS.storefrontStoreId,
      userId: IDS.merchantStorefrontUserId,
      domain: makeId('mekong-silk.rentifymarket.test'),
      niche: 'fashion',
      status: 'active',
      staffData: [
        {
          id: IDS.staffId,
          userId: IDS.staffUserId,
          permissions: ['manage_pos', 'manage_products'],
        },
      ],
      userData: {
        id: IDS.merchantStorefrontUserId,
        name: 'Bopha Weaver',
        email: users.storefrontMerchant.email,
        phoneNumber: users.storefrontMerchant.phoneNumber,
        businessName: 'Mekong Silk Heritage',
      },
    },
    // StoreDeliveryPolicy (Commerce per-store COD policy)
    deliveryPolicyMarketplace: {
      storeId: IDS.marketplaceStoreId,
      codEnabled: true,
      deliveryFee: 0.00,
      freeDeliveryThreshold: 50.00,
    },
    deliveryPolicyStorefront: {
      storeId: IDS.storefrontStoreId,
      codEnabled: true,
      deliveryFee: 3.00,
      freeDeliveryThreshold: 100.00,
    },
  };

  const scenario = {
    ids: IDS,
    users,
    stores,
    template,
    websites,
    staff,
    coreBilling,
    sellerApplications,
    categories,
    products,
    productVariants,
    customers,
    carts,
    cartItems,
    orders,
    orderItems,
    payments,
    invoices,
    shippingDetails,
    orderEvents,
    projections,
  };

  if (options.overrides) {
    for (const [key, val] of Object.entries(options.overrides)) {
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        scenario[key] = { ...scenario[key], ...val };
      } else {
        scenario[key] = val;
      }
    }
  }

  return scenario;
}

module.exports = {
  createPlatformScenario,
};
