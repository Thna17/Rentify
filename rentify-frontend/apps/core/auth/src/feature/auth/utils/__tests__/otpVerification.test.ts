import { describe, it, expect } from 'vitest';
import { maskContact } from '../phoneUtils';

describe('OTP Verification & Contact Masking Tests', () => {
  describe('maskContact', () => {
    it('masks Cambodian international phone numbers (+855)', () => {
      expect(maskContact('+855 96 984 9988')).toBe('+855 96 •••• 988');
      expect(maskContact('+855969849988')).toBe('+855 96 •••• 988');
      expect(maskContact('85512345678')).toBe('+855 12 •••• 678');
    });

    it('masks Cambodian local phone numbers (starting with 0)', () => {
      expect(maskContact('0969849988')).toBe('096 •••• 988');
      expect(maskContact('096 984 9988')).toBe('096 •••• 988');
      expect(maskContact('012 345 678')).toBe('012 •••• 678');
    });

    it('masks standard email addresses preserving domain', () => {
      const masked = maskContact('sokha.chan@gmail.com');
      expect(masked).toMatch(/^s•+n@gmail\.com$/);
      expect(masked.endsWith('@gmail.com')).toBe(true);
      expect(masked.startsWith('s')).toBe(true);

      const shortUser = maskContact('ab@domain.com');
      expect(shortUser).toBe('a*@domain.com');
    });

    it('handles empty or short edge cases safely', () => {
      expect(maskContact('')).toBe('');
      expect(maskContact('123')).toBe('123');
    });
  });

  describe('OTP Code Processing', () => {
    const processDigitInput = (input: string) => {
      return input.replace(/\D/g, '').slice(-1);
    };

    const processPastedCode = (pasted: string) => {
      const clean = pasted.replace(/\D/g, '').slice(0, 6);
      const cells = ['', '', '', '', '', ''];
      for (let i = 0; i < clean.length; i++) {
        cells[i] = clean[i];
      }
      return {
        cells,
        fullCode: clean,
        isComplete: clean.length === 6,
      };
    };

    it('processes single digit inputs correctly', () => {
      expect(processDigitInput('5')).toBe('5');
      expect(processDigitInput('a')).toBe('');
      expect(processDigitInput('12')).toBe('2'); // Takes last digit on multi-char input
    });

    it('handles paste of full 6-digit code', () => {
      const result = processPastedCode('123456');
      expect(result.isComplete).toBe(true);
      expect(result.fullCode).toBe('123456');
      expect(result.cells).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('handles paste with spaces or hyphens', () => {
      const result = processPastedCode('123-456');
      expect(result.isComplete).toBe(true);
      expect(result.fullCode).toBe('123456');
      expect(result.cells).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('handles partial paste', () => {
      const result = processPastedCode('123');
      expect(result.isComplete).toBe(false);
      expect(result.fullCode).toBe('123');
      expect(result.cells).toEqual(['1', '2', '3', '', '', '']);
    });
  });
});
