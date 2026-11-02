// rentify-server/scripts/update_subscription_packages.js
// Idempotently synchronizes the Package table with the revised $8 Starter & $15 Pro pricing,
// and ensures all packages (including $0 Free) have storefront capability and correct product/staff limits.

const sequelize = require('../src/config/db');
const { Package } = require('../src/models');

const STARTER_PKG_ID = '44444444-4444-4444-8444-444444444441';
const GROWTH_PKG_ID = '44444444-4444-4444-8444-444444444442';
const ENTERPRISE_PKG_ID = '44444444-4444-4444-8444-444444444443';

const PACKAGES = [
  {
    id: STARTER_PKG_ID,
    name: 'Free',
    price: 0.0,
    duration: '1 month',
    features: [
      'basic-dashboard',
      'product-management',
      'order-management',
      'marketplace',
      'store',
      'pos',
      'invoice',
      'Store and one catalog',
      'Sell on Rentify Marketplace',
      'Own storefront (subdomain + templates)',
      'POS at the counter',
      'KHQR Payments',
    ],
    limits: {
      staff: 1,
      storage: 1024,
      products: 25,
      whoItsFor: 'Micro-seller, new seller',
      commission: 'Only on marketplace orders',
      storeAndCatalog: true,
      marketplace: true,
      ownStorefront: true,
      pos: true,
      proTools: false,
    },
  },
  {
    id: GROWTH_PKG_ID,
    name: 'Starter',
    price: 8.0,
    duration: '1 month',
    features: [
      'basic-dashboard',
      'product-management',
      'order-management',
      'marketplace',
      'store',
      'pos',
      'invoice',
      'Store and one catalog',
      'Sell on Rentify Marketplace (100 products)',
      'Own storefront (subdomain + templates)',
      'POS at the counter',
      '2 Staff accounts',
      '14-day free trial',
      'KHQR Payments',
    ],
    limits: {
      staff: 2,
      storage: 5120,
      products: 100,
      trialDays: 14,
      whoItsFor: 'Shop with a counter or brand',
      commission: 'Only on marketplace orders',
      storeAndCatalog: true,
      marketplace: true,
      ownStorefront: true,
      pos: true,
      proTools: false,
    },
  },
  {
    id: ENTERPRISE_PKG_ID,
    name: 'Pro',
    price: 15.0,
    duration: '1 month',
    features: [
      'basic-dashboard',
      'product-management',
      'order-management',
      'marketplace',
      'store',
      'pos',
      'invoice',
      'advanced-analytics',
      'Store and one catalog',
      'Sell on Rentify Marketplace (500 products)',
      'Own storefront + Custom Domain',
      'POS at the counter',
      '5 Staff accounts',
      'Custom Domain',
      'Telegram Order Notifications',
      'Advanced analytics & marketing tools',
      '14-day free trial',
      'KHQR Payments',
    ],
    limits: {
      staff: 5,
      storage: 20480,
      products: 500,
      trialDays: 14,
      whoItsFor: 'Growing shop & brand',
      commission: 'Only on marketplace orders',
      storeAndCatalog: true,
      marketplace: true,
      ownStorefront: true,
      pos: true,
      proTools: true,
    },
  },
];

async function updatePackages() {
  console.log('🔄 Updating subscription packages in database...');
  await sequelize.authenticate();

  for (const pkg of PACKAGES) {
    let existing = await Package.findByPk(pkg.id);
    if (!existing) {
      existing = await Package.findOne({ where: { name: pkg.name } });
    }

    if (existing) {
      existing.name = pkg.name;
      existing.price = pkg.price;
      existing.duration = pkg.duration;
      existing.features = pkg.features;
      existing.limits = pkg.limits;
      existing.changed('features', true);
      existing.changed('limits', true);
      await existing.save();
      console.log(`✅ Updated package "${pkg.name}" (${existing.id}) -> $${pkg.price}/mo, limits:`, pkg.limits);
    } else {
      await Package.create(pkg);
      console.log(`✅ Created package "${pkg.name}" (${pkg.id}) -> $${pkg.price}/mo`);
    }
  }

  console.log('🎉 Subscription packages successfully synchronized.');
}

if (require.main === module) {
  updatePackages()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Failed to update subscription packages:', err);
      process.exit(1);
    });
}

module.exports = { updatePackages };
