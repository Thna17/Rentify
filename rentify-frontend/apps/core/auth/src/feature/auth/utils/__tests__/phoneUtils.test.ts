import { describe, it, expect } from 'vitest';
import {
  sanitizePhoneNumber,
  toCanonicalE164,
  validateCambodianPhone,
  formatCambodianPhone,
  formatLocalPhone,
  detectCambodianOperator,
} from '../phoneUtils';

describe('Cambodian Phone Utilities', () => {
  describe('toCanonicalE164 and sanitizePhoneNumber', () => {
    it('handles 0969849988 (local with leading 0)', () => {
      expect(toCanonicalE164('0969849988')).toBe('+855969849988');
      expect(sanitizePhoneNumber('0969849988')).toBe('855969849988');
      expect(validateCambodianPhone('0969849988')).toBe(true);
    });

    it('handles 969849988 (national subscriber number without leading 0)', () => {
      expect(toCanonicalE164('969849988')).toBe('+855969849988');
      expect(sanitizePhoneNumber('969849988')).toBe('855969849988');
      expect(validateCambodianPhone('969849988')).toBe(true);
    });

    it('handles +855969849988 (international E.164 format)', () => {
      expect(toCanonicalE164('+855969849988')).toBe('+855969849988');
      expect(sanitizePhoneNumber('+855969849988')).toBe('855969849988');
      expect(validateCambodianPhone('+855969849988')).toBe(true);
    });

    it('handles 855969849988 (E.164 without leading +)', () => {
      expect(toCanonicalE164('855969849988')).toBe('+855969849988');
      expect(sanitizePhoneNumber('855969849988')).toBe('855969849988');
      expect(validateCambodianPhone('855969849988')).toBe(true);
    });

    it('handles 8-digit subscriber numbers (e.g. 012 345 678)', () => {
      expect(toCanonicalE164('012345678')).toBe('+85512345678');
      expect(sanitizePhoneNumber('012345678')).toBe('85512345678');
      expect(validateCambodianPhone('012345678')).toBe(true);
      expect(validateCambodianPhone('12345678')).toBe(true);
      expect(validateCambodianPhone('+85512345678')).toBe(true);
    });

    it('rejects invalid inputs', () => {
      expect(validateCambodianPhone('')).toBe(false);
      expect(validateCambodianPhone('12345')).toBe(false);
      expect(validateCambodianPhone('0123456789012345')).toBe(false);
    });
  });

  describe('Formatting', () => {
    it('formats Cambodian phone with country code', () => {
      expect(formatCambodianPhone('0969849988')).toBe('+855 96 984 9988');
      expect(formatCambodianPhone('012345678')).toBe('+855 12 345 678');
    });

    it('formats local phone with leading 0', () => {
      expect(formatLocalPhone('855969849988')).toBe('096 984 9988');
      expect(formatLocalPhone('85512345678')).toBe('012 345 678');
    });
  });

  describe('Cambodian Mobile Operator Detection', () => {
    it('detects Smart Axiata (096, 010, 081)', () => {
      expect(detectCambodianOperator('0969849988')?.name).toBe('Smart');
      expect(detectCambodianOperator('010234567')?.name).toBe('Smart');
      expect(detectCambodianOperator('+85581234567')?.name).toBe('Smart');
    });

    it('detects Cellcard (012, 077, 089)', () => {
      expect(detectCambodianOperator('012345678')?.name).toBe('Cellcard');
      expect(detectCambodianOperator('077123456')?.name).toBe('Cellcard');
      expect(detectCambodianOperator('+85589123456')?.name).toBe('Cellcard');
    });

    it('detects Metfone (088, 097, 071, 031)', () => {
      expect(detectCambodianOperator('0881234567')?.name).toBe('Metfone');
      expect(detectCambodianOperator('0971234567')?.name).toBe('Metfone');
      expect(detectCambodianOperator('0711234567')?.name).toBe('Metfone');
      expect(detectCambodianOperator('0311234567')?.name).toBe('Metfone');
    });
  });
});
