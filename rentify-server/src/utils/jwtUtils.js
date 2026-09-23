const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (payload) => {
  // `iat` is second-granular. A unique ID makes rotation effective even when
  // two refreshes happen during the same second.
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
