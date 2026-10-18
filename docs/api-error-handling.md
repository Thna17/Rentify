# Standard API Error Handling and Envelope Specification

This document defines the unified API error envelope, stable machine codes, retryable semantics, and security redaction rules across Rentify's Core API (`rentify-server`) and Commerce API (`ecommerce-server`).

---

## 1. The Standard Error Envelope

Every API error returned by Core or Commerce adheres to the following backward-compatible envelope:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Store name and primary category are required",
    "fieldErrors": [
      {
        "field": "name",
        "message": "Store name is required"
      }
    ],
    "retryable": false,
    "correlationId": "req-018d44c2-927c-74a9-a9c1-5827c9b84001"
  },
  "message": "Store name and primary category are required",
  "success": false,
  "statusCode": 400,
  "correlationId": "req-018d44c2-927c-74a9-a9c1-5827c9b84001"
}
```

In addition, the HTTP response header `X-Correlation-ID` is populated with the request correlation identifier, ensuring logs and traces can be linked across service boundaries.

### Envelope Fields

| Field | Type | Description |
|---|---|---|
| `error.code` | `string` | Stable, uppercase machine code for client routing (e.g., `VALIDATION_FAILED`, `NOT_FOUND`). |
| `error.message` | `string` | Safe, human-readable error description suitable for display or fallback. |
| `error.fieldErrors` | `Array<{ field: string, message: string }>` | Structured validation errors per field or JSON property. Empty array for non-validation errors. |
| `error.retryable` | `boolean` | `true` if client may retry without modifying the request (e.g., rate limits, transient network issues). |
| `error.correlationId` | `string` | Distributed trace correlation ID matching `X-Correlation-ID` header. |
| `message` *(Legacy)* | `string` | Root-level string message preserved for legacy frontend and webhook consumers. |
| `success` *(Legacy)* | `boolean` | Root-level boolean flag (`false`) preserved for legacy consumers. |
| `statusCode` *(Legacy)* | `number` | Root-level HTTP status code matching the response status. |
| `correlationId` *(Legacy)* | `string` | Root-level correlation ID for older client handlers. |

---

## 2. Machine Error Codes

| HTTP Status | Code | Meaning | Default `retryable` |
|---|---|---|---|
| **400** | `BAD_REQUEST` | Malformed input, unparseable JSON, or general invalid request. | `false` |
| **400** | `VALIDATION_FAILED` | Input payload failed schema or business validation constraints. | `false` |
| **401** | `UNAUTHENTICATED` | Missing, expired, or invalid credentials/session. | `false` |
| **403** | `PERMISSION_DENIED` | Authenticated user lacks required store, website, or platform permissions. | `false` |
| **404** | `NOT_FOUND` | Target entity, store, product, or endpoint does not exist. | `false` |
| **409** | `CONFLICT` | Resource conflict, unique constraint violation, or concurrency version collision. | `false` |
| **422** | `UNPROCESSABLE_ENTITY` | Semantic validation failure on otherwise well-formed request. | `false` |
| **429** | `RATE_LIMITED` | Rate limit exceeded. Client should respect `Retry-After` if present. | `true` |
| **500** | `INTERNAL_SERVER_ERROR` | Unexpected internal failure. Raw details masked in production. | `false` |
| **502** | `BAD_GATEWAY` | Downstream or third-party service communication failure. | `true` |
| **503** | `SERVICE_UNAVAILABLE` | Service, database, or media storage temporarily unavailable or in maintenance. | `true` |
| **504** | `GATEWAY_TIMEOUT` | Upstream service or query timed out. | `true` |

---

## 3. Retryable Policy

- **Non-retryable (`retryable: false`)**: 4xx client errors (`BAD_REQUEST`, `VALIDATION_FAILED`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, `NOT_FOUND`, `CONFLICT`) require user or client modification before retrying.
- **Retryable (`retryable: true`)**: Transient errors (`RATE_LIMITED`, `BAD_GATEWAY`, `SERVICE_UNAVAILABLE`, `GATEWAY_TIMEOUT`) can be retried using exponential backoff with jitter.
- **Dynamic Override**: Individual handlers may mark specific errors (e.g. transient database lock timeout on checkout) as retryable if safe.

---

## 4. Redaction and Information Hiding

To avoid data leakage, production responses strictly enforce the following security invariants:

1. **Stack Traces**: Stack traces are never returned in response payloads regardless of environment. They are recorded exclusively via structured production logging with correlation IDs.
2. **Database & SQL Errors**: Raw SQL statements, table structures, column names, and driver error messages are scrubbed. Sequelize errors (`SequelizeValidationError`, `SequelizeUniqueConstraintError`) are mapped to clean `VALIDATION_FAILED` or `CONFLICT` codes.
3. **Credential & Secret Redaction**: Any text matching auth headers, bearer tokens, passwords, API keys, webhook secrets, or Bakong KHQR credentials in error messages is replaced with `[REDACTED]`.
4. **Unhandled Server Errors**: Any non-operational error (e.g., uncaught exception or runtime TypeError) defaults to status `500` with message `"Internal server error"`, masking internal implementation details.

---

## 5. Representative Modules Migrated (Phase 1)

In accordance with Phase 1 scope, centralized error handling was established and validated across two representative, security-critical modules:

1. **Core API (`rentify-server`)**:
   - `src/modules/internal/`: Internal service auth (`internalAuth.js`) and cross-service store/website lookups (`internalController.js`).
   - Centralized middleware: `src/middlewares/errorHandler.js` mounted in `src/app.js`.
   - Utility: `src/utils/errors.js` (`ApiError`, `formatErrorEnvelope`, `sanitizeMessage`).
2. **Commerce API (`ecommerce-server`)**:
   - `modules/admin/`: Platform operations auth (`verifyCoreAdmin.js`) and admin operations controller (`platformOperationsController.js`).
   - Centralized middleware: `middlewares/errorHandler.js` mounted in `app.js`.
   - Utility: `utils/ApiError.js` (`ApiError`, `formatErrorEnvelope`, `sanitizeMessage`, `normalizeFieldErrors`).

---

## 6. Frontend Interoperability

Frontends across the platform consume errors through backward-compatible adapters:

### Angular (`admin-frontend` & `marketplace-frontend`)

`apiErrorMessage(error, fallback)` parses both envelope formats:

```typescript
export const apiErrorMessage = (error: unknown, fallback = 'Something went wrong. Please try again.'): string => {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as (ApiError & { error?: { message?: string } | string; message?: string }) | null;
    if (typeof body?.error === 'string') return body.error;
    return body?.error?.message ?? body?.message ?? fallback;
  }
  return fallback;
};
```

### React / Vite (`rentify-frontend`)

`getApiErrorMessage(error, fallback)` supports both standard and legacy formats:

```typescript
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const record = error as UnknownRecord | null;
  const data = record?.data;
  const candidates = [
    typeof data?.error === 'string' ? data.error : data?.error?.message,
    data?.message,
    typeof data === 'string' && data.length < 200 ? data : undefined,
  ];
  const message = candidates.find((value) => typeof value === 'string' && value.trim());
  return message ? message.trim() : fallback;
};
```

---

## 7. Migration Period and Legacy Field Retirement Criteria

The dual-shape envelope ensures continuous compatibility during multi-phase rollout:

- **Phase 1 – Phase 4 (Compatibility Window)**: All endpoints returning the new error envelope retain top-level `message`, `success`, `statusCode`, and `correlationId` fields. Legacy endpoints returning legacy formats continue to work with existing frontend adapters.
- **Phase 5 (Retirement Gate)**: Root legacy fields (`message`, `success`, `statusCode`) may be permanently retired only when:
  1. All routes across Core API and Commerce API are migrated to use `ApiError` and centralized `errorHandler`.
  2. All frontend clients (`rentify-frontend`, `marketplace-frontend`, `admin-frontend`) and external consumers are updated to inspect `error.code` and `error.message`.
  3. Parity audit verifies 0 consumer reliance on root-level error fields as documented in `docs/phase-5-release-runbook.md`.
