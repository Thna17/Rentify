// ecommerce-server/scripts/seedTechMarketplace.js
const { sequelize } = require('../config/db');
const {
  StoreAccess,
  StoreDeliveryPolicy,
  Product,
  Order,
  OrderItem,
  Payment,
  Invoice,
  OrderEvent,
} = require('../models');

const TECH_MERCHANT_ID = '55555555-5555-4555-8555-555555555555';
const TECH_WEBSITE_ID = '8c90a1b2-3b4c-5d6e-9f0a-1b2c3d4e5f60';
const TECH_STORE_ID = '9c9030e1-476f-4ef4-92f8-c9f4a96d52a8';

const BUYER_EMILY_ID = '99999999-9999-4999-8999-999999999999';
const BUYER_MICHAEL_ID = '88888888-8888-4888-8888-888888888888';

const TECH_PROD_HEADPHONES_ID = 'b7777777-7777-4777-8777-777777777771';
const TECH_PROD_EARBUDS_ID = 'b7777777-7777-4777-8777-777777777772';
const TECH_PROD_WATCH_ID = 'b7777777-7777-4777-8777-777777777773';
const TECH_PROD_KEYBOARD_ID = 'b7777777-7777-4777-8777-777777777774';
const TECH_PROD_STAND_ID = 'b7777777-7777-4777-8777-777777777775';
const TECH_PROD_CHARGER_ID = 'b7777777-7777-4777-8777-777777777776';

const MKT_ORDER_1_ID = '05555555-5555-4555-8555-555555555551';
const MKT_ORDER_2_ID = '05555555-5555-4555-8555-555555555552';

const MKT_PAYMENT_1_ID = 'a5555555-5555-4555-8555-555555555551';
const MKT_PAYMENT_2_ID = 'a5555555-5555-4555-8555-555555555552';

