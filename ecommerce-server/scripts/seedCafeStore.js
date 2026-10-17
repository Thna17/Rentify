// ecommerce-server/scripts/seedCafeStore.js
// Mekong Brew's menu: the Template 3 (café) demo store. Core's side (website,
// content, Store) is rentify-server/scripts/seedCafeStore.js; the ids must match.
// Called from seed.js.
const { sequelize } = require('../config/db');
const {
  WebsiteData,
  StoreAccess,
  StoreDeliveryPolicy,
  Category,
  Product,
  ProductOption,
  ProductVariant,
} = require('../models');

const TEMPLATE_3_ID = '56245606-c064-4507-85cb-05a611cb3d8f';
const CAFE_MERCHANT_ID = '1aa7d5ff-31ae-4057-9f8f-353ea8991fd8';
const CAFE_WEBSITE_ID = '4effbe7b-55fa-479b-a73f-eaee81189136';
// Core assigns Store ids. Used only when Core has not projected the café's
// Store to Commerce yet (a fresh database); it matches the id Core's seed uses then.
const DEFAULT_CAFE_STORE_ID = 'a6b158b9-f18d-4bee-a3c4-56b585da3d49';

const image = (id, alt) => ({ url: `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop&q=80`, alt });
const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const CATEGORIES = [
  { id: 'e3a1c0de-0001-4c0f-8e00-000000000001', name: 'Espresso Bar', photo: '1509042239860-f550ce710b93' },
  { id: 'e3a1c0de-0002-4c0f-8e00-000000000002', name: 'Iced & Cold Brew', photo: '1461023058943-07fcbe16d735' },
  { id: 'e3a1c0de-0003-4c0f-8e00-000000000003', name: 'Tea & Matcha', photo: '1515823064-d6e0c04616a7' },
  { id: 'e3a1c0de-0004-4c0f-8e00-000000000004', name: 'Bakery', photo: '1555507036-ab1f4038808a' },
  { id: 'e3a1c0de-0005-4c0f-8e00-000000000005', name: 'Beans to Take Home', photo: '1447933601403-0c6688de566e' },
];
const [ESPRESSO, ICED, TEA, BAKERY, BEANS] = CATEGORIES.map((category) => category.id);

// productType must be one the cafe niche allows: beverage, food, combo, merchandise.
const PRODUCTS = [
  {
    id: 'e3a1f00d-0001-4c0f-8e00-000000000001', categoryId: ICED, name: 'Khmer Iced Coffee', price: 2.25,
    productType: 'beverage', photo: '1461023058943-07fcbe16d735', createdAt: daysAgo(5),
    shortDescription: 'Dark-roast Mondulkiri coffee over ice with sweet condensed milk.',
    description: 'Dark-roast Mondulkiri coffee over ice with sweet condensed milk.\nThe Phnom Penh classic, made properly.',
  },
  {
    id: 'e3a1f00d-0002-4c0f-8e00-000000000002', categoryId: ESPRESSO, name: 'Flat White', price: 2.75,
    productType: 'beverage', photo: '1541167760496-1628856ab772',
    description: 'Double ristretto with silky steamed milk.',
  },
  {
    id: 'e3a1f00d-0003-4c0f-8e00-000000000003', categoryId: ESPRESSO, name: 'Cappuccino', price: 2.5,
    productType: 'beverage', photo: '1572442388796-11668a67e53d',
    description: 'Espresso, steamed milk and a thick cap of foam.',
  },
  {
    id: 'e3a1f00d-0004-4c0f-8e00-000000000004', categoryId: ESPRESSO, name: 'Caffè Latte', price: 2.75,
    productType: 'beverage', photo: '1517701604599-bb29b565090c',
    description: 'Smooth and milky, with our single-origin espresso.\nChoose a regular or a large cup.',
    sizes: [
      { id: 'e3a1ba5e-0004-4c0f-8e00-000000000041', value: 'Regular', price: 2.75 },
      { id: 'e3a1ba5e-0004-4c0f-8e00-000000000042', value: 'Large', price: 3.25 },
    ],
  },
  {
    id: 'e3a1f00d-0005-4c0f-8e00-000000000005', categoryId: ESPRESSO, name: 'Americano', price: 2.0,
    productType: 'beverage', photo: '1509042239860-f550ce710b93',
    description: 'Two shots of espresso lengthened with hot water.',
  },
  {
    id: 'e3a1f00d-0006-4c0f-8e00-000000000006', categoryId: ICED, name: 'Cold Brew', price: 3.0, compareAtPrice: 3.5,
    productType: 'beverage', photo: '1534778101976-62847782c213',
    description: 'Steeped for 18 hours. Chocolatey and low in acidity.',
  },
  {
    id: 'e3a1f00d-0007-4c0f-8e00-000000000007', categoryId: ICED, name: 'Coconut Cold Brew', price: 3.5,
    productType: 'beverage', photo: '1485808191679-5f86510681a2', createdAt: daysAgo(3),
    description: 'Cold brew shaken with fresh Kampot coconut water.',
  },
  {
    id: 'e3a1f00d-0008-4c0f-8e00-000000000008', categoryId: TEA, name: 'Iced Matcha Latte', price: 3.25,
    productType: 'beverage', photo: '1515823064-d6e0c04616a7',
    description: 'Ceremonial-grade matcha whisked with oat milk.',
  },
  {
    id: 'e3a1f00d-0009-4c0f-8e00-000000000009', categoryId: BAKERY, name: 'Butter Croissant', price: 1.75,
    productType: 'food', photo: '1555507036-ab1f4038808a', trackInventory: true, stockQuantity: 24,
    description: 'Baked every morning with French butter.',
  },
  {
    id: 'e3a1f00d-0010-4c0f-8e00-000000000010', categoryId: BAKERY, name: 'Palm Sugar Cookie', price: 1.25,
    productType: 'food', photo: '1558961363-fa8fdf82db35', trackInventory: true, stockQuantity: 30,
    description: 'Chewy cookie sweetened with Kampong Speu palm sugar.',
  },
  {
    id: 'e3a1f00d-0011-4c0f-8e00-000000000011', categoryId: BEANS, name: 'Mondulkiri House Blend · 250g', price: 9.5,
    productType: 'merchandise', photo: '1447933601403-0c6688de566e', trackInventory: true, stockQuantity: 40,
    description: 'Medium roast with notes of cacao and toasted nuts. Whole beans.',
  },
];

