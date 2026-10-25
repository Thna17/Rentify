const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-access-secret-32-chars-minimum-ok';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-minimum';
process.env.COOKIE_SECRET = 'test-cookie-secret-32-chars-minimum-ok';
process.env.MFA_ENCRYPTION_KEY = 'test-mfa-encryption-key-32-chars-ok!';

const totp = require('../../src/utils/totp');
const { encryptMfaSecret, decryptMfaSecret } = require('../../src/utils/mfaEncryption');
const sessionManager = require('../../src/utils/sessionManager');
const { requireRecentAuth, RECENT_AUTH_MAX_AGE_MS } = require('../../src/middlewares/recentAuth');
const { emitAuditEvent } = require('../../src/utils/auditLogger');

const createResponse = () => ({
  statusCode: 200,
  body: null,
  cookies: {},
  clearedCookies: [],
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
  cookie(name, val, opts) {
    this.cookies[name] = { val, opts };
    return this;
  },
  clearCookie(name, opts) {
    this.clearedCookies.push({ name, opts });
    return this;
  },
});

test('P2-SEC-001: 1. Standards-based RFC 6238 TOTP computation and validation', () => {
  const { base32, otpauthUrl } = totp.generateTotpSecret('admin@rentify.local', 'Rentify');
  assert.ok(base32.length >= 26, 'Base32 secret must be at least 160 bits');
  assert.ok(otpauthUrl.startsWith('otpauth://totp/Rentify:admin%40rentify.local?secret='));

  // Generate valid token at current time
  const { code, timeStep } = totp.generateTotpToken(base32);
  assert.match(code, /^\d{6}$/, 'TOTP token must be 6 digits');

  // Verify valid token
  const verifyRes = totp.verifyTotpCode(code, base32);
  assert.equal(verifyRes.valid, true);
  assert.equal(verifyRes.timeStep, timeStep);

  // Reject invalid token
  const badRes = totp.verifyTotpCode('000000', base32, { lastTimeStep: null });
  // Unless by astronomical coincidence the code was 000000:
  if (code !== '000000') {
    assert.equal(badRes.valid, false);
    assert.equal(badRes.error, 'INVALID_TOKEN');
  }

  // Reject malformed token format
  const malformed = totp.verifyTotpCode('12a4', base32);
  assert.equal(malformed.valid, false);
  assert.equal(malformed.error, 'INVALID_FORMAT');
});

test('P2-SEC-001: 2. Encrypted TOTP seed at rest using AES-256-GCM', () => {
  const rawSecret = 'JBSWY3DPEHPK3PXP'; // Standard Base32 test secret
  const encrypted = encryptMfaSecret(rawSecret);

  assert.ok(encrypted !== rawSecret, 'Encrypted secret must not match plaintext');
  const envelope = JSON.parse(encrypted);
  assert.equal(envelope.v, 1);
  assert.ok(envelope.iv && envelope.tag && envelope.ct, 'Envelope must contain GCM IV, tag, and ciphertext');

  // Decryption recovers exact plaintext
  const decrypted = decryptMfaSecret(encrypted);
  assert.equal(decrypted, rawSecret);

  // Tampering with ciphertext fails authentication tag check
  const tamperedEnvelope = { ...envelope, ct: Buffer.from('tampered-ciphertext').toString('base64') };
  assert.throws(() => decryptMfaSecret(JSON.stringify(tamperedEnvelope)));
});

test('P2-SEC-001: 3. Replay protection prevents token reuse in the same time step', () => {
  const { base32 } = totp.generateTotpSecret('admin@rentify.local');
  const { code, timeStep } = totp.generateTotpToken(base32);

  // First verification succeeds
  const first = totp.verifyTotpCode(code, base32, { lastTimeStep: null });
  assert.equal(first.valid, true);
  assert.equal(first.timeStep, timeStep);

  // Second verification with the same or later lastTimeStep is rejected as replayed
  const replay = totp.verifyTotpCode(code, base32, { lastTimeStep: timeStep });
  assert.equal(replay.valid, false);
  assert.equal(replay.error, 'TOKEN_REPLAYED');
});

