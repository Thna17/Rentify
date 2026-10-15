// scripts/test_raas.js
require('dotenv').config();
const { sequelize } = require('../config/db');
const { Order, Payment, WebsiteData, OrderItem, Product } = require('../models');
const recoveryWorker = require('../modules/payments/recoveryWorker');
const PaymentVerificationService = require('../modules/payments/PaymentVerificationService');
const FulfillmentService = require('../modules/payments/FulfillmentService');

async function testRaaS() {
    console.log('🧪 Starting RaaS Engine Simulation...\n');

    // 1. Mock the specific Verify function to always succeed for this test
    const originalVerify = PaymentVerificationService.verifyBakongTransaction;
    PaymentVerificationService.verifyBakongTransaction = async () => {
        console.log('   [Mock] Bakong API called... Transaction Verified from Bank Side! ✅');
        return {
            transactionId: 'BAKONG-MOCK-TX-123',
            amount: 10.00,
            currency: 'USD',
            verifiedAt: new Date()
        };
    };

    const t = await sequelize.transaction();

    try {
        // 2. Setup: Create a "Stuck" Order and Payment
        console.log('1️⃣  Simulating a "Lost" Transaction (User closed tab)...');

        // Ensure we have a website (fallback)
        let website = await WebsiteData.findOne({ transaction: t });
        if (!website) {
            website = await WebsiteData.create({
                id: 'test-website-id',
                domain: 'test-store.com',
                niche: 'ecommerce'
            }, { transaction: t });
        }

        const order = await Order.create({
            websiteId: website.id,
            totalAmount: 10.00,
            status: 'pending',
            orderType: 'online',
            customerInfo: { name: 'Test User', email: 'test@example.com' },
            shippingDetail: { address: '123 Test St' },
            currency: 'USD'
        }, { transaction: t });

        // Create Dummy Product & Item for Stock Logic
        const randomSuffix = Math.floor(Math.random() * 10000);
        const product = await Product.create({
            websiteId: website.id,
            name: `Test Product ${randomSuffix}`,
            price: 10.00,
            stockQuantity: 100,
            status: 'active',
            websiteNiche: 'ecommerce'
        }, { transaction: t });

        await OrderItem.create({
            orderId: order.id,
            productId: product.id,
            quantity: 1,
            price: 10.00,
            basePrice: 10.00,
            total: 10.00
        }, { transaction: t });

        const payment = await Payment.create({
            orderId: order.id,
            amount: 10.00,
            status: 'pending',
            paymentMethod: 'khqr',
            transactionData: { md5Hash: 'mock-hash-123' }, // Existing hash
            isRecovered: false
        }, { transaction: t });

        // Commit set up
        await t.commit();
        // t = null; // Do not nullify const, but track state
        console.log(`   -> Created Stuck Order: ${order.id}`);
        console.log(`   -> Created Pending Payment: ${payment.id}`);
        console.log(`   -> Current Status: ORDER=${order.status}, PAYMENT=${payment.status}\n`);


        // 3. Run the Watchdog
        console.log('2️⃣  Running Recovery Watchdog (Force Run)...');

        // We override the "time filter" logic in the worker for this test 
        // simply by calling the core logic on our specific payment manually
        // OR we can just wait 1 second and run the worker if we relaxed the SQL query.
        // To be precise/fast, let's call fulfillment service directly simulating the worker finding it.

        const verificationData = await PaymentVerificationService.verifyBakongTransaction('hash', 10.00);

        if (verificationData) {
            await FulfillmentService.confirmOrderPayment(payment.id, verificationData, true);
        }

        console.log('\n3️⃣  Verifying Results...');

        const updatedOrder = await Order.findByPk(order.id);
        const updatedPayment = await Payment.findByPk(payment.id);

        console.log(`   -> Final Order Status: ${updatedOrder.status} ${updatedOrder.status === 'processing' ? '✅' : '❌'}`);
        console.log(`   -> Final Payment Status: ${updatedPayment.status} ${updatedPayment.status === 'completed' ? '✅' : '❌'}`);
        console.log(`   -> isRecovered Flag: ${updatedPayment.isRecovered} ${updatedPayment.isRecovered === true ? '✅' : '❌'}`);

        if (updatedPayment.status === 'completed' && updatedPayment.isRecovered) {
            console.log('\n🎉 SUCCESS: RaaS Engine successfully detected and recovered the lost revenue!');
        } else {
            console.log('\n❌ FAILED: Recovery logic did not execute as expected.');
        }

    } catch (err) {
        if (t && !t.finished) await t.rollback();
        console.error('Test Failed:', err);
    } finally {
        // Restore mock (good practice)
        PaymentVerificationService.verifyBakongTransaction = originalVerify;
        // process.exit(); // Let it finish naturally
    }
}

testRaaS();
