/** Localized date and time for order listings and receipts. */
export const formatDate = (value, language) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(language === 'kh' ? 'km-KH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
