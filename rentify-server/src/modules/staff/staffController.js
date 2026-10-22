const StaffAuthService = require("./staffAuthService");
const { Staff, Store, User, Website } = require("../../models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const staffAuthService = new StaffAuthService();
const { ApiError } = require("../../utils/errors");
const responseHandler = require("../../utils/responseHandler");
const NotificationService = require("../notifications").notificationService;
const notificationService = new NotificationService("staff");
const staffInvitationEmail = require("./emails/staffInvitationEmail");
const { Op } = require("sequelize");

const VALID_PERMISSIONS = [
  "manage_products",
  "manage_orders",
  "manage_invoices",
  "manage_pos",
  "manage_analytics",
  "manage_settings",
  "manage_staff",
];

function validatePermissionDelegation(caller, targetPermissions) {
  if (!targetPermissions) return;
  if (!Array.isArray(targetPermissions)) {
    throw new ApiError(400, "Permissions must be an array");
  }
  for (const perm of targetPermissions) {
    if (!VALID_PERMISSIONS.includes(perm)) {
      throw new ApiError(400, `Invalid permission specified: ${perm}`);
    }
  }
  if (caller?.role === "staff") {
    const callerPerms = new Set(caller.permissions || []);
    const unheld = targetPermissions.filter((p) => !callerPerms.has(p));
    if (unheld.length > 0) {
      throw new ApiError(
        403,
        `Cannot grant permissions you do not hold: ${unheld.join(", ")}`
      );
    }
  }
}

function validateNoRoleEscalation(caller, body) {
  if (body.role && body.role !== "staff") {
    throw new ApiError(
      403,
      "Staff cannot be promoted to owner or administrator"
    );
  }
  if (body.merchantId && caller?.role !== "admin" && body.merchantId !== caller?.id) {
    throw new ApiError(403, "Cannot invite staff for another merchant");
  }
  if (body.ownerUserId && caller?.role !== "admin" && body.ownerUserId !== caller?.id) {
    throw new ApiError(403, "Cannot transfer store ownership or modify merchant identity");
  }
}

async function resolveCallerAndStore(req, { write = false, targetStaff = null } = {}) {
  const transaction = req.transaction;
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized");
  }

  if (req.user.status === "suspended" || req.user.isActive === false) {
    throw new ApiError(403, "Account is suspended");
  }

  let store = null;

  if (targetStaff) {
    let targetStoreId = targetStaff.storeId;
    if (!targetStoreId && targetStaff.merchantId) {
      const merchantStore = await Store.findOne({
        where: { ownerUserId: targetStaff.merchantId },
        transaction,
      });
      targetStoreId = merchantStore?.id;
    }

    if (!targetStoreId) {
      throw new ApiError(404, "Staff not found");
    }

    store = await Store.findByPk(targetStoreId, { transaction });
    if (!store) {
      throw new ApiError(404, "Staff not found");
    }

    // Verify caller authority over target store
    if (req.user.role === "admin") {
      // Platform admin override
    } else if (req.user.role === "staff") {
      const callerBelongsToStore =
        (req.user.storeId && req.user.storeId === store.id) ||
        req.user.merchantId === store.ownerUserId;

      if (!callerBelongsToStore) {
        throw new ApiError(404, "Staff not found"); // Anti-enumeration!
      }

      const permissions = new Set(req.user.permissions || []);
      if (!permissions.has("manage_staff")) {
        throw new ApiError(403, "Staff management permission required");
      }
    } else {
      // Store owner / merchant caller
      if (store.ownerUserId !== req.user.id) {
        throw new ApiError(404, "Staff not found"); // Anti-enumeration!
      }
    }
  } else {
    // Store-level actions (list, create, invite)
    const requestedStoreId = req.query?.storeId || req.body?.storeId;

    if (req.user.role === "admin") {
      if (requestedStoreId) {
        store = await Store.findByPk(requestedStoreId, { transaction });
      } else if (req.body?.merchantId) {
        store = await Store.findOne({
          where: { ownerUserId: req.body.merchantId },
          transaction,
        });
      }
    } else if (req.user.role === "staff") {
      const permissions = new Set(req.user.permissions || []);
      if (!permissions.has("manage_staff")) {
        throw new ApiError(403, "Staff management permission required");
      }

      let callerStoreId = req.user.storeId;
      if (!callerStoreId) {
        const callerRecord = await Staff.findByPk(req.user.id, { transaction });
        callerStoreId = callerRecord?.storeId;
      }
      if (!callerStoreId && req.user.merchantId) {
        const merchantStore = await Store.findOne({
          where: { ownerUserId: req.user.merchantId },
          transaction,
        });
        callerStoreId = merchantStore?.id;
      }

      if (!callerStoreId) {
        throw new ApiError(404, "Store not found for this staff member");
      }

      if (requestedStoreId && requestedStoreId !== callerStoreId) {
        throw new ApiError(403, "You do not have access to this store");
      }

      store = await Store.findByPk(callerStoreId, { transaction });
      if (!store) {
        throw new ApiError(404, "Store not found");
      }
    } else {
      // Store owner caller
      if (requestedStoreId) {
        store = await Store.findByPk(requestedStoreId, { transaction });
        if (!store || store.ownerUserId !== req.user.id) {
          throw new ApiError(403, "You do not have access to this store");
        }
      } else {
        store = await Store.findOne({
          where: { ownerUserId: req.user.id },
          transaction,
        });
        if (!store) {
          throw new ApiError(404, "Store not found for this merchant");
        }
      }
    }
  }

  if (store && write && store.status !== "active") {
    throw new ApiError(403, "Store is suspended");
  }

  const websiteId = req.query?.websiteId || req.body?.websiteId;
  if (websiteId && store) {
    const website = await Website.findByPk(websiteId, { transaction });
    if (!website || website.storeId !== store.id) {
      throw new ApiError(400, "Website does not belong to the target store");
    }
  }

  return { store };
}

