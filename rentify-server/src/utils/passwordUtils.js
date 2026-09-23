// utils/passwordUtils.js
const zxcvbn = require('zxcvbn');

exports.validatePassword = (password) => {
  if (password.length < 10) {
    return "Password must be at least 10 characters long";
  }
  
  const requirements = [
    { pattern: /[A-Z]/, message: "Include at least one uppercase letter" },
    { pattern: /[a-z]/, message: "Include at least one lowercase letter" },
    { pattern: /[0-9]/, message: "Include at least one number" },
    { pattern: /[^A-Za-z0-9]/, message: "Include at least one special character" },
  ];

  for (const req of requirements) {
    if (!req.pattern.test(password)) {
      return req.message;
    }
  }

  const strength = zxcvbn(password);
  if (strength.score < 3) {
    return "Password is too weak. Try adding more complexity";
  }

  return null;
};