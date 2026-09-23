const crypto = require("crypto");

const generateSessionId = () => crypto.randomBytes(16).toString("hex");

const sessionMiddleware = (req, res, next) => {
  // Always set req.sessionId from cookie or generate new
  req.sessionId = req.cookies.sessionId || generateSessionId();
  
  // Set cookie if not already set
  if (!req.cookies.sessionId) {
    res.cookie("sessionId", req.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }
  
  next();
};

module.exports = sessionMiddleware;