exports.createStaff = async (req, res) => {
  const transaction = req.transaction;
  const { name, email, phoneNumber, password, permissions, websiteId: bodyWebsiteId } = req.body;

  validateNoRoleEscalation(req.user, req.body);
  const { store } = await resolveCallerAndStore(req, { write: true });
  validatePermissionDelegation(req.user, permissions || []);

  let website = null;
  if (bodyWebsiteId) {
    website = await Website.findByPk(bodyWebsiteId, { transaction });
    if (!website || website.storeId !== store.id) {
      throw new ApiError(400, "Website does not belong to the target store");
    }
  }

  const result = await staffAuthService.signup(
    {
      merchantId: store.ownerUserId,
      storeId: store.id,
      websiteId: website?.id || null,
      ...req.body,
    },
    transaction
  );

  responseHandler.success(
    res,
    201,
    {
      staffId: result.entity.id,
    },
    "Staff created successfully"
  );
};

exports.listStaff = async (req, res) => {
  const transaction = req.transaction;
  const { store } = await resolveCallerAndStore(req, { write: false });

  const staff = await Staff.findAll({
    where: {
      [Op.or]: [
        { storeId: store.id },
        { merchantId: store.ownerUserId, storeId: null },
      ],
    },
    attributes: { exclude: ["password", "refreshToken", "otp"] },
    order: [["createdAt", "ASC"]],
    transaction,
  });

  res.json(staff);
};

exports.staffLogin = async (req, res) => {
  const transaction = req.transaction;
  const { email, phoneNumber, password, storeId } = req.body;

  const result = await staffAuthService.login({
    email,
    phoneNumber,
    password,
    storeId,
    transaction,
  });

  staffAuthService.setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  responseHandler.success(
    res,
    200,
    {
      staff: result.entity,
      accessToken: result.accessToken,
    },
    "Staff login successful"
  );
};

exports.validateStaffToken = async (req, res) => {
  const transaction = req.transaction;
  const { accessToken, refreshToken } = req.body;

  if (!accessToken && !refreshToken) {
    throw new ApiError(401, "No token provided");
  }

  const result = await staffAuthService.validateToken(
    accessToken,
    refreshToken,
    transaction
  );

  if (!result.valid) {
    throw new ApiError(401, result.error);
  }

  const staff = await Staff.findByPk(result.entity.id, {
    attributes: ["permissions", "merchantId", "websiteId", "storeId", "isActive"],
    transaction,
  });

  if (!staff || !staff.isActive) {
    throw new ApiError(403, "Staff access is inactive");
  }

  res.status(200).json({
    ...result,
    entity: {
      ...result.entity,
      merchantId: staff.merchantId,
      websiteId: staff.websiteId,
      storeId: staff.storeId,
    },
    permissions: staff.permissions,
  });
};

exports.resendOtp = async (req, res) => {
  const transaction = req.transaction;
  const { email, phoneNumber, verificationMethod } = req.body;

  const result = await staffAuthService.resendOtp({
    email,
    phoneNumber,
    verificationMethod,
    transaction,
  });

  res.status(200).json(result);
};

