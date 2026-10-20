# End-to-End Contract & Browser Test Shell

This document describes the CI-capable contract and browser end-to-end test harness implemented under work package `P1-QA-002`.

---

## 1. Overview & Objectives

Rentify's dual-channel architecture (Marketplace-only merchants and Storefront + Marketplace merchants) requires automated end-to-end verification proving:
1. **Public Buyer Journey**: Marketplace buyers discover products through the search overlay, click actual search results in Playwright, and view canonical product details with accurate Store, price, and stock presentation.
2. **Browser-Authenticated Merchant Journey**: Merchants authenticate through real Core API auth and load the real merchant UI in Playwright, verifying live store data rendering and tenancy invariants (`storeId !== websiteId`, `websiteId === null` for marketplace-only stores).
3. **Tenancy Invariants**: Store ID and Website ID are strictly distinct, and marketplace-only stores never have a website.
4. **OpenAPI Contract Validation**: Every API interaction is validated against the accepted Core (`docs/openapi/core.openapi.yaml`) and Commerce (`docs/openapi/commerce.openapi.yaml`) contracts, checking status codes, distributed correlation IDs (`x-correlation-id`), and payload schemas.
5. **Real Application Execution**: Exercises real platform server processes (`rentify-server` and `ecommerce-server`) and real built frontend applications (`marketplace-frontend` and `rentify-frontend` merchant app) running live in Chromium.
6. **Zero Flakiness**: Bounded polling on observable DOM/network state rather than arbitrary sleeps.
7. **Air-Tight Safety**: Production environments, operational databases, remote cloud hosts, and external URLs are unconditionally rejected.

---

## 2. Architecture & Components (`tools/e2e/`)

```
tools/e2e/
├── config.js              # Deterministic test ports (3199, 4199, 4599, 4499), URLs, and timeouts
├── safety.js              # Guardrails checking NODE_ENV, cloud DB hosts, production DBs, and URLs
├── prepare.js             # Clean-CI preparation: builds frontends, installs Playwright, runs migrations
├── dbHelper.js            # Ensures test databases exist, runs migrations, and handles fixture seeding/teardown
├── resolve.js             # Multi-workspace node_modules resolver
├── artifactCollector.js   # Captures screenshots (.png), traces (.zip / .json), logs, and summary reports
├── contractValidator.js   # Validates status, correlation IDs, and schemas against OpenAPI contracts
├── browserShell.js        # Playwright Chromium browser automation driver with observable waiting
├── serverManager.js       # Orchestrates real Core, Commerce, Marketplace, and Merchant processes
├── journeys/
│   ├── buyerJourney.js            # Public buyer browsing, search result click, COD checkout & stock reduction
│   ├── merchantJourney.js         # Browser-authenticated merchant UI assertion, tenancy checks & product sync
│   └── safetyAndFailureJourney.js # Production rejection, safety validation & failure artifact proof
└── runner.js              # CLI test runner with tag filtering and clean reporting
```

---

## 3. Installation & Prerequisites

The test harness runs using Node 20+, a running MySQL test instance, and Playwright Chromium:

- **Playwright**: Pinned to exact version `1.64.1` in the root `package.json`.
- **Browser Binary**: Chromium is installed via `npx playwright install chromium` or automatically via `npm run e2e:prepare`.
- **Databases**: Isolated MySQL databases (`rentify_core_test` and `rentify_commerce_test`) are automatically created and migrated during test setup.
- **Frontend Builds**: Real built artifacts in `marketplace-frontend/dist` and `rentify-frontend/dist/apps/core/merchant` are served by the harness. Missing builds cause an immediate and descriptive failure.

---

## 4. Commands

### 4.1 Preparation

Prepare the clean-CI test environment (installs Playwright Chromium, builds both frontends, creates databases, and runs migrations):
```bash
npm run e2e:prepare
```

### 4.2 Local Execution

Run all golden test journeys:
```bash
npm run test:e2e
```

Run specific test journeys by tag:
```bash
# Public buyer journey only
node tools/e2e/runner.js --tag @buyer

# Authenticated merchant journey only
node tools/e2e/runner.js --tag @merchant

# All Release 1 golden journeys
node tools/e2e/runner.js --tag @golden

# Safety rejection & failure artifact verification
node tools/e2e/runner.js --tag @safety
```