test('P2-SEC-001: 4. Single-use hashed recovery codes and regeneration invalidation', () => {
  const { plainCodes, hashedCodes } = totp.generateRecoveryCodes(8);
  assert.equal(plainCodes.length, 8);
  assert.equal(hashedCodes.length, 8);

  // Plain codes must be formatted in groups (e.g. XXXX-XXXX-XXXX)
  for (const c of plainCodes) {
    assert.match(c, /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  }

  // Stored codes are hashed and salt-backed, never cleartext
  for (const h of hashedCodes) {
    assert.ok(h.hash && h.salt);
    assert.equal(h.usedAt, null);
    assert.equal(plainCodes.includes(h.hash), false);
  }

  // Verification succeeds with unused code
  const codeToUse = plainCodes[2];
  const verifyRes = totp.verifyRecoveryCode(codeToUse, hashedCodes);
  assert.equal(verifyRes.valid, true);
  assert.equal(verifyRes.matchedIndex, 2);

  // Mark as used
  hashedCodes[2].usedAt = new Date().toISOString();

  // Attempting to reuse the exact same recovery code fails
  const reuseRes = totp.verifyRecoveryCode(codeToUse, hashedCodes);
  assert.equal(reuseRes.valid, false);

  // Regeneration invalidates all previous codes
  const regenerated = totp.generateRecoveryCodes(8);
  const oldCodeVerify = totp.verifyRecoveryCode(plainCodes[0], regenerated.hashedCodes);
  assert.equal(oldCodeVerify.valid, false);
});

test('P2-SEC-001: 5. Recent authentication enforcement for high-risk actions', async () => {
  // Case A: Unauthenticated caller receives 401
  const reqUnauth = { user: null };
  const resUnauth = createResponse();
  let nextCalled = false;
  await requireRecentAuth(reqUnauth, resUnauth, () => { nextCalled = true; });
  assert.equal(resUnauth.statusCode, 401);
  assert.equal(nextCalled, false);

  // Case B: Authenticated caller with recent auth (< 15 mins) passes
  const reqRecent = {
    user: {
      id: 'admin-1',
      role: 'admin',
      recentAuthAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 mins ago
    },
  };
  const resRecent = createResponse();
  let recentNext = false;
  await requireRecentAuth(reqRecent, resRecent, () => { recentNext = true; });
  assert.equal(recentNext, true);
  assert.equal(resRecent.statusCode, 200);

  // Case C: Authenticated caller with expired recent auth (> 15 mins) is denied with 403 RECENT_AUTH_REQUIRED
  const reqExpired = {
    user: {
      id: 'admin-1',
      role: 'admin',
      recentAuthAt: new Date(Date.now() - 16 * 60 * 1000).toISOString(), // 16 mins ago
    },
  };
  const resExpired = createResponse();
  let expiredNext = false;
  await requireRecentAuth(reqExpired, resExpired, () => { expiredNext = true; });
  assert.equal(expiredNext, false);
  assert.equal(resExpired.statusCode, 403);
  assert.equal(resExpired.body.code, 'RECENT_AUTH_REQUIRED');
});

test('P2-SEC-001: 6. Session inventory with client metadata that never exposes raw tokens', () => {
  const rawUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';
  const clientType = sessionManager.parseClientType(rawUa);
  assert.equal(clientType, 'Chrome on macOS');

  const token = 'raw-refresh-token-value-super-secret';
  const hashed = sessionManager.hashToken(token);
  assert.equal(hashed.length, 64);
  assert.notEqual(hashed, token);

  // Verify mobile parsing
  const mobileUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
  assert.equal(sessionManager.parseClientType(mobileUa), 'Safari on iOS');
});

test('P2-SEC-001: 7. Privileged audit events structured logging', async () => {
  const auditEntry = await emitAuditEvent({
    correlationId: 'test-corr-001',
    actorUserId: 'admin-uuid-1',
    actorRole: 'admin',
    action: 'ADMIN_MFA_ENROLLED',
    resource: 'User',
    resourceId: 'admin-uuid-1',
    ipAddress: '127.0.0.1',
    userAgent: 'Node-Test-Runner',
    status: 'SUCCESS',
    details: { test: true },
  });

  // Verify non-throwing audit emission
  assert.ok(auditEntry === null || auditEntry.action === 'ADMIN_MFA_ENROLLED');
});

test('P2-SEC-001: 8. Admin controller MFA enrollment, confirmation and recovery codes', async () => {
  const securityController = require('../../src/modules/admin/adminSecurityController');
  const { User } = require('../../src/models');

  // Create mock admin user
  const mockUser = {
    id: 'admin-test-uuid-101',
    email: 'admin.sec@rentify.local',
    name: 'Sec Admin',
    role: 'admin',
    mfaEnabled: false,
    mfaSecret: null,
    mfaPendingSecret: null,
    mfaRecoveryCodes: null,
    mfaFailedAttempts: 0,
    mfaLockUntil: null,
    save: async function() { return this; },
  };

  const origFindByPk = User.findByPk;
  User.findByPk = async (id) => (id === mockUser.id ? mockUser : null);

  try {
    // 1. Enroll
    const reqEnroll = { user: { id: mockUser.id, role: 'admin' } };
    const resEnroll = createResponse();
    await securityController.enrollMfa(reqEnroll, resEnroll);

    assert.equal(resEnroll.statusCode, 200);
    assert.ok(resEnroll.body.secret, 'Must return Base32 secret for setup');
    assert.ok(resEnroll.body.otpauthUrl, 'Must return otpauth URL');
    assert.ok(mockUser.mfaPendingSecret, 'Pending secret must be stored');
    assert.notEqual(mockUser.mfaPendingSecret, resEnroll.body.secret, 'Stored secret must be encrypted');

    // 2. Confirm with bad code fails
    const reqBadConfirm = { user: { id: mockUser.id }, body: { code: '000000' }, ip: '127.0.0.1' };
    const resBadConfirm = createResponse();
    await securityController.confirmMfa(reqBadConfirm, resBadConfirm);
    assert.equal(resBadConfirm.statusCode, 400);
    assert.equal(mockUser.mfaEnabled, false);
    assert.equal(mockUser.mfaFailedAttempts, 1);

    // 3. Confirm with valid code succeeds
    const plainSecret = decryptMfaSecret(mockUser.mfaPendingSecret);
    const { code: validCode } = totp.generateTotpToken(plainSecret);
    const reqGoodConfirm = { user: { id: mockUser.id }, body: { code: validCode }, ip: '127.0.0.1' };
    const resGoodConfirm = createResponse();
    await securityController.confirmMfa(reqGoodConfirm, resGoodConfirm);

    assert.equal(resGoodConfirm.statusCode, 200);
    assert.equal(mockUser.mfaEnabled, true);
    assert.equal(mockUser.mfaPendingSecret, null);
    assert.ok(mockUser.mfaSecret, 'Encrypted secret must be saved');
    assert.equal(resGoodConfirm.body.recoveryCodes.length, 8);

    // 4. Status endpoint reports active MFA without leaking secrets
    const reqStatus = { user: { id: mockUser.id } };
    const resStatus = createResponse();
    await securityController.getMfaStatus(reqStatus, resStatus);
    assert.equal(resStatus.statusCode, 200);
    assert.equal(resStatus.body.mfaEnabled, true);
    assert.equal(resStatus.body.hasRecoveryCodes, true);
    assert.equal(resStatus.body.secret, undefined, 'Secret must never leak in status response');
  } finally {
    User.findByPk = origFindByPk;
  }
});

test('P2-SEC-001: 9. Rate limiting on MFA challenge: 5 failed attempts locks account', async () => {
  const securityController = require('../../src/modules/admin/adminSecurityController');
  const { User } = require('../../src/models');

  const rawSecret = totp.generateTotpSecret('locked@rentify.local').base32;
  const mockUser = {
    id: 'admin-test-locked-1',
    email: 'locked@rentify.local',
    role: 'admin',
    mfaEnabled: true,
    mfaSecret: encryptMfaSecret(rawSecret),
    mfaPendingSecret: encryptMfaSecret(rawSecret),
    mfaFailedAttempts: 4,
    mfaLockUntil: null,
    save: async function() { return this; },
  };

  const origFindByPk = User.findByPk;
  User.findByPk = async (id) => (id === mockUser.id ? mockUser : null);

  try {
    // 5th failed attempt triggers lock
    const reqFail = { user: { id: mockUser.id }, body: { code: '000000' }, ip: '127.0.0.1' };
    const resFail = createResponse();
    await securityController.confirmMfa(reqFail, resFail);

    assert.equal(resFail.statusCode, 400);
    assert.equal(mockUser.mfaFailedAttempts, 5);
    assert.ok(mockUser.mfaLockUntil && mockUser.mfaLockUntil > Date.now());
  } finally {
    User.findByPk = origFindByPk;
  }
});

test('P2-SEC-001: 10. Step-up re-authentication updates recentAuthAt and issues token', async () => {
  const securityController = require('../../src/modules/admin/adminSecurityController');
  const { User } = require('../../src/models');
  const bcrypt = require('bcrypt');

  const passwordPlain = 'SuperSecret123!';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);
  const rawSecret = totp.generateTotpSecret('stepup@rentify.local').base32;

  const mockUser = {
    id: 'admin-test-stepup-1',
    email: 'stepup@rentify.local',
    password: passwordHash,
    role: 'admin',
    mfaEnabled: true,
    mfaSecret: encryptMfaSecret(rawSecret),
    mfaRecoveryCodes: '[]',
    mfaFailedAttempts: 0,
    mfaLockUntil: null,
    mfaLastTimeStep: null,
    save: async function() { return this; },
  };

  const origFindByPk = User.findByPk;
  User.findByPk = async (id) => (id === mockUser.id ? mockUser : null);

  try {
    const { code: validMfa } = totp.generateTotpToken(rawSecret);
    const req = {
      user: { id: mockUser.id, role: 'admin' },
      body: { password: passwordPlain, mfaToken: validMfa },
      cookies: {},
      ip: '127.0.0.1',
    };
    const res = createResponse();
    await securityController.stepUpAuth(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.recentAuthAt, 'Must return refreshed recentAuthAt');
    assert.ok(res.body.accessToken, 'Must issue updated accessToken');
    assert.ok(res.cookies.userAccessToken, 'Must set cookie with updated token');
  } finally {
    User.findByPk = origFindByPk;
  }
});