exports.verifyOtp = async (req, res) => {
  const transaction = req.transaction;
  const { email, phoneNumber, otp, verificationMethod } = req.body;

  const result = await staffAuthService.verifyOtp({
    email,
    phoneNumber,
    otp,
    verificationMethod,
    transaction,
  });

  staffAuthService.setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  res.status(200).json({
    message: "Staff account verified",
    accessToken: result.accessToken,
    staff: {
      id: result.entity.id,
      name: result.entity.name,
      email: result.entity.email,
      storeId: result.entity.storeId,
      permissions: result.entity.permissions,
    },
  });
};

exports.forgotPassword = async (req, res) => {
  const transaction = req.transaction;
  const { email, phoneNumber } = req.body;

  const result = await staffAuthService.forgotPassword({
    email,
    phoneNumber,
    transaction,
  });

  res.status(200).json(result);
};

exports.resetPassword = async (req, res) => {
  const transaction = req.transaction;
  const { token, password } = req.body;

  const result = await staffAuthService.resetPassword({
    token,
    password,
    transaction,
  });

  res.status(200).json(result);
};

exports.refreshToken = async (req, res) => {
  const transaction = req.transaction;
  const refreshToken = req.cookies.staffRefreshToken;

  const result = await staffAuthService.refreshToken({
    refreshToken,
    transaction,
  });

  staffAuthService.setAuthCookies(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  res.status(200).json({
    accessToken: result.accessToken,
    message: "Token refreshed",
  });
};

exports.logout = async (req, res) => {
  const transaction = req.transaction;
  const refreshToken = req.cookies.staffRefreshToken;

  await staffAuthService.logout({
    refreshToken,
    transaction,
  });

  staffAuthService.clearAuthCookies(res);

  res.status(200).json({ message: "Logout successful" });
};

exports.getStaffById = async (req, res) => {
  const transaction = req.transaction;
  const staffId = req.params.id;

  const staff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["password", "refreshToken", "otp"] },
    transaction,
  });

  if (!staff) {
    throw new ApiError(404, "Staff not found");
  }

  // resolveCallerAndStore verifies caller authority and returns 404 for unrelated / cross-store callers
  await resolveCallerAndStore(req, { write: false, targetStaff: staff });

  res.status(200).json(staff);
};

exports.getStaffProfile = async (req, res) => {
  const transaction = req.transaction;
  const staffId = req.staff?.id || req.user?.id;

  const staff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["password", "refreshToken", "otp"] },
    transaction,
  });

  if (!staff || !staff.isActive) {
    throw new ApiError(403, "Staff access is inactive");
  }

  res.status(200).json(staff);
};

exports.sendStaffInvitation = async (req, res) => {
  const transaction = req.transaction;
  const { name, contact, contactMethod, permissions, websiteId: bodyWebsiteId } = req.body;

  if (!name || !contact || !contactMethod || !permissions) {
    throw new ApiError(400, "Missing required fields");
  }

  if (!["email", "phone"].includes(contactMethod)) {
    throw new ApiError(400, "Invalid contact method");
  }

  if (contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
    throw new ApiError(400, "Invalid email format");
  }

  if (contactMethod === "phone" && !/^\+?[1-9]\d{1,14}$/.test(contact)) {
    throw new ApiError(400, "Invalid phone number format");
  }

  validateNoRoleEscalation(req.user, req.body);
  const { store } = await resolveCallerAndStore(req, { write: true });
  validatePermissionDelegation(req.user, permissions);

  let website = null;
  if (bodyWebsiteId) {
    website = await Website.findByPk(bodyWebsiteId, { transaction });
    if (!website || website.storeId !== store.id) {
      throw new ApiError(400, "Website does not belong to the target store");
    }
  }

  const normContact = contactMethod === "email" ? contact.trim().toLowerCase() : contact.trim();
  const where = {
    storeId: store.id,
    ...(contactMethod === "email" ? { email: normContact } : { phoneNumber: normContact }),
  };

  const existingStaff = await Staff.findOne({ where, transaction });
  if (existingStaff) {
    throw new ApiError(400, "Staff member already exists for this store");
  }

  const invitationToken = crypto.randomBytes(32).toString("hex");
  const staff = await Staff.create(
    {
      merchantId: store.ownerUserId,
      storeId: store.id,
      websiteId: website?.id || null,
      name: name.trim(),
      [contactMethod === "email" ? "email" : "phoneNumber"]: normContact,
      permissions,
      isActive: false,
      isVerified: false,
      invitationToken,
      invitationSentAt: new Date(),
      invitationMethod: contactMethod,
    },
    { transaction }
  );

  try {
    if (contactMethod === "email") {
      await sendEmailInvitation(normContact, invitationToken, name.trim());
    } else {
      await sendTelegramInvitation(normContact, invitationToken);
    }
  } catch (_notifErr) {
    // Non-fatal if notification service is not reachable
  }

  responseHandler.success(
    res,
    200,
    { staffId: staff.id, invitationToken },
    "Invitation sent successfully"
  );
};

