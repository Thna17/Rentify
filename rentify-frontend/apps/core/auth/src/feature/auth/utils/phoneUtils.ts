// Shared phone number utilities
export const sanitizePhoneNumber = (phone: string) => {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    digits = '855' + digits.substring(1);
  }
  if (digits.length === 9) digits = '855' + digits;
  if (!digits.startsWith('855')) digits = '855' + digits;
  return digits.substring(0, 12);
};

export const formatCambodianPhone = (input: string) => {
  const digits = sanitizePhoneNumber(input);
  const countryCode = '855';
  const mainNumber = digits.substring(3);

  if (!mainNumber) return '';
  
  return `(${countryCode}) ${mainNumber.substring(0, 3)}-${mainNumber.substring(3)}`;
};

export const validateCambodianPhone = (phone: string) => {
  const sanitized = sanitizePhoneNumber(phone);
  return sanitized.startsWith('855') && sanitized.length === 12;
};
