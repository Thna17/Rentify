const { sequelize } = require('../config/db');
const { Product, StoreAccess, StoreDeliveryPolicy } = require('../models');
const { canonicalCategory } = require('../config/marketplaceTaxonomy');
const { setDeliveryPolicy } = require('../modules/checkout/marketplaceCheckoutService');

const examples = [
  { websiteId: '7b8f9e01-2a3b-4c5d-8e9f-0a1b2c3d4e5f', fee: '2.50', products: [
    ['p1111111-1111-4111-8111-111111111111', 'Gentle Foaming Cleanser', 'Skincare'],
    ['p2222222-2222-4222-8222-222222222222', 'Purifying Balancing Toner', 'Skincare'],
    ['p3333333-3333-4333-8333-333333333333', 'Radiance Hyaluronic Acid Serum', 'Skincare'],
    ['p4444444-4444-4444-8444-444444444444', 'Vitamin C Brightening Face Oil', 'Skincare'],
    ['p5555555-5555-4555-8555-555555555555', 'Deep Barrier Hydrating Cream', 'Skincare'],
    ['p6666666-6666-4666-8666-666666666666', 'Invisible Shield Mineral Sunscreen SPF 50', 'Skincare'],
  ] },
  { websiteId: '8c90a1b2-3b4c-5d6e-9f0a-1b2c3d4e5f60', fee: '3.00', products: [
    ['p7777777-7777-4777-8777-777777777771', 'AuraSound Wireless ANC Headphones', 'Electronics Accessories'],
    ['p7777777-7777-4777-8777-777777777772', 'PulseBuds Pro True Wireless Earbuds', 'Electronics Accessories'],
    ['p7777777-7777-4777-8777-777777777773', 'Apex Horizon Titanium Smartwatch', 'Phones & Devices'],
    ['p7777777-7777-4777-8777-777777777774', 'Vortex Mechanical 75% Keyboard', 'Electronics Accessories'],
    ['p7777777-7777-4777-8777-777777777775', 'ErgoLift Aluminum Laptop Stand', 'Electronics Accessories'],
    ['p7777777-7777-4777-8777-777777777776', 'OmniPower 100W GaN Fast Charger', 'Electronics Accessories'],
  ] },
];

async function run() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Mock marketplace seeding is development-only');
  }
  const report = [];
  for (const example of examples) {
    const store = await StoreAccess.findOne({ where: { websiteId: example.websiteId } });
    if (!store) throw new Error(`No Commerce Store projection for ${example.websiteId}`);
    let classified = 0;
    for (const [id, name, category] of example.products) {
      if (!canonicalCategory(category)) throw new Error(`Invalid marketplace category ${category}`);
      const product = await Product.findByPk(id);
      if (!product || product.name !== name || product.websiteId !== example.websiteId ||
          product.storeId !== store.storeId) {
        throw new Error(`Expected mock Product ${name} was not found in the Store`);
      }
      if (product.marketplaceCategory && product.marketplaceCategory !== category) {
        throw new Error(`${name} already has a different marketplace category`);
      }
      if (!product.marketplaceCategory) {
        await product.update({ marketplaceCategory: category, version: product.version + 1 });
        classified += 1;
      }
    }
    let policy = await StoreDeliveryPolicy.findByPk(store.storeId);
    if (!policy) policy = await setDeliveryPolicy(store.storeId, { flatFee: example.fee });
    report.push({ storeId: store.storeId, classified, products: example.products.length,
      deliveryFee: policy.flatFee });
  }
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
