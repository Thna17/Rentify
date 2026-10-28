const crypto = require('crypto');
const { User, UserSession } = require('../../models');
const totp = require('../../utils/totp');
const { encryptMfaSecret, decryptMfaSecret } = require('../../utils/mfaEncryption');
const sessionManager = require('../../utils/sessionManager');
const { emitAuditEvent } = require('../../utils/auditLogger');
const { getCorrelationId } = require('../../utils/logger');
const { generateAccessToken, generateRefreshToken } = require('../../utils/jwtUtils');
const cookieConfig = require('../../config/cookieConfig');
const bcrypt = require('bcrypt');
const { sendEmail } = require('../notifications').emailService;
const approvalService = require('../../utils/adminApprovalService');

const contactChangeDescriptor = (pending) => ({
  operation: 'contact.change',
  emailFingerprint: pending.newEmail
    ? crypto.createHash('sha256').update(String(pending.newEmail).trim().toLowerCase()).digest('hex') : null,
  phoneFingerprint: pending.newPhoneNumber
    ? crypto.createHash('sha256').update(String(pending.newPhoneNumber).trim()).digest('hex') : null,
});

/**
 * Returns MFA status for the currently authenticated administrator.
 * Never leaks secret keys or plaintext recovery codes.
 */
exports.getMfaStatus = async (req, res) => {
  const user = await User.findByPk(req.user.id, {
    attributes: ['id', 'email', 'role', 'mfaEnabled', 'mfaRecoveryCodes'],
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  let recoveryCodesRemaining = 0;
  if (user.mfaRecoveryCodes) {
    try {
      const parsed = JSON.parse(user.mfaRecoveryCodes);
      if (Array.isArray(parsed)) {
        recoveryCodesRemaining = parsed.filter((c) => !c.usedAt).length;
      }
    } catch (_e) {}
  }

  res.json({
    mfaEnabled: Boolean(user.mfaEnabled),
    hasRecoveryCodes: recoveryCodesRemaining > 0,
    recoveryCodesRemaining,
  });
};

/**
 * Initiates TOTP MFA enrollment.
 * Secret is generated and encrypted at rest in pending state.
 * Plaintext secret and otpauthUrl are returned ONLY once here during enrollment.
 */
exports.enrollMfa = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const label = user.email || user.name || 'admin';
  const { base32, otpauthUrl } = totp.generateTotpSecret(label, 'Rentify');

  user.mfaPendingSecret = encryptMfaSecret(base32);
  user.mfaFailedAttempts = 0;
  user.mfaLockUntil = null;
  await user.save();

  await emitAuditEvent({
    correlationId: getCorrelationId(req), actorUserId: user.id,
    actorRole: req.platformAccess?.roles?.[0] || req.user.role,
    actorRoles: req.platformAccess?.roles, effectivePermissions: req.platformAccess?.effectivePermissions,
    action: 'ADMIN_MFA_ENROLLMENT_STARTED', resource: 'User', resourceId: user.id,
    reason: 'Operator initiated MFA enrollment', tenantScope: 'self/*',
    safeBefore: { mfaEnabled: Boolean(user.mfaEnabled) }, safeAfter: { enrollmentPending: true },
    ipAddress: req.ip, userAgent: req.get?.('user-agent'),
  });

  res.json({
    secret: base32,
    otpauthUrl,
    message: 'Scan the QR code or enter the secret in your authenticator app, then confirm with a 6-digit code.',
  });
};

/**
 * Confirms MFA enrollment with a verified TOTP code challenge.
 * Activates MFA and returns single-use recovery codes (shown only once).
 */
exports.confirmMfa = async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Verification code is required' });

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.mfaLockUntil && user.mfaLockUntil > Date.now()) {
    return res.status(429).json({ error: 'Account temporarily locked due to failed MFA attempts. Please try again later.' });
  }
  if (!user.mfaPendingSecret) {
    return res.status(400).json({ error: 'No MFA enrollment in progress. Please start enrollment first.' });
  }

  let plainSecret;
  try {
    plainSecret = decryptMfaSecret(user.mfaPendingSecret);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to decrypt pending MFA secret' });
  }

  const verifyResult = totp.verifyTotpCode(code, plainSecret);
  if (!verifyResult.valid) {
    user.mfaFailedAttempts = (user.mfaFailedAttempts || 0) + 1;
    if (user.mfaFailedAttempts >= 5) {
      user.mfaLockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await user.save();

    await emitAuditEvent({
      correlationId: getCorrelationId(req),
      actorUserId: user.id,
      action: 'ADMIN_MFA_CHALLENGE_FAILED',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      status: 'FAILURE',
      details: { reason: verifyResult.error || 'INVALID_CODE', context: 'enrollment_confirm' },
    });

    return res.status(400).json({ error: 'Invalid verification code. Please check your authenticator app.' });
  }

  // Generate 8 single-use recovery codes
  const { plainCodes, hashedCodes } = totp.generateRecoveryCodes(8);

  user.mfaSecret = user.mfaPendingSecret;
  user.mfaPendingSecret = null;
  user.mfaEnabled = true;
  user.mfaRecoveryCodes = JSON.stringify(hashedCodes);
  user.mfaFailedAttempts = 0;
  user.mfaLockUntil = null;
  user.mfaLastTimeStep = verifyResult.timeStep;
  await user.save();

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: user.id,
    action: 'ADMIN_MFA_ENROLLED',
    resource: 'User',
    resourceId: user.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: { recoveryCodesCount: plainCodes.length },
  });

  res.json({
    success: true,
    message: 'MFA enabled successfully. Store your recovery codes safely; they will not be shown again.',
    recoveryCodes: plainCodes,
  });
};

