// ecommerce-server/scripts/seedFourStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products for 4 marketplace-only stores.
// Uses direct Unsplash image URLs with { url, alt } matching the pattern used by NexTech Electronics (:4600).
// Multiple high-resolution angles/shots per product for rich marketplace presentation.

const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

// Helper to construct fast, responsive Unsplash image objects
const img = (id, alt) => ({
  url: `https://images.unsplash.com/${id}?w=800&auto=format&fit=crop&q=80`,
  alt,
});

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
        images: [
          img('photo-1515372039744-b8f02a3ae446', 'Casual Summer Dress - Front View'),
          img('photo-1496747611176-843222e1e57c', 'Casual Summer Dress - Lifestyle'),
          img('photo-1572804013309-59a88b7e92f1', 'Casual Summer Dress - Detail'),
        ],
      },
      {
        name: 'Classic White Button-Up Shirt',
        price: 14.50,
        compareAtPrice: 19.99,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1598033129183-c4f50c736f10', 'Classic White Button-Up Shirt - Front'),
          img('photo-1602810318383-e386cc2a3ccf', 'Classic White Button-Up Shirt - Model'),
          img('photo-1620799140408-edc6dcb6d633', 'Classic White Button-Up Shirt - Flat Lay'),
        ],
      },
      {
        name: 'Slim Fit Jeans',
        price: 22.00,
        compareAtPrice: 29.99,
        marketplaceCategory: "Men's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1541099649105-f69ad21f3246', 'Slim Fit Jeans - Blue Denim'),
          img('photo-1576995853123-5a10305d93c0', 'Slim Fit Jeans - Back Pocket Detail'),
        ],
      },
      {
        name: 'Floral Midi Skirt',
        price: 16.99,
        compareAtPrice: 22.00,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1583496661160-fb5886a0aaaa', 'Floral Midi Skirt - Front'),
          img('photo-1577900232427-18219b9166a0', 'Floral Midi Skirt - Style View'),
        ],
      },
      {
        name: 'Oversized Hoodie',
        price: 25.00,
        compareAtPrice: 32.99,
        marketplaceCategory: 'Unisex Clothing',
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1556905055-8f358a7a47b2', 'Oversized Hoodie - Front'),
          img('photo-1509967419530-da38b4704bc6', 'Oversized Hoodie - Streetwear Fit'),
        ],
      },
      {
        name: 'Linen Co-ord Set',
        price: 29.99,
        compareAtPrice: 39.99,
        marketplaceCategory: "Women's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1509631179647-0177331693ae', 'Linen Co-ord Set - Natural Tone'),
          img('photo-1515886657613-9f3515b0c78f', 'Linen Co-ord Set - Fashion View'),
        ],
      },
      {
        name: 'Athletic Shorts',
        price: 10.99,
        compareAtPrice: 15.00,
        marketplaceCategory: 'Activewear',
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1591195853828-11db59a44f6b', 'Athletic Shorts - Activewear'),
          img('photo-1506152983158-b4a74a01c721', 'Athletic Shorts - Training Fit'),
        ],
      },
      {
        name: 'Polo Shirt',
        price: 13.99,
        compareAtPrice: 18.99,
        marketplaceCategory: "Men's Clothing",
        websiteNiche: 'fashion',
        productType: 'clothing',
        images: [
          img('photo-1581655353564-df123a1eb820', 'Polo Shirt - Classic Fit'),
          img('photo-1521572267360-ee0c2909d518', 'Polo Shirt - Casual Style'),
        ],
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
        images: [
          img('photo-1574944985070-8f3ebc6b79d2', 'iPhone 11 - Display View'),
          img('photo-1565849904461-04a58ad377e0', 'iPhone 11 - In Hand'),
        ],
      },
      {
        name: 'iPhone 12',
        price: 429.00,
        compareAtPrice: 499.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1605236453806-6ff36851218e', 'iPhone 12 - Pacific Blue'),
          img('photo-1591337676887-a217a6970a8a', 'iPhone 12 - Dual Camera Detail'),
        ],
      },
      {
        name: 'iPhone 14 Pro Max',
        price: 699.00,
        compareAtPrice: 849.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1695048133142-1a20484d2569', 'iPhone 14 Pro Max - Front Display'),
          img('photo-1511707171634-5f897ff02aa9', 'iPhone 14 Pro Max - Triple Camera Array'),
        ],
      },
      {
        name: 'iPhone 16',
        price: 899.00,
        compareAtPrice: 999.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1510557880182-3d4d3cba35a5', 'iPhone 16 - Modern Titanium Finish'),
          img('photo-1580910051074-3eb694886505', 'iPhone 16 - Side Profile'),
        ],
      },
      {
        name: 'iPhone 15 Pro Max',
        price: 799.00,
        compareAtPrice: 949.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1695048133142-1a20484d2569', 'iPhone 15 Pro Max - Natural Titanium'),
          img('photo-1603791440384-56cd371ee9a7', 'iPhone 15 Pro Max - Pro Camera System'),
        ],
      },
      {
        name: 'iPhone 12 Pro Max',
        price: 499.00,
        compareAtPrice: 599.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1603791440384-56cd371ee9a7', 'iPhone 12 Pro Max - Premium Finish'),
          img('photo-1605236453806-6ff36851218e', 'iPhone 12 Pro Max - Back Housing'),
        ],
      },
      {
        name: 'iPhone 13',
        price: 379.00,
        compareAtPrice: 449.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1592750475338-74b7b21085ab', 'iPhone 13 - Midnight Black'),
          img('photo-1530319067432-f2a729c03db5', 'iPhone 13 - Starlight White'),
        ],
      },
      {
        name: 'iPhone 17 Air',
        price: 1099.00,
        compareAtPrice: 1199.00,
        marketplaceCategory: 'Phones & Devices',
        websiteNiche: 'electronics',
        productType: 'device',
        images: [
          img('photo-1565849904461-04a58ad377e0', 'iPhone 17 Air - Ultra Slim Chassis'),
          img('photo-1510557880182-3d4d3cba35a5', 'iPhone 17 Air - Edge-to-Edge OLED'),
        ],
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
        images: [
          img('photo-1585776245991-cf89dd7fc73a', 'Pilot FriXion Erasable Gel Pens - Pack'),
          img('photo-1583485088034-697b5bc54ccd', 'Pilot FriXion Pen - Writing Tip'),
        ],
      },
      {
        name: 'Uni-Ball Jetstream Lite Touch Pen',
        price: 3.50,
        compareAtPrice: 5.00,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1583485088034-697b5bc54ccd', 'Uni-Ball Jetstream Pen - In Action'),
          img('photo-1569683795645-b62e50fbf103', 'Uni-Ball Jetstream Pen - Blue Barrel'),
        ],
      },
      {
        name: 'A4 Grid Paper Pack',
        price: 5.99,
        compareAtPrice: 7.99,
        marketplaceCategory: 'Paper & Notebooks',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1607604276583-eef5d076aa5f', 'A4 Grid Paper - Stack'),
          img('photo-1544716278-ca5e3f4abd8c', 'A4 Grid Paper - Close-up Lines'),
        ],
      },
      {
        name: 'Faber-Castell Graphite Pencil Set',
        price: 9.99,
        compareAtPrice: 13.99,
        marketplaceCategory: 'Art Supplies',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1513542789411-b6a5d4f31634', 'Faber-Castell Graphite Pencils - Arranged'),
          img('photo-1585776245991-cf89dd7fc73a', 'Faber-Castell Pencils - Sharpened Tips'),
        ],
      },
      {
        name: 'Japanese Stationery Pen (Blue)',
        price: 4.50,
        compareAtPrice: 6.00,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1569683795645-b62e50fbf103', 'Japanese Stationery Pen - Blue Edition'),
          img('photo-1583485088034-697b5bc54ccd', 'Japanese Stationery Pen - Calligraphy'),
        ],
      },
      {
        name: 'Notebook Spiral Hardcover A5',
        price: 7.99,
        compareAtPrice: 10.99,
        marketplaceCategory: 'Paper & Notebooks',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1544716278-ca5e3f4abd8c', 'Spiral Hardcover Notebook A5 - Closed'),
          img('photo-1531346878377-a5be20888e57', 'Spiral Hardcover Notebook A5 - Open on Desk'),
        ],
      },
      {
        name: 'Multi-Pen 4-in-1 (Black, Blue, Red, Pencil)',
        price: 6.99,
        compareAtPrice: 9.50,
        marketplaceCategory: 'Stationery',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1618005182384-a83a8bd57fbe', 'Multi-Pen 4-in-1 - Body & Selector'),
          img('photo-1595152772835-219674b2a8a6', 'Multi-Pen 4-in-1 - Color Samples'),
        ],
      },
      {
        name: 'Deco Mini Sticker Tape Set',
        price: 8.50,
        compareAtPrice: 11.99,
        marketplaceCategory: 'Art Supplies',
        websiteNiche: 'ecommerce',
        productType: 'physical',
        images: [
          img('photo-1586075010923-2dd4570fb338', 'Deco Mini Sticker Tapes - Rolls'),
          img('photo-1531346878377-a5be20888e57', 'Deco Mini Sticker Tapes - Crafting View'),
        ],
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
        images: [
          img('photo-1556228720-195a672e8a03', 'Magical Orchid Body Wash Bottle'),
          img('photo-1601049541289-9b1b7bbbfe19', 'Magical Orchid Body Wash - Lather'),
        ],
      },
      {
        name: 'Lux Botanicals Soft Rose Body Wash 250ml',
        price: 5.50,
        compareAtPrice: 7.99,
        marketplaceCategory: 'Body Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1556228720-195a672e8a03', 'Soft Rose Body Wash 250ml Bottle'),
          img('photo-1571781926291-c477ebfd024b', 'Soft Rose Body Wash - Pump Detail'),
        ],
      },
      {
        name: 'Cetaphil Daily Facial Cleanser 16oz',
        price: 11.99,
        compareAtPrice: 15.99,
        marketplaceCategory: 'Face Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1570172619644-dfd03ed5d881', 'Cetaphil Daily Facial Cleanser Bottle'),
          img('photo-1556228720-195a672e8a03', 'Cetaphil Daily Facial Cleanser - Dispenser'),
        ],
      },
      {
        name: 'Activated Charcoal Face Wash',
        price: 8.99,
        compareAtPrice: 12.50,
        marketplaceCategory: 'Face Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1556228720-195a672e8a03', 'Activated Charcoal Face Wash Tube'),
          img('photo-1526947425960-945c6e72858f', 'Activated Charcoal Face Wash - Texture'),
        ],
      },
      {
        name: 'Rose Face Wash Gentle Foam',
        price: 7.50,
        compareAtPrice: 10.99,
        marketplaceCategory: 'Face Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1598440947619-2c35fc9aa908', 'Rose Gentle Foam Pump Bottle'),
          img('photo-1571781926291-c477ebfd024b', 'Rose Gentle Foam - Foam Head'),
        ],
      },
      {
        name: 'Passion Flower Moisturizing Shampoo 400ml',
        price: 9.99,
        compareAtPrice: 13.99,
        marketplaceCategory: 'Hair Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1535585209827-a15fcdbc4c2d', 'Passion Flower Shampoo Bottle'),
          img('photo-1522337360788-8b13dee7a37e', 'Passion Flower Shampoo - Botanical Ingredients'),
        ],
      },
      {
        name: 'Shea Butter Nourishing Shampoo',
        price: 10.99,
        compareAtPrice: 14.99,
        marketplaceCategory: 'Hair Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1522337360788-8b13dee7a37e', 'Shea Butter Nourishing Shampoo Bottle'),
          img('photo-1535585209827-a15fcdbc4c2d', 'Shea Butter Nourishing Shampoo - Rich Texture'),
        ],
      },
      {
        name: 'Amla & Shikakai Herbal Shampoo 400ml',
        price: 8.50,
        compareAtPrice: 11.99,
        marketplaceCategory: 'Hair Care',
        websiteNiche: 'skincare',
        productType: 'cleanser',
        images: [
          img('photo-1527799820374-dcf8d9d4a388', 'Amla & Shikakai Herbal Shampoo Bottle'),
          img('photo-1522337360788-8b13dee7a37e', 'Amla & Shikakai Herbal Shampoo - Natural Extracts'),
        ],
      },
      {
        name: 'SPF 80 Mineral Sunscreen 80g',
        price: 12.99,
        compareAtPrice: 17.99,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [
          img('photo-1598440947619-2c35fc9aa908', 'SPF 80 Mineral Sunscreen Tube'),
          img('photo-1570172619644-dfd03ed5d881', 'SPF 80 Mineral Sunscreen - Outdoor Protection'),
        ],
      },
      {
        name: 'Vitamin C Brightening Sunscreen',
        price: 14.99,
        compareAtPrice: 19.99,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [
          img('photo-1620916566398-39f1143ab7be', 'Vitamin C Brightening Sunscreen Bottle'),
          img('photo-1617897903246-719242758050', 'Vitamin C Brightening Sunscreen - Glowing Glow'),
        ],
      },
      {
        name: 'Peach Glow Sunscreen SPF 50',
        price: 10.99,
        compareAtPrice: 15.00,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [
          img('photo-1598440947619-2c35fc9aa908', 'Peach Glow Sunscreen SPF 50 Tube'),
          img('photo-1599305090598-fe179d501227', 'Peach Glow Sunscreen - Cream Swatch'),
        ],
      },
      {
        name: 'Invisible Instant Glow Sunscreen',
        price: 11.50,
        compareAtPrice: 15.99,
        marketplaceCategory: 'Sun Care',
        websiteNiche: 'skincare',
        productType: 'sunscreen',
        images: [
          img('photo-1601049541289-9b1b7bbbfe19', 'Invisible Instant Glow Sunscreen Bottle'),
          img('photo-1617897903246-719242758050', 'Invisible Instant Glow Sunscreen - Clear Finish'),
        ],
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
  console.log('🛍  Seeding 4-store marketplace products (Unsplash HD multi-images like NexTech)...');

  for (const [ownerUserId, store] of Object.entries(CATALOGUE)) {
    const storeId = await ensureStoreAccess(store.storeId, ownerUserId, store.primaryCategory);
    await ensureDeliveryPolicy(storeId);
    console.log(`  📦 ${store.primaryCategory} store (${storeId})`);
    for (const p of store.products) {
      const created = await upsertProduct(storeId, p);
      console.log(`    ${created ? '✅' : '⚡'} ${p.name} (${p.images.length} images)`);
    }
  }

  // Ensure all 4 stores' products have status=active and stock=100
  const targetStoreIds = [CLOTH_STORE_ID, PHONE_STORE_ID, SCHOOL_STORE_ID, SKINCARE_STORE_ID];

  await sequelize.query(
    'UPDATE Products SET status = ?, stockQuantity = ?, updatedAt = NOW() WHERE storeId IN (?) AND (status != ? OR stockQuantity <= 0)',
    { replacements: ['active', 100, targetStoreIds, 'active'] }
  );

  console.log('✅ 4-store marketplace products seeded with verified Unsplash HD gallery images');
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedFourStoresProducts();
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seedFourStoresProducts;
