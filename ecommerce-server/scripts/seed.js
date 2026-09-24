// ecommerce-server/scripts/seed.js
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/db');
const {
  WebsiteData,
  WebsiteContent,
  Category,
  Product,
  Customer,
  Order,
  OrderItem,
  Payment,
  Invoice,
  PaymentGatewayConfig,
} = require('../models');

const WEBSITE_ID = '7b8f9e01-2a3b-4c5d-8e9f-0a1b2c3d4e5f';
const MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '33333333-3333-4333-8333-333333333333';
const TEMPLATE_1_ID = '044c94e2-a47c-47d5-895b-33bc00eb5abb';
const CUSTOMER_ID = '99999999-9999-4999-8999-999999999999';

const CAT_CLEANSER_ID = 'c1111111-1111-4111-8111-111111111111';
const CAT_SERUM_ID = 'c2222222-2222-4222-8222-222222222222';
const CAT_MOISTURIZER_ID = 'c3333333-3333-4333-8333-333333333333';
const CAT_SUNSCREEN_ID = 'c4444444-4444-4444-8444-444444444444';

const PROD_CLEANSER_ID = 'b1111111-1111-4111-8111-111111111111';
const PROD_TONER_ID = 'b2222222-2222-4222-8222-222222222222';
const PROD_SERUM_ID = 'b3333333-3333-4333-8333-333333333333';
const PROD_OIL_ID = 'b4444444-4444-4444-8444-444444444444';
const PROD_CREAM_ID = 'b5555555-5555-4555-8555-555555555555';
const PROD_SUNSCREEN_ID = 'b6666666-6666-4666-8666-666666666666';

const ORDER_1_ID = '01111111-1111-4111-8111-111111111111';
const ORDER_2_ID = '02222222-2222-4222-8222-222222222222';
const PAYMENT_1_ID = 'a1111111-1111-4111-8111-111111111111';
const PAYMENT_2_ID = 'a2222222-2222-4222-8222-222222222222';

// Template 2 Constants - NexTech Electronics
const TECH_WEBSITE_ID = '8c90a1b2-3b4c-5d6e-9f0a-1b2c3d4e5f60';
const TECH_MERCHANT_ID = '55555555-5555-4555-8555-555555555555';
const TECH_STAFF_ID = '66666666-6666-4666-8666-666666666666';
const TEMPLATE_2_ID = 'af3e0202-6327-45b1-bece-02ab3aba4a05';
const TECH_CUSTOMER_ID = '88888888-8888-4888-8888-888888888888';

const TECH_CAT_AUDIO_ID = 'c5555555-5555-4555-8555-555555555555';
const TECH_CAT_WEARABLES_ID = 'c6666666-6666-4666-8666-666666666666';
const TECH_CAT_COMPUTING_ID = 'c7777777-7777-4777-8777-777777777777';
const TECH_CAT_ACCESSORIES_ID = 'c8888888-8888-4888-8888-888888888888';

const TECH_PROD_HEADPHONES_ID = 'b7777777-7777-4777-8777-777777777771';
const TECH_PROD_EARBUDS_ID = 'b7777777-7777-4777-8777-777777777772';
const TECH_PROD_WATCH_ID = 'b7777777-7777-4777-8777-777777777773';
const TECH_PROD_KEYBOARD_ID = 'b7777777-7777-4777-8777-777777777774';
const TECH_PROD_STAND_ID = 'b7777777-7777-4777-8777-777777777775';
const TECH_PROD_CHARGER_ID = 'b7777777-7777-4777-8777-777777777776';

const TECH_ORDER_1_ID = '03333333-3333-4333-8333-333333333333';
const TECH_ORDER_2_ID = '04444444-4444-4444-8444-444444444444';
const TECH_PAYMENT_1_ID = 'a3333333-3333-4333-8333-333333333333';
const TECH_PAYMENT_2_ID = 'a4444444-4444-4444-8444-444444444444';