test('P2-SEC-001: 11. Secure contact change request and verification with OTP', async () => {
  const securityController = require('../../src/modules/admin/adminSecurityController');
  const { User } = require('../../src/models');

  const mockUser = {
    id: 'admin-contact-change-1',
    email: 'old.admin@rentify.local',
    phoneNumber: '+85512345678',
    role: 'admin',
    pendingContact: null,
    save: async function() { return this; },
  };

  const origFindByPk = User.findByPk;
  const origFindOne = User.findOne;
  User.findByPk = async (id) => (id === mockUser.id ? mockUser : null);
  User.findOne = async () => null; // Email not taken

  try {
    // 1. Request contact change
    const reqReq = {
      user: { id: mockUser.id },
      body: { newEmail: 'new.admin@rentify.local' },
      ip: '127.0.0.1',
    };
    const resReq = createResponse();
    await securityController.requestContactChange(reqReq, resReq);

    assert.equal(resReq.statusCode, 200);
    assert.ok(mockUser.pendingContact, 'Pending contact state must be stored');
    const pending = JSON.parse(mockUser.pendingContact);
    assert.equal(pending.newEmail, 'new.admin@rentify.local');
    assert.ok(resReq.body.testOtp, 'Test OTP must be returned in test mode');

    // 2. Verify with invalid OTP fails
    const reqBadVerify = { user: { id: mockUser.id }, body: { otp: '000000' }, ip: '127.0.0.1' };
    const resBadVerify = createResponse();
    await securityController.verifyContactChange(reqBadVerify, resBadVerify);
    assert.equal(resBadVerify.statusCode, 400);
    assert.equal(mockUser.email, 'old.admin@rentify.local');

    // 3. Verify with valid OTP succeeds and updates email
    const reqGoodVerify = { user: { id: mockUser.id }, body: { otp: resReq.body.testOtp }, ip: '127.0.0.1' };
    const resGoodVerify = createResponse();
    await securityController.verifyContactChange(reqGoodVerify, resGoodVerify);
    assert.equal(resGoodVerify.statusCode, 200);
    assert.equal(mockUser.email, 'new.admin@rentify.local');
    assert.equal(mockUser.pendingContact, null);
  } finally {
    User.findByPk = origFindByPk;
    User.findOne = origFindOne;
  }
});