/**
 * Disables MFA for administrator. Requires recent authentication and password verification.
 */
exports.disableMfa = async (req, res) => {
  const { password, code } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required to disable MFA' });

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ error: 'Invalid password' });
  }

  if (user.mfaEnabled && code) {
    let plainSecret;
    try {
      plainSecret = decryptMfaSecret(user.mfaSecret);
    } catch (_e) {}

    if (plainSecret) {
      const verify = totp.verifyTotpCode(code, plainSecret);
      if (!verify.valid) {
        return res.status(400).json({ error: 'Invalid MFA verification code' });
      }
    }
  }

  user.mfaEnabled = false;
  user.mfaSecret = null;
  user.mfaPendingSecret = null;
  user.mfaRecoveryCodes = null;
  user.mfaFailedAttempts = 0;
  user.mfaLockUntil = null;
  await user.save();

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: user.id,
    action: 'ADMIN_MFA_DISABLED',
    resource: 'User',
    resourceId: user.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
  });

  res.json({ success: true, message: 'MFA has been disabled' });
};

/**
 * Regenerates single-use recovery codes, invalidating all prior codes.
 * Requires recent authentication.
 */
exports.regenerateRecoveryCodes = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!user.mfaEnabled) {
    return res.status(400).json({ error: 'MFA is not enabled on this account' });
  }

  const { plainCodes, hashedCodes } = totp.generateRecoveryCodes(8);
  user.mfaRecoveryCodes = JSON.stringify(hashedCodes);
  await user.save();

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: user.id,
    action: 'ADMIN_RECOVERY_CODES_REGENERATED',
    resource: 'User',
    resourceId: user.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: { recoveryCodesCount: plainCodes.length },
  });

  res.json({
    success: true,
    message: 'New recovery codes generated. All previous recovery codes have been invalidated.',
    recoveryCodes: plainCodes,
  });
};

/**
 * Step-up / Re-authentication endpoint.
 * Refreshes recentAuthAt timestamp for the current session.
 */
