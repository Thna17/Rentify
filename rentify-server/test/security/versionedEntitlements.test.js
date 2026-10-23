// rentify-server/test/security/versionedEntitlements.test.js
// Comprehensive test suite for P2-ENT-001: Versioned Entitlements in Rentify Core.

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CAPABILITIES_VERSION,
  LIFECYCLE_STATES,
  POLICY_CONSTANTS,
  CAPABILITY_TIERS,
  resolveTier,
} = require('../../src/modules/billing/entitlements/capabilityConfig');
const entitlementService = require('../../src/modules/billing/entitlements/entitlementService');
const { Store, Subscription, Package, Website, Staff, StoreSyncOutbox } = require('../../src/models');
const { ApiError } = require('../../src/utils/errors');

const STORE_PILOT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STORE_STARTER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const STORE_BUSINESS_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OWNER_A_ID = '11111111-1111-4111-8111-111111111111';
const OWNER_B_ID = '22222222-2222-4222-8222-222222222222';
const ADMIN_ID = '99999999-9999-4999-8999-999999999999';

test('P2-ENT-001: Capability Model & Tier Configuration', () => {
  assert.equal(CAPABILITIES_VERSION, 1, 'Capabilities version must be 1');

  // Verify all 3 approved Release 1 tiers exist
  assert.ok(CAPABILITY_TIERS.free_pilot, 'Free Pilot tier must exist');
  assert.ok(CAPABILITY_TIERS.starter, 'Starter tier must exist');
  assert.ok(CAPABILITY_TIERS.business, 'Business tier must exist');

  // Verify plan display names are decoupled from machine keys
  assert.equal(CAPABILITY_TIERS.free_pilot.displayName, 'Free Pilot');
  assert.equal(CAPABILITY_TIERS.starter.displayName, 'Starter');
  assert.equal(CAPABILITY_TIERS.business.displayName, 'Business');

  // Verify required capability keys for Free Pilot
  const pilotCaps = CAPABILITY_TIERS.free_pilot.capabilities;
  assert.equal(pilotCaps.marketplaceListing, true);
  assert.equal(pilotCaps.website, false);
  assert.equal(pilotCaps.productLimit, 25);
  assert.equal(pilotCaps.staffLimit, 1);
  assert.equal(pilotCaps.pos, true);
  assert.equal(pilotCaps.invoices, true);
  assert.equal(pilotCaps.customDomainBrowse, false);
  assert.equal(pilotCaps.hostedCheckout, false);
  assert.equal(pilotCaps.historicalOrderRead, true);

  // Verify required capability keys for Starter
  const starterCaps = CAPABILITY_TIERS.starter.capabilities;
  assert.equal(starterCaps.marketplaceListing, true);
  assert.equal(starterCaps.website, true);
  assert.equal(starterCaps.productLimit, 100);
  assert.equal(starterCaps.staffLimit, 2);
  assert.equal(starterCaps.pos, true);
  assert.equal(starterCaps.invoices, true);
  assert.equal(starterCaps.customDomainBrowse, false);
  assert.equal(starterCaps.hostedCheckout, true);
  assert.equal(starterCaps.historicalOrderRead, true);

  // Verify required capability keys for Business
  const businessCaps = CAPABILITY_TIERS.business.capabilities;
  assert.equal(businessCaps.marketplaceListing, true);
  assert.equal(businessCaps.website, true);
  assert.equal(businessCaps.productLimit, 500);
  assert.equal(businessCaps.staffLimit, 5);
  assert.equal(businessCaps.pos, true);
  assert.equal(businessCaps.invoices, true);
  assert.equal(businessCaps.customDomainBrowse, true);
  assert.equal(businessCaps.hostedCheckout, true);
  assert.equal(businessCaps.historicalOrderRead, true);
});

test('P2-ENT-001: Legacy Package Compatibility Resolution', () => {
  // Free variations
  assert.equal(resolveTier({ name: 'Free', price: 0 }).tier, 'free_pilot');
  assert.equal(resolveTier('free').tier, 'free_pilot');
  assert.equal(resolveTier('pilot').tier, 'free_pilot');

  // Starter variations
  assert.equal(resolveTier({ name: 'Starter', price: 15 }).tier, 'starter');
  assert.equal(resolveTier('starter').tier, 'starter');

  // Business / Pro variations
  assert.equal(resolveTier({ name: 'Pro', price: 10 }).tier, 'business');
  assert.equal(resolveTier({ name: 'Business Storefront', price: 35 }).tier, 'business');
  assert.equal(resolveTier('business').tier, 'business');
  assert.equal(resolveTier('pro').tier, 'business');
});

