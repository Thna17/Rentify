import { describe, it, expect } from 'vitest';
import {
  validateCambodianPhone,
  sanitizePhoneNumber,
  toCanonicalE164,
  maskContact,
  formatCambodianPhone,
} from '../phoneUtils';

describe('Password Recovery Validation & Formatting', () => {
  describe('Contact Detection for Forgot Password', () => {
    it('identifies valid email addresses', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test('merchant@rentify.local')).toBe(true);
      expect(emailRegex.test('customer@gmail.com')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('invalid@')).toBe(false);
    });

    it('identifies valid Cambodian phone numbers', () => {
      expect(validateCambodianPhone('012 345 678')).toBe(true);
      expect(validateCambodianPhone('096 984 9988')).toBe(true);
      expect(validateCambodianPhone('+855 12 345 678')).toBe(true);
      expect(validateCambodianPhone('855969849988')).toBe(true);
      expect(validateCambodianPhone('0123')).toBe(false);
    });

    it('sanitizes Cambodian phones for backend API', () => {
      expect(sanitizePhoneNumber('012 345 678')).toBe('85512345678');
      expect(sanitizePhoneNumber('0969849988')).toBe('855969849988');
      expect(toCanonicalE164('012 345 678')).toBe('+85512345678');
      expect(toCanonicalE164('+855 12 345 678')).toBe('+85512345678');
    });

    it('constructs correct API payload for email and phone recovery', () => {
      const buildPayload = (contact: string) => {
        const clean = contact.trim();
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
        const isPhone = validateCambodianPhone(clean);
        return {
          email: isEmail ? clean : null,
          phoneNumber: isPhone ? sanitizePhoneNumber(clean) : null,
        };
      };

      expect(buildPayload('seller@rentify.local')).toEqual({
        email: 'seller@rentify.local',
        phoneNumber: null,
      });

      expect(buildPayload('0969849988')).toEqual({
        email: null,
        phoneNumber: '855969849988',
      });
    });
  });

  describe('Contact Masking for Reset Display', () => {
    it('masks phone numbers safely', () => {
      expect(maskContact('0969849988')).toBe('096 •••• 988');
      expect(maskContact('+85512345678')).toBe('+855 12 •••• 678');
    });

    it('masks email addresses safely', () => {
      expect(maskContact('sophat@gmail.com')).toBe('s••••t@gmail.com');
      expect(maskContact('al@b.com')).toBe('a*@b.com');
    });

    it('handles empty or missing contact gracefully', () => {
      expect(maskContact('')).toBe('');
    });
  });

  describe('Reset Password Token & Error Detection', () => {
    it('detects invalid or expired token error responses', () => {
      const isTokenInvalid = (err: string) =>
        /expired|invalid|token|not found|malformed|used/i.test(err);

      expect(isTokenInvalid('Password reset token has expired')).toBe(true);
      expect(isTokenInvalid('Invalid reset token or OTP code')).toBe(true);
      expect(isTokenInvalid('Token already used')).toBe(true);
      expect(isTokenInvalid('Network connection lost')).toBe(false);
      expect(isTokenInvalid('Internal server error')).toBe(false);
    });

    it('validates 6-digit OTP codes correctly', () => {
      const otpRegex = /^\d{6}$/;
      expect(otpRegex.test('123456')).toBe(true);
      expect(otpRegex.test('998877')).toBe(true);
      expect(otpRegex.test('12345')).toBe(false);
      expect(otpRegex.test('1234567')).toBe(false);
      expect(otpRegex.test('12345a')).toBe(false);
    });

    it('evaluates password strength scoring correctly', () => {
      const calculateScore = (pwd: string) => {
        let score = 0;
        if (!pwd) return 0;
        if (pwd.length >= 8) score += 30;
        if (/[A-Z]/.test(pwd)) score += 25;
        if (/[0-9]/.test(pwd)) score += 25;
        if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
        return Math.min(100, score);
      };

      expect(calculateScore('short')).toBe(0);
      expect(calculateScore('password123')).toBe(55); // >=8 (30) + number (25)
      expect(calculateScore('Password123')).toBe(80); // >=8 (30) + upper (25) + number (25)
      expect(calculateScore('P@ssword123')).toBe(100); // >=8 (30) + upper (25) + number (25) + symbol (20)
    });

    it('checks password confirmation matching', () => {
      const p1 = 'Secret123!';
      const p2 = 'Secret123!';
      const p3 = 'Different123!';
      expect(p1 === p2).toBe(true);
      expect(p1 === p3).toBe(false);
    });
  });
});
