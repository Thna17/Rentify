import { describe, it, expect } from 'vitest';
import {
  validateCambodianPhone,
  toCanonicalE164,
  sanitizePhoneNumber,
} from '../phoneUtils';

describe('Signup Validation & Password Criteria Tests', () => {
  describe('Cambodian Phone & Email Signup Validation', () => {
    it('validates Cambodian phone numbers with various formats', () => {
      // International with spaces
      expect(validateCambodianPhone('+855 96 984 9988')).toBe(true);
      // International without spaces
      expect(validateCambodianPhone('+855969849988')).toBe(true);
      // Local format with 0
      expect(validateCambodianPhone('0969849988')).toBe(true);
      // Local format with space
      expect(validateCambodianPhone('096 984 9988')).toBe(true);
      // 8-digit subscriber (Cellcard 012)
      expect(validateCambodianPhone('012 345 678')).toBe(true);
      expect(validateCambodianPhone('+85512345678')).toBe(true);
    });

    it('sanitizes and normalizes phone numbers correctly', () => {
      expect(sanitizePhoneNumber('+855 96 984 9988')).toBe('855969849988');
      expect(sanitizePhoneNumber('096 984 9988')).toBe('855969849988');
      expect(toCanonicalE164('+855 96 984 9988')).toBe('+855969849988');
      expect(toCanonicalE164('096 984 9988')).toBe('+855969849988');
    });

    it('rejects invalid phone numbers', () => {
      expect(validateCambodianPhone('12345')).toBe(false);
      expect(validateCambodianPhone('abcdefghij')).toBe(false);
      expect(validateCambodianPhone('')).toBe(false);
    });

    it('validates standard email regex', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('user@example.com')).toBe(true);
      expect(emailRegex.test('sokha.chan@gmail.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('missing@tld')).toBe(false);
    });
  });

  describe('Password Strength & Checklist Logic', () => {
    const evaluatePassword = (password: string) => {
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSymbolOrComplex =
        /[^A-Za-z0-9]/.test(password) ||
        (password.length >= 10 && hasUppercase && hasNumber && /[a-z]/.test(password));

      let score = 0;
      if (hasMinLength) score += 1;
      if (hasUppercase) score += 1;
      if (hasNumber) score += 1;
      if (hasSymbolOrComplex) score += 1;
      if (!hasMinLength) score = Math.min(score, 1);

      return {
        hasMinLength,
        hasUppercase,
        hasNumber,
        hasSymbolOrComplex,
        score: Math.max(score, 1),
      };
    };

    it('rates short or simple password as Weak (score 1)', () => {
      const result = evaluatePassword('simple');
      expect(result.hasMinLength).toBe(false);
      expect(result.score).toBe(1);
    });

    it('rates 8 characters without uppercase/numbers as Weak/Fair (score 1 or 2)', () => {
      const result = evaluatePassword('password');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(false);
      expect(result.hasNumber).toBe(false);
      expect(result.score).toBe(1);
    });

    it('rates 8 characters with uppercase as Fair (score 2)', () => {
      const result = evaluatePassword('Password');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumber).toBe(false);
      expect(result.score).toBe(2);
    });

    it('rates 8 characters with uppercase and number as Good (score 3)', () => {
      const result = evaluatePassword('Password1');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumber).toBe(true);
      expect(result.score).toBe(3);
    });

    it('rates complex password with symbols as Strong (score 4)', () => {
      const result = evaluatePassword('Password1@#');
      expect(result.hasMinLength).toBe(true);
      expect(result.hasUppercase).toBe(true);
      expect(result.hasNumber).toBe(true);
      expect(result.hasSymbolOrComplex).toBe(true);
      expect(result.score).toBe(4);
    });
  });
});
