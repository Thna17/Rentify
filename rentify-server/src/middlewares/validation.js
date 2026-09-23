// src/middleware/validation.js
const { ERROR_CODES } = require('../config/constants');
const { logger } = require('../utils/logger');

/**
 * Validation middleware for website creation
 */
const validateCreateWebsite = (req, res, next) => {
  const { templateId, businessData, packageId } = req.body;

  // Check required fields
  if (!templateId) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Template ID is required'
    });
  }

  if (!businessData) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Business data is required'
    });
  }

  if (!businessData.name) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Business name is required'
    });
  }

  if (!businessData.email) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Business email is required'
    });
  }

  if (!businessData.contact) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Business contact information is required'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (businessData.email && !emailRegex.test(businessData.email)) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid email format'
    });
  }

  logger.debug('Website creation validation passed', {
    templateId,
    businessName: businessData.name
  });

  next();
};

/**
 * Validation for deployment requests
 */
const validateDeployment = (req, res, next) => {
  const { websiteId } = req.params;

  if (!websiteId) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Website ID is required'
    });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(websiteId)) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Invalid website ID format'
    });
  }

  next();
};

/**
 * Validation for update website status
 */
const validateUpdateWebsiteStatus = (req, res, next) => {
  const { websiteId, status } = req.body;

  if (!websiteId || !status) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Website ID and status are required'
    });
  }

  const validStatuses = ['customization', 'building', 'active', 'failed', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  next();
};

module.exports = {
  validateCreateWebsite,
  validateDeployment,
  validateUpdateWebsiteStatus
};