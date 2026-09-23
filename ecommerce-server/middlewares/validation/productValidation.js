// middlewares/validation/productValidation.js
const { body, query, param } = require('express-validator');
const { ApiError } = require('../../utils/ApiError');

const validateCreateProduct = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ max: 255 })
    .withMessage('Product name must be less than 255 characters'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  
  body('productType')
    .isIn(['physical', 'digital', 'service', 'subscription', 'food', 'beverage', 'clothing', 'cleanser', 'moisturizer'])
    .withMessage('Invalid product type'),
  
  body('stockQuantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer')
];

const validateBulkProducts = [
  body('products')
    .isArray({ min: 1 })
    .withMessage('Products must be a non-empty array'),
  
  body('products.*.name')
    .notEmpty()
    .withMessage('Each product must have a name'),
  
  body('products.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Each product must have a valid price')
];

const validateInventoryUpdate = [
  body('quantity')
    .isInt()
    .withMessage('Quantity must be an integer'),
  
  body('expectedVersion')
    .isInt({ min: 0 })
    .withMessage('Expected version must be a non-negative integer')
];

const validateBulkUpdate = [
  body('productIds')
    .isArray({ min: 1 })
    .withMessage('Product IDs must be a non-empty array'),
  
  body('operation')
    .isIn(['delete', 'status-change', 'price-update', 'inventory-update'])
    .withMessage('Invalid operation'),
  
  body('expectedVersions')
    .isArray({ min: 1 })
    .withMessage('Expected versions must be a non-empty array')
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg
    }));
    return next(ApiError.badRequest('Validation failed', errorMessages));
  }
  next();
};

module.exports = {
  validateCreateProduct,
  validateBulkProducts,
  validateInventoryUpdate,
  validateBulkUpdate,
  handleValidationErrors
};