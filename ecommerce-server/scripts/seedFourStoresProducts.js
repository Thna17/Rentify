// ecommerce-server/scripts/seedFourStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products (with real Cloudinary images)
// for 4 marketplace-only stores.
//
// Run AFTER seedFourStores.js:
//   docker cp ecommerce-server/scripts/seedFourStoresProducts.js rentify-ecommerce-api-1:/app/scripts/
//   docker exec rentify-ecommerce-api-1 node scripts/seedFourStoresProducts.js
//
// Requires Cloudinary env vars and access to the local image directory mounted in the container.

const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

// ─── Cloudinary config (picked from environment) ────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Store IDs (must match seedFourStores.js) ────────────────────────────────
const CLOTH_OWNER_ID   = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PHONE_OWNER_ID   = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SCHOOL_OWNER_ID  = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SKINCARE_OWNER_ID= 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// These IDs come from the Store table created by seedFourStores — we look them
// up dynamically by ownerUserId so we don't hard-code generated UUIDs.

// ─── Image base directory (mounted or host path) ────────────────────────────
// When running inside Docker, mount or copy images first. If the path doesn't
// exist we fall back to placeholder URLs.
const IMG_BASE = process.env.SEED_IMG_DIR || '/app/seed-images';
const CLOTH_DIR   = path.join(IMG_BASE, 'Cloth Store', 'Cloth Store');
const PHONE_DIR   = path.join(IMG_BASE, 'Phone', 'Phone');
const SCHOOL_DIR  = path.join(IMG_BASE, 'School Supply', 'School Supply');
const SKINCARE_DIR= path.join(IMG_BASE, 'Skincare', 'Skincare');

// ─── Helpers ────────────────────────────────────────────────────────────────
const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.jxl']);

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => {
      const ext = path.extname(f).toLowerCase().replace('.jxl', '.jpg');
      return VALID_EXT.has(path.extname(f).toLowerCase()) && !f.startsWith('.');
    })
    .map((f) => path.join(dir, f));
}

function listImagesRecursive(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push(...listImagesRecursive(path.join(dir, entry.name)));
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (VALID_EXT.has(ext) && !entry.name.startsWith('.') && entry.name !== 'logo.png' && entry.name !== 'logo.jpg' && entry.name !== 'logo.jpeg') {
        results.push(path.join(dir, entry.name));
      }
    }
  }
  return results;
}

const uploadCache = new Map();

