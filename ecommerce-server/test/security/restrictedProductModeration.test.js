'use strict';

// test/security/restrictedProductModeration.test.js
// Verification suite for P5-TRUST-001: Authoritative product policy enforcement,
// moderation decisions, merchant appeals, and immutable audit history.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { sequelize } = require('../../config/db');
const {
  Product,
  ProductModerationHistory,
} = require('../../models');

const {
  RESTRICTED_TAXONOMY_VERSION,
  evaluateProductPolicy,
} = require('../../modules/catalog/restrictedProductTaxonomy');

const publicationEligibilityService = require('../../modules/catalog/publicationEligibilityService');
const {
  REASON_CODES,
  evaluateChannel,
  evaluatePublicationEligibility,
  buildPublicMarketplaceWhere,
  buildPublicStorefrontWhere,
} = publicationEligibilityService;

const { productModerationService } = require('../../modules/catalog');
const storeCatalogService = require('../../modules/store-catalog/storeCatalogService');
const storeCatalogController = require('../../modules/store-catalog/storeCatalogController');
const { checkedProductAndVariant } = require('../../modules/checkout/marketplaceRules');
const OnlineOrderStrategy = require('../../modules/orders/core/orderCreation/strategies/OnlineOrderStrategy');

// Helper to simulate Express response
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

// Mock transaction that executes without connecting to external DB
const mockTx = {
  LOCK: { UPDATE: 'UPDATE' },
  commit: async () => {},
  rollback: async () => {},
};

test('P5-TRUST-001: 1. Prohibited product cannot publish: restricted taxonomy blocks submission and publication', async () => {
  assert.equal(RESTRICTED_TAXONOMY_VERSION, '1.0.0');

  // 1a. Test taxonomy detection on prohibited keywords
  const prohibitedInputs = [
    { name: 'Tactical assault rifle AR-15 replica', code: 'PROHIBITED_WEAPONS_EXPLOSIVES' },
    { name: 'Pure synthetic cocaine powder', code: 'PROHIBITED_NARCOTICS' },
    { name: 'Fake replica Rolex Submariner watch', code: 'PROHIBITED_COUNTERFEIT' },
    { name: 'Authentic raw elephant ivory carving', code: 'PROHIBITED_WILDLIFE_FLORA' },
    { name: 'Real preserved human skull relic', code: 'PROHIBITED_HUMAN_REMAINS' },
    { name: 'Explicit hardcore pornographic DVD', code: 'PROHIBITED_ADULT_CONTENT' },
    { name: 'Industrial grade cyanide toxic chemical', code: 'PROHIBITED_HAZARDOUS_MATERIALS' },
    { name: 'Unlicensed prescription antibiotics pills', code: 'PROHIBITED_UNLICENSED_MEDICINE' },
  ];

  for (const item of prohibitedInputs) {
    const evalRes = evaluateProductPolicy({ name: item.name });
    assert.equal(evalRes.compliant, false, `Expected ${item.name} to fail policy check`);
    assert.ok(evalRes.primaryReasonCode.startsWith('PROHIBITED_'), `Reason code should be PROHIBITED_*: ${evalRes.primaryReasonCode}`);
    assert.ok(evalRes.guidance.length > 10, 'Guidance message must be present');
    assert.ok(evalRes.matchedCategories.some((c) => c.code === item.code), `Should match category code ${item.code}`);
  }

  // 1b. Test pre-submission evaluation API
  const subResult = productModerationService.evaluateForSubmission({
    name: 'Military Grade Automatic Rifle',
    description: 'High capacity magazine included',
  });
  assert.equal(subResult.compliant, false);
  assert.equal(subResult.primaryReasonCode, 'PROHIBITED_WEAPONS_EXPLOSIVES');
  assert.ok(Array.isArray(subResult.guidanceCatalog.categories));

  // 1c. Test publication eligibility evaluation: flagged and rejected products must fail publication
  const testStore = {
    storeId: 'store-trust-001',
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
    primaryCategory: 'Electronics',
  };

  const flaggedProduct = {
    id: 'prod-flagged-001',
    storeId: 'store-trust-001',
    name: 'Illegal Item',
    price: 100.00,
    status: 'active',
    moderationStatus: 'flagged',
    prohibitedReasonCode: 'PROHIBITED_WEAPONS_EXPLOSIVES',
    marketplaceCategory: 'Electronics',
    marketplaceVisibility: true,
  };

  const evalFlagged = evaluatePublicationEligibility({ product: flaggedProduct, store: testStore });
  assert.equal(evalFlagged.isPublished, false);
  assert.equal(evalFlagged.channels.marketplace.eligible, false);
  assert.equal(evalFlagged.channels.storefront.eligible, false);
  assert.equal(evalFlagged.channels.pos.eligible, false);

  const rejectedProduct = {
    ...flaggedProduct,
    id: 'prod-rejected-001',
    moderationStatus: 'rejected',
  };
  const evalRejected = evaluatePublicationEligibility({ product: rejectedProduct, store: testStore });
  assert.equal(evalRejected.isPublished, false);

  // 1d. Public query WHERE clauses must enforce moderationStatus === 'approved'
  const publicMpWhere = buildPublicMarketplaceWhere();
  assert.equal(publicMpWhere.moderationStatus, 'approved');

  const publicSfWhere = buildPublicStorefrontWhere('store-trust-001');
  assert.equal(publicSfWhere.moderationStatus, 'approved');
});

