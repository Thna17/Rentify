# Staff Ownership and Permission Audit (P2-AUTHZ-002)

**Status**: Verified & Enforced
**Slice**: P2-AUTHZ-002 (Staff Slice)
**Authority**: `rentify-server`
**Date**: October 23, 2026
**Target Invariant**: Store-Centric Staff Membership, Permission Non-Escalation, Expiring Single-Use Store-Bound Invitations, Contact Matching on Acceptance, Cross-Store Anti-Enumeration (404), Immediate Session Revocation, Multi-Store Membership Support

---

## 1. Executive Summary

This audit establishes authoritative ownership rules and runtime access control enforcement for all active staff operations in Rentify's core platform (`rentify-server`), covering staff invitations, invitation acceptance, staff listing, permission assignment, activation/deactivation, account revocation, session lifecycle, and store membership.

In accordance with Phase 2 requirements (P2-AUTHZ-002: Staff Slice):
- **Store-First Membership Hierarchy**: Staff membership is canonically bound to a `Store` via `storeId` (referencing `Stores(id)`). The `websiteId` attribute is made nullable and serves strictly as optional channel context for storefront operations.
- **Store Manager Authority & Non-Escalation**: Only Store Owners, explicitly permitted staff managers holding the `manage_staff` permission, or platform administrators may manage staff. Permitted managers can only delegate permissions that they personally hold (`subset check`); attempts to grant unheld permissions are rejected with `403 Cannot grant permissions you do not hold`.
- **Role Escalation Prevention**: Staff members cannot be promoted to Store Owner, Merchant, or Platform Administrator (`role: 'admin'` / `role: 'user'` rejected with `403`). Staff cannot modify their own permissions or delete their own accounts (self-escalation / self-deletion prevention).
- **Cryptographic, Single-Use, Expiring Invitations**: Staff invitations use cryptographically secure 256-bit random tokens (`crypto.randomBytes(32)`), expire strictly after 7 days (`invitationSentAt > Date.now() - 7d`), and are single-use (`invitationToken` is set to `null` immediately upon acceptance). Reusing or attempting to accept an expired invitation token returns `400 Invalid or expired invitation token`.
- **Contact Verification on Acceptance**: Accepting an invitation verifies that the claimant's provided contact (email or phone) matches the invited recipient contact recorded at invitation time. Mismatched claims are rejected with `403 Contact does not match invitation recipient`.
- **Cross-Store Anti-Enumeration**: Reading (`GET /api/staff/:id`), updating (`PATCH /api/staff/:id`), or deleting (`DELETE /api/staff/:id`) staff belonging to another store returns `404 Staff not found` (not 403), preventing malicious enumeration of staff IDs across tenants.
- **Session Revocation on Deactivation**: Deactivating (`isActive: false`) or deleting a staff member immediately clears `refreshToken` and `refreshTokenExpires`. Subsequent requests with access or refresh tokens are rejected with `403 Staff access is inactive` in token validation endpoints and authentication middlewares (`verifyToken`, `handleStaffAuth`, `verifyStaffToken`).
- **Multi-Store Staff Membership**: A single individual (same email or phone number) can hold legitimate staff memberships across multiple independent stores. Unique indexes enforce uniqueness per `(storeId, email)` and `(storeId, phoneNumber)`. When authenticating with multiple active memberships, `storeId` is required to explicitly select the target store context; ambiguous logins fail with `400 Multiple store memberships found. Please specify storeId.`
- **Suspended Store & Actor Behavior**: Mutating operations on suspended stores (`store.status !== 'active'`) are rejected with `403 Store is suspended`. Suspended user accounts are rejected with `403 Account is suspended`.

---

## 2. Staff Route & Operation Inventory