async function uploadImage(filePath, folder) {
  if (uploadCache.has(filePath)) return uploadCache.get(filePath);
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `rentify/marketplace/${folder}`,
      resource_type: 'image',
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    });
    const url = result.secure_url;
    uploadCache.set(filePath, url);
    console.log(`  📤 Uploaded: ${path.basename(filePath)} → ${url}`);
    return url;
  } catch (err) {
    console.warn(`  ⚠️  Upload failed for ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

async function uploadImages(filePaths, folder, limit = 5) {
  const urls = [];
  for (const fp of filePaths.slice(0, limit)) {
    const url = await uploadImage(fp, folder);
    if (url) urls.push({ url });
  }
  return urls;
}

function placeholder(name) {
  return [{ url: `https://placehold.co/600x600?text=${encodeURIComponent(name)}` }];
}

async function ensureStoreAccess(ownerUserId, opts) {
  // Fetch the store ID from the StoreAccess table (synced by core API)
  // or fall back to creating it directly with what we know.
  let sa = await StoreAccess.findOne({ where: { ownerUserId } });
  const payload = {
    ownerUserId,
    websiteId: null,
    primaryCategory: opts.primaryCategory,
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    version: 1,
    marketplaceEntitlement: 'pilot',
  };
  if (sa) {
    await sa.update({ ...payload, version: Math.max(sa.version, 1) });
    console.log(`✅ Updated StoreAccess: ${opts.name} (${sa.storeId})`);
    return sa.storeId;
  } else {
    // Shouldn't normally happen if syncStore ran, but handle gracefully
    console.warn(`⚠️  StoreAccess not found for ${opts.name} — the core-side sync may not have reached ecommerce-api yet.`);
    console.warn(`   Skipping store — re-run after core seed completes and commerce sync succeeds.`);
    return null;
  }
}

async function ensureDeliveryPolicy(storeId) {
  let policy = await StoreDeliveryPolicy.findByPk(storeId);
  if (!policy) {
    policy = await StoreDeliveryPolicy.create({
      storeId,
      flatFee: '2.00',
      currency: 'USD',
      version: 1,
    });
    console.log(`✅ Created DeliveryPolicy $2.00 for store ${storeId}`);
  } else {
    console.log(`⚡ DeliveryPolicy already exists for store ${storeId}`);
  }
  return policy;
}

async function upsertProduct(data) {
  const existing = await Product.findOne({
    where: { storeId: data.storeId, name: data.name },
  });
  if (existing) {
    await existing.update(data);
    return { product: existing, created: false };
  }
  const product = await Product.create(data);
  return { product, created: true };
}

// ─── Store 1: Cloth Store ────────────────────────────────────────────────────
async function seedClothStore(storeId) {
  console.log('\n👗 Seeding Cloth Store products...');
  const images = listImages(CLOTH_DIR);
  const hasImages = images.length > 0;

  const products = [
    {
      name: 'Casual Summer Dress',
      description: 'A lightweight, breathable summer dress perfect for everyday wear. Made from soft cotton fabric.',
      price: 18.99,
      compareAtPrice: 24.99,
      marketplaceCategory: 'Women\'s Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(0, 4) : [],
    },
    {
      name: 'Classic White Button-Up Shirt',
      description: 'A timeless white shirt suitable for both formal and casual occasions. Available in multiple sizes.',
      price: 14.50,
      compareAtPrice: 19.99,
      marketplaceCategory: 'Women\'s Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(4, 8) : [],
    },
    {
      name: 'Slim Fit Jeans',
      description: 'Modern slim-fit denim jeans with stretch fabric for maximum comfort throughout the day.',
      price: 22.00,
      compareAtPrice: 29.99,
      marketplaceCategory: 'Men\'s Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(8, 12) : [],
    },
    {
      name: 'Floral Midi Skirt',
      description: 'Beautiful floral-print midi skirt with elastic waistband. Great for spring and summer.',
      price: 16.99,
      compareAtPrice: 22.00,
      marketplaceCategory: 'Women\'s Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(12, 16) : [],
    },
    {
      name: 'Oversized Hoodie',
      description: 'Cozy oversized hoodie in a relaxed fit. Perfect for lounging or casual outings.',
      price: 25.00,
      compareAtPrice: 32.99,
      marketplaceCategory: 'Unisex Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(16, 20) : [],
    },
    {
      name: 'Linen Co-ord Set',
      description: 'Matching linen blouse and trousers set for a put-together look with minimal effort.',
      price: 29.99,
      compareAtPrice: 39.99,
      marketplaceCategory: 'Women\'s Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(20, 24) : [],
    },
    {
      name: 'Athletic Shorts',
      description: 'Lightweight quick-dry athletic shorts ideal for workouts, running, or casual wear.',
      price: 10.99,
      compareAtPrice: 15.00,
      marketplaceCategory: 'Activewear',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(24, 28) : [],
    },
    {
      name: 'Polo Shirt',
      description: 'Classic polo shirt in breathable pique fabric. Available in multiple colors.',
      price: 13.99,
      compareAtPrice: 18.99,
      marketplaceCategory: 'Men\'s Clothing',
      productType: 'clothing',
      imageFiles: hasImages ? images.slice(28, 32) : [],
    },
  ];

  for (const p of products) {
    const imageUrls = p.imageFiles.length > 0
      ? await uploadImages(p.imageFiles, 'cloth-store', 4)
      : placeholder(p.name);
    const { created } = await upsertProduct({
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      storeId,
      websiteId: null,
      marketplaceCategory: p.marketplaceCategory,
      marketplaceVisibility: true,
      websiteNiche: 'fashion',
      productType: p.productType,
      status: 'active',
      images: imageUrls,
    });
    console.log(`  ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Store 2: Phone Store ────────────────────────────────────────────────────
async function seedPhoneStore(storeId) {
  console.log('\n📱 Seeding Phone Store products...');

  const iphone11Dir = path.join(PHONE_DIR, 'Iphnone 11');
  const iphone12Dir = path.join(PHONE_DIR, 'Iphone 12');
  const iphone14Dir = path.join(PHONE_DIR, 'iphone 14');
  const iphone16Dir = path.join(PHONE_DIR, 'IPhone 16');
  const phoneMainImages = listImages(PHONE_DIR).filter(f => !fs.statSync(f).isDirectory());

  const products = [
    {
      name: 'iPhone 11',
      description: 'Apple iPhone 11 with 6.1-inch Liquid Retina display, A13 Bionic chip, and dual-camera system. Great value flagship.',
      price: 329.00,
      compareAtPrice: 399.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: listImages(iphone11Dir),
    },
    {
      name: 'iPhone 12',
      description: 'Apple iPhone 12 with 5G support, 6.1-inch Super Retina XDR display, and Ceramic Shield front. MagSafe compatible.',
      price: 429.00,
      compareAtPrice: 499.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: listImages(iphone12Dir),
    },
    {
      name: 'iPhone 14 Pro Max',
      description: 'Apple iPhone 14 Pro Max with Dynamic Island, 48MP main camera, and always-on display. Premium performance.',
      price: 699.00,
      compareAtPrice: 849.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: listImages(iphone14Dir),
    },
    {
      name: 'iPhone 16',
      description: 'Apple iPhone 16 with A18 chip, advanced camera system, and Apple Intelligence features. The latest generation.',
      price: 899.00,
      compareAtPrice: 999.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: listImages(iphone16Dir),
    },
    {
      name: 'iPhone 15 Pro Max',
      description: 'Apple iPhone 15 Pro Max with titanium design, 5x telephoto zoom, and USB-C connectivity.',
      price: 799.00,
      compareAtPrice: 949.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: phoneMainImages.filter(f => f.includes('15promax') || f.includes('15.jpg')),
    },
    {
      name: 'iPhone 12 Pro Max',
      description: 'Apple iPhone 12 Pro Max with ProRAW photography, Ceramic Shield, and 6.7-inch display.',
      price: 499.00,
      compareAtPrice: 599.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: phoneMainImages.filter(f => f.includes('12promax')),
    },
    {
      name: 'iPhone 13',
      description: 'Apple iPhone 13 with improved dual cameras, longer battery life, and A15 Bionic chip.',
      price: 379.00,
      compareAtPrice: 449.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: phoneMainImages.filter(f => f.includes('iphone13')),
    },
    {
      name: 'iPhone 17 Air',
      description: 'Apple iPhone 17 Air — ultra-thin design with next-gen A-series chip and advanced camera. Coming soon at pre-order price.',
      price: 1099.00,
      compareAtPrice: 1199.00,
      marketplaceCategory: 'Phones & Devices',
      imageFiles: phoneMainImages.filter(f => f.includes('17air')),
    },
  ];

  for (const p of products) {
    const imageUrls = p.imageFiles.length > 0
      ? await uploadImages(p.imageFiles, 'phone-store', 5)
      : placeholder(p.name);
    const { created } = await upsertProduct({
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      storeId,
      websiteId: null,
      marketplaceCategory: p.marketplaceCategory,
      marketplaceVisibility: true,
      websiteNiche: 'electronics',
      productType: 'device',
      status: 'active',
      images: imageUrls,
    });
    console.log(`  ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Store 3: School Supply Store ───────────────────────────────────────────
async function seedSchoolSupplyStore(storeId) {
  console.log('\n✏️  Seeding School Supply Store products...');
  const images = listImages(SCHOOL_DIR);
  const hasImages = images.length > 0;

  const products = [
    {
      name: 'Pilot FriXion Erasable Gel Pen Set (10-Pack)',
      description: 'Refillable erasable gel ink pens with fine point. 10 assorted colors. Ideal for notes and planners.',
      price: 12.99,
      compareAtPrice: 16.99,
      marketplaceCategory: 'Stationery',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('pilot') || f.toLowerCase().includes('pen')) : [],
    },
    {
      name: 'Uni-Ball Jetstream Lite Touch Pen',
      description: 'Smooth-writing ballpoint pen with ultra-low friction tip. Delivers consistent ink flow for comfortable writing.',
      price: 3.50,
      compareAtPrice: 5.00,
      marketplaceCategory: 'Stationery',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('jetstream') || f.toLowerCase().includes('uni')) : [],
    },
    {
      name: 'A4 Grid Paper Pack',
      description: 'Premium quality A4 grid/graph paper pack. 250 sheets, 5mm grid spacing. Great for math, sketching, and drafting.',
      price: 5.99,
      compareAtPrice: 7.99,
      marketplaceCategory: 'Paper & Notebooks',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('paper') || f.toLowerCase().includes('grid')) : [],
    },
    {
      name: 'Faber-Castell Graphite Pencil Set',
      description: 'Professional graphite pencil set with 12 grades from 2H to 8B. Essential for artists and students.',
      price: 9.99,
      compareAtPrice: 13.99,
      marketplaceCategory: 'Art Supplies',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('graphite') || f.toLowerCase().includes('faber') || f.toLowerCase().includes('liz')) : [],
    },
    {
      name: 'Japanese Stationery Pen (Blue)',
      description: 'Premium Japanese-made ballpoint pen. Smooth ink, ergonomic grip, refillable cartridge.',
      price: 4.50,
      compareAtPrice: 6.00,
      marketplaceCategory: 'Stationery',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('japanese') || f.toLowerCase().includes('768')) : [],
    },
    {
      name: 'Notebook Spiral Hardcover A5',
      description: 'Durable hardcover A5 spiral notebook. 200 lined pages, lay-flat design, pocket inside back cover.',
      price: 7.99,
      compareAtPrice: 10.99,
      marketplaceCategory: 'Paper & Notebooks',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('notebook') || f.toLowerCase().includes('img_4382')) : [],
    },
    {
      name: 'Multi-Pen 4-in-1 (Black, Blue, Red, Pencil)',
      description: 'Convenient 4-in-1 multi-function pen with black, blue, red ink, and a pencil — all in one slim body.',
      price: 6.99,
      compareAtPrice: 9.50,
      marketplaceCategory: 'Stationery',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('mp-') || f.toLowerCase().includes('media')) : [],
    },
    {
      name: 'Deco Mini Sticker Tape Set',
      description: 'Set of 10 decorative washi/sticker tapes. Great for planners, journals, and scrapbooking.',
      price: 8.50,
      compareAtPrice: 11.99,
      marketplaceCategory: 'Art Supplies',
      imageFiles: hasImages ? images.filter(f => f.toLowerCase().includes('xdcee') || f.toLowerCase().includes('images 5')) : [],
    },
  ];

  for (const p of products) {
    const fallback = images.slice(0, 3);
    const chosen = p.imageFiles.length > 0 ? p.imageFiles : fallback;
    const imageUrls = chosen.length > 0
      ? await uploadImages(chosen, 'school-supply-store', 4)
      : placeholder(p.name);
    const { created } = await upsertProduct({
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      storeId,
      websiteId: null,
      marketplaceCategory: p.marketplaceCategory,
      marketplaceVisibility: true,
      websiteNiche: 'ecommerce',
      productType: 'physical',
      status: 'active',
      images: imageUrls,
    });
    console.log(`  ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Store 4: Skincare Store ─────────────────────────────────────────────────
async function seedSkincareStore(storeId) {
  console.log('\n🧴 Seeding Skincare Store products...');

  const bodyWashDir   = path.join(SKINCARE_DIR, 'body wash');
  const faceWashDir   = path.join(SKINCARE_DIR, 'Face wash');
  const shampooDir    = path.join(SKINCARE_DIR, 'Shampoo');
  const sunscreenDir  = path.join(SKINCARE_DIR, 'sunscreen');

  const products = [
    // Body wash
    {
      name: 'Lux Botanicals Magical Orchid Body Wash',
      description: 'Luxurious body wash infused with magical orchid extract. Leaves skin soft and delicately fragrant.',
      price: 6.99,
      compareAtPrice: 9.99,
      marketplaceCategory: 'Body Care',
      productType: 'cleanser',
      imageFiles: listImages(bodyWashDir).filter(f => f.toLowerCase().includes('lux') || f.toLowerCase().includes('orchid')),
      folderImages: listImages(bodyWashDir),
    },
    {
      name: 'Lux Botanicals Soft Rose Body Wash 250ml',
      description: 'Gentle rose-scented body wash in a 250ml bottle. Moisturizing formula with natural botanical extracts.',
      price: 5.50,
      compareAtPrice: 7.99,
      marketplaceCategory: 'Body Care',
      productType: 'cleanser',
      imageFiles: listImages(bodyWashDir).filter(f => f.toLowerCase().includes('soft') || f.toLowerCase().includes('rose')),
      folderImages: listImages(bodyWashDir),
    },
    // Face wash
    {
      name: 'Cetaphil Daily Facial Cleanser 16oz',
      description: 'Gentle daily face wash for sensitive to oily skin. Dermatologist recommended, non-comedogenic formula.',
      price: 11.99,
      compareAtPrice: 15.99,
      marketplaceCategory: 'Face Care',
      productType: 'cleanser',
      imageFiles: listImages(faceWashDir).filter(f => f.toLowerCase().includes('cetaphil')),
      folderImages: listImages(faceWashDir),
    },
    {
      name: 'Activated Charcoal Face Wash',
      description: 'Deep-cleansing activated charcoal face wash. Removes impurities, excess oil, and unclogs pores effectively.',
      price: 8.99,
      compareAtPrice: 12.50,
      marketplaceCategory: 'Face Care',
      productType: 'cleanser',
      imageFiles: listImages(faceWashDir).filter(f => f.toLowerCase().includes('charcoal') || f.toLowerCase().includes('sw_')),
      folderImages: listImages(faceWashDir),
    },
    {
      name: 'Rose Face Wash Gentle Foam',
      description: 'Soft rose extract facial cleanser. Hydrating formula that cleanses without stripping natural moisture.',
      price: 7.50,
      compareAtPrice: 10.99,
      marketplaceCategory: 'Face Care',
      productType: 'cleanser',
      imageFiles: listImages(faceWashDir).filter(f => f.toLowerCase().includes('rose_face')),
      folderImages: listImages(faceWashDir),
    },
    // Shampoo
    {
      name: 'Passion Flower Moisturizing Shampoo 400ml',
      description: 'Hydrating shampoo with passion flower extract. Strengthens hair, reduces breakage, and adds shine.',
      price: 9.99,
      compareAtPrice: 13.99,
      marketplaceCategory: 'Hair Care',
      productType: 'cleanser',
      imageFiles: listImages(shampooDir).filter(f => f.toLowerCase().includes('passion') || f.toLowerCase().includes('80857634')),
      folderImages: listImages(shampooDir),
    },
    {
      name: 'Shea Butter Nourishing Shampoo',
      description: 'Rich shea butter shampoo for dry and damaged hair. Deeply nourishes while providing long-lasting moisture.',
      price: 10.99,
      compareAtPrice: 14.99,
      marketplaceCategory: 'Hair Care',
      productType: 'cleanser',
      imageFiles: listImages(shampooDir).filter(f => f.toLowerCase().includes('shea') || f.toLowerCase().includes('hero')),
      folderImages: listImages(shampooDir),
    },
    {
      name: 'Amla & Shikakai Herbal Shampoo 400ml',
      description: 'Traditional Ayurvedic shampoo with amla and shikakai. Promotes hair growth and strengthens roots naturally.',
      price: 8.50,
      compareAtPrice: 11.99,
      marketplaceCategory: 'Hair Care',
      productType: 'cleanser',
      imageFiles: listImages(shampooDir).filter(f => f.toLowerCase().includes('amla') || f.toLowerCase().includes('shikakai')),
      folderImages: listImages(shampooDir),
    },
    // Sunscreen
    {
      name: 'SPF 80 Mineral Sunscreen 80g',
      description: 'High-protection mineral sunscreen with SPF 80. Lightweight, non-greasy formula suitable for all skin types.',
      price: 12.99,
      compareAtPrice: 17.99,
      marketplaceCategory: 'Sun Care',
      productType: 'sunscreen',
      imageFiles: listImages(sunscreenDir).filter(f => f.toLowerCase().includes('nia') || f.toLowerCase().includes('listing_1st')),
      folderImages: listImages(sunscreenDir),
    },
    {
      name: 'Vitamin C Brightening Sunscreen',
      description: 'Dual-action sunscreen with Vitamin C for UV protection and skin brightening in one step.',
      price: 14.99,
      compareAtPrice: 19.99,
      marketplaceCategory: 'Sun Care',
      productType: 'sunscreen',
      imageFiles: listImages(sunscreenDir).filter(f => f.toLowerCase().includes('vitamin')),
      folderImages: listImages(sunscreenDir),
    },
    {
      name: 'Peach Glow Sunscreen SPF 50',
      description: 'Cute peach-scented SPF 50 sunscreen. Gives a subtle glow finish and is water-resistant for 80 minutes.',
      price: 10.99,
      compareAtPrice: 15.00,
      marketplaceCategory: 'Sun Care',
      productType: 'sunscreen',
      imageFiles: listImages(sunscreenDir).filter(f => f.toLowerCase().includes('peach')),
      folderImages: listImages(sunscreenDir),
    },
    {
      name: 'Invisible Instant Glow Sunscreen',
      description: 'Lightweight invisible sunscreen with instant glow effect. SPF 50+ broad-spectrum UV protection.',
      price: 11.50,
      compareAtPrice: 15.99,
      marketplaceCategory: 'Sun Care',
      productType: 'sunscreen',
      imageFiles: listImages(sunscreenDir).filter(f => f.toLowerCase().includes('sanfe') || f.toLowerCase().includes('invisible')),
      folderImages: listImages(sunscreenDir),
    },
  ];

  for (const p of products) {
    const chosen = p.imageFiles.length > 0 ? p.imageFiles : (p.folderImages || []).slice(0, 3);
    const imageUrls = chosen.length > 0
      ? await uploadImages(chosen, 'skincare-store', 4)
      : placeholder(p.name);
    const { created } = await upsertProduct({
      name: p.name,
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      storeId,
      websiteId: null,
      marketplaceCategory: p.marketplaceCategory,
      marketplaceVisibility: true,
      websiteNiche: 'skincare',
      productType: p.productType,
      status: 'active',
      images: imageUrls,
    });
    console.log(`  ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await sequelize.authenticate();
  console.log('✅ Commerce DB connected\n');

  const stores = [
    { ownerUserId: CLOTH_OWNER_ID,    name: 'Cloth Store',         category: 'Fashion',          seed: seedClothStore },
    { ownerUserId: PHONE_OWNER_ID,    name: 'Phone Store',          category: 'Electronics',      seed: seedPhoneStore },
    { ownerUserId: SCHOOL_OWNER_ID,   name: 'School Supply Store',  category: 'Other',            seed: seedSchoolSupplyStore },
    { ownerUserId: SKINCARE_OWNER_ID, name: 'Skincare Store',       category: 'Beauty & Skincare',seed: seedSkincareStore },
  ];

  for (const s of stores) {
    const storeId = await ensureStoreAccess(s.ownerUserId, { name: s.name, primaryCategory: s.category });
    if (!storeId) continue;
    await ensureDeliveryPolicy(storeId);
    await s.seed(storeId);
  }

  console.log('\n🎉 All 4 stores seeded successfully in Commerce API!');
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
