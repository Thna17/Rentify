# Shared Platform Integration Fixtures

This document describes the shared integration fixture builder implemented for Rentify Core (`rentify-server`) and Commerce (`ecommerce-server`) under package `P1-QA-001`.

---

## 1. Overview & Objectives

In Rentify's dual-channel platform (marketplace-only and storefront + marketplace), integration tests across Core and Commerce require consistent, deterministic data models.

The shared fixture system provides:
1. **Deterministic Scenario Generation**: Fixed, predictable UUIDs and attributes across test executions.
2. **Environment & Host Safety Guardrails**: Absolute protection preventing accidental execution against production databases or cloud hosts.
3. **Strict Tenancy & Invariant Enforcement**: Models two distinct stores, proving that a marketplace-only store has no website, while a storefront store has a website with a distinct identifier (`websiteId !== storeId`).
4. **Cross-Service Mapping**: Synchronizes Core models (`Store`, `Website`, `Staff`, `Subscription`) with Commerce models and projections (`StoreAccess`, `WebsiteData`, `Category`, `Product`, `Order`, `Invoice`).
5. **Deterministic Selective Cleanup**: Teardown removes strictly fixture-owned records in reverse topological order, preserving pre-existing non-fixture records.

---

## 2. Safety Protections (`tools/fixtures/safety.js`)

All fixture seed and cleanup operations execute `assertSafeTestEnvironment()` before touching any model or connection.

### 2.1 Rejection Criteria

Fixture operations immediately throw `UnsafeEnvironmentError` under any of the following conditions:

- **Production Environment**: `process.env.NODE_ENV === 'production'`.
- **Non-Test Database**: The database name does not contain `test` or `mock` (and is not `:memory:`). Specifically rejects default operational databases such as `rentify_core`, `rentify_ecommerce`, `production`, `khmercraft`, etc.
- **Cloud & Production Hosts**: Hostnames matching `*.rds.amazonaws.com`, `*.cloudsql.googleapis.com`, `*.azure.com`, `*rentifymarket.com`, `*rentify.com`, or names containing `prod` or `live`.
- **Production Credentials**: Usernames containing `prod` or `live`.

---

## 3. Canonical Scenario Entities (`tools/fixtures/scenario.js`)

The fixture generator `createPlatformScenario(options)` produces an immutable data structure containing:

### 3.1 Stores & Tenants

- **Store A (`marketplaceOnly`)**:
  - `id`: `10000000-0000-4000-8000-000000000001`
  - `name`: `'Angkor Artisan Pottery'`
  - `slug`: `'angkor-artisan-pottery'`
  - `primaryCategory`: `'Handicrafts & Pottery'`
  - `ownerUserId`: `20000000-0000-4000-8000-000000000001` (Kosal Ceramicist)
  - `websiteId`: `null` (*Key invariant: marketplace-only stores have no website*)
  - `marketplaceEnabled`: `true`
  - `marketplaceApprovalStatus`: `'approved'`
- **Store B (`storefrontAndMarketplace`)**:
  - `id`: `10000000-0000-4000-8000-000000000002`
  - `name`: `'Mekong Silk Heritage'`
  - `slug`: `'mekong-silk-heritage'`
  - `primaryCategory`: `'Fashion & Textiles'`
  - `ownerUserId`: `20000000-0000-4000-8000-000000000002` (Bopha Weaver)
  - `websiteId`: `30000000-0000-4000-8000-000000000002` (*Distinct from Store ID*)
  - `marketplaceEnabled`: `true`
  - `marketplaceApprovalStatus`: `'approved'`

### 3.2 Roles & Identities

- **Marketplace Merchant Owner**: Kosal (`kosal.pottery@rentify.test`).
- **Storefront Merchant Owner**: Bopha (`bopha.silk@rentify.test`).
- **Store Staff Member**: Dara (`dara.pos@rentify.test`) assigned to Store B with limited permissions (`['manage_pos', 'manage_products']`). Cannot access orders, settings, or other stores.
- **Buyer**: Sokha (`sokha.buyer@rentify.test`), customer profile in Commerce.
- **Platform Admin**: Admin user (`ops.admin@rentify.test`).

### 3.3 Catalog & Inventory

- **Category A**: `'Handcrafted Ceramics'` (Store A).
- **Category B**: `'Traditional Textiles'` (Store B).
- **Simple Product**: `'Handmade Celadon Tea Pot'` (Store A, price: $35.00, stock: 20, no variants).
- **Variant Product**: `'Golden Silk Ikat Scarf'` (Store B, price: $60.00, total stock: 25).
  - Variant 1: Ruby Red (`SILK-IKAT-RUBY`, price: $60.00, stock: 10).
  - Variant 2: Sapphire Blue (`SILK-IKAT-SAPH`, price: $65.00, stock: 15).