async function seedCommerce() {
  console.log('🌱 Starting Rentify Commerce Database Seeding...');
  await sequelize.authenticate();

  // Earlier demo fixtures used a non-UUID `p` prefix. Update the primary keys
  // before seeding so existing carts, orders, options and variants follow via
  // their ON UPDATE CASCADE foreign keys instead of leaving duplicate products.
  for (const productId of [PROD_CLEANSER_ID, PROD_TONER_ID, PROD_SERUM_ID,
    PROD_OIL_ID, PROD_CREAM_ID, PROD_SUNSCREEN_ID, TECH_PROD_HEADPHONES_ID,
    TECH_PROD_EARBUDS_ID, TECH_PROD_WATCH_ID, TECH_PROD_KEYBOARD_ID,
    TECH_PROD_STAND_ID, TECH_PROD_CHARGER_ID]) {
    const legacyId = `p${productId.slice(1)}`;
    await sequelize.query('UPDATE Products SET id = :productId WHERE id = :legacyId', {
      replacements: { productId, legacyId },
    });
  }

  // 1. Seed WebsiteData
  console.log('🌐 Seeding WebsiteData...');
  let websiteData = await WebsiteData.findOne({ where: { websiteId: WEBSITE_ID } });
  const websitePayload = {
    id: WEBSITE_ID,
    websiteId: WEBSITE_ID,
    userId: MERCHANT_ID,
    domain: 'localhost',
    niche: 'skincare',
    status: 'active',
    websiteTemplateId: TEMPLATE_1_ID,
    businessConfig: {
      ingredientInfo: true,
      skinTypeMatching: true,
      allergyWarnings: true,
    },
    userData: {
      id: MERCHANT_ID,
      name: 'Sarah Skincare Merchant',
      email: 'merchant@rentify.local',
      businessName: 'Aura Botanicals',
      phoneNumber: '+85512000002',
    },
    staffData: [
      {
        id: STAFF_ID,
        name: 'John Staff',
        email: 'staff@rentify.local',
        phoneNumber: '+85512000003',
        permissions: ['manage_products', 'manage_orders', 'manage_invoices', 'manage_pos'],
      },
    ],
    package: {
      name: 'Free Trial',
      limits: { staff: 2, storage: 1024, products: 50 },
      features: [
        'basic-dashboard',
        'product-management',
        'order-management',
        'store',
        'advanced-analytics',
        'invoice',
        'pos',
        '1 Store',
        '50 Products',
        'Standard Analytics',
        'Vite Storefront',
      ],
    },
  };

  if (!websiteData) {
    websiteData = await WebsiteData.create(websitePayload);
  } else {
    await websiteData.update(websitePayload);
  }

  // Seed Tech WebsiteData (Template 2)
  let techWebsiteData = await WebsiteData.findOne({ where: { websiteId: TECH_WEBSITE_ID } });
  const techWebsitePayload = {
    id: TECH_WEBSITE_ID,
    websiteId: TECH_WEBSITE_ID,
    userId: TECH_MERCHANT_ID,
    domain: 'localhost:4600',
    niche: 'ecommerce',
    status: 'active',
    websiteTemplateId: TEMPLATE_2_ID,
    businessConfig: {
      inventory: true,
      shipping: true,
      tax: true,
      reviews: true,
    },
    userData: {
      id: TECH_MERCHANT_ID,
      name: 'Alex Tech Merchant',
      email: 'tech.merchant@rentify.local',
      businessName: 'NexTech Electronics',
      phoneNumber: '+85512000004',
    },
    staffData: [
      {
        id: TECH_STAFF_ID,
        name: 'David Tech Staff',
        email: 'tech.staff@rentify.local',
        phoneNumber: '+85512000005',
        permissions: ['manage_products', 'manage_orders', 'manage_invoices', 'manage_pos'],
      },
    ],
    package: {
      name: 'Growth',
      limits: { staff: 5, storage: 5120, products: 500 },
      features: [
        'basic-dashboard',
        'product-management',
        'order-management',
        'store',
        'advanced-analytics',
        'invoice',
        'pos',
        'Unlimited Products',
        '5 Staff Members',
        'Custom Domain',
        'Telegram Order Notifications',
        'KHQR Payments',
      ],
    },
  };

  if (!techWebsiteData) {
    techWebsiteData = await WebsiteData.create(techWebsitePayload);
  } else {
    await techWebsiteData.update(techWebsitePayload);
  }

  // 2. Seed WebsiteContents for Commerce
  console.log('📄 Seeding WebsiteContents for Commerce...');
  const contents = [
    // Template 1 - Aura Botanicals
    {
      websiteId: WEBSITE_ID,
      category: 'Header',
      label: 'Site Title',
      type: 'text',
      value: { text: 'Aura Botanicals' },
    },
    {
      websiteId: WEBSITE_ID,
      category: 'Hero',
      label: 'Hero Headline',
      type: 'text',
      value: { text: 'Glow Naturally with Organic Skincare' },
    },
    {
      websiteId: WEBSITE_ID,
      category: 'Hero',
      label: 'Hero Subtitle',
      type: 'text',
      value: { text: 'Pure, organic botanicals curated for your everyday glow.' },
    },
    {
      websiteId: WEBSITE_ID,
      category: 'Color Palette',
      label: 'Color Palette',
      type: 'palette',
      value: { primary: '#2D6A4F', secondary: '#52B788', background: '#F8F9FA' },
    },
    {
      websiteId: WEBSITE_ID,
      category: 'Footer',
      label: 'Copyright',
      type: 'text',
      value: { text: '© 2026 Aura Botanicals. Powered by Rentify.' },
    },
    // Template 2 - NexTech Electronics
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'Header',
      label: 'Site Title',
      type: 'text',
      value: { text: 'NexTech Electronics' },
    },
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'Hero',
      label: 'Hero Headline',
      type: 'text',
      value: { text: 'Next Generation Tech & Gadgets' },
    },
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'Hero',
      label: 'Hero Subtitle',
      type: 'text',
      value: { text: 'Discover high performance audio, smart wearables, and computing essentials.' },
    },
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'Color Palette',
      label: 'Color Palette',
      type: 'palette',
      value: { primary: '#2563EB', secondary: '#3B82F6', background: '#0F172A' },
    },
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'Footer',
      label: 'Copyright',
      type: 'text',
      value: { text: '© 2026 NexTech Electronics. Powered by Rentify.' },
    },
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'homepage',
      label: 'Hero Image',
      type: 'image[]',
      value: [
        { url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=80', alt: 'Premium Electronics' },
        { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80', alt: 'Studio Headphones' },
      ],
    },
  ];

  for (const c of contents) {
    const existing = await WebsiteContent.findOne({
      where: { websiteId: c.websiteId, category: c.category, label: c.label },
    });
    if (!existing) {
      await WebsiteContent.create(c);
    } else {
      await existing.update(c);
    }
  }

  // 3. Seed Categories
  console.log('🏷️  Seeding Categories...');
  const categoriesData = [
    {
      id: CAT_CLEANSER_ID,
      websiteId: WEBSITE_ID,
      name: 'Cleansers & Toners',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    {
      id: CAT_SERUM_ID,
      websiteId: WEBSITE_ID,
      name: 'Serums & Treatments',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    {
      id: CAT_MOISTURIZER_ID,
      websiteId: WEBSITE_ID,
      name: 'Moisturizers & Creams',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    {
      id: CAT_SUNSCREEN_ID,
      websiteId: WEBSITE_ID,
      name: 'Sun Protection',
      image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    // Template 2 Categories - NexTech Electronics
    {
      id: TECH_CAT_AUDIO_ID,
      websiteId: TECH_WEBSITE_ID,
      name: 'Audio & Headphones',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    {
      id: TECH_CAT_WEARABLES_ID,
      websiteId: TECH_WEBSITE_ID,
      name: 'Smartwatches & Wearables',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    {
      id: TECH_CAT_COMPUTING_ID,
      websiteId: TECH_WEBSITE_ID,
      name: 'Laptops & Computing',
      image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
    {
      id: TECH_CAT_ACCESSORIES_ID,
      websiteId: TECH_WEBSITE_ID,
      name: 'Accessories & Gaming',
      image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80',
      status: 'active',
    },
  ];

  for (const cat of categoriesData) {
    const existing = await Category.findByPk(cat.id);
    if (!existing) {
      await Category.create(cat);
    } else {
      await existing.update(cat);
    }
  }

  // 4. Seed Products
  console.log('🧴 Seeding Products...');
  const productsData = [
    {
      id: PROD_CLEANSER_ID,
      websiteId: WEBSITE_ID,
      categoryId: CAT_CLEANSER_ID,
      name: 'Gentle Foaming Cleanser',
      slug: 'gentle-foaming-cleanser',
      shortDescription: 'Gentle clarifying daily foaming cleanser with green tea and chamomile.',
      description: 'Our award-winning Gentle Foaming Cleanser lifts away impurities, excess oil, and makeup without disrupting the natural moisture barrier. Suitable for sensitive, normal, and combination skin types.',
      price: 24.0,
      compareAtPrice: 28.0,
      stockQuantity: 50,
      trackInventory: true,
      productType: 'cleanser',
      websiteNiche: 'skincare',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
          alt: 'Gentle Foaming Cleanser Bottle',
        },
      ],
      tags: ['bestseller', 'gentle', 'daily', 'organic'],
    },
    {
      id: PROD_TONER_ID,
      websiteId: WEBSITE_ID,
      categoryId: CAT_CLEANSER_ID,
      name: 'Purifying Balancing Toner',
      slug: 'purifying-balancing-toner',
      shortDescription: 'Alcohol-free balancing toner with rose water and witch hazel.',
      description: 'Restore your skin pH balance and tighten pores with our refreshing floral toner. Infused with organic damask rose hydrosol to calm redness and prepare skin for serum absorption.',
      price: 22.0,
      compareAtPrice: 26.0,
      stockQuantity: 40,
      trackInventory: true,
      productType: 'cleanser',
      websiteNiche: 'skincare',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1608248597359-bb43e7fb0213?w=800&auto=format&fit=crop&q=80',
          alt: 'Purifying Balancing Toner',
        },
      ],
      tags: ['hydrating', 'rosewater', 'calming'],
    },
    {
      id: PROD_SERUM_ID,
      websiteId: WEBSITE_ID,
      categoryId: CAT_SERUM_ID,
      name: 'Radiance Hyaluronic Acid Serum',
      slug: 'radiance-hyaluronic-acid-serum',
      shortDescription: 'Multi-molecular weight hyaluronic acid for deep cellular hydration.',
      description: 'Delivers multi-depth hydration and visible plumping without feeling sticky. Formulated with five molecular weights of pure vegan hyaluronic acid plus vitamin B5.',
      price: 38.0,
      compareAtPrice: 44.0,
      stockQuantity: 35,
      trackInventory: true,
      productType: 'treatment',
      websiteNiche: 'skincare',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
          alt: 'Radiance Hyaluronic Acid Serum',
        },
      ],
      tags: ['bestseller', 'anti-aging', 'hydrating', 'vegan'],
    },
    {
      id: PROD_OIL_ID,
      websiteId: WEBSITE_ID,
      categoryId: CAT_SERUM_ID,
      name: 'Vitamin C Brightening Face Oil',
      slug: 'vitamin-c-brightening-face-oil',
      shortDescription: 'Potent 15% Vitamin C oil blend for radiant, even-toned complexion.',
      description: 'Protect against environmental stressors and fade hyperpigmentation with stabilized lipid-soluble vitamin C blended with cold-pressed rosehip and jojoba seed oils.',
      price: 45.0,
      compareAtPrice: 52.0,
      stockQuantity: 25,
      trackInventory: true,
      productType: 'treatment',
      websiteNiche: 'skincare',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop&q=80',
          alt: 'Vitamin C Brightening Face Oil',
        },
      ],
      tags: ['brightening', 'glow', 'antioxidant'],
    },
    {
      id: PROD_CREAM_ID,
      websiteId: WEBSITE_ID,
      categoryId: CAT_MOISTURIZER_ID,
      name: 'Deep Barrier Hydrating Cream',
      slug: 'deep-barrier-hydrating-cream',
      shortDescription: 'Ceramide-rich barrier repair cream for soothing lasting moisture.',
      description: 'Replenishes dry, compromised skin with plant-derived squalane, three essential ceramides, and centella asiatica extract. Leaves skin soft, velvety, and deeply nourished.',
      price: 36.0,
      compareAtPrice: 42.0,
      stockQuantity: 40,
      trackInventory: true,
      productType: 'moisturizer',
      websiteNiche: 'skincare',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
          alt: 'Deep Barrier Hydrating Cream Jar',
        },
      ],
      tags: ['barrier-repair', 'ceramides', 'nourishing'],
    },
    {
      id: PROD_SUNSCREEN_ID,
      websiteId: WEBSITE_ID,
      categoryId: CAT_SUNSCREEN_ID,
      name: 'Invisible Shield Mineral Sunscreen SPF 50',
      slug: 'invisible-shield-mineral-sunscreen-spf-50',
      shortDescription: '100% non-nano zinc oxide sunscreen with zero white cast.',
      description: 'Broad-spectrum UVA/UVB defense enriched with soothing aloe vera and green tea antioxidants. Lightweight, reef-safe, water-resistant for up to 80 minutes.',
      price: 28.0,
      compareAtPrice: 32.0,
      stockQuantity: 60,
      trackInventory: true,
      productType: 'sunscreen',
      websiteNiche: 'skincare',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
          alt: 'Invisible Shield Mineral Sunscreen',
        },
      ],
      tags: ['bestseller', 'spf50', 'mineral', 'reef-safe'],
    },
    // Template 2 Products - NexTech Electronics
    {
      id: TECH_PROD_HEADPHONES_ID,
      websiteId: TECH_WEBSITE_ID,
      categoryId: TECH_CAT_AUDIO_ID,
      name: 'AuraSound Wireless ANC Headphones',
      slug: 'aurasound-wireless-anc-headphones',
      shortDescription: 'Active noise cancelling over-ear headphones with 40h battery life.',
      description: 'Experience studio-grade acoustic performance with custom 40mm graphene drivers, hybrid active noise cancellation, and ultra-plush memory foam earcups.',
      price: 199.0,
      compareAtPrice: 249.0,
      stockQuantity: 45,
      trackInventory: true,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
          alt: 'AuraSound Wireless ANC Headphones',
        },
      ],
      tags: ['bestseller', 'audio', 'anc', 'wireless'],
    },
    {
      id: TECH_PROD_EARBUDS_ID,
      websiteId: TECH_WEBSITE_ID,
      categoryId: TECH_CAT_AUDIO_ID,
      name: 'PulseBuds Pro True Wireless Earbuds',
      slug: 'pulsebuds-pro-true-wireless-earbuds',
      shortDescription: 'IPX7 waterproof wireless earbuds with transparency mode and Qi charging.',
      description: 'Compact, powerful in-ear earbuds with low-latency gaming mode, clear voice calling with 6 beamforming microphones, and up to 32 hours total playtime.',
      price: 119.0,
      compareAtPrice: 149.0,
      stockQuantity: 60,
      trackInventory: true,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
          alt: 'PulseBuds Pro True Wireless Earbuds',
        },
      ],
      tags: ['audio', 'earbuds', 'waterproof'],
    },
    {
      id: TECH_PROD_WATCH_ID,
      websiteId: TECH_WEBSITE_ID,
      categoryId: TECH_CAT_WEARABLES_ID,
      name: 'Apex Horizon Titanium Smartwatch',
      slug: 'apex-horizon-titanium-smartwatch',
      shortDescription: 'Grade-5 titanium smartwatch with AMOLED sapphire display and ECG sensor.',
      description: 'Engineered for athletes and executives alike with multi-band GPS, 14-day battery life, 100m water resistance, and comprehensive biometric health tracking.',
      price: 349.0,
      compareAtPrice: 399.0,
      stockQuantity: 30,
      trackInventory: true,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
          alt: 'Apex Horizon Titanium Smartwatch',
        },
      ],
      tags: ['bestseller', 'smartwatch', 'titanium', 'fitness'],
    },
    {
      id: TECH_PROD_KEYBOARD_ID,
      websiteId: TECH_WEBSITE_ID,
      categoryId: TECH_CAT_COMPUTING_ID,
      name: 'Vortex Mechanical 75% Keyboard',
      slug: 'vortex-mechanical-75-keyboard',
      shortDescription: 'Gasket-mounted hot-swappable RGB wireless mechanical keyboard.',
      description: 'Precision typing feel with pre-lubed linear switches, sound-dampening silicone gaskets, CNC aluminum top case, and Bluetooth/2.4GHz/USB-C tri-mode connectivity.',
      price: 139.0,
      compareAtPrice: 169.0,
      stockQuantity: 40,
      trackInventory: true,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80',
          alt: 'Vortex Mechanical 75% Keyboard',
        },
      ],
      tags: ['computing', 'keyboard', 'mechanical', 'rgb'],
    },
    {
      id: TECH_PROD_STAND_ID,
      websiteId: TECH_WEBSITE_ID,
      categoryId: TECH_CAT_COMPUTING_ID,
      name: 'ErgoLift Aluminum Laptop Stand',
      slug: 'ergolift-aluminum-laptop-stand',
      shortDescription: 'Adjustable ergonomic aluminum laptop riser with thermal ventilation.',
      description: 'Sleek, sturdy aluminum alloy stand elevating your display to ergonomic eye level, improving posture and cooling airflow for 11-17 inch laptops.',
      price: 49.0,
      compareAtPrice: 59.0,
      stockQuantity: 55,
      trackInventory: true,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80',
          alt: 'ErgoLift Aluminum Laptop Stand',
        },
      ],
      tags: ['ergonomic', 'accessories', 'laptop-stand'],
    },
    {
      id: TECH_PROD_CHARGER_ID,
      websiteId: TECH_WEBSITE_ID,
      categoryId: TECH_CAT_ACCESSORIES_ID,
      name: 'OmniPower 100W GaN Fast Charger',
      slug: 'omnipower-100w-gan-fast-charger',
      shortDescription: 'Ultra-compact 4-port 100W GaN III fast desktop and travel charger.',
      description: 'Fast-charge your laptop, tablet, and phone simultaneously with intelligent power distribution and next-gen Gallium Nitride efficiency in a pocket-sized design.',
      price: 59.0,
      compareAtPrice: 75.0,
      stockQuantity: 70,
      trackInventory: true,
      productType: 'physical',
      websiteNiche: 'ecommerce',
      status: 'active',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
          alt: 'OmniPower 100W GaN Fast Charger',
        },
      ],
      tags: ['bestseller', 'charger', 'gan', 'fast-charging'],
    },
  ];

  for (const prod of productsData) {
    const existing = await Product.findByPk(prod.id);
    if (!existing) {
      await Product.create(prod);
    } else {
      await existing.update(prod);
    }
  }

  // 5. Seed Customer
  console.log('👥 Seeding Customer...');
  const customerPassword = await bcrypt.hash('Customer@12345', 10);
  let customer = await Customer.findByPk(CUSTOMER_ID);
  const customerPayload = {
    id: CUSTOMER_ID,
    storeId: WEBSITE_ID,
    name: 'Emily Watson',
    email: 'emily.customer@example.com',
    phoneNumber: '+85512999888',
    password: customerPassword,
    status: 'active',
    isVerified: true,
    totalOrders: 1,
    totalSpent: 62.0,
  };
  if (!customer) {
    customer = await Customer.create(customerPayload);
  } else {
    await customer.update(customerPayload);
  }

  // Template 2 Customer - NexTech Electronics
  let techCustomer = await Customer.findByPk(TECH_CUSTOMER_ID);
  const techCustomerPayload = {
    id: TECH_CUSTOMER_ID,
    storeId: TECH_WEBSITE_ID,
    name: 'Michael Tech Customer',
    email: 'tech.customer@example.com',
    phoneNumber: '+85512999777',
    password: customerPassword,
    status: 'active',
    isVerified: true,
    totalOrders: 1,
    totalSpent: 349.0,
  };
  if (!techCustomer) {
    techCustomer = await Customer.create(techCustomerPayload);
  } else {
    await techCustomer.update(techCustomerPayload);
  }

  // 6. Seed Payment Gateway Config
  console.log('💳 Seeding Payment Gateway Config...');
  const existingConfig = await PaymentGatewayConfig.findOne({
    where: { websiteId: WEBSITE_ID, gateway: 'khqr' },
  });
  if (!existingConfig) {
    await PaymentGatewayConfig.create({
      websiteId: WEBSITE_ID,
      gateway: 'khqr',
      enabled: true,
      config: {
        merchantName: 'Aura Botanicals',
        bakongAccountId: 'aura_botanicals@aclb',
        currency: 'USD',
      },
    });
  }

  const existingTechGateway = await PaymentGatewayConfig.findOne({
    where: { websiteId: TECH_WEBSITE_ID, gateway: 'khqr' },
  });
  if (!existingTechGateway) {
    await PaymentGatewayConfig.create({
      websiteId: TECH_WEBSITE_ID,
      gateway: 'khqr',
      enabled: true,
      config: {
        merchantName: 'NexTech Electronics',
        bakongAccountId: 'nextech_electronics@aclb',
        currency: 'USD',
      },
    });
  }

  // 7. Seed Orders & Invoices & Payments
  console.log('📦 Seeding Orders, Payments & Invoices...');
  let order1 = await Order.findByPk(ORDER_1_ID);
  if (!order1) {
    order1 = await Order.create({
      id: ORDER_1_ID,
      orderNumber: 'ORD-2026-001',
      websiteId: WEBSITE_ID,
      userId: MERCHANT_ID,
      customerId: CUSTOMER_ID,
      orderNiche: 'skincare',
      subtotal: 62.0,
      totalAmount: 62.0,
      status: 'completed',
      currency: 'USD',
      orderType: 'online',
      customerInfo: {
        name: 'Emily Watson',
        email: 'emily.customer@example.com',
        phone: '+85512999888',
      },
      shippingDetail: {
        address: 'No. 45, St. 240, Daun Penh',
        city: 'Phnom Penh',
        country: 'Cambodia',
      },
    });

    await OrderItem.create({
      orderId: ORDER_1_ID,
      productId: PROD_CLEANSER_ID,
      quantity: 1,
      price: 24.0,
      basePrice: 24.0,
      total: 24.0,
    });

    await OrderItem.create({
      orderId: ORDER_1_ID,
      productId: PROD_SERUM_ID,
      quantity: 1,
      price: 38.0,
      basePrice: 38.0,
      total: 38.0,
    });

    await Payment.create({
      id: PAYMENT_1_ID,
      orderId: ORDER_1_ID,
      amount: 62.0,
      status: 'completed',
      paymentMethod: 'khqr',
      gateway: 'khqr',
      currency: 'USD',
      transactionId: 'TXN-KHQR-998811',
      paidAt: new Date(),
    });

    await Invoice.create({
      invoiceNumber: 'INV-2026-001',
      websiteId: WEBSITE_ID,
      orderId: ORDER_1_ID,
      paymentId: PAYMENT_1_ID,
      dueDate: new Date(),
      status: 'paid',
    });
  }

  let order2 = await Order.findByPk(ORDER_2_ID);
  if (!order2) {
    order2 = await Order.create({
      id: ORDER_2_ID,
      orderNumber: 'ORD-2026-002',
      websiteId: WEBSITE_ID,
      userId: MERCHANT_ID,
      customerId: CUSTOMER_ID,
      orderNiche: 'skincare',
      subtotal: 28.0,
      totalAmount: 28.0,
      status: 'pending',
      currency: 'USD',
      orderType: 'online',
      customerInfo: {
        name: 'Emily Watson',
        email: 'emily.customer@example.com',
        phone: '+85512999888',
      },
      shippingDetail: {
        address: 'No. 45, St. 240, Daun Penh',
        city: 'Phnom Penh',
        country: 'Cambodia',
      },
    });

    await OrderItem.create({
      orderId: ORDER_2_ID,
      productId: PROD_SUNSCREEN_ID,
      quantity: 1,
      price: 28.0,
      basePrice: 28.0,
      total: 28.0,
    });

    await Payment.create({
      id: PAYMENT_2_ID,
      orderId: ORDER_2_ID,
      amount: 28.0,
      status: 'pending',
      paymentMethod: 'khqr',
      gateway: 'khqr',
      currency: 'USD',
    });

    await Invoice.create({
      invoiceNumber: 'INV-2026-002',
      websiteId: WEBSITE_ID,
      orderId: ORDER_2_ID,
      paymentId: PAYMENT_2_ID,
      dueDate: new Date(),
      status: 'pending',
    });
  }

  // Template 2 Orders - NexTech Electronics
  let techOrder1 = await Order.findByPk(TECH_ORDER_1_ID);
  if (!techOrder1) {
    techOrder1 = await Order.create({
      id: TECH_ORDER_1_ID,
      orderNumber: 'ORD-TECH-001',
      websiteId: TECH_WEBSITE_ID,
      userId: TECH_MERCHANT_ID,
      customerId: TECH_CUSTOMER_ID,
      orderNiche: 'ecommerce',
      subtotal: 349.0,
      totalAmount: 349.0,
      status: 'completed',
      currency: 'USD',
      orderType: 'online',
      customerInfo: {
        name: 'Michael Tech Customer',
        email: 'tech.customer@example.com',
        phone: '+85512999777',
      },
      shippingDetail: {
        address: 'No. 88, Russian Blvd, Toul Kork',
        city: 'Phnom Penh',
        country: 'Cambodia',
      },
    });

    await OrderItem.create({
      orderId: TECH_ORDER_1_ID,
      productId: TECH_PROD_WATCH_ID,
      quantity: 1,
      price: 349.0,
      basePrice: 349.0,
      total: 349.0,
    });

    await Payment.create({
      id: TECH_PAYMENT_1_ID,
      orderId: TECH_ORDER_1_ID,
      amount: 349.0,
      status: 'completed',
      paymentMethod: 'khqr',
      gateway: 'khqr',
      currency: 'USD',
      transactionId: 'TXN-KHQR-TECH-001',
      paidAt: new Date(),
    });

    await Invoice.create({
      invoiceNumber: 'INV-TECH-001',
      websiteId: TECH_WEBSITE_ID,
      orderId: TECH_ORDER_1_ID,
      paymentId: TECH_PAYMENT_1_ID,
      dueDate: new Date(),
      status: 'paid',
    });
  }

  let techOrder2 = await Order.findByPk(TECH_ORDER_2_ID);
  if (!techOrder2) {
    techOrder2 = await Order.create({
      id: TECH_ORDER_2_ID,
      orderNumber: 'ORD-TECH-002',
      websiteId: TECH_WEBSITE_ID,
      userId: TECH_MERCHANT_ID,
      customerId: TECH_CUSTOMER_ID,
      orderNiche: 'ecommerce',
      subtotal: 198.0,
      totalAmount: 198.0,
      status: 'pending',
      currency: 'USD',
      orderType: 'online',
      customerInfo: {
        name: 'Michael Tech Customer',
        email: 'tech.customer@example.com',
        phone: '+85512999777',
      },
      shippingDetail: {
        address: 'No. 88, Russian Blvd, Toul Kork',
        city: 'Phnom Penh',
        country: 'Cambodia',
      },
    });

    await OrderItem.create({
      orderId: TECH_ORDER_2_ID,
      productId: TECH_PROD_KEYBOARD_ID,
      quantity: 1,
      price: 139.0,
      basePrice: 139.0,
      total: 139.0,
    });

    await OrderItem.create({
      orderId: TECH_ORDER_2_ID,
      productId: TECH_PROD_CHARGER_ID,
      quantity: 1,
      price: 59.0,
      basePrice: 59.0,
      total: 59.0,
    });

    await Payment.create({
      id: TECH_PAYMENT_2_ID,
      orderId: TECH_ORDER_2_ID,
      amount: 198.0,
      status: 'pending',
      paymentMethod: 'khqr',
      gateway: 'khqr',
      currency: 'USD',
    });

    await Invoice.create({
      invoiceNumber: 'INV-TECH-002',
      websiteId: TECH_WEBSITE_ID,
      orderId: TECH_ORDER_2_ID,
      paymentId: TECH_PAYMENT_2_ID,
      dueDate: new Date(),
      status: 'pending',
    });
  }

  console.log('✅ Rentify Commerce Database Seeding completed successfully!');
}

if (require.main === module) {
  seedCommerce()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding error in Commerce:', err);
      process.exit(1);
    });
}

module.exports = seedCommerce;
