# Cross-Service Observability & Correlation Logging

This document defines the observability, correlation tracing, structured logging, and redaction standards implemented across Rentify Core (`rentify-server`) and Commerce (`ecommerce-server`).

---

## 1. Overview & Objectives

In a distributed multi-service architecture with decoupled merchant storefronts and a shared marketplace, end-to-end request tracing is critical for reliability, debugging, security, and auditing.

Package `P1-OBS-001` establishes:
1. **Deterministic Correlation ID Ingestion & Generation**: Every inbound HTTP request across Core and Commerce receives a verified correlation ID.
2. **Standardized Response Echoing**: The canonical correlation ID is returned in the `x-correlation-id` response header and in centralized error payloads.
3. **Automated Cross-Service Propagation**: Outgoing HTTP calls between Core and Commerce (and asynchronous outbox workers) automatically forward the correlation ID.
4. **Structured JSON Logging in Production**: Operational logs are emitted as single-line JSON with standard operational metadata.
5. **Human-Readable Logs in Development**: Local developers see clean, colorized log statements formatted with service name and correlation ID.
6. **Strict Redaction Guardrails**: Eight sensitive data categories are automatically scrubbed from all log streams before serialization.

---

## 2. Correlation ID Specification

### 2.1 Inbound Header Ingestion

The correlation middleware checks inbound request headers in order of priority:
1. `x-correlation-id`
2. `x-request-id`

### 2.2 Validation Format

Inbound IDs must conform to:
```text
^[a-zA-Z0-9_\-\.]{8,128}$
```
- Minimum length: 8 characters
- Maximum length: 128 characters
- Allowed characters: alphanumeric, underscores (`_`), hyphens (`-`), periods (`.`)
- Headers with control characters, spaces, special punctuation, or invalid lengths are rejected as unsafe.

### 2.3 Fallback Generation

If no valid ID is present in the request headers, the middleware generates a new standard UUID v4.

### 2.4 Response Contract

Every HTTP response emits:
```http
x-correlation-id: <correlation-id>
```

In addition, centralized error handlers in both Core and Commerce return the correlation ID in the JSON body for client error reporting:
```json
{
  "message": "Resource not found",
  "correlationId": "trace-uuid-or-incoming-id"
}
```

---

## 3. Async Context & Request Lifecycle

Node.js `AsyncLocalStorage` (via `node:async_hooks`) maintains correlation context throughout asynchronous execution without requiring manual parameter passing:

```javascript
import { getCorrelationId, runWithCorrelation } from '../utils/logger.js';

// Within any controller, service, or repository:
const correlationId = getCorrelationId();
```

### Request Timing & Route Logging

On request completion (`res.on('finish')`), the correlation middleware logs the completed HTTP transaction with:
- `method`: HTTP method (`GET`, `POST`, etc.)
- `route`: Route template (e.g. `/api/websites/:id`), avoiding parameterized sensitive IDs or query strings
- `status`: HTTP response status code (e.g. `200`, `404`)
- `durationMs`: Wall-clock execution time in milliseconds with sub-millisecond precision

---

## 4. Cross-Service Propagation

### 4.1 Synchronous HTTP Calls

Both Core and Commerce configure global Axios request interceptors that inject `x-correlation-id` into outgoing requests whenever an active correlation context exists.

- **Core-to-Commerce** (`rentify-server` -> `ecommerce-server`):
  - Website synchronizations (`ecommerceSyncService`)
  - Store projections (`storeSyncService`)
- **Commerce-to-Core** (`ecommerce-server` -> `rentify-server`):
  - Checkout merchant contact lookup (`merchantContactService`)
  - Token and merchant validation calls

### 4.2 Asynchronous Outbox Propagation

For outbox-backed operations (such as `WebsiteSyncOutbox` and `StoreSyncOutbox`), the correlation ID is captured at mutation time and stored in the outbox payload metadata (`_correlationId`). When the outbox worker processes the queued item, it restores the correlation context via `runWithCorrelation(correlationId, ...)`, preserving trace continuity across decoupled processing cycles.

---

## 5. Structured Logging & Redaction

### 5.1 Standard Production Log Schema

In production (`NODE_ENV=production`), Winston outputs single-line JSON:

```json
{
  "timestamp": "2026-10-19T00:20:54.123Z",
  "service": "rentify-server",
  "level": "info",
  "correlationId": "f7d3a2b1-5e8c-4a3b-9c2d-1e0f8a7b6c5d",
  "message": "HTTP POST /api/websites 201 (/api/websites -> 201 in 14.52ms)",
  "method": "POST",
  "route": "/api/websites",
  "status": 201,
  "durationMs": 14.52,
  "environment": "production",
  "version": "1.0.0"
}
```

### 5.2 Redaction Policy

To prevent secret leakage and protect privacy, eight categories are redacted recursively across all log arguments:

| Category | Keys / Patterns Scrubbed | Redacted Value |
| :--- | :--- | :--- |
| **Authorization** | `authorization`, `proxy-authorization` | `[REDACTED]` or `Bearer [REDACTED]` |
| **Cookies & Sessions** | `cookie`, `set-cookie`, `sessionid`, `connect.sid` | `[REDACTED]` |
| **Passwords** | `password`, `currentpassword`, `newpassword`, `passwordconfirm`, `pin` | `[REDACTED]` |
| **Tokens & Secrets** | `token`, `accesstoken`, `refreshtoken`, `secret`, `jwt` | `[REDACTED]` |
| **API & Private Keys** | `apikey`, `privatekey`, `secretkey`, PEM private key blocks | `[REDACTED]` or `[REDACTED_PRIVATE_KEY]` |
| **CutLuy Credentials** | `cutluykey`, `cutluysecret`, `cutluytoken` | `[REDACTED]` |
| **Buyer Personal Data** | `email`, `phone`, `phonenumber`, `address`, `shippingaddress`, `latitude`, `longitude` | `[REDACTED]` |
| **Payment Credentials** | `cardnumber`, `cvv`, `qrpayload`, `khqr`, `paymenttoken` | `[REDACTED]` |

*Note: Raw request and response bodies are excluded from default HTTP access logging.*

---

## 6. Verification & Test Evidence

Observability and correlation behaviors are verified continuously by the test suite:

- **Core Security Suite**: `rentify-server/test/security/correlationLogging.test.js`
  - Safe correlation ID validation and invalid ID fallback.
  - Complete redaction of all 8 sensitive categories without data loss of safe keys.
  - Circular reference safety during recursive redaction.
  - HTTP header ingestion and `x-correlation-id` response header round-trip.
  - Centralized error response correlation injection.
  - Core-to-Commerce outbox context preservation.
- **Commerce Security Suite**: `ecommerce-server/test/security/correlationLogging.test.js`
  - Correlation validation and generation.
  - Redaction of commerce-specific payloads (buyer address, phone, QR payloads, CutLuy credentials).
  - Outgoing Axios request propagation.
  - Merchant contact lookup cross-service header forwarding.
- **End-to-End Cross-Service Integration Suite**: `rentify-server/test/integration/crossServiceTracing.test.js`
  - Core -> Commerce website projection trace propagation across live ephemeral HTTP servers.
  - Commerce -> Core merchant lookup trace propagation across live ephemeral HTTP servers.
  - Log verification proving zero plaintext leakage of sensitive credentials, cookies, addresses, or QR payloads in structured logs.
