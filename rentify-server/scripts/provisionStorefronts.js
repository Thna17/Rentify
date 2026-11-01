const { sequelize } = require('../src/config/db');
const { Website, WebsiteTemplate, Package, User, Store, Subscription, Payment, WebsiteContent } = require('../src/models');
const websiteService = require('../src/modules/websites/websiteService');
const deploymentService = require('../src/modules/deployments/deploymentService');
const { logger } = require('../src/utils/logger');

async function run() {
  console.log('Finding stores without websites or uncompleted deployments...');

  const templates = await WebsiteTemplate.findAll();
  console.log('Available templates:', templates.map(t => ({ id: t.id, name: t.name, cat: t.category, num: t.websiteTemplateId })));

  const starterPkg = await Package.findOne({ where: { price: 5 } });
  if (!starterPkg) throw new Error('Starter $5 package not found!');
  console.log('Starter package:', starterPkg.id, starterPkg.name, starterPkg.price);

  // Template mapping helper based on category
  const getTemplateForCategory = (cat) => {
    const c = String(cat || '').toLowerCase();
    if (c.includes('cafe') || c.includes('food') || c.includes('beverage')) {
      return templates.find(t => t.websiteTemplateId === 3) || templates[0];
    }
    if (c.includes('electronic') || c.includes('tech')) {
      return templates.find(t => t.websiteTemplateId === 2) || templates[0];
    }
    // Default to template 1 (ecommerce / skincare / general)
    return templates.find(t => t.websiteTemplateId === 1) || templates[0];
  };

  const stores = await Store.findAll({
    include: [{ model: Website, as: 'website' }],
  });

  for (const store of stores) {
    console.log(`\nProcessing Store: "${store.name}" (${store.id}), Category: ${store.primaryCategory}`);

    let website = store.website;
    if (!website) {
      console.log(`Creating website for store "${store.name}"...`);
      const selectedTemplate = getTemplateForCategory(store.primaryCategory);
      
      const payment = await Payment.create({
        userId: store.ownerUserId,
        packageId: starterPkg.id,
        amount: 5,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'khqr',
        transactionId: `SEED-PROVISION-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        transactionData: { provisioned: true },
      });

      const niche = (store.primaryCategory && String(store.primaryCategory).toLowerCase().includes('cafe')) ? 'cafe' : 'ecommerce';
      website = await websiteService.createWebsiteWithTrial({
        userId: store.ownerUserId,
        templateId: selectedTemplate.id,
        businessData: {
          name: store.name,
          niche,
          primaryCategory: store.primaryCategory || 'Other',
          email: `${store.slug}@rentify.dev`,
        },
        packageId: starterPkg.id,
        paymentId: payment.id,
      });
      console.log(`Created website ${website.id} for store "${store.name}"`);
    } else {
      console.log(`Store already has website ${website.id}, status: ${website.status}, subdomain: ${website.subdomain}`);
    }

    if (website.status !== 'active' || !website.subdomain) {
      console.log(`Publishing website ${website.id}...`);
      const result = await deploymentService.publishWebsite(website.id);
      console.log(`Published website ${website.id}: URL = ${result.deploymentUrl}`);
    } else {
      console.log(`Website ${website.id} is already active on subdomain: ${website.subdomain}`);
    }
  }

  console.log('\nAll stores checked and provisioned successfully!');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error provisioning storefronts:', err);
    process.exit(1);
  });
