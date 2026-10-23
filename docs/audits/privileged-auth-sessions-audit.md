# Privileged Authentication and Session Controls Audit (P2-SEC-001)

**Document ID:** AUD-P2-SEC-001  
**Status:** Complete  
**Date:** 2026-10-23  
**Scope:** Core API (`rentify-server`), Admin Frontend (`admin-frontend`), Platform OpenAPI (`docs/openapi/core.openapi.yaml`), and Authorization Policy Matrix (`docs/security/authorization-matrix.json`)  
**Related Documents:** [`docs/identity-subject-model.md`](../identity-subject-model.md), [`docs/admin-operations.md`](../admin-operations.md), [`docs/authorization-policy-matrix.md`](../authorization-policy-matrix.md)

---

## 1. Executive Summary

Work package **P2-SEC-001** introduces production-grade privileged security controls for platform administrators and merchants on Rentify. These controls enforce standards-based Multi-Factor Authentication (RFC 6238 TOTP), recent-authentication step-up policies, a comprehensive device and session inventory, safe recovery flows, secure contact verification, role-elevation defense, and structured audit telemetry.

All cryptographic implementations are built using Node.js native `crypto` libraries with zero external dependencies on opaque third-party auth services. Secrets at rest are encrypted with authenticated AES-256-GCM. Session state strictly separates public metadata from raw token secrets (only salted SHA-256 hashes are persisted).

---

## 2. Threat Model & Mitigation Matrix

| Risk / Threat | Attack Vector | Architecture Mitigation | Verification Status |
| :--- | :--- | :--- | :--- |
| **Credential Stuffing / Password Compromise** | Stolen admin passwords used to access platform admin portal. | Standards-based RFC 6238 TOTP required for administrators. Login demands two-phase challenge (`/api/auth/mfa/challenge`) with short-lived MFA pending state. | **Enforced & Verified** |
| **TOTP Secret Theft at Rest** | Database breach or backup exfiltration exposing TOTP seeds. | TOTP seeds are encrypted at rest using AES-256-GCM with per-secret random IVs and authentication tags. | **Enforced & Verified** |
| **TOTP Replay & Brute Force** | Replaying valid OTP within window or brute-forcing 6-digit codes. | Replay tracking verifies `mfaLastTimeStep` to reject repeated use in the same 30s window. 5 consecutive failed attempts trigger a 15-minute account lockout. | **Enforced & Verified** |
| **MFA Secret Leakage** | Plaintext secret exposed in logs, user profile endpoints, or error traces. | TOTP seed and otpauth URL are returned *strictly once* during `/admin/mfa/setup`. Profile models strip all MFA secret fields. Logs redact `mfaSecret` and tokens. | **Enforced & Verified** |
| **Session Hijacking & Stale Sessions** | Compromised bearer tokens remaining valid after device theft or role change. | `UserSession` inventory tracks devices; revocation deletes or flags sessions. Token refresh rotates token secrets. Demoting an admin or removing roles instantly revokes all user sessions. | **Enforced & Verified** |
| **Privilege Escalation via Session Retention** | User demoted from `admin` retains a high-privilege access token for up to token expiry. | `verifyToken` middleware validates admin subject active status and verifies session validity directly from the database or cache. | **Enforced & Verified** |
| **High-Risk Action on Stale Admin Session** | Attacker using an unattended admin workstation to approve sellers or change roles. | High-risk operations (seller approvals, suspensions, role modifications, security settings, global session revocation) require recent authentication within 15 minutes (`requireRecentAuth`). Step-up re-auth endpoint (`/admin/auth/step-up`) prompts for re-verification. | **Enforced & Verified** |
| **Account Takeover via Contact Change** | Attacker changing recovery email or phone to hijack identity. | Contact updates require recent authentication and issue a 6-digit verification OTP to the *new* contact address before committing changes. | **Enforced & Verified** |

---

## 3. Cryptographic Implementation Details

### 3.1 Standards-Based TOTP (RFC 6238 & RFC 4226)
- **Engine:** [`rentify-server/src/utils/totp.js`](../../rentify-server/src/utils/totp.js)
- **Base32 Encoding:** RFC 4648 Base32 alphabet (`A-Z`, `2-7`) with bitwise decoding and padding safety.
- **Algorithm:** HMAC-SHA1 with dynamic truncation per RFC 4226 (HOTP).
- **Time Step:** 30 seconds (`X = 30`).
- **Digits:** 6 numeric digits zero-padded.
- **Verification Window:** Window of ±1 step (90-second total drift allowance).
- **Replay Protection:** Persists `mfaLastTimeStep`. If a verified token corresponds to a time step already recorded for that user, it is rejected with `MFA_CODE_ALREADY_USED`.

