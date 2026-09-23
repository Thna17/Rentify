const StaffAuthService = require("../services/staffAuthService");
const { Staff } = require("../models");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const staffAuthService = new StaffAuthService();
const { ApiError } = require("../utils/errors");
const responseHandler = require("../utils/responseHandler");
const NotificationService = require("../services/notificationService");
const notificationService = new NotificationService("staff");
const staffInvitationEmail = require("../utils/templates/staffInvitationEmail");
const { Op } = require("sequelize");
exports.createStaff = async (req, res) => {
  // Merchant creates staff member
  const transaction = req.transaction;

  const result = await staffAuthService.signup(
    {
      merchantId: req.user.id,
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
  // List all staff for current merchant
  const staff = await Staff.findAll({
    where: { merchantId: req.user.id },
    attributes: { exclude: ["password", "refreshToken"] },
    transaction,
  });

  res.json(staff);
};

exports.staffLogin = async (req, res) => {
  const transaction = req.transaction;
  const { email, phoneNumber, password } = req.body;

  const result = await staffAuthService.login({
    email,
    phoneNumber,
    password,
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

  // Include permissions in the response
  const staff = await Staff.findByPk(result.entity.id, {
    attributes: ["permissions"],
    transaction,
  });

  res.status(200).json({
    ...result,
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

  // Set authentication cookies
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

  // Update cookies with new tokens
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

  // Clear authentication cookies
  staffAuthService.clearAuthCookies(res);

  res.status(200).json({ message: "Logout successful" });
};

exports.getStaffById = async (req, res) => {
  const transaction = req.transaction;
  const staffId = req.params.id;

  const staff = await Staff.findOne({
    where: {
      id: staffId,
      merchantId: req.user.id, // Ensure merchant is only accessing their staff
    },
    attributes: { exclude: ["password", "refreshToken"] },
    transaction,
  });

  if (!staff) {
    throw new ApiError(404, "Staff not found");
  }

  res.status(200).json(staff);
};

exports.getStaffProfile = async (req, res) => {
  const transaction = req.transaction;
  const staffId = req.staff.id; // ✅ use ID from verified token

  const staff = await Staff.findByPk(staffId, {
    attributes: { exclude: ["password", "refreshToken"] },
    transaction,
  });

  if (!staff) {
    throw new ApiError(404, "Staff not found");
  }

  res.status(200).json(staff);
};

// Add to staffController
exports.sendStaffInvitation = async (req, res) => {
  const transaction = req.transaction;
  const { merchantId, name, contact, contactMethod, permissions } = req.body;

  // Validate input
  if (!name || !contact || !contactMethod || !permissions) {
    throw new ApiError(400, "Missing required fields");
  }

  // Validate contact method
  if (!["email", "phone"].includes(contactMethod)) {
    throw new ApiError(400, "Invalid contact method");
  }

  // Check for existing staff
  const where = {};
  if (contactMethod === "email") where.email = contact;
  if (contactMethod === "phone") where.phoneNumber = contact;
  where.merchantId = merchantId;

  const existingStaff = await Staff.findOne({ where, transaction });
  if (existingStaff) {
    throw new ApiError(400, "Staff member already exists");
  }

  // Create staff with pending status
  const staff = await Staff.create(
    {
      merchantId,
      name,
      [contactMethod === "email" ? "email" : "phoneNumber"]: contact,
      permissions,
      isActive: false,
      isVerified: false,
      invitationToken: crypto.randomBytes(32).toString("hex"),
      invitationSentAt: new Date(),
      invitationMethod: contactMethod,
    },
    { transaction }
  );

  // Send invitation
  if (contactMethod === "email") {
    await sendEmailInvitation(contact, staff.invitationToken, name);
  } else {
    await sendTelegramInvitation(contact, staff.invitationToken);
  }

  responseHandler.success(
    res,
    200,
    { staffId: staff.id },
    "Invitation sent successfully"
  );
};

// Helper functions
const sendEmailInvitation = async (email, token, name) => {
  const invitationLink = `${process.env.FRONTEND_URL}/staff/accept-invitation?token=${token}`;
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
  // await notificationService.send('telegram', phone, message);

  await notificationService.send({
    channel: "telegram",
    recipient: phone,
    message,
    options: { subject: "Staff Invite" },
  });
};

exports.acceptStaffInvitation = async (req, res) => {
  const transaction = req.transaction;
  const { token, password } = req.body;
  // Find staff by token
  const staff = await Staff.findOne({
    where: {
      invitationToken: token,
      invitationSentAt: {
        [Op.gt]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      }, // 7 days expiry
    },
    transaction,
  });

  if (!staff) {
    throw new ApiError(400, "Invalid or expired invitation token");
  }

  // Set password and activate
  const hashedPassword = await bcrypt.hash(password, 10);
  staff.password = hashedPassword;
  staff.isActive = true;
  staff.isVerified = true;
  staff.invitationToken = null;
  await staff.save({ transaction });

  // Generate tokens
  const tokens = staffAuthService.generateTokens(staff);

  // Return response
  responseHandler.success(
    res,
    200,
    {
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        permissions: staff.permissions,
      },
      accessToken: tokens.accessToken,
    },
    "Staff account activated successfully"
  );
};

// Add updateStaff, deleteStaff, etc.
