export function buildPosRegisterSessionKey({ storeKey = "", deviceId = "" } = {}) {
  return `rentify.pos.register-session.${String(storeKey).trim().toLowerCase()}.${String(deviceId).trim()}`;
}

export function createRegisterSessionRecord({
  storeKey,
  deviceId,
  cashierId,
  cashierName,
  cashierRole,
  registerLabel,
  openingFloat = 0,
}) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `pos-reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    storeKey,
    deviceId,
    cashierId,
    cashierName,
    cashierRole,
    registerLabel: registerLabel || "Main Register",
    openingFloat: Number(openingFloat || 0),
    openedAt: new Date().toISOString(),
    closedAt: null,
    status: "OPEN",
    tillEvents: [],
  };
}

export function parseRegisterSessionRecord(rawValue) {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function closeRegisterSessionRecord(session, { closingFloat = 0, closingNote = "" } = {}) {
  if (!session) return null;
  return {
    ...session,
    status: "CLOSED",
    closedAt: new Date().toISOString(),
    closingFloat: Number(closingFloat || 0),
    closingNote: String(closingNote || ""),
  };
}
