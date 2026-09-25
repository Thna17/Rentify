// ecommerce-server/scripts/seedFourStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products for 4 marketplace-only stores.
// Uses direct Unsplash image URLs with { url, alt } matching the pattern used by NexTech Electronics (:4600).
// Reliable on every machine, in Docker, and on clean installs with zero external configuration.

const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

// ─── Owner UUIDs & Store UUIDs (must match rentify-server/scripts/seedFourStores.js) ──
const CLOTH_OWNER    = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLOTH_STORE_ID = '4c5925a8-2eeb-405e-8525-1be9f3cd58be';

const PHONE_OWNER    = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PHONE_STORE_ID = 'c8daaa56-4e64-4907-9857-1b6c49ccb0ec';

const SCHOOL_OWNER    = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SCHOOL_STORE_ID = '56674a8e-5fec-4328-8130-ada835828cc9';

const SKINCARE_OWNER    = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SKINCARE_STORE_ID = '688a5f23-79df-4bc0-bd09-f53145084491';

// ─── Product catalogue matching NexTech Electronics Unsplash pattern ─────────
const CATALOGUE = {
  [CLOTH_OWNER]: {
    storeId: CLOTH_STORE_ID,
    primaryCategory: 'Fashion',
    products: [
      {
        name: 'Casual Summer Dress',
        price: 18.99,
        compareAtPrice: 24.99,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=800&auto=format&fit=crop&q=80', alt: 'Casual Summer Dress' }],
      },
      {
        name: 'Classic White Button-Up Shirt',
        price: 14.50,
        compareAtPrice: 19.99,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80', alt: 'Classic White Button-Up Shirt' }],
      },
      {
        name: 'Slim Fit Jeans',
        price: 22.00,
        compareAtPrice: 29.99,
        marketplaceCategory: "Men's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80', alt: 'Slim Fit Jeans' }],
      },
      {
        name: 'Floral Midi Skirt',
        price: 16.99,
        compareAtPrice: 22.00,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&auto=format&fit=crop&q=80', alt: 'Floral Midi Skirt' }],
      },
      {
        name: 'Oversized Hoodie',
        price: 25.00,
        compareAtPrice: 32.99,
        marketplaceCategory: 'Unisex Clothing',
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80', alt: 'Oversized Hoodie' }],
      },
      {
        name: 'Linen Co-ord Set',
        price: 29.99,
        compareAtPrice: 39.99,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80', alt: 'Linen Co-ord Set' }],
      },
      {
        name: 'Athletic Shorts',
        price: 10.99,
        compareAtPrice: 15.00,
        marketplaceCategory: 'Activewear',
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=80', alt: 'Athletic Shorts' }],
      },
      {
        name: 'Polo Shirt',
        price: 13.99,
        compareAtPrice: 18.99,
        marketplaceCategory: "Men's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [{ url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&auto=format&fit=crop&q=80', alt: 'Polo Shirt' }],
      },
    ],
  },

  [PHONE_OWNER]: {
    storeId: PHONE_STORE_ID,
    primaryCategory: 'Electronics',
    products: [
      {
        name: 'iPhone 11',
        price: 329.00,
        compareAtPrice: 399.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 11' }],
      },
      {
        name: 'iPhone 12',
        price: 429.00,
        compareAtPrice: 499.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 12' }],
      },
      {
        name: 'iPhone 14 Pro Max',
        price: 699.00,
        compareAtPrice: 849.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 14 Pro Max' }],
      },
      {
        name: 'iPhone 16',
        price: 899.00,
        compareAtPrice: 999.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 16' }],
      },
      {
        name: 'iPhone 15 Pro Max',
        price: 799.00,
        compareAtPrice: 949.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 15 Pro Max' }],
      },
      {
        name: 'iPhone 12 Pro Max',
        price: 499.00,
        compareAtPrice: 599.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 12 Pro Max' }],
      },
      {
        name: 'iPhone 13',
        price: 379.00,
        compareAtPrice: 449.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 13' }],
      },
      {
        name: 'iPhone 17 Air',
        price: 1099.00,
        compareAtPrice: 1199.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [{ url: 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=800&auto=format&fit=crop&q=80', alt: 'iPhone 17 Air' }],
      },
    ],
  },

  [SCHOOL_OWNER]: {
    storeId: SCHOOL_STORE_ID,
    primaryCategory: 'Other',
    products: [
      {
        name: 'Pilot FriXion Erasable Gel Pen Set (10-Pack)',
        price: 12.99,
        compareAtPrice: 16.99,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&auto=format&fit=crop&q=80', alt: 'Pilot FriXion Erasable Gel Pen Set' }],
      },
      {
        name: 'Uni-Ball Jetstream Lite Touch Pen',
        price: 3.50,
        compareAtPrice: 5.00,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&auto=format&fit=crop&q=80', alt: 'Uni-Ball Jetstream Lite Touch Pen' }],
      },
      {
        name: 'A4 Grid Paper Pack',
        price: 5.99,
        compareAtPrice: 7.99,
        marketplaceCategory: 'Paper & Notebooks',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80', alt: 'A4 Grid Paper Pack' }],
      },
      {
        name: 'Faber-Castell Graphite Pencil Set',
        price: 9.99,
        compareAtPrice: 13.99,
        marketplaceCategory: 'Art Supplies',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80', alt: 'Faber-Castell Graphite Pencil Set' }],
      },
      {
        name: 'Japanese Stationery Pen (Blue)',
        price: 4.50,
        compareAtPrice: 6.00,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=800&auto=format&fit=crop&q=80', alt: 'Japanese Stationery Pen (Blue)' }],
      },
      {
        name: 'Notebook Spiral Hardcover A5',
        price: 7.99,
        compareAtPrice: 10.99,
        marketplaceCategory: 'Paper & Notebooks',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80', alt: 'Notebook Spiral Hardcover A5' }],
      },
      {
        name: 'Multi-Pen 4-in-1 (Black, Blue, Red, Pencil)',
        price: 6.99,
        compareAtPrice: 9.50,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', alt: 'Multi-Pen 4-in-1' }],
      },
      {
        name: 'Deco Mini Sticker Tape Set',
        price: 8.50,
        compareAtPrice: 11.99,
        marketplaceCategory: 'Art Supplies',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [{ url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80', alt: 'Deco Mini Sticker Tape Set' }],
      },
    ],
  },

  [SKINCARE_OWNER]: {
    storeId: SKINCARE_STORE_ID,
    primaryCategory: 'Beauty & Skincare',
    products: [
      {
        name: 'Lux Botanicals Magical Orchid Body Wash',
        price: 6.99,
        compareAtPrice: 9.99,
        marketplaceCategory: 'Body Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1608248597359-bb43e7fb0213?w=800&auto=format&fit=crop&q=80', alt: 'Lux Botanicals Magical Orchid Body Wash' }],
      },
      {
        name: 'Lux Botanicals Soft Rose Body Wash 250ml',
        price: 5.50,
        compareAtPrice: 7.99,
        marketplaceCategory: 'Body Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80', alt: 'Lux Botanicals Soft Rose Body Wash' }],
      },
      {
        name: 'Cetaphil Daily Facial Cleanser 16oz',
        price: 11.99,
        compareAtPrice: 15.99,
        marketplaceCategory: 'Face Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80', alt: 'Cetaphil Daily Facial Cleanser' }],
      },
      {
        name: 'Activated Charcoal Face Wash',
        price: 8.99,
        compareAtPrice: 12.50,
        marketplaceCategory: 'Face Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1556228722-d0b71f3b3924?w=800&auto=format&fit=crop&q=80', alt: 'Activated Charcoal Face Wash' }],
      },
      {
        name: 'Rose Face Wash Gentle Foam',
        price: 7.50,
        compareAtPrice: 10.99,
        marketplaceCategory: 'Face Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80', alt: 'Rose Face Wash Gentle Foam' }],
      },
      {
        name: 'Passion Flower Moisturizing Shampoo 400ml',
        price: 9.99,
        compareAtPrice: 13.99,
        marketplaceCategory: 'Hair Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=800&auto=format&fit=crop&q=80', alt: 'Passion Flower Moisturizing Shampoo' }],
      },
      {
        name: 'Shea Butter Nourishing Shampoo',
        price: 10.99,
        compareAtPrice: 14.99,
        marketplaceCategory: 'Hair Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80', alt: 'Shea Butter Nourishing Shampoo' }],
      },
      {
        name: 'Amla & Shikakai Herbal Shampoo 400ml',
        price: 8.50,
        compareAtPrice: 11.99,
        marketplaceCategory: 'Hair Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [{ url: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80', alt: 'Amla & Shikakai Herbal Shampoo' }],
      },
      {
        name: 'SPF 80 Mineral Sunscreen 80g',
        price: 12.99,
        compareAtPrice: 17.99,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [{ url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80', alt: 'SPF 80 Mineral Sunscreen' }],
      },
      {
        name: 'Vitamin C Brightening Sunscreen',
        price: 14.99,
        compareAtPrice: 19.99,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [{ url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80', alt: 'Vitamin C Brightening Sunscreen' }],
      },
      {
        name: 'Peach Glow Sunscreen SPF 50',
        price: 10.99,
        compareAtPrice: 15.00,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [{ url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80', alt: 'Peach Glow Sunscreen SPF 50' }],
      },
      {
        name: 'Invisible Instant Glow Sunscreen',
        price: 11.50,
        compareAtPrice: 15.99,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [{ url: 'https://images.unsplash.com/photo-1608248597359-bb43e7fb0213?w=800&auto=format&fit=crop&q=80', alt: 'Invisible Instant Glow Sunscreen' }],
      },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function ensureStoreAccess(storeId, ownerUserId, primaryCategory) {
  let sa = await StoreAccess.findByPk(storeId);
  const payload = {
    storeId,
    ownerUserId,
    websiteId: null,
    primaryCategory,
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    version: 1,
    marketplaceEntitlement: 'pilot',
  };

  if (!sa) {
    const existing = await StoreAccess.findOne({ where: { ownerUserId } });
    if (existing) {
      await existing.update(payload);
      sa = existing;
      console.log(`  ⚡ Updated existing StoreAccess for ${primaryCategory} (${sa.storeId})`);
    } else {
      sa = await StoreAccess.create(payload);
      console.log(`  ✅ Created StoreAccess for ${primaryCategory} (${storeId})`);
    }
  } else {
    await sa.update(payload);
    console.log(`  ⚡ Updated StoreAccess for ${primaryCategory} (${storeId})`);
  }
  return sa.storeId;
}

async function ensureDeliveryPolicy(storeId) {
  let policy = await StoreDeliveryPolicy.findByPk(storeId);
  if (!policy) {
    await StoreDeliveryPolicy.create({
      storeId,
      flatFee: '2.00',
      currency: 'USD',
      version: 1,
    });
  } else {
    await policy.update({ flatFee: '2.00', currency: 'USD' });
  }
}

async function upsertProduct(storeId, p) {
  const existing = await Product.findOne({ where: { storeId, name: p.name } });
  if (existing) {
    await existing.update({
      images: p.images,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      marketplaceCategory: p.marketplaceCategory,
      status: 'active',
      stockQuantity: 100,
      marketplaceVisibility: true,
    });
    return false;
  }
  await Product.create({
    ...p,
    storeId,
    websiteId: null,
    marketplaceVisibility: true,
    status: 'active',
    stockQuantity: 100,
  });
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedFourStoresProducts() {
  console.log('🛍  Seeding 4-store marketplace products (Unsplash HD images like NexTech)...');

  for (const [ownerUserId, store] of Object.entries(CATALOGUE)) {
    const storeId = await ensureStoreAccess(store.storeId, ownerUserId, store.primaryCategory);
    await ensureDeliveryPolicy(storeId);
    console.log(`  📦 ${store.primaryCategory} store (${storeId})`);
    for (const p of store.products) {
      const created = await upsertProduct(storeId, p);
      console.log(`    ${created ? '✅' : '⚡'} ${p.name}`);
    }
  }

  // Ensure all 4 stores' products have status=active and stock=100
  const targetStoreIds = [CLOTH_STORE_ID, PHONE_STORE_ID, SCHOOL_STORE_ID, SKINCARE_STORE_ID];

  await sequelize.query(
    'UPDATE Products SET status = ?, stockQuantity = ?, updatedAt = NOW() WHERE storeId IN (?) AND (status != ? OR stockQuantity <= 0)',
    { replacements: ['active', 100, targetStoreIds, 'active'] }
  );

  console.log('✅ 4-store marketplace products seeded with verified Unsplash HD images');
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedFourStoresProducts();
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seedFourStoresProducts;