test('P5-TRUST-001: 2. Existing prohibited product becomes non-purchasable across all channels', async () => {
  const store = {
    storeId: 'store-trust-002',
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
  };

  const formerlyApprovedProduct = {
    id: 'prod-trust-002',
    storeId: 'store-trust-002',
    name: 'Previously Valid Knife now flagged',
    price: 45.00,
    status: 'active',
    moderationStatus: 'flagged',
    marketplaceCategory: 'Outdoor',
    marketplaceVisibility: true,
  };

  // Evaluate across marketplace, storefront, and pos
  const mpResult = evaluateChannel({ channel: 'marketplace', product: formerlyApprovedProduct, store });
  assert.equal(mpResult.eligible, false);
  assert.equal(mpResult.purchasable, false);

  const sfResult = evaluateChannel({ channel: 'storefront', product: formerlyApprovedProduct, store });
  assert.equal(sfResult.eligible, false);
  assert.equal(sfResult.purchasable, false);

  const posResult = evaluateChannel({ channel: 'pos', product: formerlyApprovedProduct, store });
  assert.equal(posResult.eligible, false);
  assert.equal(posResult.purchasable, false);

  // eligibleProductWhere in storeCatalogService must include moderationStatus: 'approved'
  const filter = storeCatalogService.eligibleProductWhere('store-trust-002');
  assert.equal(filter.moderationStatus, 'approved');
});

test('P5-TRUST-001: 3. Stale cart and direct checkout are blocked for held/prohibited products', async (t) => {
  const store = {
    storeId: 'store-trust-003',
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
  };

  const flaggedProduct = {
    id: 'prod-cart-001',
    storeId: 'store-trust-003',
    name: 'Flagged Item in Stale Cart',
    price: 30.00,
    currency: 'USD',
    status: 'active',
    moderationStatus: 'flagged',
    prohibitedReasonCode: 'PROHIBITED_COUNTERFEIT_GOODS',
    marketplaceCategory: 'Accessories',
    marketplaceVisibility: false,
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === 'prod-cart-001') return flaggedProduct;
    return null;
  });

  // 3a. checkedProductAndVariant fails closed with 409 PRODUCT_NOT_ELIGIBLE
  await assert.rejects(
    async () => {
      await checkedProductAndVariant('prod-cart-001', null, store, mockTx, 'marketplace');
    },
    (err) => {
      assert.equal(err.statusCode || err.status, 409);
      assert.equal(err.code, 'PRODUCT_NOT_ELIGIBLE');
      return true;
    }
  );

  // 3b. OnlineOrderStrategy.processOrder blocks online orders containing held products
  const mockModels = {
    Cart: {
      findOne: async () => ({
        CartItems: [
          { productId: 'prod-cart-001', quantity: 1, unitPrice: '30.00' },
        ],
      }),
    },
    Product: {
      findOne: async (query) => {
        // Product.findOne enforces moderationStatus: 'approved'
        if (query?.where?.moderationStatus === 'approved') return null;
        return flaggedProduct;
      },
    },
    Customer: {},
    ProductVariant: {},
    WebsiteData: {},
  };
  const onlineStrategy = new OnlineOrderStrategy(mockModels);

  await assert.rejects(
    async () => {
      await onlineStrategy.processOrder({
        user: { type: 'customer', id: 'cust-1' },
        websiteId: 'web-1',
        paymentMethod: 'COD',
        storeId: 'store-trust-003',
      }, mockTx);
    },
    (err) => {
      assert.ok(err.message.includes('not eligible for purchase') || err.message.includes('not available'));
      return true;
    }
  );
});

