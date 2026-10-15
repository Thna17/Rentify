export function shouldUseBrowserPrintFallback({ hotspotPrinting = false, printerName = "", forceFallback = false } = {}) {
  if (!hotspotPrinting) return true;
  if (forceFallback) return true;
  return !String(printerName || "").trim();
}

export function buildPosCheckoutSignature({
  cartId,
  customerId,
  customerName,
  customerPhone,
  paymentKey,
  paymentCurrency,
  amountTendered,
  additionalPaymentLines = [],
  orderOption,
  cartItems = [],
} = {}) {
  return JSON.stringify({
    cartId: cartId || "",
    customerId: customerId || "",
    customerName: customerName || "",
    customerPhone: customerPhone || "",
    paymentKey: paymentKey || "",
    paymentCurrency: paymentCurrency || "",
    amountTendered: String(amountTendered || ""),
    orderOption: orderOption || "",
    additionalPaymentLines: (additionalPaymentLines || []).map((line) => ({
      paymentKey: line.paymentKey || "",
      currencyCode: line.currencyCode || "",
      amount: String(line.amount || ""),
    })),
    cartItems: (cartItems || []).map((item) => ({
      id: item.id,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
    })),
  });
}
