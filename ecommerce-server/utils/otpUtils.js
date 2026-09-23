// otpUtils.js
const crypto = require("crypto"); 
function generateOtp() {
  const buffer = crypto.randomBytes(3);
  return parseInt(buffer.toString('hex'), 16).toString().substring(0, 6);
  }
  
  module.exports = { generateOtp };
  