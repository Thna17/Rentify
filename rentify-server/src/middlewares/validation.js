// src/middleware/validation.js
const { ERROR_CODES } = require('../config/constants');
const { logger } = require('../utils/logger');

/**
 * Validation middleware for website creation
 */
const validateCreateWebsite = async (req, res, next) => {
  const { templateId } = req.body;
  let { businessData } = req.body;

  // Check required fields
  if (!templateId) {
    return res.status(400).json({
      success: false,
      error: ERROR_CODES.VALIDATION_ERROR,
      message: 'Template ID is required'
    });
  }

  // If upgrading from an existing Store (Dashboard checklist -> Pick template),
  // hydrate any omitted businessData fields from the merchant's Store & User record
  if (req.user?.id && (!businessData || !businessData.name || !businessData.email || !businessData.contact || !businessData.primaryCategory)) {
    try {
      const { User, Store } = require('../models');
      const [userRecord, storeRecord] = await Promise.all([
        User.findByPk(req.user.id),
        Store.findOne({ where: { ownerUserId: req.user.id } }),
      ]);
      if (userRecord || storeRecord) {
        businessData = {
          ...(businessData || {}),
          name: businessData?.name || storeRecord?.name || userRecord?.name || '',
          primaryCategory: businessData?.primaryCategory || storeRecord?.primaryCategory || 'Other',
          email: businessData?.email || userRecord?.email || `${req.user.id}@merchant.rentify.local`,
          contact: businessData?.contact || userRecord?.phoneNumber || '+855 12 000 000',
          location: businessData?.location || 'phnom-penh',
        };
        req.body.businessData = businessData;
      }
    } catch {
      // Proceed to standard validation if lookup fails
    }
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