// ecommerce-server/modules/invoices/invoiceErrors.js
// P3-INV-002 Slice 5: Stable domain error codes for invoice fulfillment and stock mutations.

class InvoiceDomainError extends Error {
  constructor(message, code, statusCode = 400, details = null) {
    super(message);
    this.name = 'InvoiceDomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

const INVOICE_ERROR_CODES = Object.freeze({
  INVOICE_NOT_FOUND: 'INVOICE_NOT_FOUND',
  INVOICE_ALREADY_FULFILLED: 'INVOICE_ALREADY_FULFILLED',
  CANNOT_EDIT_FULFILLED_INVOICE: 'CANNOT_EDIT_FULFILLED_INVOICE',
  CANNOT_EDIT_CANCELLED_INVOICE: 'CANNOT_EDIT_CANCELLED_INVOICE',
  CANNOT_FULFILL_CANCELLED_INVOICE: 'CANNOT_FULFILL_CANCELLED_INVOICE',
  CANNOT_FULFILL_DRAFT_INVOICE: 'CANNOT_FULFILL_DRAFT_INVOICE',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  STORE_ACCESS_DENIED: 'STORE_ACCESS_DENIED',
  STORE_NOT_ACTIVE: 'STORE_NOT_ACTIVE',
  CROSS_STORE_SELECTION_PROHIBITED: 'CROSS_STORE_SELECTION_PROHIBITED',
  CROSS_STORE_ITEM_PROHIBITED: 'CROSS_STORE_ITEM_PROHIBITED',
});

module.exports = {
  InvoiceDomainError,
  INVOICE_ERROR_CODES,
};