test('P5-TRUST-001: 4. Moderator reason is strictly required when flagging or rejecting', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  const mockProduct = {
    id: 'prod-mod-001',
    storeId: 'store-001',
    moderationStatus: 'flagged',
    prohibitedReasonCode: 'PROHIBITED_WEAPONS_EXPLOSIVES',
    update: async () => mockProduct,
  };
  t.mock.method(Product, 'findByPk', async () => mockProduct);

  // 4a. Moderator rejection requires reasonCode
  await assert.rejects(
    async () => {
      await productModerationService.recordModeratorDecision('prod-mod-001', {
        decision: 'reject',
        reasonCode: '',
        reason: 'Violates our terms of service regarding weapons',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'MODERATION_REASON_CODE_REQUIRED');
      return true;
    }
  );

  // 4b. Moderator rejection requires reason text of at least 5 characters
  await assert.rejects(
    async () => {
      await productModerationService.recordModeratorDecision('prod-mod-001', {
        decision: 'reject',
        reasonCode: 'PROHIBITED_WEAPONS_EXPLOSIVES',
        reason: 'bad', // only 3 chars
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'MODERATION_REASON_REQUIRED');
      return true;
    }
  );

  // 4c. Appeal review decision requires reason of at least 5 characters
  await assert.rejects(
    async () => {
      await productModerationService.decideAppeal('prod-mod-001', {
        decision: 'reject',
        reason: 'no',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'REVIEW_REASON_REQUIRED');
      return true;
    }
  );
});

test('P5-TRUST-001: 5. Merchant receives actionable reason and safe guidance without internal note leakage', () => {
  const store = {
    storeId: 'store-trust-005',
    status: 'active',
    marketplaceApprovalStatus: 'approved',
    marketplaceEntitlement: 'pilot',
    marketplaceEnabled: true,
  };

  const flaggedProduct = {
    id: 'prod-exp-001',
    storeId: 'store-trust-005',
    name: 'Replica Designer Sunglasses',
    price: 20.00,
    status: 'active',
    moderationStatus: 'flagged',
    prohibitedReasonCode: 'PROHIBITED_COUNTERFEIT_GOODS',
    moderationNotes: 'Internal confidential fraud score: 98. Flagged by ML pipeline #4.',
    marketplaceCategory: 'Fashion',
    marketplaceVisibility: false,
  };

  // Privileged/Merchant explanation
  const merchantExplanation = evaluatePublicationEligibility({
    product: flaggedProduct,
    store,
    isPrivileged: true,
  });

  assert.equal(merchantExplanation.isPublished, false);
  assert.equal(merchantExplanation.canAppeal, true);
  assert.equal(merchantExplanation.prohibitedReasonCode, 'PROHIBITED_COUNTERFEIT_GOODS');
  assert.ok(merchantExplanation.channels.marketplace.reasons.some((r) => r.code === 'PRODUCT_MODERATION_FLAGGED'));

  // Public unprivileged channel evaluation: zero leakage of internal notes
  const publicMpEvaluation = evaluateChannel({
    channel: 'marketplace',
    product: flaggedProduct,
    store,
    isPrivileged: false,
  });

  assert.equal(publicMpEvaluation.eligible, false);
  assert.equal(publicMpEvaluation.purchasable, false);
  assert.deepEqual(publicMpEvaluation.reasons, [], 'Public callers must receive zero internal note leakage');
});

test('P5-TRUST-001: 6. Appeal lifecycle: submit appeal, hold product while pending, approve or reject', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  const historyEvents = [];
  t.mock.method(ProductModerationHistory, 'create', async (data) => {
    historyEvents.push(data);
    return data;
  });
  t.mock.method(ProductModerationHistory, 'findOne', async () => null);

  const product = {
    id: 'prod-appeal-001',
    storeId: 'store-appeal-001',
    name: 'Suspicious Kitchen Cleaver',
    price: 35.00,
    status: 'active',
    moderationStatus: 'flagged',
    prohibitedReasonCode: 'PROHIBITED_WEAPONS_EXPLOSIVES',
    appealStatus: 'none',
    async update(attrs) {
      Object.assign(this, attrs);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async () => product);

  // 6a. Reason must be at least 10 chars
  await assert.rejects(
    async () => {
      await productModerationService.submitMerchantAppeal('store-appeal-001', 'prod-appeal-001', {
        reason: 'Too short',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'APPEAL_REASON_REQUIRED');
      return true;
    }
  );

  // 6b. Evidence must be HTTPS URL
  await assert.rejects(
    async () => {
      await productModerationService.submitMerchantAppeal('store-appeal-001', 'prod-appeal-001', {
        reason: 'This is a genuine culinary chef knife certified for restaurant use',
        evidenceUrls: ['http://insecure-site.com/cert.pdf'],
      });
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'INVALID_EVIDENCE_URL');
      return true;
    }
  );

  // 6c. Valid appeal submission
  const submitRes = await productModerationService.submitMerchantAppeal('store-appeal-001', 'prod-appeal-001', {
    reason: 'This is a culinary chef knife for cooking, not a combat weapon',
    evidenceUrls: ['https://example.com/culinary-certificate.pdf'],
  });

  assert.equal(submitRes.duplicate, false);
  assert.equal(product.appealStatus, 'pending');
  // Product MUST remain non-purchasable while pending!
  assert.equal(product.moderationStatus, 'flagged');

  // 6d. Submitting another appeal while pending is blocked
  await assert.rejects(
    async () => {
      await productModerationService.submitMerchantAppeal('store-appeal-001', 'prod-appeal-001', {
        reason: 'Second appeal attempt while first is still pending review',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'APPEAL_ALREADY_PENDING');
      return true;
    }
  );

  // 6e. Moderator approves appeal -> product becomes approved and purchasable
  const approveRes = await productModerationService.decideAppeal('prod-appeal-001', {
    decision: 'approved',
    reason: 'Verified kitchenware certification. Item is culinary knife.',
  });

  assert.equal(approveRes.duplicate, false);
  assert.equal(product.appealStatus, 'approved');
  assert.equal(product.moderationStatus, 'approved');
  assert.equal(product.prohibitedReasonCode, null);

  // 6f. History audit records verify transition trail
  assert.ok(historyEvents.some((h) => h.action === 'appeal_submitted'));
  assert.ok(historyEvents.some((h) => h.action === 'appeal_approved'));
});

test('P5-TRUST-001: 7. Tenant safety: cross-tenant moderation and appeal are denied', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  const storeAProduct = {
    id: 'prod-store-a',
    storeId: 'store-a',
    moderationStatus: 'flagged',
    appealStatus: 'none',
    update: async () => storeAProduct,
  };

  t.mock.method(Product, 'findByPk', async (id) => {
    if (id === 'prod-store-a') return storeAProduct;
    return null;
  });

  // 7a. Store B merchant attempting to appeal Store A's product via service
  await assert.rejects(
    async () => {
      await productModerationService.submitMerchantAppeal('store-b', 'prod-store-a', {
        reason: 'Attempting to appeal a product from another store unauthorized',
      });
    },
    (err) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, 'CROSS_TENANT_ACCESS_DENIED');
      return true;
    }
  );

  // 7b. Store B merchant attempting to view Store A's moderation history via controller
  const req = {
    store: { storeId: 'store-b' },
    params: { productId: 'prod-store-a' },
    get: () => null,
  };
  const res = createMockResponse();

  await storeCatalogController.getModerationHistory(req, res);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'CROSS_TENANT_ACCESS_DENIED');
});