exports.stepUpAuth = async (req, res) => {
  const { password, mfaToken, recoveryCode } = req.body;
  if (!password) return res.status(400).json({ error: 'Password is required for step-up authentication' });

  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Rate limit / Lock check
  if (user.mfaLockUntil && user.mfaLockUntil > Date.now()) {
    return res.status(429).json({
      error: 'Account temporarily locked due to failed MFA attempts. Please try again later.',
      lockUntil: user.mfaLockUntil,
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ error: 'Invalid password' });
  }

  // If user has MFA enabled, verify TOTP token or recovery code
  if (user.mfaEnabled) {
    if (!mfaToken && !recoveryCode) {
      return res.status(400).json({
        error: 'MFA code or recovery code is required for step-up authentication',
        code: 'MFA_CODE_REQUIRED',
      });
    }

    let mfaPassed = false;

    if (recoveryCode) {
      const storedCodes = JSON.parse(user.mfaRecoveryCodes || '[]');
      const recResult = totp.verifyRecoveryCode(recoveryCode, storedCodes);
      if (recResult.valid) {
        storedCodes[recResult.matchedIndex].usedAt = new Date().toISOString();
        user.mfaRecoveryCodes = JSON.stringify(storedCodes);
        mfaPassed = true;

        await emitAuditEvent({
          correlationId: getCorrelationId(req),
          actorUserId: user.id,
          action: 'ADMIN_RECOVERY_CODE_USED',
          resource: 'User',
          resourceId: user.id,
          ipAddress: req.ip,
          status: 'SUCCESS',
          details: { context: 'step_up' },
        });
      }
    } else if (mfaToken) {
      const plainSecret = decryptMfaSecret(user.mfaSecret);
      const totpResult = totp.verifyTotpCode(mfaToken, plainSecret, {
        lastTimeStep: user.mfaLastTimeStep,
      });

      if (totpResult.valid) {
        user.mfaLastTimeStep = totpResult.timeStep;
        user.mfaFailedAttempts = 0;
        mfaPassed = true;
      }
    }

    if (!mfaPassed) {
      user.mfaFailedAttempts = (user.mfaFailedAttempts || 0) + 1;
      if (user.mfaFailedAttempts >= 5) {
        user.mfaLockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      await emitAuditEvent({
        correlationId: getCorrelationId(req),
        actorUserId: user.id,
        action: 'ADMIN_MFA_CHALLENGE_FAILED',
        resource: 'User',
        resourceId: user.id,
        ipAddress: req.ip,
        status: 'FAILURE',
        details: { context: 'step_up' },
      });

      return res.status(400).json({ error: 'Invalid MFA verification code' });
    }
  }

  user.mfaFailedAttempts = 0;
  user.mfaLockUntil = null;
  await user.save();

  // Find or determine active session
  let sessionId = req.user.sessionId;
  if (!sessionId && req.cookies?.userRefreshToken) {
    const tokenHash = sessionManager.hashToken(req.cookies.userRefreshToken);
    const existingSession = await UserSession.findOne({
      where: { userId: user.id, tokenHash, revokedAt: null },
    });
    if (existingSession) sessionId = existingSession.id;
  }

  if (sessionId) {
    await sessionManager.updateRecentAuth(sessionId);
  }

  const nowIso = new Date().toISOString();
  // Generate updated access token with recentAuthAt
  const newAccessToken = generateAccessToken({
    id: user.id,
    role: user.role,
    sessionId: sessionId || undefined,
    recentAuthAt: nowIso,
  });

  res.cookie('userAccessToken', newAccessToken, {
    ...cookieConfig,
    maxAge: 15 * 60 * 1000,
  });

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: user.id,
    action: 'ADMIN_RECENT_AUTH_STEP_UP',
    resource: 'User',
    resourceId: user.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
  });

  res.json({
    success: true,
    recentAuthAt: nowIso,
    accessToken: newAccessToken,
    message: 'Recent authentication verified successfully',
  });
};

/**
 * Lists active sessions for current administrator (Session Inventory).
 * Raw tokens and hashes are never exposed.
 */
exports.listSessions = async (req, res) => {
  let currentSessionId = req.user.sessionId || null;
  if (!currentSessionId && req.cookies?.userRefreshToken) {
    const tokenHash = sessionManager.hashToken(req.cookies.userRefreshToken);
    const current = await UserSession.findOne({
      where: { userId: req.user.id, tokenHash, revokedAt: null },
      attributes: ['id'],
    });
    if (current) currentSessionId = current.id;
  }

  const sessions = await sessionManager.listUserSessions(req.user.id, currentSessionId);
  res.json({ data: sessions });
};

/**
 * Revokes a specific session by ID.
 */
exports.revokeSession = async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) return res.status(400).json({ error: 'Session ID is required' });

  const success = await sessionManager.revokeSession(sessionId, req.user.id);
  if (!success) {
    return res.status(404).json({ error: 'Session not found or already revoked' });
  }

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: req.user.id,
    action: 'ADMIN_SESSION_REVOKED',
    resource: 'UserSession',
    resourceId: sessionId,
    ipAddress: req.ip,
    status: 'SUCCESS',
  });

  // If current session was revoked, clear cookies
  if (req.user.sessionId === sessionId) {
    res.clearCookie('userAccessToken', cookieConfig);
    res.clearCookie('userRefreshToken', cookieConfig);
  }

  res.json({ success: true, message: 'Session revoked successfully' });
};

/**
 * Revokes all other sessions for the administrator.
 * Requires recent authentication.
 */