### 3.2 Secret Encryption at Rest (AES-256-GCM)
- **Engine:** [`rentify-server/src/utils/mfaEncryption.js`](../../rentify-server/src/utils/mfaEncryption.js)
- **Cipher:** `aes-256-gcm`.
- **Key Derivation:** 32-byte secret key prioritized via `MFA_ENCRYPTION_KEY`, falling back to `PAYMENT_CONFIG_ENCRYPTION_KEY` or hashed `COOKIE_SECRET`/`JWT_SECRET`.
- **Format:** `iv:authTag:ciphertext` encoded in hex.
- **Integrity:** Tampered ciphertexts or tags throw an authentication error and fail closed.

### 3.3 Recovery Codes
- **Generation:** 8 high-entropy alphanumeric codes generated via `crypto.randomBytes(12)`, formatted as `XXXX-XXXX-XXXX`.
- **Storage:** Stored in database as salted SHA-256 hashes (`salt:hash`). Raw codes are presented *only once* to the user during setup or explicit regeneration.
- **Single-Use Consumption:** Successful redemption removes the used hash from the array.
- **Regeneration Invalidation:** Regenerating codes generates 8 new codes and completely overwrites all existing recovery hashes.

---

## 4. Session Architecture & Management

### 4.1 Session Inventory (`UserSession` Model)
Each successful authentication or refresh persists a row in `UserSessions` with:
- `id`: UUID primary key.
- `userId`: Owner of the session.
- `refreshTokenHash`: SHA-256 hash of the current refresh token (the raw token is never persisted).
- `deviceType`: Detected client device (`desktop`, `mobile`, `tablet`, or `unknown`).
- `clientName`: Detected browser/engine (e.g., `Chrome 120`, `Safari`, `Firefox`).
- `os`: Operating system (e.g., `macOS`, `iOS`, `Windows`, `Linux`, `Android`).
- `ipAddress`: Client IP address at session creation.
- `userAgent`: Raw client User-Agent string.
- `lastActiveAt`: Timestamp updated on each token refresh.
- `expiresAt`: Deterministic 30-day session lifetime.
- `isRevoked`: Boolean flag for invalidated sessions.

### 4.2 Refresh Token Rotation
On each `/api/auth/refresh` request:
1. The incoming refresh token is verified against JWT signatures.
2. Its SHA-256 hash is matched against active `UserSessions`.
3. If revoked or not found, access is denied (`401 INVALID_REFRESH_TOKEN`).
4. A new refresh token is issued and hashed.
5. The session record is updated with the new hash and fresh `lastActiveAt`.

### 4.3 Revocation Controls
- **Single Session Revocation:** `DELETE /admin/sessions/:sessionId` allows terminating any specific remote session.
- **Revoke All Other Sessions:** `POST /admin/sessions/revoke-others` invalidates all sessions belonging to the user *except* the session matching the current refresh token.
- **Role Elevation Defense:** Modifying user roles (e.g. promoting or demoting an admin via `PUT /admin/users/:userId/role`) immediately calls `revokeAllUserSessions(userId)` to prevent privilege persistence across old tokens.

---

## 5. Recent Authentication Policy (`requireRecentAuth`)

- **Middleware:** [`rentify-server/src/middlewares/recentAuth.js`](../../rentify-server/src/middlewares/recentAuth.js)
- **Window:** 15 minutes (`RECENT_AUTH_WINDOW_MS = 900,000`).
- **Enforcement:** Inspects the authenticated subject's `recentAuthAt` timestamp (stored on the session and token). If absent or elapsed:
  - Responds with `403 Forbidden` (`RECENT_AUTH_REQUIRED`).
  - Requires the user to hit `POST /admin/auth/step-up` with their current password and valid TOTP code.
- **Protected Actions:**
  - `POST /admin/mfa/setup` & `POST /admin/mfa/disable`
  - `POST /admin/mfa/recovery-codes/regenerate`
  - `POST /admin/sessions/revoke-others`
  - `POST /admin/account/contact-change/request`
  - `PUT /admin/users/:userId/role`
  - `POST /admin/sellers/:storeId/approve` & `POST /admin/sellers/:storeId/suspend`

