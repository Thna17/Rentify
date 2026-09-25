// ecommerce-server/scripts/seedFourStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products for 4 marketplace-only stores.
// Called automatically from seed.js.
//
// Image upload behaviour:
//   - If CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET are set
//     AND SEED_IMG_DIR exists with images → uploads real images to Cloudinary.
//   - Otherwise → seeds with clean placeholder images (works on any machine).
//
// To upload real images on your machine:
//   docker cp "C:/Users/User/Downloads/Telegram Desktop/." rentify-ecommerce-api-1:/app/seed-images/
//   docker exec -e CLOUDINARY_CLOUD_NAME=... -e CLOUDINARY_API_KEY=... \
//     -e CLOUDINARY_API_SECRET=... -e SEED_IMG_DIR=/app/seed-images \
//     rentify-ecommerce-api-1 node scripts/seedFourStoresProducts.js

const path = require('path');
const fs = require('fs');
const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

// ─── Owner UUIDs (must match seedFourStores.js) ──────────────────────────────
const CLOTH_OWNER   = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PHONE_OWNER   = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SCHOOL_OWNER  = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SKINCARE_OWNER= 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

// ─── Cloudinary (optional) ───────────────────────────────────────────────────
function getCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) return null;
  try {
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary;
  } catch {
    return null;
  }
}

// ─── Image helpers ────────────────────────────────────────────────────────────
const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.jxl']);
const IMG_BASE = process.env.SEED_IMG_DIR || '/app/seed-images';
const uploadCache = new Map();

function listImages(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => VALID_EXT.has(path.extname(f).toLowerCase()) && !f.startsWith('.'))
    .map(f => path.join(dir, f));
}

async function uploadImage(cloudinary, filePath, folder) {
  if (uploadCache.has(filePath)) return uploadCache.get(filePath);
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `rentify/marketplace/${folder}`,
      resource_type: 'image',
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    });
    uploadCache.set(filePath, result.secure_url);
    return result.secure_url;
  } catch {
    return null;
  }
}

async function buildImages(cloudinary, filePaths, folder, limit = 4) {
  if (cloudinary && filePaths.length > 0) {
    const urls = [];
    for (const fp of filePaths.slice(0, limit)) {
      const url = await uploadImage(cloudinary, fp, folder);
      if (url) urls.push({ url });
    }
    if (urls.length > 0) return urls;
  }
  // Fallback: clean placeholder
  return [{ url: `https://placehold.co/600x600/f3f4f6/64748b?text=${encodeURIComponent(folder.replace(/-/g, '+'))}` }];
}

// ─── Store helpers ────────────────────────────────────────────────────────────
async function ensureStoreAccess(ownerUserId, { primaryCategory }) {
  const sa = await StoreAccess.findOne({ where: { ownerUserId } });
  if (!sa) return null;
  await sa.update({
    primaryCategory,
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    marketplaceEntitlement: 'pilot',
  });
  return sa.storeId;
}

async function ensureDeliveryPolicy(storeId) {
  const [policy] = await StoreDeliveryPolicy.findOrCreate({
    where: { storeId },
    defaults: { storeId, flatFee: '2.00', currency: 'USD', version: 1 },
  });
  return policy;
}

async function upsertProduct(data) {
  const existing = await Product.findOne({ where: { storeId: data.storeId, name: data.name } });
  if (existing) {
    // Only update images/status if they need fixing (idempotent)
    await existing.update({ status: data.status, marketplaceVisibility: data.marketplaceVisibility, stockQuantity: data.stockQuantity });
    return false;
  }
  await Product.create(data);
  return true;
}

