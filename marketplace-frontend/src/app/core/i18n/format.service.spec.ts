// src/app/core/i18n/format.service.spec.ts
// P4-UX-002: Unit tests for locale-aware formatting of money, numbers, dates, and times.

import { TestBed } from '@angular/core/testing';
import { FormatService } from './format.service';
import { TranslateService } from './translate.service';

describe('FormatService (P4-UX-002)', () => {
  let service: FormatService;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatService, TranslateService],
    });
    service = TestBed.inject(FormatService);
    translate = TestBed.inject(TranslateService);
    translate.setLanguage('en');
  });

  describe('Currency Formatting', () => {
    it('formats USD currency in English locale with exact two decimals', () => {
      translate.setLanguage('en');
      expect(service.formatCurrency(45)).toBe('$45.00');
      expect(service.formatCurrency(1250.5)).toBe('$1,250.50');
      expect(service.formatCurrency('99.99')).toBe('$99.99');
      expect(service.formatCurrency(0)).toBe('$0.00');
      expect(service.formatCurrency(null)).toBe('$0.00');
    });

    it('formats KHR currency in English locale', () => {
      translate.setLanguage('en');
      expect(service.formatCurrency(4000, 'KHR')).toBe('4,000 KHR');
    });

    it('formats KHR currency in Khmer locale', () => {
      translate.setLanguage('km');
      expect(service.formatCurrency(4000, 'KHR')).toBe('4,000 ៛');
      expect(service.formatCurrency(4000, 'KHR', { useKhmerDigits: true })).toBe('៤,០០០ ៛');
    });

    it('formats USD currency with Khmer numerals when requested', () => {
      translate.setLanguage('km');
      expect(service.formatCurrency(45, 'USD', { useKhmerDigits: true })).toBe('$៤៥.០០');
      expect(service.formatCurrency(1250, 'USD', { useKhmerDigits: true })).toBe('$១,២៥០.០០');
    });
  });

  describe('Number Formatting', () => {
    it('formats numbers with thousands separators in English', () => {
      translate.setLanguage('en');
      expect(service.formatNumber(1000000)).toBe('1,000,000');
    });

    it('converts to Khmer numerals accurately', () => {
      expect(service.toKhmerDigits('0123456789')).toBe('០១២៣៤៥៦៧៨៩');
      expect(service.toKhmerDigits(2026)).toBe('២០២៦');
    });
  });

  describe('Date Formatting', () => {
    it('formats dates in English locale', () => {
      translate.setLanguage('en');
      const testDate = new Date('2026-10-26T12:00:00Z');
      const formatted = service.formatDate(testDate);
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Oct');
    });

    it('formats dates in Khmer locale with Cambodian month names', () => {
      translate.setLanguage('km');
      const testDate = new Date('2026-10-26T12:00:00Z');
      const formatted = service.formatDate(testDate);
      expect(formatted).toContain('តុលា'); // October in Khmer
      expect(formatted).toContain('2026');
    });

    it('formats dates with Khmer numerals in Khmer locale when specified', () => {
      translate.setLanguage('km');
      const testDate = new Date('2026-10-26T12:00:00Z');
      const formatted = service.formatDate(testDate, { useKhmerDigits: true });
      expect(formatted).toContain('តុលា');
      expect(formatted).toContain('២០២៦');
    });
  });

  describe('Time Formatting', () => {
    it('formats time in 12-hour AM/PM format in English', () => {
      translate.setLanguage('en');
      const morningDate = new Date(2026, 9, 26, 9, 15);
      const afternoonDate = new Date(2026, 9, 26, 14, 30);
      expect(service.formatTime(morningDate)).toBe('9:15 AM');
      expect(service.formatTime(afternoonDate)).toBe('2:30 PM');
    });

    it('formats time in Khmer with Cambodian day period terms', () => {
      translate.setLanguage('km');
      const morningDate = new Date(2026, 9, 26, 9, 15);
      const afternoonDate = new Date(2026, 9, 26, 14, 30);
      expect(service.formatTime(morningDate)).toContain('ព្រឹក'); // Morning in Khmer
      expect(service.formatTime(afternoonDate)).toContain('រសៀល'); // Afternoon in Khmer
    });
  });

  describe('Relative Time', () => {
    it('handles recent time in English and Khmer', () => {
      const now = new Date();
      translate.setLanguage('en');
      expect(service.formatRelativeTime(now)).toBe('Just now');

      translate.setLanguage('km');
      expect(service.formatRelativeTime(now)).toBe('ទើបតែឥឡូវនេះ');
    });
  });
});
