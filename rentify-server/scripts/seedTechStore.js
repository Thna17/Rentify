// rentify-server/scripts/seedTechStore.js
const sequelize = require('../src/config/db');
const { Store, Website, User, Staff, SellerApplication } = require('../src/models');

const TECH_MERCHANT_ID = '55555555-5555-4555-8555-555555555555';
const TECH_STAFF_ID = '66666666-6666-4666-8666-666666666666';
const TECH_WEBSITE_ID = '8c90a1b2-3b4c-5d6e-9f0a-1b2c3d4e5f60';
// Used only when the merchant has no Store yet (a fresh database). Core assigns
// Store ids, so an existing database keeps the Store it already has.
const DEFAULT_TECH_STORE_ID = '719d9c55-b338-4ded-9c1a-231a0b1863b9';

async function seedTechStore() {
  console.log('⚡ Ensuring NexTech Electronics store setup in Core API...');
  await sequelize.authenticate();

  // 1. Ensure Store exists and is approved for Marketplace. A merchant owns at
  // most one Store (uq_stores_owner), so reuse the one linked to the website or
  // owned by the merchant before creating one.
  const website = await Website.findByPk(TECH_WEBSITE_ID);
  let store =
    (website?.storeId && (await Store.findByPk(website.storeId))) ||
    (await Store.findOne({ where: { ownerUserId: TECH_MERCHANT_ID } }));
  const TECH_STORE_ID = store?.id || DEFAULT_TECH_STORE_ID;
  const storePayload = {
    ownerUserId: TECH_MERCHANT_ID,
    name: 'NexTech Electronics',
    primaryCategory: 'Electronics',
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    projectionVersion: 3,
    marketplaceEntitlement: 'pilot',
  };

  if (!store) {
    store = await Store.create({ ...storePayload, id: TECH_STORE_ID, slug: `store-${TECH_STORE_ID}` });
    console.log('✅ Created NexTech Store in Core');
  } else {
    await store.update(storePayload);
    console.log('✅ Updated NexTech Store in Core');
  }

  // 2. Link Website to Store
  if (website && website.storeId !== TECH_STORE_ID) {
    await website.update({ storeId: TECH_STORE_ID });
    console.log('✅ Linked NexTech Website to Store');
  }

  // 3. Ensure Staff has proper permissions and links
  const staff = await Staff.findByPk(TECH_STAFF_ID);
  if (staff) {
    await staff.update({
      merchantId: TECH_MERCHANT_ID,
      websiteId: TECH_WEBSITE_ID,
      permissions: [
        'manage_products',
        'manage_orders',
        'manage_invoices',
        'manage_pos',
        'manage_settings',
        'manage_analytics',
        'manage_staff',
      ],
      isActive: true,
      isVerified: true,
    });
    console.log('✅ Updated tech.staff permissions');
  }

  // 4. Ensure SellerApplication is approved
  const existingApp = await SellerApplication.findOne({ where: { storeId: TECH_STORE_ID } });
  const appData = {
    storeId: TECH_STORE_ID,
    status: 'approved',
    responsibleName: 'Alex Tech Merchant',
    pickupLocation: 'No. 88, Russian Blvd, Toul Kork, Phnom Penh',
    buyerContact: '+85512000004',
    sampleProductDescription: 'High performance consumer electronics, smartwatches, wireless audio, and computing accessories.',
    acceptsDeliveryResponsibility: true,
    acceptsCodResponsibility: true,
    acceptsReturnsResponsibility: true,
    acceptsRefundResponsibility: true,
    submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    reviewedAt: new Date(),
  };

  if (!existingApp) {
    await SellerApplication.create(appData);
    console.log('✅ Created approved SellerApplication for NexTech');
  } else {
    await existingApp.update(appData);
    console.log('✅ Approved existing SellerApplication for NexTech');
  }

  console.log('🚀 NexTech Electronics Core setup complete!');
  return TECH_STORE_ID;
}

if (require.main === module) {
  seedTechStore()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedTechStore;
