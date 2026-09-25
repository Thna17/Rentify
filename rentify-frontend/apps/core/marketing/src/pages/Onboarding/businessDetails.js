// Same rule Core applies when it creates the website
// (rentify-server/src/middlewares/validation.js), so a detail that passes here
// is not rejected at the final step.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MIN_PHONE_DIGITS = 8;
const MAX_PHONE_DIGITS = 15;

export const isValidEmail = (value) => EMAIL_PATTERN.test(String(value || '').trim());

/** Digits with optional +, spaces, dashes, dots or brackets, e.g. +855 12 345 678. */
export const isValidPhone = (value) => {
  const text = String(value || '').trim();
  if (!/^\+?[\d\s\-().]+$/.test(text)) return false;
  const digits = text.replace(/\D/g, '').length;
  return digits >= MIN_PHONE_DIGITS && digits <= MAX_PHONE_DIGITS;
};

/** Translation keys for the fields that are filled in but invalid. */
export const businessDetailErrors = ({ email, contact } = {}) => ({
  email: email && !isValidEmail(email) ? 'business.email.invalid' : null,
  contact: contact && !isValidPhone(contact) ? 'business.contact.invalid' : null,
});

export const isBusinessDetailsComplete = (details = {}) => {
  const { name, location, contact, email, primaryCategory } = details;
  if (!(name?.trim() && location && contact && email && primaryCategory)) return false;
  const errors = businessDetailErrors(details);
  return !errors.email && !errors.contact;
};
