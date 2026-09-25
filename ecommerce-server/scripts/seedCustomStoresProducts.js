// ecommerce-server/scripts/seedCustomStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products for the 5 custom
// stores created by rentify-server/scripts/seedCustomStores.js, uploading
// the merchant's OWN photos from ecommerce-server/seed-images/<slug>/ to
// Cloudinary. Not wired into the main seed chain — run by hand:
//
//   docker cp "seed-images/." rentify-ecommerce-api-1:/app/seed-images/
//   docker compose exec \
//     -e CLOUDINARY_CLOUD_NAME=... -e CLOUDINARY_API_KEY=... -e CLOUDINARY_API_SECRET=... \
//     ecommerce-api node scripts/seedCustomStoresProducts.js
//
// (seed-images/ is bind-mounted from the host already, so the docker cp step
// is only needed if you copied photos in after the container started.)

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

let cloudinary = null;
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const IMG_BASE = process.env.SEED_IMG_DIR || path.join(__dirname, '..', 'seed-images');
const VALID_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const uploadCache = new Map();

async function uploadImage(filePath, folder) {
  if (uploadCache.has(filePath)) return uploadCache.get(filePath);
  if (!cloudinary) return null;
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `rentify/marketplace/${folder}`,
      resource_type: 'image',
      transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
    });
    uploadCache.set(filePath, result.secure_url);
    return result.secure_url;
  } catch (err) {
    console.warn(`    ⚠️  Upload failed for ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => VALID_EXT.has(path.extname(f).toLowerCase()) && !f.startsWith('.') && !/logo/i.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

/** Deterministic-ish price in [min, max], seeded by name so reruns are stable. */
function priceFor(name, min, max) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const span = max - min;
  return Math.round((min + (hash % 1000) / 1000 * span) * 100) / 100;
}

// ─── Store definitions (must match rentify-server/scripts/seedCustomStores.js) ─
const STORES = [
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000001',
    storeId: '22222222-cafe-4002-8002-000000000001',
    slug: 'phone-corner',
    primaryCategory: 'Electronics',
    marketplaceCategory: 'Phones & Tablets',
    websiteNiche: 'electronics',
    productType: 'device',
    priceRange: [149, 999],
    // Each subfolder is one phone model — every photo inside is that same product.
    grouping: 'folder',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000002',
    storeId: '22222222-cafe-4002-8002-000000000002',
    slug: 'bright-minds-school-supply',
    primaryCategory: 'Other',
    marketplaceCategory: 'School Supplies',
    websiteNiche: 'ecommerce',
    productType: 'physical',
    priceRange: [1, 8],
    grouping: 'file',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000003',
    storeId: '22222222-cafe-4002-8002-000000000003',
    slug: 'glow-skincare-studio',
    primaryCategory: 'Beauty & Skincare',
    websiteNiche: 'skincare',
    productType: 'treatment',
    priceRange: [4, 18],
    // Each subfolder is a product type (Face wash, Shampoo, ...) with several
    // different items inside — one product per photo. The folder name stays
    // in the product's own name, but the marketplace category has to be one
    // of the taxonomy's real subcategory names or the product is invisible
    // on every category page (it still shows in "All products").
    grouping: 'file',
    subcategoryMap: {
      'Face Wash': 'Skincare',
      Sunscreen: 'Skincare',
      Shampoo: 'Haircare',
      'Body Wash': 'Bath & Body',
    },
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000004',
    storeId: '22222222-cafe-4002-8002-000000000004',
    slug: 'munchie-snack-house',
    primaryCategory: 'Food & Beverage',
    marketplaceCategory: 'Snacks & Dried Fruit',
    websiteNiche: 'grocery',
    productType: 'packaged',
    priceRange: [1, 4],
    grouping: 'file',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000005',
    storeId: '22222222-cafe-4002-8002-000000000005',
    slug: 'second-life-thrift',
    primaryCategory: 'Fashion',
    marketplaceCategory: 'Unisex Clothing',
    websiteNiche: 'fashion',
    productType: 'clothing',
    priceRange: [3, 15],
    grouping: 'file',
  },
];

const titleCase = (str) => str
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
  .join(' ');


// Files named "...-witb-<color>-<date>..." are Apple's own "which one to buy"
// shots: one per colourway. Recognising them lets a product show real colour
// swatches instead of a flat photo grid.
const COLOR_WORDS = ['cloudwhite', 'lightgold', 'skyblue', 'spaceblack', 'black', 'white',
  'silver', 'burgundy', 'glacier', 'lavender', 'sage', 'blue', 'purple', 'green', 'gold', 'pink'];
const COLOR_LABELS = {
  cloudwhite: 'Cloud White', lightgold: 'Light Gold', skyblue: 'Sky Blue', spaceblack: 'Space Black',
};

// The other four phone folders don't have colour-coded filenames, so each
// photo was checked by eye and labelled by hand here.
const MANUAL_COLORS = {
  'images 25.jpeg': 'Purple', 'images 41.jpeg': 'Green', 'images 42.jpeg': 'Black',
  'iphone17-blue-02.webp': 'Blue', // IPhone 16
  '11_white-1-1.jpg.webp': 'White', '190916160012823952.webp': 'Black',
  '51u8wcttmcl.jpg': 'Purple', '75344_b2cdfae3-2e9f-4836-aecc-c7590d2a1ba7.jpg.webp': 'Red',
  'apple-iphone-11-1.png': 'Yellow', 'images 31.jpeg': 'Purple', 'images 36.jpeg': 'Green', // Iphnone 11
  'apple-iphone-12-purple-1.jpg': 'Purple', 'images 37.jpeg': 'White', 'images 38.jpeg': 'Black',
  'images 40.jpeg': 'Red', 'iphone_12_blue_pdp_image_position_2__en_us_ecommerce_d7a4.png.webp': 'Blue',
  'refurbished-iphone-12-green-1.jpg.webp': 'Green', // Iphone 12
  'images 26.jpeg': 'White', 'images 32.jpeg': 'Blue', 'images 35.jpeg': 'Purple', // iphone 14
};

function variantColor(fileName) {
  const base = path.basename(fileName).toLowerCase();
  if (MANUAL_COLORS[base]) return MANUAL_COLORS[base];
  const match = base.match(/witb-([a-z]+)-\d/);
  const token = match?.[1];
  if (!token || !COLOR_WORDS.includes(token)) return null;
  return COLOR_LABELS[token] || titleCase(token);
}

// The "Main"/"main" shot in every folder is Apple's own multi-device
// "which colour to buy" lineup — the attractive shot for the product card.
// It's the lead photo; the individual colour photos become swatches.
function isLineupShot(fileName) {
  return /^main\b/i.test(path.basename(fileName));
}

async function ensureStoreAccess(storeId, ownerUserId, primaryCategory) {
  let sa = await StoreAccess.findByPk(storeId);
  const payload = {
    storeId, ownerUserId, websiteId: null, primaryCategory,
    needsCategoryReview: false, marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved', status: 'active',
    version: 1, marketplaceEntitlement: 'pilot',
  };
  if (!sa) {
    sa = await StoreAccess.create(payload);
    console.log(`  ✅ Created StoreAccess for ${primaryCategory} (${storeId})`);
  } else {
    await sa.update(payload);
    console.log(`  ⚡ Updated StoreAccess for ${primaryCategory} (${storeId})`);
  }
  return sa.storeId;
}

async function ensureDeliveryPolicy(storeId) {
  let policy = await StoreDeliveryPolicy.findByPk(storeId);
  if (!policy) {
    await StoreDeliveryPolicy.create({ storeId, flatFee: '2.00', currency: 'USD', version: 1 });
  } else {
    await policy.update({ flatFee: '2.00', currency: 'USD' });
  }
}

async function upsertProduct(storeId, p) {
  const existing = await Product.findOne({ where: { storeId, name: p.name } });
  if (existing) {
    await existing.update({
      images: p.images, price: p.price, compareAtPrice: p.compareAtPrice,
      marketplaceCategory: p.marketplaceCategory, status: 'active',
      stockQuantity: 25, marketplaceVisibility: true,
      ...(p.nicheAttributes ? { nicheAttributes: p.nicheAttributes } : {}),
    });
    return false;
  }
  await Product.create({
    ...p, storeId, websiteId: null, marketplaceVisibility: true,
    status: 'active', stockQuantity: 25,
  });
  return true;
}

/** Build the product list for one store from its seed-images folder. */
async function buildProducts(store) {
  const base = path.join(IMG_BASE, store.slug);
  const products = [];

  if (store.grouping === 'folder') {
    // One product per subfolder; every photo inside belongs to that product.
    // The "Main"/"main" shot — Apple's own multi-device "which colour to buy"
    // lineup — is the lead photo on the card; every individual colour photo
    // becomes a swatch on the product page, so picking one (or clicking the
    // photo rail) swaps in that colour.
    for (const folderName of listDirs(base)) {
      const files = listFiles(path.join(base, folderName));
      if (!files.length) continue;
      const name = titleCase(folderName);
      const images = [];
      const variants = [];
      let leadUrl = null;

      for (const file of files) {
        const color = variantColor(file);
        const url = await uploadImage(file, `${store.slug}/${folderName}`);
        if (!url) continue;
        images.push({ url, alt: color ? `${name} - ${color}` : `${name} - all colours` });
        if (color) variants.push({ label: color, url });
        if (isLineupShot(file)) leadUrl = url;
      }
      if (!images.length) continue;
      // Put the lineup shot first so it's the card thumbnail.
      if (leadUrl) {
        const leadIndex = images.findIndex((img) => img.url === leadUrl);
        if (leadIndex > 0) images.unshift(images.splice(leadIndex, 1)[0]);
      }
      const price = priceFor(name, ...store.priceRange);
      products.push({
        name,
        price,
        compareAtPrice: Math.round(price * 1.2 * 100) / 100,
        marketplaceCategory: store.marketplaceCategory,
        websiteNiche: store.websiteNiche,
        productType: store.productType,
        description: `${name}, listed by ${titleCase(store.slug)}.`,
        images,
        nicheAttributes: variants.length ? { variants } : {},
      });
    }
    return products;
  }

  // grouping === 'file': every photo is its own product. Subfolders (if any)
  // just supply a subtype label used in the name and marketplace category.
  const subdirs = listDirs(base);
  const groups = subdirs.length
    ? subdirs.map((d) => ({ label: titleCase(d), dir: path.join(base, d) }))
    : [{ label: null, dir: base }];

  for (const group of groups) {
    const files = listFiles(group.dir);
    let index = 0;
    for (const file of files) {
      index += 1;
      const name = group.label
        ? `${group.label} #${index}`
        : `${titleCase(store.slug)} Item #${index}`;
      const url = await uploadImage(file, group.label ? `${store.slug}/${group.label}` : store.slug);
      if (!url) continue;
      const price = priceFor(name, ...store.priceRange);
      products.push({
        name,
        price,
        compareAtPrice: Math.round(price * 1.25 * 100) / 100,
        marketplaceCategory: (store.subcategoryMap && store.subcategoryMap[group.label]) || group.label || store.marketplaceCategory,
        websiteNiche: store.websiteNiche,
        productType: store.productType,
        description: `${name} from ${titleCase(store.slug)}. Rename and describe it from your seller dashboard.`,
        images: [{ url, alt: name }],
      });
    }
  }
  return products;
}

async function seedCustomStoresProducts() {
  if (!cloudinary) {
    console.log('  ⚠️  No Cloudinary credentials — pass -e CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET. Nothing uploaded.');
  }
  console.log('🛍  Seeding custom stores from your own product photos...');

  for (const store of STORES) {
    const storeId = await ensureStoreAccess(store.storeId, store.ownerUserId, store.primaryCategory);
    await ensureDeliveryPolicy(storeId);
    const products = await buildProducts(store);
    console.log(`  📦 ${store.slug}: ${products.length} products`);
    for (const p of products) {
      const created = await upsertProduct(storeId, p);
      console.log(`    ${created ? '✅' : '⚡'} ${p.name} (${p.images.length} images)`);
    }
  }

  const targetStoreIds = STORES.map((s) => s.storeId);
  await sequelize.query(
    'UPDATE Products SET status = ?, stockQuantity = ?, updatedAt = NOW() WHERE storeId IN (?) AND (status != ? OR stockQuantity <= 0)',
    { replacements: ['active', 25, targetStoreIds, 'active'] },
  );

  console.log('✅ Custom stores seeded with your own product photos');
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedCustomStoresProducts();
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seedCustomStoresProducts;
