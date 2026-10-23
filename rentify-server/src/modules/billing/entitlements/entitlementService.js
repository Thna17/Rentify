// rentify-server/src/modules/billing/entitlements/entitlementService.js
// Centralized server-side entitlement evaluation engine for Rentify Core.

const {
  CAPABILITIES_VERSION,
  LIFECYCLE_STATES,
  POLICY_CONSTANTS,
  CAPABILITY_TIERS,
  resolveTier,
} = require('./capabilityConfig');

class EntitlementService {
  constructor() {
    this.version = CAPABILITIES_VERSION;
  }

  /**
   * Authoritatively evaluates versioned entitlements for a store.
   *
   * @param {string} storeId - Target store identifier
   * @param {Object} [options]
   * @param {Object} [options.transaction] - Sequelize transaction
   * @param {Date} [options.asOfDate] - Optional evaluation timestamp (defaults to now)
   * @param {Object} [options.store] - Pre-fetched store model
   * @returns {Promise<Object>} Authoritative versioned entitlement snapshot
   */
  async evaluateStoreEntitlements(storeId, options = {}) {
    const { transaction, asOfDate = new Date() } = options;
    const now = new Date(asOfDate);

    const { Store, Subscription, Package, Website, Staff } = require('../../../models');

    let store = options.store;
    if (!store) {
      store = await Store.findByPk(storeId, { transaction });
    }
    if (!store) {
      const err = new Error('Store not found for entitlement evaluation');
      err.statusCode = 404;
      throw err;
    }

    // Lookup website linked to this store (if any)
    let website = options.website;
    if (website === undefined) {
      try {
        website = await Website.findOne({ where: { storeId }, transaction });
      } catch {
        website = null;
      }
    }

    // Lookup latest subscription linked to user or website
    let subscription = options.subscription;
    if (subscription === undefined && (website || store.ownerUserId)) {
      try {
        const whereCond = website?.id
          ? { websiteId: website.id }
          : { userId: store.ownerUserId };

        subscription = await Subscription.findOne({
          where: whereCond,
          include: [{ model: Package }],
          order: [['createdAt', 'DESC']],
          transaction,
        });
      } catch {
        subscription = null;
      }
    }

    // Resolve Tier
    let tierConfig;
    if (subscription && subscription.Package) {
      tierConfig = resolveTier(subscription.Package);
    } else if (website) {
      // Storefront exists but no subscription record yet -> Starter trial
      tierConfig = CAPABILITY_TIERS.starter;
    } else {
      // Marketplace-only store without website -> Free Pilot
      tierConfig = CAPABILITY_TIERS.free_pilot;
    }

    // Determine Lifecycle State and Key Milestone Dates
    let lifecycleState = LIFECYCLE_STATES.ACTIVE;
    let trialEndsAt = null;
    let gracePeriodEndsAt = null;
    let suspendedAt = null;
    let cancelledAt = null;
    let historicalAccessEndsAt = null;
    let isTrial = false;

    // Check store administrative / account status
    if (store.status === 'suspended') {
      lifecycleState = LIFECYCLE_STATES.SUSPENDED;
      suspendedAt = store.updatedAt || now;
      historicalAccessEndsAt = new Date(
        suspendedAt.getTime() + POLICY_CONSTANTS.HISTORICAL_ACCESS_DAYS * 24 * 60 * 60 * 1000
      );
    } else if (subscription) {
      const subStatus = String(subscription.status || '').toLowerCase();
      const startDate = subscription.startDate ? new Date(subscription.startDate) : new Date(subscription.createdAt);
      const endDate = subscription.endDate ? new Date(subscription.endDate) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const graceEnd = new Date(
        endDate.getTime() + POLICY_CONSTANTS.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
      );
      const historyEnd = new Date(
        graceEnd.getTime() + POLICY_CONSTANTS.HISTORICAL_ACCESS_DAYS * 24 * 60 * 60 * 1000
      );

      if (subStatus === 'suspended') {
        lifecycleState = LIFECYCLE_STATES.SUSPENDED;
        suspendedAt = subscription.updatedAt || now;
        historicalAccessEndsAt = new Date(
          suspendedAt.getTime() + POLICY_CONSTANTS.HISTORICAL_ACCESS_DAYS * 24 * 60 * 60 * 1000
        );
      } else if (subStatus === 'cancelled') {
        lifecycleState = LIFECYCLE_STATES.CANCELLED;
        cancelledAt = subscription.updatedAt || now;
        historicalAccessEndsAt = new Date(
          cancelledAt.getTime() + POLICY_CONSTANTS.HISTORICAL_ACCESS_DAYS * 24 * 60 * 60 * 1000
        );
      } else if (subStatus === 'trial') {
        trialEndsAt = endDate;
        if (now <= endDate) {
          lifecycleState = LIFECYCLE_STATES.TRIAL;
          isTrial = true;
        } else if (now <= graceEnd) {
          lifecycleState = LIFECYCLE_STATES.GRACE_PERIOD;
          gracePeriodEndsAt = graceEnd;
        } else {
          lifecycleState = LIFECYCLE_STATES.SUSPENDED;
          suspendedAt = graceEnd;
          historicalAccessEndsAt = historyEnd;
        }
      } else {
        // active or expired
        if (now <= endDate) {
          lifecycleState = LIFECYCLE_STATES.ACTIVE;
        } else if (now <= graceEnd) {
          lifecycleState = LIFECYCLE_STATES.GRACE_PERIOD;
          gracePeriodEndsAt = graceEnd;
        } else {
          lifecycleState = LIFECYCLE_STATES.SUSPENDED;
          suspendedAt = graceEnd;
          historicalAccessEndsAt = historyEnd;
        }
      }
    } else {
      // Marketplace-only 6-month Free Pilot
      const storeCreated = store.createdAt ? new Date(store.createdAt) : now;
      const pilotEnd = new Date(
        storeCreated.getTime() + POLICY_CONSTANTS.MARKETPLACE_PILOT_DAYS * 24 * 60 * 60 * 1000
      );
      const graceEnd = new Date(
        pilotEnd.getTime() + POLICY_CONSTANTS.GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
      );
      const historyEnd = new Date(
        graceEnd.getTime() + POLICY_CONSTANTS.HISTORICAL_ACCESS_DAYS * 24 * 60 * 60 * 1000
      );

      if (now <= pilotEnd) {
        lifecycleState = LIFECYCLE_STATES.ACTIVE;
      } else if (now <= graceEnd) {
        lifecycleState = LIFECYCLE_STATES.GRACE_PERIOD;
        gracePeriodEndsAt = graceEnd;
      } else {
        lifecycleState = LIFECYCLE_STATES.SUSPENDED;
        suspendedAt = graceEnd;
        historicalAccessEndsAt = historyEnd;
      }
    }

    // Evaluate Capabilities based on Tier + Lifecycle Rules
    const capabilities = { ...tierConfig.capabilities };
    let mutationsAllowed = true;
    let restrictionReason = null;

    if (lifecycleState === LIFECYCLE_STATES.ACTIVE || lifecycleState === LIFECYCLE_STATES.TRIAL) {
      mutationsAllowed = true;
    } else if (lifecycleState === LIFECYCLE_STATES.GRACE_PERIOD) {
      // DEC-018: Storefront & marketplace live; product/staff/website edits locked
      mutationsAllowed = false;
      capabilities.hostedCheckout = true;
      capabilities.marketplaceListing = true;
      capabilities.historicalOrderRead = true;
      restrictionReason = `Subscription is in a 7-day grace period ending on ${gracePeriodEndsAt ? gracePeriodEndsAt.toISOString().slice(0, 10) : 'soon'}. Storefront and marketplace sales remain active, but adding products, staff, and website edits are locked.`;
    } else if (lifecycleState === LIFECYCLE_STATES.SUSPENDED) {
      // DEC-020: Suspended; 90 days historical read access
      mutationsAllowed = false;
      capabilities.hostedCheckout = false;
      capabilities.marketplaceListing = false;
      capabilities.pos = false;

      const isWithin90Days = historicalAccessEndsAt ? now <= historicalAccessEndsAt : true;
      capabilities.historicalOrderRead = isWithin90Days;

      if (isWithin90Days) {
        restrictionReason = `Subscription is suspended. Read-only access to historical orders and invoices is available until ${historicalAccessEndsAt ? historicalAccessEndsAt.toISOString().slice(0, 10) : '90 days'}.`;
      } else {
        restrictionReason = 'Historical 90-day read access window post-suspension has expired.';
      }
    } else if (lifecycleState === LIFECYCLE_STATES.CANCELLED) {
      // DEC-020: Cancelled; 90 days historical read access
      mutationsAllowed = false;
      capabilities.hostedCheckout = false;
      capabilities.marketplaceListing = false;
      capabilities.pos = false;

      const isWithin90Days = historicalAccessEndsAt ? now <= historicalAccessEndsAt : true;
      capabilities.historicalOrderRead = isWithin90Days;

      if (isWithin90Days) {
        restrictionReason = `Subscription has been cancelled. Read-only access to historical orders and invoices is available until ${historicalAccessEndsAt ? historicalAccessEndsAt.toISOString().slice(0, 10) : '90 days'}.`;
      } else {
        restrictionReason = 'Historical 90-day read access window post-cancellation has expired.';
      }
    }

    // Count Current Staff for Quota
    let currentStaff = 0;
    try {
      currentStaff = await Staff.count({
        where: { storeId, isActive: true },
        transaction,
      });
    } catch {
      // Staff lookup fallback in isolated test environments
    }

    return {
      version: this.version,
      entitlementVersion: this.version,
      storeId: store.id,
      tier: tierConfig.tier,
      displayName: tierConfig.displayName,
      lifecycleState,
      isTrial,
      isActive: lifecycleState === LIFECYCLE_STATES.ACTIVE,
      isGracePeriod: lifecycleState === LIFECYCLE_STATES.GRACE_PERIOD,
      isSuspended: lifecycleState === LIFECYCLE_STATES.SUSPENDED,
      isCancelled: lifecycleState === LIFECYCLE_STATES.CANCELLED,
      mutationsAllowed,
      capabilities: {
        marketplaceListing: Boolean(capabilities.marketplaceListing),
        website: Boolean(capabilities.website),
        productLimit: Number(capabilities.productLimit),
        staffLimit: Number(capabilities.staffLimit),
        pos: Boolean(capabilities.pos),
        invoices: Boolean(capabilities.invoices),
        customDomainBrowse: Boolean(capabilities.customDomainBrowse),
        hostedCheckout: Boolean(capabilities.hostedCheckout),
        historicalOrderRead: Boolean(capabilities.historicalOrderRead),
      },
      quotas: {
        products: {
          limit: Number(capabilities.productLimit),
        },
        staff: {
          limit: Number(capabilities.staffLimit),
          current: currentStaff,
          available: Math.max(0, Number(capabilities.staffLimit) - currentStaff),
        },
      },
      dates: {
        trialEndsAt: trialEndsAt ? trialEndsAt.toISOString() : null,
        gracePeriodEndsAt: gracePeriodEndsAt ? gracePeriodEndsAt.toISOString() : null,
        suspendedAt: suspendedAt ? suspendedAt.toISOString() : null,
        cancelledAt: cancelledAt ? cancelledAt.toISOString() : null,
        historicalAccessEndsAt: historicalAccessEndsAt ? historicalAccessEndsAt.toISOString() : null,
      },
      restrictionReason,
      evaluatedAt: now.toISOString(),
    };
  }

  /**
   * Verifies if a store possesses a capability.
   */
  async can(storeId, capabilityKey, options = {}) {
    const evaluation = await this.evaluateStoreEntitlements(storeId, options);
    return Boolean(evaluation.capabilities[capabilityKey]);
  }
}

module.exports = new EntitlementService();