test('P2-ENT-001: Marketplace-Only 6-Month Pilot Lifecycle State Transitions', async () => {
  const storeCreated = new Date('2026-01-01T00:00:00Z');
  const mockStore = {
    id: STORE_PILOT_ID,
    ownerUserId: OWNER_A_ID,
    name: 'Craft Shop Pilot',
    status: 'active',
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    createdAt: storeCreated,
  };

  // 1. Day 30: Active Pilot
  const evalActive = await entitlementService.evaluateStoreEntitlements(STORE_PILOT_ID, {
    store: mockStore,
    website: null,
    subscription: null,
    asOfDate: new Date('2026-01-31T00:00:00Z'),
  });
  assert.equal(evalActive.tier, 'free_pilot');
  assert.equal(evalActive.lifecycleState, 'active');
  assert.equal(evalActive.mutationsAllowed, true);
  assert.equal(evalActive.capabilities.marketplaceListing, true);
  assert.equal(evalActive.capabilities.productLimit, 25);
  assert.equal(evalActive.capabilities.staffLimit, 1);

  // 2. Day 183: Grace Period (between day 180 and 187)
  const evalGrace = await entitlementService.evaluateStoreEntitlements(STORE_PILOT_ID, {
    store: mockStore,
    website: null,
    subscription: null,
    asOfDate: new Date('2026-07-03T00:00:00Z'), // ~183 days
  });
  assert.equal(evalGrace.lifecycleState, 'grace_period');
  assert.equal(evalGrace.isGracePeriod, true);
  assert.equal(evalGrace.mutationsAllowed, false, 'Mutations must be locked during grace period');
  assert.equal(evalGrace.capabilities.marketplaceListing, true, 'Marketplace listing remains active in grace period');
  assert.equal(evalGrace.capabilities.historicalOrderRead, true);
  assert.ok(evalGrace.restrictionReason.includes('grace period'));

  // 3. Day 200: Suspended (within 90-day historical window)
  const evalSuspended = await entitlementService.evaluateStoreEntitlements(STORE_PILOT_ID, {
    store: mockStore,
    website: null,
    subscription: null,
    asOfDate: new Date('2026-08-01T00:00:00Z'),
  });
  assert.equal(evalSuspended.lifecycleState, 'suspended');
  assert.equal(evalSuspended.isSuspended, true);
  assert.equal(evalSuspended.mutationsAllowed, false);
  assert.equal(evalSuspended.capabilities.marketplaceListing, false);
  assert.equal(evalSuspended.capabilities.pos, false);
  assert.equal(evalSuspended.capabilities.historicalOrderRead, true, 'Historical orders readable within 90 days');

  // 4. Day 350: Historical Read Access Expired (> 90 days after grace period expiration)
  const evalExpired = await entitlementService.evaluateStoreEntitlements(STORE_PILOT_ID, {
    store: mockStore,
    website: null,
    subscription: null,
    asOfDate: new Date('2026-12-01T00:00:00Z'),
  });
  assert.equal(evalExpired.lifecycleState, 'suspended');
  assert.equal(evalExpired.capabilities.historicalOrderRead, false, 'Historical read access must expire after 90 days');
  assert.ok(evalExpired.restrictionReason.includes('expired'));
});

