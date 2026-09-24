// rentify-server/scripts/seed.js
const bcrypt = require('bcrypt');
const sequelize = require('../src/config/db');
const {
  User,
  Package,
  WebsiteTemplate,
  TemplateContent,
  Website,
  WebsiteContent,
  Subscription,
  Staff
} = require('../src/models');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const MERCHANT_ID = '22222222-2222-4222-8222-222222222222';
const STAFF_ID = '33333333-3333-4333-8333-333333333333';
const TECH_MERCHANT_ID = '55555555-5555-4555-8555-555555555555';
const TECH_STAFF_ID = '66666666-6666-4666-8666-666666666666';
const TEMPLATE_1_ID = '044c94e2-a47c-47d5-895b-33bc00eb5abb';
const TEMPLATE_2_ID = 'af3e0202-6327-45b1-bece-02ab3aba4a05';
const WEBSITE_ID = '7b8f9e01-2a3b-4c5d-8e9f-0a1b2c3d4e5f';
const TECH_WEBSITE_ID = '8c90a1b2-3b4c-5d6e-9f0a-1b2c3d4e5f60';
const STARTER_PKG_ID = '44444444-4444-4444-8444-444444444441';
const GROWTH_PKG_ID = '44444444-4444-4444-8444-444444444442';
const ENTERPRISE_PKG_ID = '44444444-4444-4444-8444-444444444443';

