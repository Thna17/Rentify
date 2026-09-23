const bcrypt = require("bcrypt");
const crypto = require("crypto");

// JWTs are longer than bcrypt's 72-byte input limit. Hashing their fixed-size
// digest first prevents distinct refresh tokens with the same prefix comparing
// as equal.
const digest = (token) => crypto.createHash("sha256").update(token).digest("hex");
const hashRefreshToken = (token) => bcrypt.hash(digest(token), 10);
const compareRefreshToken = (token, hash) => bcrypt.compare(digest(token), hash);

module.exports = { hashRefreshToken, compareRefreshToken };
