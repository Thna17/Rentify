import { normalizeScanCode } from "./posProductLookup.js";

function normalizePhoneLookup(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function collectCustomerIdentifiers(customer = {}) {
  const pairs = [
    ["barcode", customer.barcode],
    ["memberCode", customer.memberCode],
    ["code", customer.code],
    ["id", customer.id],
    ["phone", customer.phoneNumber || customer.phone],
    ["email", customer.email],
  ];

  return pairs
    .map(([type, value]) => {
      if (!value) return null;
      const normalized =
        type === "phone" ? normalizePhoneLookup(value) : normalizeScanCode(value);
      return normalized ? { type, normalized, raw: value } : null;
    })
    .filter(Boolean);
}

export function resolveCustomerScanLookup(rawCode, customers = []) {
  const code = normalizeScanCode(rawCode);
  const phoneCode = normalizePhoneLookup(rawCode);
  if (!code && !phoneCode) {
    return {
      state: "empty",
      code: "",
      customer: null,
      matches: [],
      matchedBy: null,
    };
  }

  const matches = [];
  const seen = new Set();

  for (const customer of customers || []) {
    for (const identifier of collectCustomerIdentifiers(customer)) {
      const isPhone = identifier.type === "phone";
      const matched = isPhone ? identifier.normalized === phoneCode : identifier.normalized === code;
      if (!matched) continue;
      const key = `${customer.id}:${identifier.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({
        customer,
        matchedBy: identifier.type,
        matchedValue: identifier.raw,
      });
    }
  }

  if (!matches.length) {
    return {
      state: "not_found",
      code: code || phoneCode,
      customer: null,
      matches: [],
      matchedBy: null,
    };
  }

  if (matches.length === 1) {
    return {
      state: "resolved",
      code: code || phoneCode,
      customer: matches[0].customer,
      matches,
      matchedBy: matches[0].matchedBy,
    };
  }

  return {
    state: "multiple",
    code: code || phoneCode,
    customer: null,
    matches,
    matchedBy: null,
  };
}