async function seedCore() {
  console.log('🌱 Starting Rentify Core Database Seeding...');
  await sequelize.authenticate();

  // 1. Seed Packages
  console.log('📦 Seeding packages...');
  const packagesData = [
    {
      id: STARTER_PKG_ID,
      name: 'Free Trial',
      price: 0.0,
      duration: '14 days',
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
      limits: { staff: 2, storage: 1024, products: 50 },
    },
    {
      id: GROWTH_PKG_ID,
      name: 'Growth',
      price: 29.0,
      duration: '1 month',
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
      limits: { staff: 5, storage: 5120, products: 500 },
    },
    {
      id: ENTERPRISE_PKG_ID,
      name: 'Enterprise',
      price: 99.0,
      duration: '1 year',
      features: [
        'basic-dashboard',
        'product-management',
        'order-management',
        'store',
        'advanced-analytics',
        'invoice',
        'pos',
        'Multi-Storefront',
        'Unlimited Staff',
        'Dedicated Support',
        'Custom Integrations',
      ],
      limits: { staff: 25, storage: 20480, products: 5000 },
    },
  ];

  for (const pkg of packagesData) {
    const existing = await Package.findByPk(pkg.id);
    if (!existing) {
      await Package.create(pkg);
    } else {
      existing.name = pkg.name;
      existing.price = pkg.price;
      existing.duration = pkg.duration;
      existing.features = pkg.features;
      existing.limits = pkg.limits;
      existing.changed('features', true);
      existing.changed('limits', true);
      await existing.save();
    }
  }

  // 2. Seed Users
  console.log('👤 Seeding users...');
  const adminPassword = await bcrypt.hash('Admin@12345', 10);
  const merchantPassword = await bcrypt.hash('Merchant@12345', 10);
  const staffPassword = await bcrypt.hash('Staff@12345', 10);
  const customerPassword = await bcrypt.hash('Customer@12345', 10);

  const usersData = [
    {
      id: ADMIN_ID,
      name: 'Rentify Admin',
      email: 'admin@rentify.local',
      phoneNumber: '+85512000001',
      password: adminPassword,
      role: 'admin',
      isVerified: true,
    },
    {
      id: MERCHANT_ID,
      name: 'Sarah Skincare Merchant',
      email: 'merchant@rentify.local',
      phoneNumber: '+85512000002',
      password: merchantPassword,
      role: 'user',
      isVerified: true,
    },
    {
      id: TECH_MERCHANT_ID,
      name: 'Alex Tech Merchant',
      email: 'tech.merchant@rentify.local',
      phoneNumber: '+85512000004',
      password: merchantPassword,
      role: 'user',
      isVerified: true,
    },
    {
      id: '99999999-9999-4999-8999-999999999999',
      name: 'Emily Watson',
      email: 'emily.customer@example.com',
      phoneNumber: '+85512999888',
      password: customerPassword,
      role: 'user',
      isVerified: true,
    },
    {
      id: '88888888-8888-4888-8888-888888888888',
      name: 'Michael Tech Customer',
      email: 'tech.customer@example.com',
      phoneNumber: '+85512999777',
      password: customerPassword,
      role: 'user',
      isVerified: true,
    },
  ];

  for (const u of usersData) {
    const existing = await User.findByPk(u.id);
    if (!existing) {
      await User.create(u);
    } else {
      await existing.update(u);
    }
  }

  // 3. Seed WebsiteTemplates
  console.log('🎨 Seeding website templates...');
  const templatesData = [
    {
      id: TEMPLATE_1_ID,
      name: 'Skin Care Website',
      websiteTemplateId: 1,
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4700',
      description: 'A sleek and modern e-commerce template designed for skincare brands. Featuring a clean layout, easy navigation, and built-in product showcase sections.',
      features: ['Responsive Design', 'SEO Optimized', 'Dark Mode Support', 'Integrated E-commerce'],
      pages: [
        { id: 1, page: 'global setting', route: '/' },
        { id: 2, page: 'Homepage', route: '/' },
        { id: 3, page: 'product', route: '/product' },
        { id: 4, page: 'About Us', route: '/about' },
        { id: 5, page: 'Contact', route: '/contact' },
      ],
      colorPalette: {
        primary: '#2D6A4F',
        secondary: '#52B788',
        accent: '#D8F3DC',
        background: '#F8F9FA',
      },
    },
    {
      id: TEMPLATE_2_ID,
      name: 'Technology Shop Website',
      websiteTemplateId: 2,
      category: 'ecommerce',
      framework: 'vite',
      baseUrl: 'http://localhost:4600',
      description: 'A professional and elegant template designed for electronics, gadgets, and tech shops.',
      features: ['Fully Responsive', 'SEO Ready', 'Dark Mode Available', 'Tech Specs & Reviews'],
      pages: [
        { id: 1, page: 'global setting', route: '/' },
        { id: 2, page: 'Homepage', route: '/' },
        { id: 3, page: 'Product', route: '/shop' },
      ],
      colorPalette: {
        primary: '#2563EB',
        secondary: '#3B82F6',
        accent: '#DBEAFE',
        background: '#0F172A',
      },
    },
  ];

  for (const t of templatesData) {
    const existing = await WebsiteTemplate.findByPk(t.id);
    if (!existing) {
      await WebsiteTemplate.create(t);
    } else {
      await existing.update(t);
    }
  }

  // 4. Seed TemplateContents for Template 1
  console.log('📑 Seeding template contents...');
  const templateContentsData = [
    {
      templateId: TEMPLATE_1_ID,
      category: 'Header',
      label: 'Site Title',
      type: 'text',
      value: { text: 'Aura Botanicals' },
    },
    {
      templateId: TEMPLATE_1_ID,
      category: 'Hero',
      label: 'Hero Headline',
      type: 'text',
      value: { text: 'Glow Naturally with Organic Skincare' },
    },
    {
      templateId: TEMPLATE_1_ID,
      category: 'Hero',
      label: 'Hero Subtitle',
      type: 'text',
      value: { text: 'Formulated with 100% certified organic botanical extracts for glowing, healthy skin.' },
    },
    {
      templateId: TEMPLATE_1_ID,
      category: 'Color Palette',
      label: 'Color Palette',
      type: 'palette',
      value: { primary: '#2D6A4F', secondary: '#52B788', background: '#F8F9FA' },
    },
    {
      templateId: TEMPLATE_1_ID,
      category: 'Footer',
      label: 'Copyright',
      type: 'text',
      value: { text: '© 2026 Aura Botanicals. Powered by Rentify.' },
    },
    {
      templateId: TEMPLATE_2_ID,
      category: 'Header',
      label: 'Site Title',
      type: 'text',
      value: { text: 'NexTech Electronics' },
    },
    {
      templateId: TEMPLATE_2_ID,
      category: 'Hero',
      label: 'Hero Headline',
      type: 'text',
      value: { text: 'Next Generation Tech & Gadgets' },
    },
    {
      templateId: TEMPLATE_2_ID,
      category: 'Hero',
      label: 'Hero Subtitle',
      type: 'text',
      value: { text: 'Discover high performance audio, smart wearables, and computing essentials.' },
    },
    {
      templateId: TEMPLATE_2_ID,
      category: 'Color Palette',
      label: 'Color Palette',
      type: 'palette',
      value: { primary: '#2563EB', secondary: '#3B82F6', background: '#0F172A' },
    },
  ];

  for (const tc of templateContentsData) {
    const existing = await TemplateContent.findOne({
      where: { templateId: tc.templateId, category: tc.category, label: tc.label },
    });
    if (!existing) {
      await TemplateContent.create(tc);
    } else {
      await existing.update(tc);
    }
  }

  // 5. Seed Website & Subscription
  console.log('🌐 Seeding merchant website & subscription...');
  let website = await Website.findByPk(WEBSITE_ID);
  if (!website) {
    website = await Website.create({
      id: WEBSITE_ID,
      userId: MERCHANT_ID,
      templateId: TEMPLATE_1_ID,
      name: 'Aura Botanicals',
      domain: 'localhost',
      status: 'active',
      limits: { staff: 2, storage: 1024, products: 50 },
      currentUsage: { staff: 1, storage: 120, products: 6 },
    });
  } else {
    await website.update({
      userId: MERCHANT_ID,
      templateId: TEMPLATE_1_ID,
      name: 'Aura Botanicals',
      domain: 'localhost',
      status: 'active',
    });
  }

  // Subscription
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 30);

  let subscription = await Subscription.findOne({ where: { websiteId: WEBSITE_ID } });
  if (!subscription) {
    subscription = await Subscription.create({
      userId: MERCHANT_ID,
      packageId: STARTER_PKG_ID,
      websiteId: WEBSITE_ID,
      startDate,
      endDate,
      status: 'trial',
    });
  }
  await website.update({ subscriptionId: subscription.id });

  // Seed Tech Website (Template 2)
  let techWebsite = await Website.findByPk(TECH_WEBSITE_ID);
  if (!techWebsite) {
    techWebsite = await Website.create({
      id: TECH_WEBSITE_ID,
      userId: TECH_MERCHANT_ID,
      templateId: TEMPLATE_2_ID,
      name: 'NexTech Electronics',
      domain: 'localhost:4600',
      status: 'active',
      limits: { staff: 5, storage: 5120, products: 500 },
      currentUsage: { staff: 1, storage: 250, products: 6 },
    });
  } else {
    await techWebsite.update({
      userId: TECH_MERCHANT_ID,
      templateId: TEMPLATE_2_ID,
      name: 'NexTech Electronics',
      domain: 'localhost:4600',
      status: 'active',
    });
  }

  let techSubscription = await Subscription.findOne({ where: { websiteId: TECH_WEBSITE_ID } });
  if (!techSubscription) {
    techSubscription = await Subscription.create({
      userId: TECH_MERCHANT_ID,
      packageId: GROWTH_PKG_ID,
      websiteId: TECH_WEBSITE_ID,
      startDate,
      endDate,
      status: 'trial',
    });
  }
  await techWebsite.update({ subscriptionId: techSubscription.id });

  // 6. Seed WebsiteContent for Websites
  console.log('📄 Seeding website content...');
  const websiteContentsData = [
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
    {
      websiteId: WEBSITE_ID,
      category: 'global setting',
      label: 'Website Name',
      type: 'text',
      value: 'Aura Botanicals',
    },
    {
      websiteId: WEBSITE_ID,
      category: 'homepage',
      label: 'Hero Image',
      type: 'image[]',
      value: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=1600&auto=format&fit=crop&q=80',
      ],
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
      category: 'global setting',
      label: 'Website Name',
      type: 'text',
      value: 'NexTech Electronics',
    },
    {
      websiteId: TECH_WEBSITE_ID,
      category: 'homepage',
      label: 'Hero Image',
      type: 'image[]',
      value: [
        'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1600&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&auto=format&fit=crop&q=80',
      ],
    },
  ];

  for (const wc of websiteContentsData) {
    const existing = await WebsiteContent.findOne({
      where: { websiteId: wc.websiteId, category: wc.category, label: wc.label },
    });
    if (!existing) {
      await WebsiteContent.create(wc);
    } else {
      await existing.update(wc);
    }
  }

  // 7. Seed Staff
  console.log('👥 Seeding store staff...');
  const existingStaff = await Staff.findByPk(STAFF_ID);
  if (!existingStaff) {
    await Staff.create({
      id: STAFF_ID,
      merchantId: MERCHANT_ID,
      websiteId: WEBSITE_ID,
      name: 'John Staff',
      email: 'staff@rentify.local',
      phoneNumber: '+85512000003',
      password: staffPassword,
      permissions: ['manage_products', 'manage_orders', 'manage_invoices', 'manage_pos'],
      isActive: true,
      isVerified: true,
    });
  }

  const existingTechStaff = await Staff.findByPk(TECH_STAFF_ID);
  if (!existingTechStaff) {
    await Staff.create({
      id: TECH_STAFF_ID,
      merchantId: TECH_MERCHANT_ID,
      websiteId: TECH_WEBSITE_ID,
      name: 'David Tech Staff',
      email: 'tech.staff@rentify.local',
      phoneNumber: '+85512000005',
      password: staffPassword,
      permissions: ['manage_products', 'manage_orders', 'manage_invoices', 'manage_pos'],
      isActive: true,
      isVerified: true,
    });
  }

  const seedTechStore = require('./seedTechStore');
  await seedTechStore();

  console.log('✅ Rentify Core Database Seeding completed successfully!');
}

if (require.main === module) {
  seedCore()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding error in Core:', err);
      process.exit(1);
    });
}

module.exports = seedCore;