test('P2-ENT-001: Storefront 14-Day Trial & Subscription Lifecycle Transitions', async () => {
  const trialStart = new Date('2026-06-01T00:00:00Z');
  const trialEnd = new Date('2026-06-15T00:00:00Z'); // 14 days

  const mockStore = {
    id: STORE_STARTER_ID,
    ownerUserId: OWNER_B_ID,
    name: 'Fashion Boutique',
    status: 'active',
    createdAt: trialStart,
  };
  const mockWebsite = { id: 'web-1', storeId: STORE_STARTER_ID };
  const mockSub = {
    id: 'sub-1',
    status: 'trial',
    startDate: trialStart,
    endDate: trialEnd,
    Package: { name: 'Starter', price: 15 },
  };

  // Day 5: Active 14-day trial
  const evalTrial = await entitlementService.evaluateStoreEntitlements(STORE_STARTER_ID, {
    store: mockStore,
    website: mockWebsite,
    subscription: mockSub,
    asOfDate: new Date('2026-06-05T00:00:00Z'),
  });
  assert.equal(evalTrial.tier, 'starter');
  assert.equal(evalTrial.lifecycleState, 'trial');
  assert.equal(evalTrial.isTrial, true);
  assert.equal(evalTrial.mutationsAllowed, true);
  assert.equal(evalTrial.capabilities.website, true);
  assert.equal(evalTrial.capabilities.hostedCheckout, true);
  assert.equal(evalTrial.capabilities.productLimit, 100);
  assert.equal(evalTrial.capabilities.staffLimit, 2);

  // Day 18: Grace period (trial ended June 15, grace period through June 22)
  const evalGrace = await entitlementService.evaluateStoreEntitlements(STORE_STARTER_ID, {
    store: mockStore,
    website: mockWebsite,
    subscription: mockSub,
    asOfDate: new Date('2026-06-18T00:00:00Z'),
  });
  assert.equal(evalGrace.lifecycleState, 'grace_period');
  assert.equal(evalGrace.mutationsAllowed, false, 'Edits locked during grace period');
  assert.equal(evalGrace.capabilities.hostedCheckout, true, 'Storefront checkout live in grace period');
  assert.equal(evalGrace.capabilities.marketplaceListing, true, 'Marketplace live in grace period');

  // Day 25: Suspended (trial + 7 days grace passed)
  const evalSuspended = await entitlementService.evaluateStoreEntitlements(STORE_STARTER_ID, {
    store: mockStore,
    website: mockWebsite,
    subscription: mockSub,
    asOfDate: new Date('2026-06-25T00:00:00Z'),
  });
  assert.equal(evalSuspended.lifecycleState, 'suspended');
  assert.equal(evalSuspended.mutationsAllowed, false);
  assert.equal(evalSuspended.capabilities.hostedCheckout, false);
  assert.equal(evalSuspended.capabilities.marketplaceListing, false);
  assert.equal(evalSuspended.capabilities.historicalOrderRead, true, 'Within 90 days');

  // 120 Days later: Historical Access Expired
  const evalExpired = await entitlementService.evaluateStoreEntitlements(STORE_STARTER_ID, {
    store: mockStore,
    website: mockWebsite,
    subscription: mockSub,
    asOfDate: new Date('2026-10-30T00:00:00Z'),
  });
  assert.equal(evalExpired.capabilities.historicalOrderRead, false);
});

test('P2-ENT-001: Staff Limit & Grace Period Mutation Enforcement in Staff Controller', async (t) => {
  const staffController = require('../../src/modules/staff/staffController');

  const mockStore = {
    id: STORE_PILOT_ID,
    ownerUserId: OWNER_A_ID,
    name: 'Craft Shop',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00Z'),
  };

  t.mock.method(Store, 'findByPk', async () => mockStore);

  // Evaluate store entitlements for mockStore
  const graceEntitlements = await entitlementService.evaluateStoreEntitlements(STORE_PILOT_ID, {
    store: mockStore,
    website: null,
    subscription: null,
    asOfDate: new Date('2026-07-03T00:00:00Z'), // in grace period
  });
  assert.equal(graceEntitlements.mutationsAllowed, false);
  assert.ok(graceEntitlements.isGracePeriod);
  assert.equal(graceEntitlements.capabilities.staffLimit, 1);
});

test('P2-ENT-001: Versioned Projections in Commerce Outbox Snapshot', async (t) => {
  const storeSyncService = require('../../src/modules/commerce-sync/storeSyncService');
  const mockStore = {
    id: STORE_STARTER_ID,
    ownerUserId: OWNER_B_ID,
    name: 'Starter Store',
    slug: 'starter-store',
    primaryCategory: 'Fashion',
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    marketplaceEntitlement: 'pilot',
    projectionVersion: 3,
  };

  t.mock.method(StoreSyncOutbox, 'findByPk', async () => null);
  t.mock.method(StoreSyncOutbox, 'create', async ({ payload }) => ({ payload }));
  t.mock.method(Store, 'findByPk', async () => mockStore);
  t.mock.method(Website, 'findOne', async () => null);
  t.mock.method(Subscription, 'findOne', async () => null);
  t.mock.method(Staff, 'count', async () => 0);

  const payload = await storeSyncService.queueStore(mockStore, { websiteId: 'web-1' });

  assert.equal(payload.storeId, STORE_STARTER_ID);
  assert.equal(payload.version, 3);
  assert.equal(payload.entitlementVersion, 1);
  assert.ok(payload.entitlements, 'Payload must include versioned entitlements object');
  assert.equal(payload.entitlements.version, 1);
  assert.ok(payload.entitlements.capabilities);
  assert.equal(typeof payload.entitlements.capabilities.productLimit, 'number');
  assert.equal(typeof payload.entitlements.capabilities.staffLimit, 'number');
});