test('P5-TRUST-001: 8. Repeated commands remain idempotent with Idempotency-Key', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  const mockProduct = {
    id: 'prod-idem-001',
    storeId: 'store-idem-001',
    moderationStatus: 'approved',
    appealStatus: 'none',
    async update(changes) {
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findByPk', async () => mockProduct);

  const existingHistoryRecords = new Map();

  t.mock.method(ProductModerationHistory, 'findOne', async ({ where }) => {
    if (where.idempotencyKey && existingHistoryRecords.has(where.idempotencyKey)) {
      return existingHistoryRecords.get(where.idempotencyKey);
    }
    return null;
  });

  t.mock.method(ProductModerationHistory, 'create', async (data) => {
    if (data.idempotencyKey) {
      existingHistoryRecords.set(data.idempotencyKey, data);
    }
    return data;
  });

  const idempotencyKey = 'moderation-cmd-uuid-999';

  // 1st call: succeeds normally
  const firstCall = await productModerationService.recordModeratorDecision('prod-idem-001', {
    decision: 'flag',
    reasonCode: 'PROHIBITED_COUNTERFEIT_GOODS',
    reason: 'Suspicious trademark usage requires proof of authenticity',
    idempotencyKey,
  });
  assert.equal(firstCall.duplicate, false);
  assert.equal(mockProduct.moderationStatus, 'flagged');

  // 2nd call with identical key: returns duplicate without re-mutating
  const secondCall = await productModerationService.recordModeratorDecision('prod-idem-001', {
    decision: 'flag',
    reasonCode: 'PROHIBITED_COUNTERFEIT_GOODS',
    reason: 'Suspicious trademark usage requires proof of authenticity',
    idempotencyKey,
  });
  assert.equal(secondCall.duplicate, true);

  // 3rd call with same key but mismatched action: raises 409 IDEMPOTENCY_CONFLICT
  await assert.rejects(
    async () => {
      await productModerationService.recordModeratorDecision('prod-idem-001', {
        decision: 'reject', // Conflicting action under same key!
        reasonCode: 'PROHIBITED_WEAPONS_EXPLOSIVES',
        reason: 'Different conflicting action under same key',
        idempotencyKey,
      });
    },
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'IDEMPOTENCY_CONFLICT');
      return true;
    }
  );
});

