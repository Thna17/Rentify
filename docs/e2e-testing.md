# End-to-End Contract & Browser Test Shell

This document describes the CI-capable contract and browser end-to-end test harness implemented under work package `P1-QA-002`.

---

## 1. Overview & Objectives

Rentify's dual-channel architecture (Marketplace-only merchants and Storefront + Marketplace merchants) requires automated end-to-end verification proving:
1. **Public Buyer Journey**: Marketplace buyers can discover products, navigate categories, and view canonical product details with accurate Store, price, and stock presentation.
2. **Authenticated Merchant Read Journey**: Merchants can sign in with safe fixture credentials and read Store-scoped data.
3. **Tenancy Invariants**: Store ID and Website ID are strictly distinct (`storeId !== websiteId`), and marketplace-only stores never have a website (`websiteId === null`).
4. **OpenAPI Contract Validation**: Every API interaction is validated against the accepted Core (`docs/openapi/core.openapi.yaml`) and Commerce (`docs/openapi/commerce.openapi.yaml`) contracts, checking status codes, distributed correlation IDs (`x-correlation-id`), and payload schemas.
5. **Zero Flakiness**: Bounded polling on observable DOM/network state rather than arbitrary sleeps.
6. **Air-Tight Safety**: Production hosts, cloud databases, remote URLs, and credentials are unconditionally rejected.

---

## 2. Architecture & Components (`tools/e2e/`)

```
tools/e2e/
├── config.js              # Deterministic test ports (3199, 4199, 4599), URLs, and timeouts
├── safety.js              # Guardrails checking NODE_ENV, cloud DB hosts, and production URLs
├── resolve.js             # Multi-workspace node_modules resolver
├── artifactCollector.js   # Captures screenshots, traces, service logs, and summary reports
├── contractValidator.js   # Validates status, correlation IDs, and schemas against OpenAPI
├── browserShell.js        # Hybrid browser driver (Playwright / Headless Chrome / JSDOM)
├── serverManager.js       # Orchestrates Core, Commerce, Marketplace, and Merchant servers
├── journeys/
│   ├── buyerJourney.js            # Public buyer browsing & Commerce OpenAPI validation
│   ├── merchantJourney.js         # Authenticated merchant read & Core OpenAPI validation
│   └── safetyAndFailureJourney.js # Production rejection & failure artifact proof
└── runner.js              # CLI test runner with tag filtering and clean reporting
```

---

## 3. Installation & Prerequisites

The test harness runs out of the box using Node 20+ and existing workspace dependencies (`jsdom` in frontend workspaces, `yaml` in API workspaces).

No manual browser binary installations are required:
- If **Playwright** is installed, it is leveraged directly.
- If **Google Chrome / Chromium** is installed (e.g. `/Applications/Google Chrome.app` on macOS or `google-chrome` on Linux), it is used for headless visual screenshotting.
- If running in lightweight or containerized CI environments without Chrome, high-contrast SVG snapshots and DOM state captures are produced deterministically.

---

## 4. Commands

### 4.1 Local Execution

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

### 4.2 CI Execution

In automated CI pipelines:
```bash
npm run verify:e2e
```
Exits with code `0` on success, or code `1` with full diagnostics and saved artifacts on failure.

---

## 5. Test Tags

| Tag | Purpose | Journeys Covered |
| :--- | :--- | :--- |
| `@buyer` | Public buyer catalog browsing, search, canonical product presentation | `buyerJourney.js` |
| `@merchant` | Authenticated merchant login, store-scoped data read, tenancy checks | `merchantJourney.js` |
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
    ├── screenshots/                  # Failure screenshots (.png / .svg)
    │   ├── failure-buyer-journey.png
    │   └── simulated-journey-failure.png
    ├── traces/                       # Complete network request/response and console traces
    │   ├── failure-buyer-journey-trace.json
    │   └── simulated-journey-failure-trace.json
    └── logs/                         # Service stdout/stderr logs
        └── services.log
```

To view the latest run summary:
```bash
cat artifacts/e2e/latest/summary.json
```

---

## 7. Safety Protections

The harness enforces strict multi-layered safety via `tools/e2e/safety.js`:

1. **Environment Gate**:
   Execution is immediately aborted if `process.env.NODE_ENV === 'production'`.
2. **Database Rejection**:
   Rejects operational databases (`rentify_core`, `rentify_ecommerce`, `production`, `khmercraft`). Database name must contain `test` or `mock` (or `:memory:`).
3. **Host Rejection**:
   Rejects cloud and production hosts (`*.rds.amazonaws.com`, `*.cloudsql.googleapis.com`, `*.azure.com`, `*rentifymarket.com`, `*rentify.com`).
4. **URL Rejection**:
   Test URLs must target local loopback addresses (`127.0.0.1` or `localhost`). Remote hosts and production domains are rejected.
5. **Deterministic Ports**:
   - Core API: `127.0.0.1:3199`
   - Commerce API: `127.0.0.1:4199`
   - Marketplace UI: `127.0.0.1:4599`
   - Merchant UI: `127.0.0.1:4499`
6. **Deterministic Reverse Teardown**:
   When tests complete or fail, servers are stopped and fixture records are deleted in reverse topological dependency order using `PlatformFixtureHarness`.

---

## 8. Debugging & Failure Diagnosis

When a test journey fails:
1. Inspect the terminal output for the exact assertion or contract error.
2. View the failure screenshot in `artifacts/e2e/latest/screenshots/`.
3. Inspect the network trace in `artifacts/e2e/latest/traces/` to review requests, status codes, and latency leading up to the failure.
4. Review `artifacts/e2e/latest/logs/services.log` for backend server logs and correlation IDs.
