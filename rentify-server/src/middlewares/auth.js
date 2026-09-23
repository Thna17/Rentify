const {
  verifyAccessToken,
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/jwtUtils");
const { User } = require("../models");
const { hashRefreshToken, compareRefreshToken } = require("../utils/refreshTokenHash");
const cookieConfig = require("../config/cookieConfig");

const verifyToken = async (req, res, next) => {
  const userAccessToken = req.cookies.userAccessToken;
  const userRefreshToken = req.cookies.userRefreshToken;


  if (!userAccessToken) {
    if (!userRefreshToken) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    // Attempt token refresh
    return refreshAccessToken(req, res, next);
  }

  try {
    const decoded = verifyAccessToken(userAccessToken);
    req.user = decoded;
    
    next();
  } catch (err) {
    if (!userRefreshToken) {
      res.clearCookie("userAccessToken", {
        ...cookieConfig,
      });
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    // Attempt token refresh
    return refreshAccessToken(req, res, next);
  }
};

const refreshAccessToken = async (req, res, next) => {
  const userRefreshToken = req.cookies.userRefreshToken;

  try {
    const decoded = verifyRefreshToken(userRefreshToken);
    const user = await User.findOne({ where: { id: decoded.id } });

    if (!user || !user.refreshToken) {
      clearCookies(res);
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid refresh token" });
    }

    const isMatch = await compareRefreshToken(userRefreshToken, user.refreshToken);
    if (!isMatch || user.refreshTokenExpires < Date.now()) {
      clearCookies(res);
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid or expired refresh token" });
    }

    const newAccessToken = generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id, role: user.role });
    user.refreshToken = await hashRefreshToken(newRefreshToken);
    user.refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await user.save();
    res.cookie("userAccessToken", newAccessToken, {
      ...cookieConfig,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie("userRefreshToken", newRefreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    req.user = { id: user.id, role: user.role };
    next();
  } catch (err) {
    clearCookies(res);
    return res
      .status(401)
      .json({ error: "Unauthorized: Invalid refresh token" });
  }
};

const clearCookies = (res) => {
  res.clearCookie("userAccessToken", {
    ...cookieConfig,
  });
  res.clearCookie("userRefreshToken", {
    ...cookieConfig,
  });
};

module.exports = { verifyToken, refreshAccessToken };
