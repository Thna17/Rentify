// services/subscriptionService.js
const { Package, Subscription, Payment, Website } = require('../models');
const { Op } = require('sequelize');
const { SUBSCRIPTION } = require('../config/constants');
const { logger } = require('../utils/logger');

class SubscriptionService {
  /**
   * Create trial subscription
   */
  async createTrialSubscription(userId, packageId, websiteId, transaction = null) {
    if (!websiteId) {
      throw new Error('A website is required for a trial subscription');
    }
    const pkg = await Package.findByPk(packageId, { transaction });
    
    if (!pkg) {
      throw new Error('Package not found');
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + SUBSCRIPTION.TRIAL_DURATION);

    const subscription = await Subscription.create({
      userId,
      packageId,
      websiteId,
      paymentId: null,
      startDate,
      endDate,
      status: SUBSCRIPTION.STATUS.TRIAL,
      isTrial: true
    }, { transaction });

    logger.info('Trial subscription created', { 
      subscriptionId: subscription.id, 
      userId,
      endDate: endDate.toISOString()
    });

    return { 
      ...subscription.get({ plain: true }), 
      Package: pkg.get({ plain: true }) 
    };
  }

  /**
   * Create paid subscription
   */
  async createPaidSubscription(userId, packageId, paymentId, transaction = null) {
    const [pkg, paymentRecord, website] = await Promise.all([
      Package.findByPk(packageId, { transaction }),
      Payment.findByPk(paymentId, { transaction }),
      Website.findOne({ where: { userId }, transaction })
    ]);

    if (!pkg) throw new Error('Package not found');
    if (!paymentRecord) throw new Error('Payment not found');
    if (!website) throw new Error('Website not found for paid subscription');

    // Validate payment ownership and status
    this.validatePayment(paymentRecord, userId);

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // 1 month default

    const subscription = await Subscription.create({
      userId,
      packageId,
      websiteId: website.id,
      paymentId,
      startDate,
      endDate,
      status: SUBSCRIPTION.STATUS.ACTIVE,
      isTrial: false
    }, { transaction });

    logger.info('Paid subscription created', { 
      subscriptionId: subscription.id, 
      userId,
      paymentId 
    });

    return { 
      ...subscription.get({ plain: true }), 
      Package: pkg.get({ plain: true }) 
    };
  }

  /**
   * Validate payment for subscription
   */
  validatePayment(paymentRecord, userId) {
    if (paymentRecord.userId !== userId) {
      throw new Error('Unauthorized: Payment does not belong to user');
    }

    if (paymentRecord.status !== 'completed') {
      throw new Error(`Payment status is ${paymentRecord.status}. Subscription requires completed payment.`);
    }
  }

  /**
   * Get all packages
   */
  async getPackages() {
    return Package.findAll({
      order: [['price', 'ASC']]
    });
  }

  /**
   * Get package by ID
   */
  async getPackageById(packageId) {
    const pkg = await Package.findByPk(packageId);
    
    if (!pkg) {
      throw new Error('Package not found');
    }

    return pkg;
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId) {
    const subscription = await Subscription.findOne({
      where: { 
        userId,
        status: [SUBSCRIPTION.STATUS.ACTIVE, SUBSCRIPTION.STATUS.TRIAL],
        endDate: { [Op.gt]: new Date() }
      },
      include: [Package]
    });

    return subscription;
  }
}

module.exports = new SubscriptionService();
