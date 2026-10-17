const POS_DEVICE_KEY = "rentify.pos.device-id";
const POS_WORKSPACE_ACCESS_KEY = "rentify.pos.workspace-access.v1";
const POS_QUICK_UNLOCK_KEY = "rentify.pos.quick-unlock.v1";

function readStorage(storage, key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // noop
  }
}

function deleteStorage(storage, key) {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // noop
  }
}

function getSessionStorage() {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function toHex(bytes) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function getPosDeviceId() {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(POS_DEVICE_KEY);
  if (existing) return existing;
  const next =
    globalThis.crypto?.randomUUID?.() ||
    `pos-device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(POS_DEVICE_KEY, next);
  return next;
}

export function formatPosDeviceLabel(deviceId) {
  const normalized = String(deviceId || "").trim();
  if (!normalized) return "Unknown";
  return normalized.slice(0, 8).toUpperCase();
}

export function buildPosTerminalScope({
  cashierId = "",
  storeKey = "",
  deviceId = "",
} = {}) {
  return `${String(cashierId).trim()}::${String(storeKey).trim().toLowerCase()}::${String(
    deviceId
  ).trim()}`;
}

function readWorkspaceAccessMap() {
  return readStorage(getSessionStorage(), POS_WORKSPACE_ACCESS_KEY) || {};
}

function writeWorkspaceAccessMap(value) {
  writeStorage(getSessionStorage(), POS_WORKSPACE_ACCESS_KEY, value);
}

function readQuickUnlockMap() {
  return readStorage(getSessionStorage(), POS_QUICK_UNLOCK_KEY) || {};
}

function writeQuickUnlockMap(value) {
  writeStorage(getSessionStorage(), POS_QUICK_UNLOCK_KEY, value);
}

export function grantPosWorkspaceAccess(scope) {
  if (!scope) return;
  const current = readWorkspaceAccessMap();
  current[scope] = {
    unlockedAt: new Date().toISOString(),
  };
  writeWorkspaceAccessMap(current);
}

export function revokePosWorkspaceAccess(scope) {
  if (!scope) return;
  const current = readWorkspaceAccessMap();
  if (!current[scope]) return;
  delete current[scope];
  writeWorkspaceAccessMap(current);
}

export function hasPosWorkspaceAccess(scope) {
  if (!scope) return false;
  const current = readWorkspaceAccessMap();
  return Boolean(current[scope]);
}

export function supportsPosQuickUnlock() {
  return Boolean(globalThis.crypto?.subtle?.digest);
}

async function hashPin(pin) {
  const normalized = String(pin || "").trim();
  if (!normalized || !supportsPosQuickUnlock()) {
    return "";
  }

  const encoded = new TextEncoder().encode(normalized);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);
  return toHex(new Uint8Array(digest));
}

export function hasPosQuickUnlockPin(scope) {
  if (!scope) return false;
  const current = readQuickUnlockMap();
  return Boolean(current[scope]?.pinHash);
}

export async function savePosQuickUnlockPin(scope, pin) {
  if (!scope) return false;
  const pinHash = await hashPin(pin);
  if (!pinHash) return false;
  const current = readQuickUnlockMap();
  current[scope] = {
    pinHash,
    updatedAt: new Date().toISOString(),
  };
  writeQuickUnlockMap(current);
  return true;
}

export async function verifyPosQuickUnlockPin(scope, pin) {
  if (!scope) return false;
  const current = readQuickUnlockMap();
  if (!current[scope]?.pinHash) return false;
  const nextHash = await hashPin(pin);
  return Boolean(nextHash) && nextHash === current[scope].pinHash;
}

export function clearPosQuickUnlockPin(scope) {
  if (!scope) return;
  const current = readQuickUnlockMap();
  if (!current[scope]) return;
  delete current[scope];
  writeQuickUnlockMap(current);
}

export function clearPosQuickUnlockState() {
  deleteStorage(getSessionStorage(), POS_QUICK_UNLOCK_KEY);
}

export function clearPosWorkspaceAccessState() {
  deleteStorage(getSessionStorage(), POS_WORKSPACE_ACCESS_KEY);
}
