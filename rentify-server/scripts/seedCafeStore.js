// rentify-server/scripts/seedCafeStore.js
// Mekong Brew: the Template 3 (café) demo store, published at
// mekong-brew.<HOSTED_STOREFRONT_DOMAIN>. Its menu is seeded by
// ecommerce-server/scripts/seedCafeStore.js. Called from seed.js.
const bcrypt = require('bcrypt');
const { User, Website, WebsiteContent, Subscription, Store, SellerApplication } = require('../src/models');
const storeSyncService = require('../src/services/storeSyncService');
const {
  TEMPLATE_3_ID,
  TEMPLATE_3_SECTION_FIELDS,
  CAFE_MERCHANT_ID,
  CAFE_WEBSITE_ID,
  DEFAULT_CAFE_STORE_ID,
  CAFE_SECTION_VALUES,
  CAFE_IDENTITY_CONTENT,
} = require('./cafeTemplate');

const STARTER_PKG_ID = '44444444-4444-4444-8444-444444444441';
const CAFE_NAME = 'Mekong Brew';

async function upsert(model, where, values) {
  const existing = await model.findOne({ where });
  if (existing) return existing.update(values);
  return model.create(values);
}

async function seedCafeStore({ passwordHash } = {}) {
  console.log('☕ Seeding Mekong Brew (Template 3 café demo)...');
  // Deployed environments set SEED_MERCHANT_PASSWORD; the default is public in the repository.
  const password = passwordHash || (await bcrypt.hash(process.env.SEED_MERCHANT_PASSWORD || 'Merchant@12345', 10));

  await upsert(User, { id: CAFE_MERCHANT_ID }, {
    id: CAFE_MERCHANT_ID,
    name: 'Dara Café Merchant',
    email: 'cafe.merchant@rentify.local',
    phoneNumber: '+85512000006',
    password,
    role: 'user',
    isVerified: true,
  });

  const websiteValues = {
    userId: CAFE_MERCHANT_ID,
    templateId: TEMPLATE_3_ID,
    name: CAFE_NAME,
    domain: 'localhost:4650',
    subdomain: 'mekong-brew',
    status: 'active',
  };
  let website = await Website.findByPk(CAFE_WEBSITE_ID);
  if (!website) {
    website = await Website.create({
      id: CAFE_WEBSITE_ID,
      ...websiteValues,
      limits: { staff: 2, storage: 1024, products: 50 },
      currentUsage: { staff: 0, storage: 60, products: 11 },
    });
  } else {
    await website.update(websiteValues);
  }

  let subscription = await Subscription.findOne({ where: { websiteId: CAFE_WEBSITE_ID } });
  if (!subscription) {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    subscription = await Subscription.create({
      userId: CAFE_MERCHANT_ID,
      packageId: STARTER_PKG_ID,
      websiteId: CAFE_WEBSITE_ID,
      startDate,
      endDate,
      status: 'trial',
    });
  }
  if (website.subscriptionId !== subscription.id) await website.update({ subscriptionId: subscription.id });

  const contents = [
    ...CAFE_IDENTITY_CONTENT.map(([category, label, type, value]) => ({ category, label, type, value })),
    ...TEMPLATE_3_SECTION_FIELDS.filter(([, label]) => CAFE_SECTION_VALUES[label] !== undefined).map(
      ([category, label, type = 'text']) => ({
        category,
        label,
        type,
        value: type === 'image' ? CAFE_SECTION_VALUES[label] : { text: CAFE_SECTION_VALUES[label] },
      })
    ),
  ];
  for (const content of contents) {
    await upsert(
      WebsiteContent,
      { websiteId: CAFE_WEBSITE_ID, category: content.category, label: content.label },
      { websiteId: CAFE_WEBSITE_ID, ...content }
    );
  }

  // A merchant owns at most one Store (uq_stores_owner): reuse the one linked
  // to the website or owned by the merchant before creating one.
  let store =
    (website.storeId && (await Store.findByPk(website.storeId))) ||
    (await Store.findOne({ where: { ownerUserId: CAFE_MERCHANT_ID } }));
  const storeValues = {
    ownerUserId: CAFE_MERCHANT_ID,
    name: CAFE_NAME,
    primaryCategory: 'Food & Beverage',
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    marketplaceEntitlement: 'pilot',
  };
  if (!store) {
    store = await Store.create({ ...storeValues, id: DEFAULT_CAFE_STORE_ID, slug: `store-${DEFAULT_CAFE_STORE_ID}`, projectionVersion: 1 });
  } else {
    await store.update({ ...storeValues, projectionVersion: store.projectionVersion + 1 });
  }
  if (website.storeId !== store.id) await website.update({ storeId: store.id });

  await upsert(SellerApplication, { storeId: store.id }, {
    storeId: store.id,
    status: 'approved',
    responsibleName: 'Dara Café Merchant',
    pickupLocation: 'No. 24, Street 240, Daun Penh, Phnom Penh',
    buyerContact: '+85512000006',
    sampleProductDescription: 'Specialty coffee, tea, pastries and roasted coffee beans.',
    acceptsDeliveryResponsibility: true,
    acceptsCodResponsibility: true,
    acceptsReturnsResponsibility: true,
    acceptsRefundResponsibility: true,
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(),
  });

  await storeSyncService.queueStore(store, { websiteId: CAFE_WEBSITE_ID });
  console.log('✅ Mekong Brew ready');
  return store.id;
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
