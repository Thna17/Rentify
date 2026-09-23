// utils/helpers.js
/**
 * Async handler to avoid try-catch blocks
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validate required fields
 */
const validateRequired = (obj, fields) => {
  const missing = fields.filter(field => !obj[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

module.exports = {
  asyncHandler,
  validateRequired
};