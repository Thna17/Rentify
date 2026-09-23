// src/config/constants.js
module.exports = {
  DEPLOYMENT: {
    STATUS: {
      CUSTOMIZATION: 'customization',
      BUILDING: 'building',
      ACTIVE: 'active',
      FAILED: 'failed',
      SUSPENDED: 'suspended',
      EXPIRED: 'expired',
      ARCHIVED: 'archived',
      DELETED: 'deleted',
      PENDING: 'pending'
    },
    FRAMEWORKS: {
      VITE: 'vite',
      NEXTJS: 'nextjs'
    }
  },
  SUBSCRIPTION: {
    STATUS: {
      ACTIVE: 'active',
      TRIAL: 'trial',
      EXPIRED: 'expired',
      CANCELLED: 'cancelled'
    },
    TRIAL_DURATION: 30 // days
  },
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DEPLOYMENT_FAILED: 'DEPLOYMENT_FAILED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED'
  },
  DEFAULT_COLORS: {
    PRIMARY: '#3B82F6',
    SECONDARY: '#10B981'
  },
  PACKAGE: {
    DEFAULT_ID: '278181bd-dbaa-4582-9116-f05b2320a659'
  }
};