# Generated Typed Platform API Clients

This document defines the architecture, generation workflow, typed client patterns, and runtime integration guides for Rentify's frontend applications:
- **`rentify-frontend`** (React / Vite)
- **`marketplace-frontend`** (Angular)
- **`admin-frontend`** (Angular)

---

## 1. Overview & Single Source of Truth

The typed frontend API clients are generated deterministically from the canonical OpenAPI 3.1 contracts in the repository:
- `docs/openapi/core.openapi.yaml` (Core API: identity, tenants, websites, templates, packages, staff, deployment)
- `docs/openapi/commerce.openapi.yaml` (Commerce API: catalog, carts, checkout, orders, invoices, payments, POS)

The code generator is pinned as `@rentify/openapi-client-generator` v1.0.0 (`tools/generate-api-clients.mjs`).

### Rules & Guardrails
1. **Never edit generated files directly**: Any edits made in `*/generated/*` are overwritten on the next generation run.
2. **Deterministic output**: Running generation against unchanged OpenAPI contracts produces a byte-for-byte identical output with zero diff.
3. **Continuous staleness verification**: CI runs `npm run verify:clients` (which executes `node tools/generate-api-clients.mjs --check`). If an engineer changes an OpenAPI contract without regenerating the clients, CI immediately fails.
4. **Mandatory path for Release 1 UI work**: All new frontend features, views, and integrations must use the typed API clients rather than manual, untyped `fetch` or `HttpClient` calls.
5. **No embedded secrets**: Generated code contains only schema types and endpoint callers. Credentials, tokens, and base URLs are supplied at runtime via central configuration.

---

## 2. Directory Layout & Separation of Concerns

Generated artifacts and handwritten adapters are strictly separated across all three frontend applications:

```
rentify-frontend/libs/shared/src/api/
├── generated/                     # <-- Auto-generated; do not edit
│   ├── client.types.ts            # Common client options and ApiClientError class
│   ├── core.types.ts              # Core schemas and Core.* namespace
│   ├── commerce.types.ts          # Commerce schemas and Commerce.* namespace
│   ├── core.client.ts             # CoreApiClient class (95 endpoints)
│   ├── commerce.client.ts         # CommerceApiClient class (137 endpoints)
│   └── index.ts                   # Generated barrel export
├── config.ts                      # Handwritten: Central URL & default options resolver
├── coreClient.ts                  # Handwritten: Default coreClient singleton & factory
├── commerceClient.ts              # Handwritten: Default commerceClient singleton & factory
├── index.ts                       # Public API barrel export for @rentify/shared/api
└── __tests__/
    └── apiClients.test.ts         # Tests verifying client behavior, errors, and trace IDs

marketplace-frontend/src/app/core/api/
├── generated/                     # <-- Auto-generated; do not edit
├── platform-api.service.ts        # Handwritten: Angular @Injectable() PlatformApiService
├── platform-api.service.spec.ts   # Tests verifying Angular service injection and calls
└── index.ts                       # Public barrel export

admin-frontend/src/app/core/api/
├── generated/                     # <-- Auto-generated; do not edit
├── platform-api.service.ts        # Handwritten: Angular @Injectable() PlatformApiService
├── platform-api.service.spec.ts   # Tests verifying Angular service injection and calls
└── index.ts                       # Public barrel export
```

---

## 3. Model Collision Prevention

Both Core and Commerce contracts define common entities with identical or similar names (e.g. `Payment`, `FieldError`, `StandardErrorDetail`, `ErrorEnvelope`).

To prevent naming collisions:
- **Namespaces**: All models from Core are placed in `export namespace Core { ... }` and from Commerce in `export namespace Commerce { ... }`.
- **Top-level aliases**: Unique aliases are exported at the root of `generated/index.ts`, such as `CorePayment`, `CommercePayment`, `CoreErrorEnvelope`, and `CommerceErrorEnvelope`.
- **Client classes**: Distinct client classes are provided: `CoreApiClient` and `CommerceApiClient`.

Example:
```typescript
import { Core, Commerce, CorePayment, CommercePayment } from '@rentify/shared/api';

const corePayment: Core.Payment = { ... };
const commercePayment: CommercePayment = { ... };
```

---

## 4. Observability: Correlation IDs

Every outgoing request through `CoreApiClient` and `CommerceApiClient` includes the `X-Correlation-ID` HTTP header:
1. **Explicit ID**: If provided in `requestOptions.correlationId`, that value is transmitted.
2. **Automatic UUID**: If omitted or undefined, an RFC 4122 v4 UUID (`req-${crypto.randomUUID()}`) is automatically generated and attached to the request headers.
3. **End-to-End Tracing**: The correlation ID flows through the reverse proxy, hits service handlers, logs in structured JSON production logs, and returns in both the `X-Correlation-ID` response header and the standard error envelope.

