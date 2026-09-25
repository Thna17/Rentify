const crypto = require("crypto");
const cookieConfig = require("../config/cookieConfig");

const generateSessionId = () => crypto.randomBytes(16).toString("hex");

const sessionMiddleware = (req, res, next) => {
  req.sessionId = req.cookies?.sessionId || req.headers?.['x-session-id'] || generateSessionId();

  if (!req.cookies?.sessionId && typeof res.cookie === 'function') {
    res.cookie("sessionId", req.sessionId, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  next();
};

module.exports = sessionMiddleware;