exports.revokeAllOtherSessions = async (req, res) => {
  let currentSessionId = req.user.sessionId || null;
  if (!currentSessionId && req.cookies?.userRefreshToken) {
    const tokenHash = sessionManager.hashToken(req.cookies.userRefreshToken);
    const current = await UserSession.findOne({
      where: { userId: req.user.id, tokenHash, revokedAt: null },
      attributes: ['id'],
    });
    if (current) currentSessionId = current.id;
  }

  const revokedCount = await sessionManager.revokeAllOtherSessions(req.user.id, currentSessionId);

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: req.user.id,
    action: 'ADMIN_GLOBAL_SESSIONS_REVOKED',
    resource: 'UserSession',
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: { revokedCount },
  });

  res.json({
    success: true,
    revokedCount,
    message: `Successfully revoked ${revokedCount} other session(s)`,
  });
};

/**
 * Requests a secure contact change (email / phone).
 * Requires recent authentication.
 * Sends a 6-digit verification code to the proposed new contact.
 */
exports.requestContactChange = async (req, res) => {
  const { newEmail, newPhoneNumber } = req.body;
  if (!newEmail && !newPhoneNumber) {
    return res.status(400).json({ error: 'Either newEmail or newPhoneNumber is required' });
  }
  if (req.platformAccess && !req.body.reason) return res.status(400).json({ error: {
    code: 'VALIDATION_FAILED', message: 'A reason is required', fieldErrors: [], retryable: false } });

  if (newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (newPhoneNumber && !/^\+?[1-9]\d{1,14}$/.test(newPhoneNumber)) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }

  // Ensure new contact is not already claimed by another user
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (newEmail && newEmail !== user.email) {
    const existing = await User.findOne({ where: { email: newEmail } });
    if (existing) {
      // Return safe message without exposing whether user exists
      return res.status(400).json({ error: 'Cannot update to requested email address' });
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const salt = crypto.randomBytes(16).toString('hex');
  const otpHash = crypto.createHash('sha256').update(`${salt}:${otp}`).digest('hex');

  user.pendingContact = JSON.stringify({
    newEmail: newEmail || null,
    newPhoneNumber: newPhoneNumber || null,
    otpHash,
    salt,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
  });
  await user.save();

  let approval = null;
  if (req.platformAccess) {
    approval = await approvalService.propose({ action: 'platform.identity.change', targetType: 'User',
      targetId: user.id, scopeType: 'platform', scopeId: null, actorUserId: user.id,
      actorRole: req.platformAccess.roles[0], reason: req.body.reason,
      sourceCaseId: req.body.sourceCaseId, requestedChange: contactChangeDescriptor({ newEmail, newPhoneNumber }),
      correlationId: getCorrelationId(req) });
  }

  if (newEmail && process.env.NODE_ENV !== 'test') {
    try {
      await sendEmail(
        newEmail,
        'Rentify Security: Verify Your New Administrator Email',
        `<p>Your verification code to update your administrator email is: <strong>${otp}</strong>.</p><p>This code expires in 10 minutes.</p>`
      );
    } catch (_e) {
      // In development, proceed
    }
  }

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: user.id,
    action: 'ADMIN_CONTACT_CHANGE_REQUESTED',
    resource: 'User',
    resourceId: user.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: { hasNewEmail: Boolean(newEmail), hasNewPhone: Boolean(newPhoneNumber) },
    actorRoles: req.platformAccess?.roles, effectivePermissions: req.platformAccess?.effectivePermissions,
    reason: req.body.reason || 'Administrator contact change requested', sourceCaseId: req.body.sourceCaseId,
    tenantScope: req.platformAccess?.tenantScope || 'self/*', approvalRequestId: approval?.id,
    safeBefore: { contactChangePending: false }, safeAfter: { contactChangePending: true,
      hasNewEmail: Boolean(newEmail), hasNewPhone: Boolean(newPhoneNumber) },
  });

  res.json({
    success: true,
    message: 'Verification code sent to the requested contact address',
    ...(approval ? { approvalRequestId: approval.id, approvalStatus: approval.status } : {}),
    // In test environment, expose OTP for automated testing convenience
    ...(process.env.NODE_ENV === 'test' ? { testOtp: otp } : {}),
  });
};

/**
 * Verifies and applies a secure contact change.
 * Requires recent authentication and correct verification code.
 */
