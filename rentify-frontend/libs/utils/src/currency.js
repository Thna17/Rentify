// @rentify/utils/currency.js
export const formatPrice = (amount, currency = 'USD', conversionRate = 4000) => {
  if (currency === 'KHR') {
    // Convert USD to KHR
    const inKHR = Math.round(amount * conversionRate);
    return new Intl.NumberFormat('km-KH', {
      style: 'currency',
      currency: 'KHR',
      minimumFractionDigits: 0,
    }).format(inKHR);
  }
  
  // USD formatting
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};