---

## 5. Standard Error Envelope Handling

The generated client includes the `ApiClientError` class, which automatically maps HTTP errors to Rentify's standard backward-compatible error envelope:

```typescript
try {
  await client.createStore({ name: '' });
} catch (error) {
  if (error instanceof ApiClientError) {
    console.error('Machine code:', error.code);               // e.g. "VALIDATION_FAILED"
    console.error('Human message:', error.message);           // e.g. "Store name is required"
    console.error('HTTP status:', error.status);              // e.g. 400
    console.error('Field errors:', error.fieldErrors);        // e.g. [{ field: "name", message: "..." }]
    console.error('Retryable?', error.retryable);             // e.g. false
    console.error('Trace ID:', error.correlationId);          // e.g. "req-018d44c2-927c-..."
  }
}
```

### Compatibility Fallback
If an older or non-conforming endpoint returns a legacy error payload (`{ message: "...", error: "..." }`), `ApiClientError` extracts the message and status while safely populating fallback fields (`fieldErrors = []`, `retryable = false`).

---

## 6. Usage Guide: React (`rentify-frontend`)

In `rentify-frontend`, typed clients are pre-configured to read base URLs dynamically from `@rentify/shared/config/urls` and send cookies (`credentials: 'include'`).

### Default Singleton Import
```typescript
import { coreClient, commerceClient, ApiClientError } from '@rentify/shared/api';

// 1. Core API call (e.g. fetch current user session)
async function loadSession() {
  try {
    const session = await coreClient.getSessionProfile();
    return session.user;
  } catch (err) {
    if (err instanceof ApiClientError && err.code === 'UNAUTHENTICATED') {
      redirectToLogin();
    }
    throw err;
  }
}

// 2. Commerce API call (e.g. fetch store products)
async function loadProducts(storeId: string) {
  const catalog = await commerceClient.getMarketplaceCatalogProducts({
    query: { storeId, limit: 20 },
  });
  return catalog.products;
}
```

### Custom Client Instance
For custom requirements (e.g. test isolation or specific auth tokens):
```typescript
import { createCoreClient } from '@rentify/shared/api';

const customClient = createCoreClient({
  baseUrl: 'https://staging-core.rentify.local',
  credentials: 'omit',
  defaultHeaders: {
    'Authorization': `Bearer ${token}`,
  },
});
```

---

## 7. Usage Guide: Angular (`marketplace-frontend` & `admin-frontend`)

In Angular, `PlatformApiService` is provided as an `@Injectable({ providedIn: 'root' })`. It resolves environment-specific API URLs from `window.__RENTIFY_MARKETPLACE__` or `window.__RENTIFY_ADMIN__` (with localhost fallbacks for development) and configures `credentials: 'include'`.

### Injecting `PlatformApiService`
```typescript
import { Component, OnInit, inject } from '@angular/core';
import { PlatformApiService, ApiClientError, Core, Commerce } from '../core/api';

@Component({
  selector: 'app-catalog-view',
  template: `
    <div *ngIf="loading">Loading products...</div>
    <div *ngIf="error" class="error-banner">{{ error }}</div>
    <ul *ngIf="products.length > 0">
      <li *ngFor="let p of products">{{ p.name }} - \${{ p.price }}</li>
    </ul>
  `,
})
export class CatalogViewComponent implements OnInit {
  private readonly platformApi = inject(PlatformApiService);

  products: Commerce.MarketplaceProduct[] = [];
  loading = false;
  error: string | null = null;

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      const response = await this.platformApi.commerce.getMarketplaceCatalogProducts({
        query: { limit: 12 },
      });
      this.products = response.products;
    } catch (err) {
      if (err instanceof ApiClientError) {
        this.error = `[${err.code}] ${err.message}`;
      } else {
        this.error = 'Failed to load catalog.';
      }
    } finally {
      this.loading = false;
    }
  }
}
```

---

## 8. CLI & Verification Commands

| Command | Action |
|---|---|
| `npm run generate:clients` | Regenerates all typed clients across all three frontend directories from OpenAPI specs. |
| `npm run verify:clients` | Runs generator with `--check` flag; fails with exit code 1 if any generated file is missing or out of date. |
| `npm run verify:repository` | Root verification script; runs OpenAPI schema validation, generator staleness checks, and security scans. |
