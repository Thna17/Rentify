// ecommerce-server/modules/orders/legacyCompatibilityErrors.js
// P3-INV-002: Error definitions for legacy website order compatibility and resolution.

class LegacyCompatibilityError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'LegacyCompatibilityError';
    this.code = code;
    this.statusCode = statusCode;
    this.status = statusCode;
  }
}

class AmbiguousWebsiteMappingError extends LegacyCompatibilityError {
  constructor(message = 'Website mapping is ambiguous and resolves to multiple or conflicting stores') {
    super('AMBIGUOUS_WEBSITE_STORE_MAPPING', message, 409);
    this.name = 'AmbiguousWebsiteMappingError';
  }
}

class UnresolvedWebsiteStoreError extends LegacyCompatibilityError {
  constructor(message = 'Website does not resolve to any active store') {
    super('UNRESOLVED_WEBSITE_STORE', message, 404);
    this.name = 'UnresolvedWebsiteStoreError';
  }
}

class AmbiguousProductSkuMappingError extends LegacyCompatibilityError {
  constructor(message = 'Ambiguous product mapping: multiple active variants exist and no variant was specified') {
    super('AMBIGUOUS_PRODUCT_SKU_MAPPING', message, 409);
    this.name = 'AmbiguousProductSkuMappingError';
  }
}

class LegacyProductNotFoundError extends LegacyCompatibilityError {
  constructor(message = 'Product not found') {
    super('PRODUCT_NOT_FOUND', message, 404);
    this.name = 'LegacyProductNotFoundError';
  }
}

class LegacyVariantNotFoundError extends LegacyCompatibilityError {
  constructor(message = 'Product variant not found') {
    super('VARIANT_NOT_FOUND', message, 404);
    this.name = 'LegacyVariantNotFoundError';
  }
}

class LegacyStoreMismatchError extends LegacyCompatibilityError {
  constructor(message = 'Item store ownership mismatch') {
    super('STORE_MISMATCH', message, 403);
    this.name = 'LegacyStoreMismatchError';
  }
}

class StoreNotActiveError extends LegacyCompatibilityError {
  constructor(message = 'Store is not active') {
    super('STORE_NOT_ACTIVE', message, 403);
    this.name = 'StoreNotActiveError';
  }
}

module.exports = {
  LegacyCompatibilityError,
  AmbiguousWebsiteMappingError,
  UnresolvedWebsiteStoreError,
  AmbiguousProductSkuMappingError,
  LegacyProductNotFoundError,
  LegacyVariantNotFoundError,
  LegacyStoreMismatchError,
  StoreNotActiveError,
};