exports.verifyContactChange = async (req, res) => {
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'Verification code is required' });

  const user = await User.findByPk(req.user.id);
  if (!user || !user.pendingContact) {
    return res.status(400).json({ error: 'No contact change request pending' });
  }

  let pending;
  try {
    pending = JSON.parse(user.pendingContact);
  } catch (_e) {
    return res.status(400).json({ error: 'Malformed pending contact state' });
  }

  if (Date.now() > pending.expiresAt) {
    user.pendingContact = null;
    await user.save();
    return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
  }

  const candidateHash = crypto.createHash('sha256').update(`${pending.salt}:${String(otp).trim()}`).digest('hex');
  if (candidateHash !== pending.otpHash) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  let approval = null;
  if (req.platformAccess) {
    try {
      approval = await approvalService.consume({ approvalId: req.body.approvalRequestId,
        action: 'platform.identity.change', targetType: 'User', targetId: user.id,
        requestedChange: contactChangeDescriptor(pending) });
    } catch (error) {
      return res.status(error.code === 'APPROVAL_REQUIRED' ? 403 : 409).json({ error: {
        code: error.code, message: error.message, fieldErrors: [], retryable: false } });
    }
  }

  // Apply contact change
  const oldEmail = user.email;
  if (pending.newEmail) user.email = pending.newEmail;
  if (pending.newPhoneNumber) user.phoneNumber = pending.newPhoneNumber;
  user.pendingContact = null;
  await user.save();

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: user.id,
    action: 'ADMIN_CONTACT_CHANGE_VERIFIED',
    resource: 'User',
    resourceId: user.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    details: { updatedEmail: Boolean(pending.newEmail), updatedPhone: Boolean(pending.newPhoneNumber) },
    actorRoles: req.platformAccess?.roles, effectivePermissions: req.platformAccess?.effectivePermissions,
    reason: req.body.reason || 'Approved administrator contact change executed',
    sourceCaseId: req.body.sourceCaseId, tenantScope: req.platformAccess?.tenantScope || 'self/*',
    approvalRequestId: approval?.id, safeBefore: { contactChangePending: true },
    safeAfter: { contactChangePending: false, updatedEmail: Boolean(pending.newEmail),
      updatedPhone: Boolean(pending.newPhoneNumber) },
  });

  res.json({
    success: true,
    message: 'Contact details updated successfully',
    user: { id: user.id, email: user.email, phoneNumber: user.phoneNumber },
  });
};

/**
 * Updates a user's platform role.
 * Requires recent authentication.
 * Role-elevation protection:
 * - Demoting an admin immediately revokes all their active sessions.
 * - Non-admins cannot invoke this endpoint.
 */
exports.updateUserRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be "user" or "admin"' });
  }

  const targetUser = await User.findByPk(userId);
  if (!targetUser) return res.status(404).json({ error: 'Target user not found' });

  const previousRole = targetUser.role;
  let approval = null;
  if (req.platformAccess) {
    try {
      approval = await approvalService.consume({ approvalId: req.body.approvalRequestId,
        action: 'platform.role.change', targetType: 'User', targetId: userId,
        requestedChange: { operation: 'legacy_role_change', previousRole, role } });
    } catch (error) {
      return res.status(error.code === 'APPROVAL_REQUIRED' ? 403 : 409).json({ error: {
        code: error.code, message: error.message, fieldErrors: [], retryable: false } });
    }
  }
  targetUser.role = role;
  await targetUser.save();

  // Any privilege change invalidates existing authorization snapshots.
  await sessionManager.revokeAllUserSessions(targetUser.id);

  await emitAuditEvent({
    correlationId: getCorrelationId(req),
    actorUserId: req.user.id,
    action: 'ADMIN_ROLE_CHANGE',
    resource: 'User',
    resourceId: targetUser.id,
    ipAddress: req.ip,
    status: 'SUCCESS',
    actorRoles: req.platformAccess?.roles,
    effectivePermissions: req.platformAccess?.effectivePermissions,
    reason: req.body.reason,
    sourceCaseId: req.body.sourceCaseId,
    tenantScope: req.platformAccess?.tenantScope,
    approvalRequestId: approval?.id,
    breakGlassGrantId: req.platformAccess?.breakGlassGrantId,
    safeBefore: { role: previousRole },
    safeAfter: { role },
    details: { previousRole, newRole: role },
  });

  res.json({
    success: true,
    message: `User role updated from ${previousRole} to ${role}`,
    user: { id: targetUser.id, role: targetUser.role },
  });
};
