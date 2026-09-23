const PHNOM_PENH_TZ = "Asia/Phnom_Penh";

const toPhnomDateString = (dateInput) => {
  if (!dateInput) return null;
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PHNOM_PENH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
};

const isPaidOnTime = (paidAt, dueDate) => {
  if (!paidAt || !dueDate) return false;
  const paidDate = toPhnomDateString(paidAt);
  const dueDateStr = toPhnomDateString(dueDate);
  if (!paidDate || !dueDateStr) return false;
  return paidDate <= dueDateStr;
};

module.exports = {
  PHNOM_PENH_TZ,
  toPhnomDateString,
  isPaidOnTime,
};