### 4.3 CI Execution

In automated CI pipelines, the unified verify command runs preparation followed by headless CI test execution:
```bash
npm run verify:e2e
```
Exits with code `0` on success, or code `1` with full diagnostics and saved artifacts on failure.

---

## 5. Test Tags

| Tag | Purpose | Journeys Covered |
| :--- | :--- | :--- |
| `@buyer` | Public buyer catalog browsing, search overlay interaction, search result click, canonical product presentation, COD checkout, deterministic stock reduction | `buyerJourney.js` |
| `@merchant` | Browser-authenticated merchant UI verification, store data assertion, tenancy checks, product publishing & cross-channel sync | `merchantJourney.js` |
| `@golden` | Release 1 Core Golden Journeys | `buyerJourney.js`, `merchantJourney.js` |
| `@contract` | OpenAPI contract response validation & correlation ID checks | `buyerJourney.js`, `merchantJourney.js` |
| `@safety` | Production host, database, URL, and credential rejection | `safetyAndFailureJourney.js` |
| `@artifacts` | Automated failure screenshot and network trace capture verification | `safetyAndFailureJourney.js` |

---

## 6. Artifact Locations & Discovery

All artifacts are written to `artifacts/e2e/` (ignored by Git):

```
artifacts/e2e/
├── latest/                           # Symlink to the most recent test run
└── run-YYYY-MM-DDTHH-mm-ss-sssZ/     # Timestamped run folder
    ├── summary.json                  # Overall execution report, duration, pass/fail status
    ├── screenshots/                  # Playwright-native full-page PNG screenshots
    │   ├── golden-buyer-product-detail.png
    │   ├── golden-merchant-store-b-dashboard.png
    │   ├── golden-merchant-store-a-dashboard.png
    │   ├── failure-buyer-journey.png
    │   └── simulated-journey-failure.png
    ├── traces/                       # Native Playwright action traces (.zip) & JSON traces (.json)
    │   ├── failure-buyer-journey-trace.zip
    │   ├── failure-buyer-journey-trace.json
    │   ├── simulated-journey-failure-trace.zip
    │   └── simulated-journey-failure-trace.json
    └── logs/                         # Service stdout/stderr logs
        └── services.log
```

To view the latest run summary:
```bash
cat artifacts/e2e/latest/summary.json
```

---

## 7. Safety Protections & Process Lifecycle

The harness enforces strict multi-layered safety via `tools/e2e/safety.js`:

1. **Environment Gate**:
   Execution is immediately aborted if `process.env.NODE_ENV === 'production'`.
2. **Database Rejection**:
   Rejects operational databases (`rentify_core`, `rentify_ecommerce`, `production`, `khmercraft`). Database name must contain `test` or `mock`.
3. **Host Rejection**:
   Rejects cloud and production hosts (`*.rds.amazonaws.com`, `*.cloudsql.googleapis.com`, `*.azure.com`, `*rentifymarket.com`, `*rentify.com`).
4. **URL Rejection**:
   Test URLs must target local loopback addresses (`127.0.0.1` or `localhost`). Remote hosts and production domains are rejected.
5. **Deterministic Ports**:
   - Core API: `127.0.0.1:3199`
   - Commerce API: `127.0.0.1:4199`
   - Marketplace UI: `127.0.0.1:4599`
   - Merchant UI: `127.0.0.1:4499`
6. **Bounded Process Shutdown**:
   Child processes receive `SIGTERM` followed by a bounded 3-second wait. If a process does not exit cleanly, it is automatically escalated to `SIGKILL`.
7. **Deterministic Reverse Teardown**:
   When tests complete or fail, servers are stopped and fixture records are deleted in reverse topological dependency order using `PlatformFixtureHarness`.

---

## 8. Debugging & Failure Diagnosis

When a test journey fails:
1. Inspect the terminal output for the exact assertion or contract error.
2. View the failure screenshot in `artifacts/e2e/latest/screenshots/`.
3. Open the Playwright trace using `npx playwright show-trace artifacts/e2e/latest/traces/<trace-name>.zip` to inspect DOM snapshots, user actions, and network timelines.
4. Review `artifacts/e2e/latest/logs/services.log` for backend server logs and correlation IDs.
