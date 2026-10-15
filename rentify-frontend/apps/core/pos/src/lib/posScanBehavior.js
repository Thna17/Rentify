import { normalizeScanCode } from "./posProductLookup.js";

export const POS_SCAN_AUTO_SUBMIT_DELAY_MS = 140;
export const POS_SCAN_MIN_LENGTH = 3;
export const POS_SCAN_MANUAL_MIN_LENGTH = 2;

export function shouldAutoSubmitScan(rawValue) {
  const code = normalizeScanCode(rawValue);
  return code.length >= POS_SCAN_MIN_LENGTH;
}

export function shouldTreatAsLikelyScannerInput(rawValue) {
  const code = normalizeScanCode(rawValue);
  return code.length >= 6 || /^\d{4,}$/.test(code);
}