test('P5-TRUST-001: 9. ProductModerationHistory records are strictly immutable', async () => {
  // Modifying an existing record must trigger beforeUpdate hook
  await assert.rejects(
    async () => {
      await ProductModerationHistory.runHooks('beforeUpdate');
    },
    (err) => {
      assert.ok(err.message.includes('IMMUTABLE_AUDIT_HISTORY'));
      return true;
    }
  );

  // Deleting an existing record must trigger beforeDestroy hook
  await assert.rejects(
    async () => {
      await ProductModerationHistory.runHooks('beforeDestroy');
    },
    (err) => {
      assert.ok(err.message.includes('IMMUTABLE_AUDIT_HISTORY'));
      return true;
    }
  );
});

test('P5-TRUST-001: 10. Event emission adheres to frozen Phase 5 contract', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn(mockTx));

  const emittedEvents = [];
  const eventOutboxService = require('../../modules/events').eventOutboxService;
  t.mock.method(eventOutboxService, 'recordEvent', async (eventData) => {
    emittedEvents.push(eventData);
    return eventData;
  });

  const product = {
    id: 'prod-evt-001',
    storeId: 'store-evt-001',
    moderationStatus: 'approved',
    appealStatus: 'none',
    update: async (changes) => {
      Object.assign(product, changes);
      return product;
    },
  };
  t.mock.method(Product, 'findByPk', async () => product);
  t.mock.method(ProductModerationHistory, 'findOne', async () => null);
  t.mock.method(ProductModerationHistory, 'create', async (data) => data);

  // Moderation flag decision
  await productModerationService.recordModeratorDecision('prod-evt-001', {
    decision: 'flag',
    reasonCode: 'PROHIBITED_HAZARDOUS_TOXIC',
    reason: 'Toxic chemical substance detected in product description',
    correlationId: 'corr-evt-100',
  });

  assert.equal(emittedEvents.length, 1);
  const flaggedEvent = emittedEvents[0];
  assert.equal(flaggedEvent.eventType, 'product.moderation_flagged');
  assert.equal(flaggedEvent.aggregateType, 'Product');
  assert.equal(flaggedEvent.aggregateId, 'prod-evt-001');
  assert.equal(flaggedEvent.schemaVersion, '1.0.0');
  assert.equal(flaggedEvent.producer, 'ecommerce-server');
  assert.equal(flaggedEvent.correlationId, 'corr-evt-100');
  assert.equal(flaggedEvent.payload.moderationStatus, 'flagged');
  assert.equal(flaggedEvent.payload.reasonCode, 'PROHIBITED_HAZARDOUS_TOXIC');
});