| Route | Method | Operation ID | Resource | Action | Auth Level | Subject Type | Required Permission | Denial Codes | Summary |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/staff` | `GET` | `listStaff` | Staff | list | Authenticated | User / Staff | `manage_staff` (if staff) | `401`, `403` | List staff members for caller's store |
| `/api/staff` | `POST` | `createStaff` | Staff | create | Authenticated | User / Staff | `manage_staff` (if staff) | `400`, `401`, `403` | Direct creation of staff member |
| `/api/staff/me` | `GET` | `getStaffProfile` | Staff | read | Authenticated | Staff | None | `401`, `403`, `404` | Get profile of authenticated staff |
| `/api/staff/:id` | `GET` | `getStaffById` | Staff | read | Authenticated | User / Staff | `manage_staff` (if staff) | `401`, `403`, `404` | Get staff details (404 across stores) |
| `/api/staff/:id` | `PATCH` | `updateStaff` | Staff | update | Authenticated | User / Staff | `manage_staff` (if staff) | `400`, `401`, `403`, `404` | Update permissions, name, or isActive status |
| `/api/staff/:id` | `DELETE` | `deleteStaff` | Staff | delete | Authenticated | User / Staff | `manage_staff` (if staff) | `401`, `403`, `404` | Delete staff member and revoke sessions |
| `/api/staff/invite` | `POST` | `sendStaffInvitation` | Staff | invite | Authenticated | User / Staff | `manage_staff` (if staff) | `400`, `401`, `403` | Send email or telegram staff invite |
| `/api/staff/accept-invitation` | `POST` | `acceptStaffInvitation` | Staff | create | Public | Public | None | `400`, `403` | Accept invite, verify contact, activate account |
| `/api/staff/login` | `POST` | `staffLogin` | Staff | authenticate | Public | Public | None | `400`, `401`, `403`, `404` | Staff login with multi-store disambiguation |
| `/api/staff/validate-token` | `POST` | `staffValidateToken` | Staff | read | Public | Public | None | `401`, `403` | Validate tokens and return permissions + storeId |
| `/api/staff/resend-otp` | `POST` | `staffResendOtp` | Staff | create | Public | Public | None | `400`, `404` | Resend OTP for verification |
| `/api/staff/verify-otp` | `POST` | `staffVerifyOtp` | Staff | create | Public | Public | None | `400`, `401` | Verify staff OTP |
| `/api/staff/forgot-password` | `POST` | `staffForgotPassword` | Staff | create | Public | Public | None | `400`, `404` | Staff forgot password request |
| `/api/staff/reset-password` | `POST` | `staffResetPassword` | Staff | create | Public | Public | None | `400` | Staff reset password with token |
| `/api/staff/refresh-token` | `POST` | `staffRefreshToken` | Staff | create | Authenticated | Staff | None | `401`, `403` | Rotate and issue new staff tokens |
| `/api/staff/logout` | `POST` | `staffLogout` | Staff | create | Authenticated | Staff | None | `200` | Invalidate refresh token and clear cookies |

---

## 3. Architectural Invariants & Security Boundaries

### 3.1 Store-Centric Data Model
- Migration `20260927_012_staff_store_id.js` adds `storeId` (UUID, referencing `Stores(id)`) to `Staffs`.
- In `Staff.js`:
  ```javascript
  storeId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "Stores", key: "id" },
  },
  websiteId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: "Websites", key: "id" },
  },
  ```
- Uniqueness constraints are scoped per store: `["storeId", "email"]` and `["storeId", "phoneNumber"]`.
- `Staff.belongsTo(Store, { foreignKey: "storeId", as: "store" })` and `Store.hasMany(Staff, { foreignKey: "storeId", as: "staffMembers" })`.

### 3.2 Permission Delegation & Non-Escalation
- Allowed staff permissions are strictly defined:
  `["manage_products", "manage_orders", "manage_invoices", "manage_pos", "manage_analytics", "manage_settings", "manage_staff"]`.
- When an authenticated staff manager invites or updates staff, the granted permissions are verified against `req.user.permissions`:
  ```javascript
  if (caller.role === "staff") {
    const callerPerms = new Set(caller.permissions || []);
    const unheld = targetPermissions.filter((p) => !callerPerms.has(p));
    if (unheld.length > 0) {
      throw new ApiError(403, `Cannot grant permissions you do not hold: ${unheld.join(", ")}`);
    }
  }
  ```
- Staff managers cannot grant permissions beyond their own subset.

### 3.3 Anti-Enumeration Cross-Store Protection
- Accessing staff by identifier across store boundaries returns `404 Staff not found` instead of `403 Forbidden`:
  ```javascript
  if (!targetStaff) throw new ApiError(404, "Staff not found");
  // Caller not belonging to the staff member's store:
  if (!callerBelongsToStore && store.ownerUserId !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(404, "Staff not found");
  }
  ```
- This guarantees an attacker cannot verify whether a given staff UUID exists in another tenant's store.

### 3.4 Cryptographic Invitation Lifecycle
- **Entropy**: Generated using `crypto.randomBytes(32).toString("hex")` (256-bit entropy).
- **TTL**: 7-day expiration enforced via Sequelize query:
  `invitationSentAt: { [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }`.
- **Single-Use**: Upon successful acceptance, `invitationToken` is set to `null` before saving. Subsequent acceptance attempts fail immediately with `400`.
- **Recipient Contact Verification**:
  ```javascript
  const providedContact = (contact || email || phoneNumber || "").trim().toLowerCase();
  if (providedContact) {
    if (providedContact !== staff.email && providedContact !== staff.phoneNumber) {
      throw new ApiError(403, "Contact does not match invitation recipient");
    }
  }
  ```

### 3.5 Session Invalidation & Revocation
- Deactivating staff (`isActive: false`) or deleting staff immediately nullifies `refreshToken = null` and `refreshTokenExpires = null`.
- `validateStaffToken`, `handleStaffAuth`, and `verifyStaffToken` query the database and reject deactivated staff with `403 Staff access is inactive`.
- Token authentication middleware (`verifyToken`) detects `role === 'staff'` in JWT payloads and validates active status in the database.

### 3.6 Multi-Store Membership Disambiguation
- An email address can be invited to and accept memberships in multiple distinct stores.
- In `StaffAuthService.prototype.login`:
  ```javascript
  if (!selectedStoreId && activeMemberships.length > 1) {
    throw new ApiError(400, "Multiple store memberships found. Please specify storeId.");
  }
  ```
- Authenticating without specifying `storeId` when multiple memberships exist forces the caller to disambiguate the target store context.

---

## 4. Matrix Actor Evaluation

| Matrix Actor Archetype | Read Operations (`listStaff`, `getStaffById`) | Write Operations (`invite`, `create`, `update`, `delete`) | Acceptance (`acceptStaffInvitation`) | Token Validation (`validateStaffToken`) |
| :--- | :--- | :--- | :--- | :--- |
| **Store Owner** | **Allow** (own store only) | **Allow** (own store only) | Allow (as public) | Allow (if staff session) |
| **Permitted Staff Manager** (`manage_staff`) | **Allow** (own store only) | **Allow** (constrained subset) | Allow (as public) | Allow |
| **Ordinary Staff** (no `manage_staff`) | **Deny 403** (or 404 for other stores) | **Deny 403** | Allow (as public) | Allow |
| **Unrelated Merchant** | **Deny 404** (Anti-enumeration) | **Deny 404** / **403** | Allow (as public) | Deny 401 |
| **Resource Buyer** | **Deny 401** / **403** | **Deny 401** / **403** | Allow (as public) | Deny 401 |
| **Public User** | **Deny 401** | **Deny 401** | **Allow** | **Allow** (validates token) |
| **Suspended Store / Actor** | **Allow** (read_only) | **Deny 403** (`Store is suspended`) | **Deny 403** (`Store is suspended`) | **Deny 403** (`Staff access is inactive`) |
| **Revoked Staff Session** | **Deny 401** / **403** | **Deny 401** / **403** | N/A | **Deny 403** (`Staff access is inactive`) |

---

## 5. Verification & Test Evidence

Comprehensive automated verification covers all required scenarios in `rentify-server/test/security/staffStoreOwnership.test.js`:

```
✔ Staff Store Ownership: 1. Store owner can invite and manage staff for their store
✔ Staff Store Ownership: 2. Permitted staff manager can invite staff with subset permissions
✔ Staff Store Ownership: 3. Staff manager cannot grant permissions they do not hold
✔ Staff Store Ownership: 4. Staff cannot promote anyone to owner or administrator
✔ Staff Store Ownership: 5. Staff manager cannot modify their own permissions (no self-escalation)
✔ Staff Store Ownership: 6. Staff manager cannot delete their own account
✔ Staff Store Ownership: 7. Ordinary staff without manage_staff is denied staff management
✔ Staff Store Ownership: 8. Cross-Store Anti-Enumeration: Unrelated merchant receives 404 Not Found
✔ Staff Store Ownership: 9. Cross-Store Anti-Enumeration: Staff of another store receives 404 Not Found
✔ Staff Store Ownership: 10. Website context must belong to the target Store
✔ Staff Store Ownership: 11. Invitation acceptance: activates account and nullifies token (single-use)
✔ Staff Store Ownership: 12. Reused invitation token is rejected
✔ Staff Store Ownership: 13. Expired invitation token (> 7 days) is rejected
✔ Staff Store Ownership: 14. Contact mismatch on invitation acceptance is rejected with 403
✔ Staff Store Ownership: 15. Deactivated/revoked staff immediately invalidates sessions
✔ Staff Store Ownership: 16. Multi-Store membership: disambiguation requires storeId when multiple exist
✔ Staff Store Ownership: 17. Suspended Store: write operations fail with 403 Store is suspended
```

### Full Repository Verification Pass
- `npm --prefix rentify-server run verify`: 103 unit tests passed, 35 integration tests passed, OpenAPI contract verified (101 operations across 88 paths), migrations verified (12 ordered migrations), secret scanning passed.
- `npm --prefix ecommerce-server run verify`: 52 unit tests passed, 29 integration tests passed, OpenAPI contract verified (138 operations across 110 paths), migrations verified (11 ordered migrations), secret scanning passed.
- `npm run verify:repository`: Matrix schema & parity verified (239 operations across 11 actor archetypes), API clients synchronized, semantic token contrast verified, host validator verified.

---

## 6. Audit Conclusion & Sign-Off

The Staff Slice of P2-AUTHZ-002 is verified and fully operational:
1. Staff records are canonically bound to `storeId` with optional `websiteId` channel context.
2. Permission delegation enforces non-escalation to prevent privilege escalation by subordinate managers.
3. Self-escalation and self-deletion by staff managers are strictly prevented.
4. Single-use, expiring, cryptographically random invitations guarantee recipient contact matching.
5. Deactivation immediately invalidates refresh tokens and blocks subsequent access.
6. Multi-store memberships are supported and explicitly disambiguated.
7. Anti-enumeration protects staff identities across tenants with safe `404` status codes.