async function seedCafeStore() {
  console.log('☕ Seeding Mekong Brew menu in Commerce API...');
  await sequelize.authenticate();

  const websitePayload = {
    id: CAFE_WEBSITE_ID,
    websiteId: CAFE_WEBSITE_ID,
    userId: CAFE_MERCHANT_ID,
    domain: 'localhost:4650',
    niche: 'cafe',
    status: 'active',
    websiteTemplateId: TEMPLATE_3_ID,
    businessConfig: { takeaway: true, delivery: true },
    userData: {
      id: CAFE_MERCHANT_ID,
      name: 'Dara Café Merchant',
      email: 'cafe.merchant@rentify.local',
      businessName: 'Mekong Brew',
      phoneNumber: '+85512000006',
    },
    staffData: [],
    package: {
      name: 'Free Trial',
      limits: { staff: 2, storage: 1024, products: 50 },
      features: ['basic-dashboard', 'product-management', 'order-management', 'store', 'invoice', 'pos'],
    },
  };
  let websiteData = await WebsiteData.findOne({ where: { websiteId: CAFE_WEBSITE_ID } });
  if (!websiteData) websiteData = await WebsiteData.create(websitePayload);
  else await websiteData.update(websitePayload);

  // Reuse the Store Core already linked to the website (StoreAccess.websiteId
  // is unique) instead of creating a second one.
  let storeAccess =
    (await StoreAccess.findOne({ where: { websiteId: CAFE_WEBSITE_ID } })) ||
    (await StoreAccess.findOne({ where: { ownerUserId: CAFE_MERCHANT_ID } }));
  const storeId = storeAccess?.storeId || DEFAULT_CAFE_STORE_ID;
  if (!storeAccess) storeAccess = await StoreAccess.findByPk(storeId);
  const accessPayload = {
    storeId,
    ownerUserId: CAFE_MERCHANT_ID,
    websiteId: CAFE_WEBSITE_ID,
    primaryCategory: 'Food & Beverage',
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    marketplaceEntitlement: 'pilot',
  };
  if (!storeAccess) await StoreAccess.create({ ...accessPayload, version: 1 });
  else await storeAccess.update(accessPayload);
  if (websiteData.storeId !== storeId) await websiteData.update({ storeId });

  const policy = await StoreDeliveryPolicy.findByPk(storeId);
  if (!policy) await StoreDeliveryPolicy.create({ storeId, flatFee: '1.00', currency: 'USD', version: 1 });

  for (const category of CATEGORIES) {
    const values = {
      id: category.id,
      websiteId: CAFE_WEBSITE_ID,
      storeId,
      name: category.name,
      image: image(category.photo, category.name).url.replace('w=800', 'w=500'),
      status: 'active',
    };
    const existing = await Category.findByPk(category.id);
    if (existing) await existing.update(values);
    else await Category.create(values);
  }

  for (const item of PRODUCTS) {
    const { sizes, photo, createdAt, ...rest } = item;
    const values = {
      ...rest,
      websiteId: CAFE_WEBSITE_ID,
      storeId,
      websiteNiche: 'cafe',
      compareAtPrice: rest.compareAtPrice ?? null,
      trackInventory: rest.trackInventory ?? false,
      stockQuantity: rest.stockQuantity ?? 0,
      status: 'active',
      marketplaceCategory: 'Food & Beverage',
      marketplaceVisibility: true,
      images: [image(photo, rest.name)],
    };
    let product = await Product.findByPk(item.id);
    if (product) await product.update(values);
    else product = await Product.create({ ...values, ...(createdAt && { createdAt }) });

    if (sizes) {
      const optionValues = { productId: product.id, name: 'Size', type: 'select', values: sizes.map(({ value }) => ({ value })) };
      const option = await ProductOption.findOne({ where: { productId: product.id, name: 'Size' } });
      if (option) await option.update(optionValues);
      else await ProductOption.create(optionValues);

      for (const size of sizes) {
        const variantValues = {
          id: size.id,
          productId: product.id,
          sku: `MB-LATTE-${size.value.toUpperCase()}`,
          price: size.price,
          // Drinks are made to order, so sizes are not stock-counted.
          trackInventory: false,
          stockQuantity: 0,
          optionValues: { Size: size.value },
          status: 'active',
        };
        const variant = await ProductVariant.findByPk(size.id);
        if (variant) await variant.update(variantValues);
        else await ProductVariant.create(variantValues);
      }
    }
  }

  console.log(`✅ Mekong Brew menu ready (${CATEGORIES.length} categories, ${PRODUCTS.length} items)`);
}

if (require.main === module) {
  seedCafeStore()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedCafeStore;