---

## 6. Audit Trail Telemetry

All privileged events are logged as structured JSON and persisted in the `AuditLogs` table via [`rentify-server/src/utils/auditLogger.js`](../../rentify-server/src/utils/auditLogger.js):

```json
{
  "timestamp": "2026-10-23T16:58:39.000Z",
  "correlationId": "corr-p2-sec-001-audit",
  "actorId": "admin-user-001",
  "actorRole": "admin",
  "action": "ADMIN_MFA_CONFIRM",
  "targetResource": "User:admin-user-001",
  "ipAddress": "192.168.1.100",
  "userAgent": "Antigravity/1.0",
  "outcome": "SUCCESS",
  "metadata": {
    "mfaType": "totp"
  }
}
```

Audited events include:
- `ADMIN_MFA_SETUP`, `ADMIN_MFA_CONFIRM`, `ADMIN_MFA_DISABLE`, `ADMIN_MFA_RECOVERY_REGEN`
- `ADMIN_STEP_UP_AUTH`
- `ADMIN_SESSION_REVOKE`, `ADMIN_SESSION_REVOKE_OTHERS`, `ADMIN_SESSION_REVOKE_ALL`
- `ADMIN_CONTACT_CHANGE_REQUEST`, `ADMIN_CONTACT_CHANGE_VERIFY`
- `ADMIN_USER_ROLE_UPDATE`

---

## 7. Admin UI Implementation (`admin-frontend`)

Two dedicated, accessible views were created in the Angular admin workspace:
1. **Security Settings View (`/security`):**
   - Live MFA status indicator.
   - Interactive enrollment wizard displaying otpauth URI and Base32 secret during setup.
   - 6-digit confirmation code challenge.
   - 8 single-use recovery codes display with copy/download options.
   - Modal dialog for secure contact updates requiring recent-auth step-up.
2. **Session Inventory View (`/sessions`):**
   - Real-time list of active sessions with device type, client name, OS, IP address, and creation date.
   - Visual badge identifying the current session.
   - Individual "Revoke" button per remote session.
   - Global "Revoke All Other Sessions" action.

---

## 8. Verification Results

### 8.1 Unit & Security Tests
All 12 targeted security tests in `rentify-server/test/security/privilegedAuthAndSessions.test.js` pass:
```
✔ P2-SEC-001: 1. Standards-based RFC 6238 TOTP computation and validation
✔ P2-SEC-001: 2. Encrypted TOTP seed at rest using AES-256-GCM
✔ P2-SEC-001: 3. Replay protection prevents token reuse in the same time step
✔ P2-SEC-001: 4. Single-use hashed recovery codes and regeneration invalidation
✔ P2-SEC-001: 5. Recent authentication enforcement for high-risk actions
✔ P2-SEC-001: 6. Session inventory with client metadata that never exposes raw tokens
✔ P2-SEC-001: 7. Privileged audit events structured logging
✔ P2-SEC-001: 8. Admin controller MFA enrollment, confirmation and recovery codes
✔ P2-SEC-001: 9. Rate limiting on MFA challenge: 5 failed attempts locks account
✔ P2-SEC-001: 10. Step-up re-authentication updates recentAuthAt and issues token
✔ P2-SEC-001: 11. Secure contact change request and verification with OTP
✔ P2-SEC-001: 12. Role-elevation protection and session revocation upon role removal
```

### 8.2 Repository & Service Verifications
- `npm run verify:repository`:
  - Secret scan: PASSED (2,121 files scanned).
  - Migration ordering: PASSED (13 Core, 13 Commerce).
  - OpenAPI verification: PASSED (116 Core routes, 138 Commerce routes mapped).
  - Client SDK generation: PASSED (up to date).
  - WCAG 2.1 design tokens: PASSED (14/14 contrast pairs).
  - Host configuration: PASSED.
  - Authorization policy matrix: PASSED (254 operations mapped across 11 archetypes).
- `rentify-server lint`: PASSED (180 files checked, boundaries & model ownership respected).
- `admin-frontend test`: PASSED (35/35 Angular unit tests passing).

---

## 9. Conclusion

Work package **P2-SEC-001** fulfills all requirements for privileged authentication, administrator MFA, recent-auth enforcement, and session lifecycle controls without introducing external SaaS dependencies or security bypasses.
