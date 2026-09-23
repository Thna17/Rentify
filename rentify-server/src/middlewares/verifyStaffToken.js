const {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/jwtUtils");
const { Staff } = require("../models");
const { hashRefreshToken, compareRefreshToken } = require("../utils/refreshTokenHash");
const cookieConfig = require("../config/cookieConfig");

const verifyStaffToken = async (req, res, next) => {
  const staffAccessToken = req.cookies.staffAccessToken;
  const staffRefreshToken = req.cookies.staffRefreshToken;
  
  if (!staffAccessToken) {
    if (!staffRefreshToken) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    return refreshStaffAccessToken(req, res, next);
  }

  try {
    const decoded = verifyAccessToken(staffAccessToken);
    req.staff = decoded;
    next();
  } catch (err) {
    if (!staffRefreshToken) {
      clearStaffCookies(res);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    return refreshStaffAccessToken(req, res, next);
  }
};

const refreshStaffAccessToken = async (req, res, next) => {
  const staffRefreshToken = req.cookies.staffRefreshToken;

  try {
    const decoded = verifyRefreshToken(staffRefreshToken);
    const staff = await Staff.findOne({ where: { id: decoded.id } });

    if (!staff || !staff.refreshToken) {
      clearStaffCookies(res);
      return res.status(401).json({ error: "Unauthorized: Invalid refresh token" });
    }

    const isMatch = await compareRefreshToken(staffRefreshToken, staff.refreshToken);
    if (!isMatch || staff.refreshTokenExpires < Date.now()) {
      clearStaffCookies(res);
      return res.status(401).json({ error: "Unauthorized: Invalid or expired refresh token" });
    }

    const newAccessToken = generateAccessToken({id: staff.id});
    const newRefreshToken = generateRefreshToken({ id: staff.id });
    staff.refreshToken = await hashRefreshToken(newRefreshToken);
    staff.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await staff.save();
    res.cookie("staffAccessToken", newAccessToken, {
      ...cookieConfig,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("staffRefreshToken", newRefreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    req.staff = { id: staff.id };
    next();
  } catch (err) {
    clearStaffCookies(res);
    return res.status(401).json({ error: "Unauthorized: Invalid refresh token" });
  }
};

const clearStaffCookies = (res) => {
  res.clearCookie("staffAccessToken", {
    ...cookieConfig,
  });
  res.clearCookie("staffRefreshToken", {
    ...cookieConfig,
  });
};

module.exports = { verifyStaffToken };
