const bcrypt = require("bcrypt");
const crypto = require("crypto");

// JWTs exceed bcrypt's 72-byte input limit; digest before bcrypt so a shared
// prefix can never make two different refresh tokens compare as equal.
const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");
const hashRefreshToken = (token) => bcrypt.hash(digest(token), 10);
const compareRefreshToken = (token, hash) => bcrypt.compare(digest(token), hash);

module.exports = { hashRefreshToken, compareRefreshToken };
