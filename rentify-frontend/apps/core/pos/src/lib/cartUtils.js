export function parseDecimal(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const num = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? fallback : num;
}

export function formatCurrency(amount, currency = "USD") {
  const num = parseDecimal(amount, 0);
  const curr = String(currency || "USD").toUpperCase();

  if (curr === "KHR") {
    return `${Math.round(num).toLocaleString("en-US")} ៛`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