const sendEmailInvitation = async (email, token, name) => {
  const invitationLink = `${process.env.FRONTEND_URL || "https://rentifymarket.com"}/staff/accept-invitation?token=${token}`;
  const html = staffInvitationEmail(name, invitationLink);

  await notificationService.send({
    channel: "email",
    recipient: email,
    message: html,
    options: { subject: "Staff Invitation" },
  });
};

const sendTelegramInvitation = async (phone, token) => {
  const botLink = "https://t.me/your_bot_name";
  const message = `You've been invited! Connect to our bot: ${botLink} and use code: ${token}`;

  await notificationService.send({
    channel: "telegram",
    recipient: phone,
    message,
    options: { subject: "Staff Invite" },
  });
};

exports.acceptStaffInvitation = async (req, res) => {
  const transaction = req.transaction;
  const { token, password, contact, email, phoneNumber } = req.body;

  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  if (!password || password.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }

  const staff = await Staff.findOne({
    where: {
      invitationToken: token,
      invitationSentAt: {
        [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days expiry
      },
    },
    transaction,
  });

  if (!staff) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  // Intended contact verification
  const providedContact = (contact || email || phoneNumber || "").trim().toLowerCase();
  if (providedContact) {
    const staffEmail = (staff.email || "").trim().toLowerCase();
    const staffPhone = (staff.phoneNumber || "").trim().toLowerCase();
    if (providedContact !== staffEmail && providedContact !== staffPhone) {
      throw new ApiError(403, "Contact does not match invitation recipient");
    }
  }

  // Store suspension check
  if (staff.storeId) {
    const store = await Store.findByPk(staff.storeId, { transaction });
    if (store && store.status !== "active") {
      throw new ApiError(403, "Store is suspended");
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  staff.password = hashedPassword;
  staff.isActive = true;
  staff.isVerified = true;
  staff.invitationToken = null; // Single-use!
  await staff.save({ transaction });

  const tokens = staffAuthService.generateTokens(staff);

  responseHandler.success(
    res,
    200,
    {
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        storeId: staff.storeId,
        permissions: staff.permissions,
      },
      accessToken: tokens.accessToken,
    },
    "Staff account activated successfully"
  );
};

exports.updateStaff = async (req, res) => {
  const transaction = req.transaction;
  const staffId = req.params.id;

  const staff = await Staff.findByPk(staffId, { transaction });
  if (!staff) {
    throw new ApiError(404, "Staff not found");
  }

  await resolveCallerAndStore(req, { write: true, targetStaff: staff });

  validateNoRoleEscalation(req.user, req.body);

  if (req.body.permissions !== undefined) {
    if (req.user.id === staff.id) {
      throw new ApiError(403, "Staff cannot modify their own permissions");
    }
    validatePermissionDelegation(req.user, req.body.permissions);
    staff.permissions = req.body.permissions;
  }

  if (req.body.name !== undefined) {
    staff.name = req.body.name.trim();
  }

  if (req.body.isActive !== undefined) {
    staff.isActive = Boolean(req.body.isActive);
    if (!staff.isActive) {
      // Session revocation: clear refresh tokens
      staff.refreshToken = null;
      staff.refreshTokenExpires = null;
    }
  }

  await staff.save({ transaction });

  const responseStaff = staff.toJSON();
  delete responseStaff.password;
  delete responseStaff.refreshToken;
  delete responseStaff.otp;

  responseHandler.success(res, 200, responseStaff, "Staff member updated successfully");
};

exports.deleteStaff = async (req, res) => {
  const transaction = req.transaction;
  const staffId = req.params.id;

  const staff = await Staff.findByPk(staffId, { transaction });
  if (!staff) {
    throw new ApiError(404, "Staff not found");
  }

  await resolveCallerAndStore(req, { write: true, targetStaff: staff });

  if (req.user.id === staff.id) {
    throw new ApiError(403, "Staff cannot delete their own account");
  }

  staff.isActive = false;
  staff.refreshToken = null;
  staff.refreshTokenExpires = null;
  await staff.destroy({ transaction });

  responseHandler.success(
    res,
    200,
    { message: "Staff member deleted successfully" },
    "Staff member deleted successfully"
  );
};
