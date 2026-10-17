export function hasPermission(subject, permission) {
  if (!subject) return false;
  if (subject.role === 'admin' || subject.role === 'owner' || subject.isOwner || subject.role === 'user') {
    return true;
  }
  const perms = subject.permissions || subject.roleSpecific?.permissions || [];
  return Array.isArray(perms) && (perms.includes(permission) || perms.includes('*'));
}

export function canUsePos(subject) {
  return hasPermission(subject, 'pos') || hasPermission(subject, 'manage_pos');
}

export function canReadCustomersInPos(subject) {
  return hasPermission(subject, 'customers') || hasPermission(subject, 'manage_customers');
}

export function canReadReturnsInPos(subject) {
  return hasPermission(subject, 'orders') || hasPermission(subject, 'manage_orders');
}

export function canWriteReturnsInPos(subject) {
  return hasPermission(subject, 'orders') || hasPermission(subject, 'manage_orders');
}

export function canInitiateRefundsInPos(subject) {
  return hasPermission(subject, 'orders') || hasPermission(subject, 'manage_orders');
}

export function canUseSensitiveLineEdits(subject) {
  return hasPermission(subject, 'products') || hasPermission(subject, 'manage_products');
}

export function getPosSensitiveActionPolicy(subject, { negativePricingEnabled = false } = {}) {
  const elevated = canUseSensitiveLineEdits(subject);
  return {
    canPriceOverride: elevated,
    canDiscountOverride: elevated,
    canUseNegativePricing: elevated && negativePricingEnabled,
    canBypassStock: false,
    canReadCustomers: canReadCustomersInPos(subject),
    canReadReturns: canReadReturnsInPos(subject),
    canWriteReturns: canWriteReturnsInPos(subject),
    canInitiateRefunds: canInitiateRefundsInPos(subject),
  };
}