// ─── Store 1: Cloth Store ─────────────────────────────────────────────────────
async function seedClothStore(storeId, cloudinary) {
  console.log('  👗 Cloth Store...');
  const dir = path.join(IMG_BASE, 'Cloth Store', 'Cloth Store');
  const imgs = listImages(dir);

  const products = [
    { name: 'Casual Summer Dress', price: 18.99, compareAtPrice: 24.99, marketplaceCategory: "Women's Clothing", imgs: imgs.slice(0, 4) },
    { name: 'Classic White Button-Up Shirt', price: 14.50, compareAtPrice: 19.99, marketplaceCategory: "Women's Clothing", imgs: imgs.slice(4, 8) },
    { name: 'Slim Fit Jeans', price: 22.00, compareAtPrice: 29.99, marketplaceCategory: "Men's Clothing", imgs: imgs.slice(8, 12) },
    { name: 'Floral Midi Skirt', price: 16.99, compareAtPrice: 22.00, marketplaceCategory: "Women's Clothing", imgs: imgs.slice(12, 16) },
    { name: 'Oversized Hoodie', price: 25.00, compareAtPrice: 32.99, marketplaceCategory: 'Unisex Clothing', imgs: imgs.slice(16, 20) },
    { name: 'Linen Co-ord Set', price: 29.99, compareAtPrice: 39.99, marketplaceCategory: "Women's Clothing", imgs: imgs.slice(20, 24) },
    { name: 'Athletic Shorts', price: 10.99, compareAtPrice: 15.00, marketplaceCategory: 'Activewear', imgs: imgs.slice(24, 28) },
    { name: 'Polo Shirt', price: 13.99, compareAtPrice: 18.99, marketplaceCategory: "Men's Clothing", imgs: imgs.slice(28, 32) },
  ];

  for (const p of products) {
    const images = await buildImages(cloudinary, p.imgs, 'cloth-store');
    const created = await upsertProduct({ name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, storeId, websiteId: null, marketplaceCategory: p.marketplaceCategory, marketplaceVisibility: true, websiteNiche: 'fashion', productType: 'clothing', status: 'active', stockQuantity: 100, images });
    console.log(`    ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Store 2: Phone Store ─────────────────────────────────────────────────────
async function seedPhoneStore(storeId, cloudinary) {
  console.log('  📱 Phone Store...');
  const phoneDir = path.join(IMG_BASE, 'Phone', 'Phone');

  const products = [
    { name: 'iPhone 11', price: 329.00, compareAtPrice: 399.00, imgs: listImages(path.join(phoneDir, 'Iphnone 11')) },
    { name: 'iPhone 12', price: 429.00, compareAtPrice: 499.00, imgs: listImages(path.join(phoneDir, 'Iphone 12')) },
    { name: 'iPhone 14 Pro Max', price: 699.00, compareAtPrice: 849.00, imgs: listImages(path.join(phoneDir, 'iphone 14')) },
    { name: 'iPhone 16', price: 899.00, compareAtPrice: 999.00, imgs: listImages(path.join(phoneDir, 'IPhone 16')) },
    { name: 'iPhone 15 Pro Max', price: 799.00, compareAtPrice: 949.00, imgs: listImages(phoneDir).filter(f => f.includes('15promax') || f.includes('15.jpg')) },
    { name: 'iPhone 12 Pro Max', price: 499.00, compareAtPrice: 599.00, imgs: listImages(phoneDir).filter(f => f.includes('12promax')) },
    { name: 'iPhone 13', price: 379.00, compareAtPrice: 449.00, imgs: listImages(phoneDir).filter(f => f.includes('iphone13')) },
    { name: 'iPhone 17 Air', price: 1099.00, compareAtPrice: 1199.00, imgs: listImages(phoneDir).filter(f => f.includes('17air')) },
  ];

  for (const p of products) {
    const images = await buildImages(cloudinary, p.imgs, 'phone-store', 5);
    const created = await upsertProduct({ name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, storeId, websiteId: null, marketplaceCategory: 'Phones & Devices', marketplaceVisibility: true, websiteNiche: 'electronics', productType: 'device', status: 'active', stockQuantity: 100, images });
    console.log(`    ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Store 3: School Supply Store ────────────────────────────────────────────
async function seedSchoolStore(storeId, cloudinary) {
  console.log('  ✏️  School Supply Store...');
  const dir = path.join(IMG_BASE, 'School Supply', 'School Supply');
  const imgs = listImages(dir);

  const products = [
    { name: 'Pilot FriXion Erasable Gel Pen Set (10-Pack)', price: 12.99, compareAtPrice: 16.99, marketplaceCategory: 'Stationery' },
    { name: 'Uni-Ball Jetstream Lite Touch Pen', price: 3.50, compareAtPrice: 5.00, marketplaceCategory: 'Stationery' },
    { name: 'A4 Grid Paper Pack (250 sheets)', price: 5.99, compareAtPrice: 7.99, marketplaceCategory: 'Paper & Notebooks' },
    { name: 'Faber-Castell Graphite Pencil Set', price: 9.99, compareAtPrice: 13.99, marketplaceCategory: 'Art Supplies' },
    { name: 'Japanese Stationery Pen (Blue)', price: 4.50, compareAtPrice: 6.00, marketplaceCategory: 'Stationery' },
    { name: 'Spiral Hardcover Notebook A5', price: 7.99, compareAtPrice: 10.99, marketplaceCategory: 'Paper & Notebooks' },
    { name: 'Multi-Pen 4-in-1 (Black, Blue, Red, Pencil)', price: 6.99, compareAtPrice: 9.50, marketplaceCategory: 'Stationery' },
    { name: 'Deco Mini Sticker Tape Set', price: 8.50, compareAtPrice: 11.99, marketplaceCategory: 'Art Supplies' },
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const slice = imgs.slice(i * 2, i * 2 + 3);
    const images = await buildImages(cloudinary, slice, 'school-supply-store');
    const created = await upsertProduct({ name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, storeId, websiteId: null, marketplaceCategory: p.marketplaceCategory, marketplaceVisibility: true, websiteNiche: 'ecommerce', productType: 'physical', status: 'active', stockQuantity: 100, images });
    console.log(`    ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Store 4: Skincare Store ──────────────────────────────────────────────────
async function seedSkincareStore(storeId, cloudinary) {
  console.log('  🧴 Skincare Store...');
  const base = path.join(IMG_BASE, 'Skincare', 'Skincare');

  const products = [
    { name: 'Lux Botanicals Magical Orchid Body Wash', price: 6.99, compareAtPrice: 9.99, cat: 'Body Care', type: 'cleanser', dir: 'body wash' },
    { name: 'Lux Botanicals Soft Rose Body Wash 250ml', price: 5.50, compareAtPrice: 7.99, cat: 'Body Care', type: 'cleanser', dir: 'body wash' },
    { name: 'Cetaphil Daily Facial Cleanser 16oz', price: 11.99, compareAtPrice: 15.99, cat: 'Face Care', type: 'cleanser', dir: 'Face wash' },
    { name: 'Activated Charcoal Face Wash', price: 8.99, compareAtPrice: 12.50, cat: 'Face Care', type: 'cleanser', dir: 'Face wash' },
    { name: 'Rose Face Wash Gentle Foam', price: 7.50, compareAtPrice: 10.99, cat: 'Face Care', type: 'cleanser', dir: 'Face wash' },
    { name: 'Passion Flower Moisturizing Shampoo 400ml', price: 9.99, compareAtPrice: 13.99, cat: 'Hair Care', type: 'cleanser', dir: 'Shampoo' },
    { name: 'Shea Butter Nourishing Shampoo', price: 10.99, compareAtPrice: 14.99, cat: 'Hair Care', type: 'cleanser', dir: 'Shampoo' },
    { name: 'Amla & Shikakai Herbal Shampoo 400ml', price: 8.50, compareAtPrice: 11.99, cat: 'Hair Care', type: 'cleanser', dir: 'Shampoo' },
    { name: 'SPF 80 Mineral Sunscreen 80g', price: 12.99, compareAtPrice: 17.99, cat: 'Sun Care', type: 'sunscreen', dir: 'sunscreen' },
    { name: 'Vitamin C Brightening Sunscreen', price: 14.99, compareAtPrice: 19.99, cat: 'Sun Care', type: 'sunscreen', dir: 'sunscreen' },
    { name: 'Peach Glow Sunscreen SPF 50', price: 10.99, compareAtPrice: 15.00, cat: 'Sun Care', type: 'sunscreen', dir: 'sunscreen' },
    { name: 'Invisible Instant Glow Sunscreen', price: 11.50, compareAtPrice: 15.99, cat: 'Sun Care', type: 'sunscreen', dir: 'sunscreen' },
  ];

  const seenDirs = {};
  for (const p of products) {
    if (!seenDirs[p.dir]) seenDirs[p.dir] = { imgs: listImages(path.join(base, p.dir)), idx: 0 };
    const bucket = seenDirs[p.dir];
    const slice = bucket.imgs.slice(bucket.idx, bucket.idx + 3);
    bucket.idx += 3;
    const images = await buildImages(cloudinary, slice, 'skincare-store');
    const created = await upsertProduct({ name: p.name, price: p.price, compareAtPrice: p.compareAtPrice, storeId, websiteId: null, marketplaceCategory: p.cat, marketplaceVisibility: true, websiteNiche: 'skincare', productType: p.type, status: 'active', stockQuantity: 100, images });
    console.log(`    ${created ? '✅' : '⚡'} ${p.name}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedFourStoresProducts() {
  console.log('🛍  Seeding 4-store marketplace products...');

  const cloudinary = getCloudinary();
  if (cloudinary) {
    console.log('  📤 Cloudinary configured — will upload real images');
  } else {
    console.log('  🖼  No Cloudinary config — using placeholder images');
  }

  const stores = [
    { ownerUserId: CLOTH_OWNER,    label: 'Cloth Store',         category: 'Fashion',           seed: seedClothStore },
    { ownerUserId: PHONE_OWNER,    label: 'Phone Store',          category: 'Electronics',       seed: seedPhoneStore },
    { ownerUserId: SCHOOL_OWNER,   label: 'School Supply Store',  category: 'Other',             seed: seedSchoolStore },
    { ownerUserId: SKINCARE_OWNER, label: 'Skincare Store',       category: 'Beauty & Skincare', seed: seedSkincareStore },
  ];

  for (const s of stores) {
    const storeId = await ensureStoreAccess(s.ownerUserId, { primaryCategory: s.category });
    if (!storeId) {
      console.log(`  ⚠️  StoreAccess not found for ${s.label} — core seed may not have run yet. Skipping.`);
      continue;
    }
    await ensureDeliveryPolicy(storeId);
    await s.seed(storeId, cloudinary);
  }

  // Ensure all seeded products have status=active (bypass inventory hook)
  const storeIds = await StoreAccess.findAll({
    where: { ownerUserId: [CLOTH_OWNER, PHONE_OWNER, SCHOOL_OWNER, SKINCARE_OWNER] },
    attributes: ['storeId'],
  }).then(rows => rows.map(r => r.storeId));

  if (storeIds.length > 0) {
    await sequelize.query(
      'UPDATE Products SET status = ?, stockQuantity = ?, updatedAt = NOW() WHERE storeId IN (?) AND status = ?',
      { replacements: ['active', 100, storeIds, 'out_of_stock'] }
    );
  }

  console.log('✅ 4-store marketplace products seeded');
}

// Allow running standalone
if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedFourStoresProducts();
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seedFourStoresProducts;