test('P2-SEC-001: 12. Role-elevation protection and session revocation upon role removal', async () => {
  const securityController = require('../../src/modules/admin/adminSecurityController');
  const { User } = require('../../src/models');

  let sessionsRevokedUserId = null;
  const origRevokeAll = sessionManager.revokeAllUserSessions;
  sessionManager.revokeAllUserSessions = async (uid) => {
    sessionsRevokedUserId = uid;
    return 3;
  };

  const targetAdminUser = {
    id: 'target-admin-uuid-999',
    email: 'demoted.admin@rentify.local',
    role: 'admin',
    save: async function() { return this; },
  };

  const origFindByPk = User.findByPk;
  User.findByPk = async (id) => (id === targetAdminUser.id ? targetAdminUser : null);

  try {
    // 1. Calling updateUserRole with non-admin or invalid role fails
    const reqInvalid = {
      user: { id: 'super-admin-1', role: 'admin' },
      params: { userId: targetAdminUser.id },
      body: { role: 'superpower' },
      ip: '127.0.0.1',
    };
    const resInvalid = createResponse();
    await securityController.updateUserRole(reqInvalid, resInvalid);
    assert.equal(resInvalid.statusCode, 400);

    // 2. Demoting admin to user succeeds and revokes all active sessions immediately
    const reqDemote = {
      user: { id: 'super-admin-1', role: 'admin' },
      params: { userId: targetAdminUser.id },
      body: { role: 'user' },
      ip: '127.0.0.1',
    };
    const resDemote = createResponse();
    await securityController.updateUserRole(reqDemote, resDemote);

    assert.equal(resDemote.statusCode, 200);
    assert.equal(targetAdminUser.role, 'user');
    assert.equal(sessionsRevokedUserId, targetAdminUser.id, 'Must immediately revoke all sessions for demoted admin');
  } finally {
    User.findByPk = origFindByPk;
    sessionManager.revokeAllUserSessions = origRevokeAll;
  }
});
