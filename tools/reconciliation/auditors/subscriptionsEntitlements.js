'use strict';

// tools/reconciliation/auditors/subscriptionsEntitlements.js
// P3-REC-001: Auditor for Subscriptions and Store capability entitlement tiers (P2-ENT-001).

const { DOMAINS, DOMAIN_STATUS, DOMAIN_METADATA } = require('../constants');
const { sampleSafeIdentifiers } = require('../safety');

const SUBSCRIPTION_GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days grace period

async function auditSubscriptionsEntitlements({ coreModels = {}, storeId = null, now = new Date() } = {}) {
  const meta = DOMAIN_METADATA[DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS];
  const { Store, Subscription, Package } = coreModels;

  if (!Store) {
    return {
      id: DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS,
      name: meta.name,
      status: DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE,
      recordsInspected: 0,
      defectsCount: 0,
      explainedCount: 0,
      sampledSafeIdentifiers: [],
      suggestedOwningPackage: meta.owningPackage,
      operatorGuidance: meta.defaultGuidance,
      findings: [],
    };
  }

  const whereClause = storeId ? { id: storeId } : {};
  const stores = await Store.findAll({ where: whereClause }).catch(() => []);

  if (!stores || stores.length === 0) {
    return {
      id: DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS,
      name: meta.name,
      status: DOMAIN_STATUS.ZERO_DATA_NO_EVIDENCE,
      recordsInspected: 0,
      defectsCount: 0,
      explainedCount: 0,
      sampledSafeIdentifiers: [],
      suggestedOwningPackage: meta.owningPackage,
      operatorGuidance: meta.defaultGuidance,
      findings: [],
    };
  }

  const findings = [];
  let defectsCount = 0;
  let explainedCount = 0;
  const currentTimeMs = new Date(now).getTime();

  for (const store of stores) {
    const tier = store.subscriptionTier || store.tier || 'marketplace_pilot';

    // 1. Marketplace pilot stores must not have custom domains assigned
    if (tier === 'marketplace_pilot' && store.customDomain) {
      defectsCount++;
      findings.push({
        message: `Store ${store.id} is on marketplace_pilot tier but has customDomain configured ("${store.customDomain}").`,
        safeId: store.id,
        explained: false,
        reason: 'PILOT_TIER_CUSTOM_DOMAIN_VIOLATION',
      });
    }

    // 2. Subscription lifecycle checks
    if (Subscription) {
      const sub = await Subscription.findOne({ where: { storeId: store.id } });
      if (sub) {
        if (sub.status === 'expired' || sub.status === 'past_due' || sub.status === 'cancelled') {
          const endDateMs = sub.endDate ? new Date(sub.endDate).getTime() : 0;
          const expiredDurationMs = currentTimeMs - endDateMs;

          if (expiredDurationMs <= SUBSCRIPTION_GRACE_PERIOD_MS) {
            explainedCount++;
            findings.push({
              message: `Store ${store.id} subscription is ${sub.status}, but within 3-day billing grace period.`,
              safeId: store.id,
              explained: true,
              reason: 'SUBSCRIPTION_GRACE_PERIOD',
            });
          } else if (store.status === 'active' && tier !== 'marketplace_pilot') {
            defectsCount++;
            findings.push({
              message: `Store ${store.id} remains on paid tier "${tier}" despite subscription expiring past grace period.`,
              safeId: store.id,
              explained: false,
              reason: 'EXPIRED_SUBSCRIPTION_ACTIVE_TIER',
            });
          }
        }
      }
    }
  }

  let status = DOMAIN_STATUS.PROVEN_ZERO_DIFFERENCES;
  if (defectsCount > 0) {
    status = DOMAIN_STATUS.UNEXPLAINED_DIFFERENCE;
  } else if (explainedCount > 0) {
    status = DOMAIN_STATUS.EXPLAINED_DIFFERENCE;
  }

  return {
    id: DOMAINS.SUBSCRIPTIONS_ENTITLEMENTS,
    name: meta.name,
    status,
    recordsInspected: stores.length,
    defectsCount,
    explainedCount,
    sampledSafeIdentifiers: sampleSafeIdentifiers(findings.map((f) => f.safeId)),
    suggestedOwningPackage: meta.owningPackage,
    operatorGuidance: meta.defaultGuidance,
    findings,
  };
}

module.exports = { auditSubscriptionsEntitlements };