### 3.4 Carts & Transactions

- **Carts**: Separate carts per store for Buyer (Marketplace cart for Store A; Storefront cart for Store B).
- **Order 1 (Marketplace COD)**: `ORD-MKT-1001` for Simple Vase (Status: `pending`, Payment: `pending`, Shipping: `pending`).
- **Order 2 (Storefront COD Delivered)**: `ORD-SF-2002` for Silk Variant (Status: `completed`, Payment: `completed`, Invoice: `INV-SF-2002` with status `paid`).
- **Order 3 (Storefront COD Refunded)**: `ORD-SF-2003` (Status: `refunded`, Payment: `refunded`, OrderEvent: `refund_confirmed`).

### 3.5 Core Billing & Subscriptions

- **Package**: `'Storefront Starter Plan'` ($29.00/mo).
- **Subscription**: Active subscription for Store B owner linked to Website B.

### 3.6 Cross-Service Projections

- **StoreAccess**: Projections in Commerce for Store A (no website) and Store B (linked website).
- **WebsiteData**: Projection in Commerce for Store B containing staff permissions and theme configuration.
- **StoreDeliveryPolicy**: COD settings and delivery fees ($0 for Store A, $3.00 for Store B).

---

## 4. Usage Guide

### 4.1 In Core API Tests (`rentify-server`)

```javascript
const { createPlatformScenario, seedCoreFixtures, cleanupCoreFixtures } = require('../fixtures');
const models = require('../../src/models');

test('merchant dashboard journey', async () => {
  const scenario = createPlatformScenario();
  const tracker = await seedCoreFixtures(models, scenario);

  try {
    const store = await models.Store.findByPk(scenario.ids.storefrontStoreId);
    // assertions...
  } finally {
    await cleanupCoreFixtures(models, tracker);
  }
});
```

### 4.2 In Commerce API Tests (`ecommerce-server`)

```javascript
const { createPlatformScenario, seedCommerceFixtures, cleanupCommerceFixtures } = require('../fixtures');
const models = require('../../models');

test('catalog query by store', async () => {
  const scenario = createPlatformScenario();
  const tracker = await seedCommerceFixtures(models, scenario);

  try {
    const products = await models.Product.findAll({
      where: { storeId: scenario.ids.marketplaceStoreId },
    });
    // assertions...
  } finally {
    await cleanupCommerceFixtures(models, tracker);
  }
});
```

### 4.3 Unified Multi-Service Harness (`PlatformFixtureHarness`)

```javascript
const { PlatformFixtureHarness } = require('../../tools/fixtures');

test('cross-service end-to-end rehearsal', async () => {
  const harness = new PlatformFixtureHarness({
    coreModels,
    commerceModels,
  });

  const scenario = await harness.setup();

  try {
    const store = harness.getStore('storefrontAndMarketplace');
    const owner = harness.getOwner('storefrontAndMarketplace');
    const staff = harness.getStaff();
    // assertions...
  } finally {
    await harness.teardown();
  }
});
```

### 4.4 In-Memory Adapter for Isolated Unit Tests

```javascript
const { createInMemoryModelAdapter, seedCoreFixtures, cleanupCoreFixtures } = require('../../tools/fixtures');

test('fast in-memory unit test', async () => {
  const models = createInMemoryModelAdapter(['User', 'Store', 'Website']);
  const tracker = await seedCoreFixtures(models);

  assert.equal(await models.Store.count(), 2);
  await cleanupCoreFixtures(models, tracker);
  assert.equal(await models.Store.count(), 0);
});
```

---

## 5. Teardown & Cleanup Order

To respect foreign-key constraints without resorting to cascade drops or truncating unrelated test data, cleanup executes in reverse dependency order:

- **Core Cleanup Order**:
  1. `SellerApplication`
  2. `Subscription`
  3. `Package`
  4. `Staff`
  5. `Website`
  6. `Store`
  7. `WebsiteTemplate`
  8. `User`

- **Commerce Cleanup Order**:
  1. `OrderEvent`
  2. `ShippingDetail`
  3. `Invoice`
  4. `Payment`
  5. `OrderItem`
  6. `Order`
  7. `CartItem`
  8. `Cart`
  9. `Customer`
  10. `ProductVariant`
  11. `Product`
  12. `Category`
  13. `StoreDeliveryPolicy`
  14. `WebsiteData`
  15. `StoreAccess`
