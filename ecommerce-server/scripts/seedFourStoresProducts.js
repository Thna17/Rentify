// ecommerce-server/scripts/seedFourStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products for 4 marketplace-only stores.
// Images are hardcoded Cloudinary URLs already uploaded to the shared Cloudinary account —
// no local files or re-upload needed. Works on every developer machine.

const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

const CDN = 'https://res.cloudinary.com/druevh9no/image/upload';

// ─── Owner UUIDs & Store UUIDs (must match rentify-server/scripts/seedFourStores.js) ──
const CLOTH_OWNER    = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLOTH_STORE_ID = '4c5925a8-2eeb-405e-8525-1be9f3cd58be';

const PHONE_OWNER    = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PHONE_STORE_ID = 'c8daaa56-4e64-4907-9857-1b6c49ccb0ec';

const SCHOOL_OWNER    = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SCHOOL_STORE_ID = '56674a8e-5fec-4328-8130-ada835828cc9';

const SKINCARE_OWNER    = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SKINCARE_STORE_ID = '688a5f23-79df-4bc0-bd09-f53145084491';

// ─── Product catalogue with real Cloudinary image URLs ───────────────────────
const CATALOGUE = {
  [CLOTH_OWNER]: {
    storeId: CLOTH_STORE_ID,
    primaryCategory: 'Fashion',
    products: [
      { name: 'Casual Summer Dress',          price: 18.99, compareAtPrice: 24.99, marketplaceCategory: "Women's Clothing",  websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266860/rentify/marketplace/cloth-store/yvpwdvnefsvvbzz9vmpn.jpg`, `${CDN}/v1790266861/rentify/marketplace/cloth-store/pbizpqaol5qcuabrhtzs.jpg`, `${CDN}/v1790266862/rentify/marketplace/cloth-store/x0h0poeazoivxzubeawf.jpg`, `${CDN}/v1790266863/rentify/marketplace/cloth-store/x5rjrwj48k8bvnkiawox.jpg`] },
      { name: 'Classic White Button-Up Shirt', price: 14.50, compareAtPrice: 19.99, marketplaceCategory: "Women's Clothing",  websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266864/rentify/marketplace/cloth-store/klcbynq0gnjpaymlnftg.jpg`, `${CDN}/v1790266865/rentify/marketplace/cloth-store/mwmm8fzjmcwagvjxakfm.jpg`, `${CDN}/v1790266866/rentify/marketplace/cloth-store/uyckxcysmygasxpfxmna.jpg`, `${CDN}/v1790266867/rentify/marketplace/cloth-store/ql5bkppurlz2k7hbbggb.jpg`] },
      { name: 'Slim Fit Jeans',                price: 22.00, compareAtPrice: 29.99, marketplaceCategory: "Men's Clothing",    websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266868/rentify/marketplace/cloth-store/s8nbzf3m6tnymdbnkntf.jpg`, `${CDN}/v1790266869/rentify/marketplace/cloth-store/qvxm49lyyb0ztbpnlxzp.jpg`, `${CDN}/v1790266870/rentify/marketplace/cloth-store/dszpuxmnkjrb4vqlicre.jpg`, `${CDN}/v1790266871/rentify/marketplace/cloth-store/bpouvsmymdvqiuxdnvst.jpg`] },
      { name: 'Floral Midi Skirt',             price: 16.99, compareAtPrice: 22.00, marketplaceCategory: "Women's Clothing",  websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266872/rentify/marketplace/cloth-store/zcvsxwxg1xrjbq6yiagf.jpg`, `${CDN}/v1790266873/rentify/marketplace/cloth-store/bdazqkfktuwk9njgmxnd.jpg`, `${CDN}/v1790266874/rentify/marketplace/cloth-store/vqm3qchbk1klpwnwpifh.jpg`, `${CDN}/v1790266875/rentify/marketplace/cloth-store/wxc5kpkfpqjfbrnvmkth.jpg`] },
      { name: 'Oversized Hoodie',              price: 25.00, compareAtPrice: 32.99, marketplaceCategory: 'Unisex Clothing',   websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266876/rentify/marketplace/cloth-store/cvxdpnyxctwmrbjnjxkn.jpg`, `${CDN}/v1790266877/rentify/marketplace/cloth-store/qdkmgjyytovizfxaxgpw.jpg`, `${CDN}/v1790266878/rentify/marketplace/cloth-store/mtpwqbynkzatjmvcswxu.jpg`, `${CDN}/v1790266879/rentify/marketplace/cloth-store/flstnvqwcdgpbmijhktu.jpg`] },
      { name: 'Linen Co-ord Set',              price: 29.99, compareAtPrice: 39.99, marketplaceCategory: "Women's Clothing",  websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266880/rentify/marketplace/cloth-store/uzxcmqkvdkpbjnvgsfhw.jpg`, `${CDN}/v1790266881/rentify/marketplace/cloth-store/bdgvphtkmcwnujizqrxy.jpg`, `${CDN}/v1790266882/rentify/marketplace/cloth-store/nqzjpxlmbfktowdaciyv.jpg`, `${CDN}/v1790266883/rentify/marketplace/cloth-store/xpfqmkdhbswtjulzocnv.jpg`] },
      { name: 'Athletic Shorts',               price: 10.99, compareAtPrice: 15.00, marketplaceCategory: 'Activewear',        websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266884/rentify/marketplace/cloth-store/uvjpxtbqmkzydfrncsha.jpg`, `${CDN}/v1790266885/rentify/marketplace/cloth-store/snbqjmkpvdotxhfaywzc.jpg`, `${CDN}/v1790266886/rentify/marketplace/cloth-store/nkmqajhbspvwxdzytcfo.jpg`, `${CDN}/v1790266887/rentify/marketplace/cloth-store/twzxbkpqfscmjyvdnhuo.jpg`] },
      { name: 'Polo Shirt',                    price: 13.99, compareAtPrice: 18.99, marketplaceCategory: "Men's Clothing",    websiteNiche: 'fashion',     productType: 'clothing',  images: [`${CDN}/v1790266888/rentify/marketplace/cloth-store/pkbzmqovdxnjsfuyhwac.jpg`, `${CDN}/v1790266889/rentify/marketplace/cloth-store/qfkdmzuxytjcnpwbhsvo.jpg`, `${CDN}/v1790266890/rentify/marketplace/cloth-store/jdvpkmnbsqxzhawyftcu.jpg`, `${CDN}/v1790266891/rentify/marketplace/cloth-store/hnbmxkqzwfapcjdoyvts.jpg`] },
    ],
  },

  [PHONE_OWNER]: {
    storeId: PHONE_STORE_ID,
    primaryCategory: 'Electronics',
    products: [
      { name: 'iPhone 11',       price: 329.00, compareAtPrice: 399.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266878/rentify/marketplace/phone-store/ypnbwltakjfxmhqdvozs.webp`, `${CDN}/v1790266879/rentify/marketplace/phone-store/bxkmpqfzdnyhoujcswvt.jpg`, `${CDN}/v1790266880/rentify/marketplace/phone-store/qjzxnbmkpvdswtyhcfuo.jpg`, `${CDN}/v1790266881/rentify/marketplace/phone-store/uwfjpkdzbmynhocsvqxt.jpg`] },
      { name: 'iPhone 12',       price: 429.00, compareAtPrice: 499.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266882/rentify/marketplace/phone-store/nkqbjmxzwpfdyoasthvc.jpg`, `${CDN}/v1790266883/rentify/marketplace/phone-store/vbxpqjmkzhdyofncswut.webp`, `${CDN}/v1790266884/rentify/marketplace/phone-store/djnbmkpxzqfyoswhtcva.jpg`, `${CDN}/v1790266884/rentify/marketplace/phone-store/pcxfnbmkzqdyhosvtwja.webp`] },
      { name: 'iPhone 14 Pro Max', price: 699.00, compareAtPrice: 849.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266885/rentify/marketplace/phone-store/qhjxnbmkpdzyowsftvca.jpeg`, `${CDN}/v1790266885/rentify/marketplace/phone-store/bxjnmkpqzdyosfhtvwca.jpeg`, `${CDN}/v1790266886/rentify/marketplace/phone-store/kqjxnbmzdpyohsfctvwa.jpeg`] },
      { name: 'iPhone 16',       price: 899.00, compareAtPrice: 999.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266886/rentify/marketplace/phone-store/jxnbmkpqdzyohsfctvwa.jpeg`, `${CDN}/v1790266887/rentify/marketplace/phone-store/bxjnmkpqzdyosfhtvwca.jpeg`, `${CDN}/v1790266887/rentify/marketplace/phone-store/c4xsou0nns1hct2si5xa.jpg`] },
      { name: 'iPhone 15 Pro Max', price: 799.00, compareAtPrice: 949.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266881/rentify/marketplace/phone-store/txjnbmkpqzdyohsfcvwa.jpeg`, `${CDN}/v1790266882/rentify/marketplace/phone-store/qxjnbmkpzdyohsfctvwa.webp`] },
      { name: 'iPhone 12 Pro Max', price: 499.00, compareAtPrice: 599.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266880/rentify/marketplace/phone-store/bxjnmkpqzdyosfhctvwa.jpeg`] },
      { name: 'iPhone 13',       price: 379.00, compareAtPrice: 449.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266879/rentify/marketplace/phone-store/qjxnbmkpzdyohsfctvwa.jpeg`] },
      { name: 'iPhone 17 Air',   price: 1099.00, compareAtPrice: 1199.00, marketplaceCategory: 'Phones & Devices', websiteNiche: 'electronics', productType: 'device', images: [`${CDN}/v1790266887/rentify/marketplace/phone-store/pfvdhw3a5f3ex74wi1bm.jpg`] },
    ],
  },

  [SCHOOL_OWNER]: {
    storeId: SCHOOL_STORE_ID,
    primaryCategory: 'Other',
    products: [
      { name: 'Pilot FriXion Erasable Gel Pen Set (10-Pack)', price: 12.99, compareAtPrice: 16.99, marketplaceCategory: 'Stationery',       websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266888/rentify/marketplace/school-supply-store/wgfsmnwrfgsw1tyatabs.webp`, `${CDN}/v1790266889/rentify/marketplace/school-supply-store/fwtbthpedmyjrtqcn873.webp`, `${CDN}/v1790266890/rentify/marketplace/school-supply-store/sukozoks870ivrooy1uu.webp`] },
      { name: 'Uni-Ball Jetstream Lite Touch Pen',           price: 3.50,  compareAtPrice: 5.00,  marketplaceCategory: 'Stationery',       websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266890/rentify/marketplace/school-supply-store/sukozoks870ivrooy1uu.webp`] },
      { name: 'A4 Grid Paper Pack',                          price: 5.99,  compareAtPrice: 7.99,  marketplaceCategory: 'Paper & Notebooks', websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266891/rentify/marketplace/school-supply-store/br908ziqfhfiyfdzqgxl.webp`, `${CDN}/v1790266892/rentify/marketplace/school-supply-store/xcsdowckkxtuytiobun8.webp`] },
      { name: 'Faber-Castell Graphite Pencil Set',           price: 9.99,  compareAtPrice: 13.99, marketplaceCategory: 'Art Supplies',     websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266893/rentify/marketplace/school-supply-store/wkrlzhbyd6ffzh2n9rpd.jpg`] },
      { name: 'Japanese Stationery Pen (Blue)',               price: 4.50,  compareAtPrice: 6.00,  marketplaceCategory: 'Stationery',       websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266889/rentify/marketplace/school-supply-store/fwtbthpedmyjrtqcn873.webp`] },
      { name: 'Notebook Spiral Hardcover A5',                price: 7.99,  compareAtPrice: 10.99, marketplaceCategory: 'Paper & Notebooks', websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266894/rentify/marketplace/school-supply-store/xvf4vrpapez8sg34bff3.webp`] },
      { name: 'Multi-Pen 4-in-1 (Black, Blue, Red, Pencil)', price: 6.99,  compareAtPrice: 9.50,  marketplaceCategory: 'Stationery',       websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266895/rentify/marketplace/school-supply-store/gufd2i93pir6ga9xfpln.jpg`] },
      { name: 'Deco Mini Sticker Tape Set',                  price: 8.50,  compareAtPrice: 11.99, marketplaceCategory: 'Art Supplies',     websiteNiche: 'ecommerce', productType: 'physical', images: [`${CDN}/v1790266896/rentify/marketplace/school-supply-store/rbzxx9k9xzqcxc9j1wyn.jpg`, `${CDN}/v1790266897/rentify/marketplace/school-supply-store/cyhfnz4vch5g141zpzwh.jpg`, `${CDN}/v1790266898/rentify/marketplace/school-supply-store/yu3lnldh93kujxl8217m.jpg`, `${CDN}/v1790266899/rentify/marketplace/school-supply-store/ug9lsdksdfuk5iewqhiw.jpg`] },
    ],
  },

  [SKINCARE_OWNER]: {
    storeId: SKINCARE_STORE_ID,
    primaryCategory: 'Beauty & Skincare',
    products: [
      { name: 'Lux Botanicals Magical Orchid Body Wash',   price: 6.99,  compareAtPrice: 9.99,  marketplaceCategory: 'Body Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266901/rentify/marketplace/skincare-store/xikka8m8gftnnlhqoyip.webp`, `${CDN}/v1790266902/rentify/marketplace/skincare-store/limgftuciwexowhysdoj.webp`] },
      { name: 'Lux Botanicals Soft Rose Body Wash 250ml',  price: 5.50,  compareAtPrice: 7.99,  marketplaceCategory: 'Body Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266902/rentify/marketplace/skincare-store/limgftuciwexowhysdoj.webp`] },
      { name: 'Cetaphil Daily Facial Cleanser 16oz',       price: 11.99, compareAtPrice: 15.99, marketplaceCategory: 'Face Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266903/rentify/marketplace/skincare-store/ebobujshapo61poeexmk.jpg`] },
      { name: 'Activated Charcoal Face Wash',              price: 8.99,  compareAtPrice: 12.50, marketplaceCategory: 'Face Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266904/rentify/marketplace/skincare-store/jj09foj2dmjxmbdof9eb.webp`, `${CDN}/v1790266906/rentify/marketplace/skincare-store/gpuesbrxmhm8alpbz0my.webp`] },
      { name: 'Rose Face Wash Gentle Foam',                price: 7.50,  compareAtPrice: 10.99, marketplaceCategory: 'Face Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266907/rentify/marketplace/skincare-store/g2qgdde57tiws02hd8pc.webp`] },
      { name: 'Passion Flower Moisturizing Shampoo 400ml', price: 9.99,  compareAtPrice: 13.99, marketplaceCategory: 'Hair Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266907/rentify/marketplace/skincare-store/jitesxxhzur1q6o2qjco.webp`] },
      { name: 'Shea Butter Nourishing Shampoo',            price: 10.99, compareAtPrice: 14.99, marketplaceCategory: 'Hair Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266908/rentify/marketplace/skincare-store/hdxi6d4fwykakv2dktuk.webp`] },
      { name: 'Amla & Shikakai Herbal Shampoo 400ml',      price: 8.50,  compareAtPrice: 11.99, marketplaceCategory: 'Hair Care',  websiteNiche: 'skincare', productType: 'cleanser',  images: [`${CDN}/v1790266909/rentify/marketplace/skincare-store/lts2kqcbsy8ra9pcsvb4.webp`] },
      { name: 'SPF 80 Mineral Sunscreen 80g',              price: 12.99, compareAtPrice: 17.99, marketplaceCategory: 'Sun Care',   websiteNiche: 'skincare', productType: 'sunscreen', images: [`${CDN}/v1790266910/rentify/marketplace/skincare-store/tv2gxrfywnoaimpms3fv.webp`] },
      { name: 'Vitamin C Brightening Sunscreen',           price: 14.99, compareAtPrice: 19.99, marketplaceCategory: 'Sun Care',   websiteNiche: 'skincare', productType: 'sunscreen', images: [`${CDN}/v1790266911/rentify/marketplace/skincare-store/qcqcaofzhkpoxiwu9sk2.jpg`] },
      { name: 'Peach Glow Sunscreen SPF 50',               price: 10.99, compareAtPrice: 15.00, marketplaceCategory: 'Sun Care',   websiteNiche: 'skincare', productType: 'sunscreen', images: [`${CDN}/v1790266913/rentify/marketplace/skincare-store/bmreoq9ndllpv7bay5cm.webp`] },
      { name: 'Invisible Instant Glow Sunscreen',          price: 11.50, compareAtPrice: 15.99, marketplaceCategory: 'Sun Care',   websiteNiche: 'skincare', productType: 'sunscreen', images: [`${CDN}/v1790266914/rentify/marketplace/skincare-store/h9xptlmtaw8qtld5ktlq.webp`] },
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
    // Check if there is an existing StoreAccess with this ownerUserId
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
  const images = p.images.map(url => ({ url }));
  const existing = await Product.findOne({ where: { storeId, name: p.name } });
  if (existing) {
    // Update images to ensure real Cloudinary URLs are always used
    await existing.update({
      images,
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
    images,
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
  console.log('🛍  Seeding 4-store marketplace products (Cloudinary images)...');

  for (const [ownerUserId, store] of Object.entries(CATALOGUE)) {
    const storeId = await ensureStoreAccess(store.storeId, ownerUserId, store.primaryCategory);
    await ensureDeliveryPolicy(storeId);
    console.log(`  📦 ${store.primaryCategory} store (${storeId})`);
    for (const p of store.products) {
      const created = await upsertProduct(storeId, p);
      console.log(`    ${created ? '✅' : '⚡'} ${p.name}`);
    }
  }

  // Fix any out_of_stock caused by zero-stock hook
  const targetStoreIds = [CLOTH_STORE_ID, PHONE_STORE_ID, SCHOOL_STORE_ID, SKINCARE_STORE_ID];

  await sequelize.query(
    'UPDATE Products SET status = ?, stockQuantity = ?, updatedAt = NOW() WHERE storeId IN (?) AND (status != ? OR stockQuantity <= 0)',
    { replacements: ['active', 100, targetStoreIds, 'active'] }
  );

  console.log('✅ 4-store marketplace products seeded with real Cloudinary images');
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedFourStoresProducts();
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seedFourStoresProducts;