async function seedTechMarketplace() {
  console.log('⚡ Injecting NexTech Electronics Marketplace setup in Commerce API...');
  await sequelize.authenticate();

  // 1. Ensure StoreAccess
  let storeAccess = await StoreAccess.findByPk(TECH_STORE_ID);
  const storePayload = {
    storeId: TECH_STORE_ID,
    ownerUserId: TECH_MERCHANT_ID,
    websiteId: TECH_WEBSITE_ID,
    primaryCategory: 'Electronics',
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    version: 3,
    marketplaceEntitlement: 'pilot',
  };

  if (!storeAccess) {
    storeAccess = await StoreAccess.create(storePayload);
    console.log('✅ Created StoreAccess for NexTech');
  } else {
    await storeAccess.update(storePayload);
    console.log('✅ Updated StoreAccess for NexTech');
  }

  // 2. Ensure StoreDeliveryPolicy
  let policy = await StoreDeliveryPolicy.findByPk(TECH_STORE_ID);
  if (!policy) {
    policy = await StoreDeliveryPolicy.create({
      storeId: TECH_STORE_ID,
      flatFee: '3.00',
      currency: 'USD',
      version: 1,
    });
    console.log('✅ Created StoreDeliveryPolicy flatFee $3.00 for NexTech');
  } else {
    await policy.update({ flatFee: '3.00' });
    console.log('✅ Updated StoreDeliveryPolicy for NexTech');
  }

  // 3. Ensure Products are categorized for Marketplace
  const productCategories = [
    { id: TECH_PROD_HEADPHONES_ID, category: 'Electronics Accessories' },
    { id: TECH_PROD_EARBUDS_ID, category: 'Electronics Accessories' },
    { id: TECH_PROD_WATCH_ID, category: 'Phones & Devices' },
    { id: TECH_PROD_KEYBOARD_ID, category: 'Electronics Accessories' },
    { id: TECH_PROD_STAND_ID, category: 'Electronics Accessories' },
    { id: TECH_PROD_CHARGER_ID, category: 'Electronics Accessories' },
  ];

  for (const item of productCategories) {
    const prod = await Product.findByPk(item.id);
    if (prod) {
      await prod.update({
        storeId: TECH_STORE_ID,
        marketplaceCategory: item.category,
        status: 'active',
      });
    }
  }
  console.log('✅ Classified all 6 NexTech products for Marketplace');

  // Clean up any partial previous runs
  await Invoice.destroy({ where: { orderId: [MKT_ORDER_1_ID, MKT_ORDER_2_ID] } });
  await OrderEvent.destroy({ where: { orderId: [MKT_ORDER_1_ID, MKT_ORDER_2_ID] } });
  await Payment.destroy({ where: { orderId: [MKT_ORDER_1_ID, MKT_ORDER_2_ID] } });
  await OrderItem.destroy({ where: { orderId: [MKT_ORDER_1_ID, MKT_ORDER_2_ID] } });
  await Order.destroy({ where: { id: [MKT_ORDER_1_ID, MKT_ORDER_2_ID] } });

  // 4. Inject Marketplace Order 1 (Delivered Marketplace COD Order)
  let order1 = await Order.findByPk(MKT_ORDER_1_ID);
  if (!order1) {
    order1 = await Order.create({
      id: MKT_ORDER_1_ID,
      orderNumber: 'ORD-MKT-TECH-001',
      storeId: TECH_STORE_ID,
      websiteId: null, // Central marketplace order
      buyerId: BUYER_EMILY_ID,
      checkoutKey: 'key-mkt-tech-001-chk',
      salesChannel: 'marketplace',
      status: 'completed',
      deliveryStatus: 'delivered',
      stockDeducted: true,
      subtotal: 199.00,
      shippingFee: 3.00,
      taxTotal: 0.00,
      totalAmount: 202.00,
      currency: 'USD',
      orderType: 'online',
      customerInfo: {
        name: 'Emily Watson',
        email: 'emily.customer@example.com',
        phone: '+85512999888',
      },
      shippingDetail: {
        address: 'No. 12, Street 302, BKK1',
        city: 'Phnom Penh',
        country: 'Cambodia',
      },
    });

    await OrderItem.create({
      orderId: MKT_ORDER_1_ID,
      productId: TECH_PROD_HEADPHONES_ID,
      name: 'AuraSound Wireless ANC Headphones',
      quantity: 1,
      price: 199.00,
      basePrice: 199.00,
      total: 199.00,
      itemMetadata: {
        seller: {
          storeId: TECH_STORE_ID,
          storeName: 'NexTech Electronics',
        },
      },
    });

    await Payment.create({
      id: MKT_PAYMENT_1_ID,
      orderId: MKT_ORDER_1_ID,
      amount: 202.00,
      collectedAmount: 202.00,
      refundedAmount: 0.00,
      status: 'paid',
      paymentMethod: 'COD',
      gateway: 'cod',
      currency: 'USD',
      transactionId: 'TXN-COD-MKT-001',
      paidAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    await Invoice.create({
      invoiceNumber: 'INV-MKT-TECH-001',
      websiteId: TECH_WEBSITE_ID,
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_1_ID,
      paymentId: MKT_PAYMENT_1_ID,
      dueDate: new Date(),
      status: 'paid',
    });

    await OrderEvent.create({
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_1_ID,
      eventKey: 'evt-001-placed',
      actorId: BUYER_EMILY_ID,
      type: 'order_placed',
      details: { channel: 'marketplace', paymentMethod: 'COD' },
    });

    await OrderEvent.create({
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_1_ID,
      eventKey: 'evt-001-dispatched',
      actorId: TECH_MERCHANT_ID,
      type: 'dispatched',
      details: { carrier: 'Express Courier', trackingNumber: 'EX-88991' },
    });

    await OrderEvent.create({
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_1_ID,
      eventKey: 'evt-001-delivered',
      actorId: TECH_MERCHANT_ID,
      type: 'delivered',
      details: { cashCollected: 202.00 },
    });

    console.log('✅ Injected Marketplace Order 1 (ORD-MKT-TECH-001 - Delivered COD)');
  }

  // 5. Inject Marketplace Order 2 (Out for Delivery Marketplace COD Order)
  let order2 = await Order.findByPk(MKT_ORDER_2_ID);
  if (!order2) {
    order2 = await Order.create({
      id: MKT_ORDER_2_ID,
      orderNumber: 'ORD-MKT-TECH-002',
      storeId: TECH_STORE_ID,
      websiteId: null, // Central marketplace order
      buyerId: BUYER_MICHAEL_ID,
      checkoutKey: 'key-mkt-tech-002-chk',
      salesChannel: 'marketplace',
      status: 'pending',
      deliveryStatus: 'out_for_delivery',
      stockDeducted: true,
      subtotal: 178.00,
      shippingFee: 3.00,
      taxTotal: 0.00,
      totalAmount: 181.00,
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
      orderId: MKT_ORDER_2_ID,
      productId: TECH_PROD_EARBUDS_ID,
      name: 'PulseBuds Pro True Wireless Earbuds',
      quantity: 1,
      price: 119.00,
      basePrice: 119.00,
      total: 119.00,
      itemMetadata: {
        seller: {
          storeId: TECH_STORE_ID,
          storeName: 'NexTech Electronics',
        },
      },
    });

    await OrderItem.create({
      orderId: MKT_ORDER_2_ID,
      productId: TECH_PROD_CHARGER_ID,
      name: 'OmniPower 100W GaN Fast Charger',
      quantity: 1,
      price: 59.00,
      basePrice: 59.00,
      total: 59.00,
      itemMetadata: {
        seller: {
          storeId: TECH_STORE_ID,
          storeName: 'NexTech Electronics',
        },
      },
    });

    await Payment.create({
      id: MKT_PAYMENT_2_ID,
      orderId: MKT_ORDER_2_ID,
      amount: 181.00,
      collectedAmount: 0.00,
      refundedAmount: 0.00,
      status: 'pending',
      paymentMethod: 'COD',
      gateway: 'cod',
      currency: 'USD',
    });

    await Invoice.create({
      invoiceNumber: 'INV-MKT-TECH-002',
      websiteId: TECH_WEBSITE_ID,
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_2_ID,
      paymentId: MKT_PAYMENT_2_ID,
      dueDate: new Date(),
      status: 'pending',
    });

    await OrderEvent.create({
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_2_ID,
      eventKey: 'evt-002-placed',
      actorId: BUYER_MICHAEL_ID,
      type: 'order_placed',
      details: { channel: 'marketplace', paymentMethod: 'COD' },
    });

    await OrderEvent.create({
      storeId: TECH_STORE_ID,
      orderId: MKT_ORDER_2_ID,
      eventKey: 'evt-002-dispatched',
      actorId: TECH_MERCHANT_ID,
      type: 'dispatched',
      details: { carrier: 'Express Courier', trackingNumber: 'EX-99223' },
    });

    console.log('✅ Injected Marketplace Order 2 (ORD-MKT-TECH-002 - Out for Delivery)');
  }

  console.log('🚀 NexTech Electronics Commerce Marketplace setup complete!');
}

if (require.main === module) {
  seedTechMarketplace()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedTechMarketplace;
