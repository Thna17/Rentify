const sanitizeData = (data) => {
  const sensitiveFields = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'otp', 'refreshToken', 'accessToken'];
  const sanitized = { ...data };

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

module.exports = { sanitizeData };