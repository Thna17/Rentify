// modules/inventory/inventoryErrors.js
// P3-INV-001: Explicit domain error classes for inventory ledger invariants.

class InventoryError extends Error {
  constructor(message, { code = 'INVENTORY_ERROR', statusCode = 400, details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

class InsufficientStockError extends InventoryError {
  constructor(message = 'Insufficient available stock for this operation', details = null) {
    super(message, { code: 'INSUFFICIENT_STOCK', statusCode: 409, details });
  }
}

class InvalidInventoryStateError extends InventoryError {
  constructor(message = 'Invalid inventory state or invariant violation', details = null) {
    super(message, { code: 'INVALID_INVENTORY_STATE', statusCode: 400, details });
  }
}

class InventoryStoreMismatchError extends InventoryError {
  constructor(message = 'Store ownership violation for SKU inventory', details = null) {
    super(message, { code: 'INVENTORY_STORE_MISMATCH', statusCode: 403, details });
  }
}

module.exports = {
  InventoryError,
  InsufficientStockError,
  InvalidInventoryStateError,
  InventoryStoreMismatchError,
};
