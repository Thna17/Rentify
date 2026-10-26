// src/app/core/i18n/error-sanitizer.service.spec.ts
// P4-UX-002: Unit tests for technical error sanitization and safe plain-language mapping.

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorSanitizerService } from './error-sanitizer.service';
import { TranslateService } from './translate.service';

describe('ErrorSanitizerService (P4-UX-002)', () => {
  let service: ErrorSanitizerService;
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorSanitizerService, TranslateService],
    });
    service = TestBed.inject(ErrorSanitizerService);
    translate = TestBed.inject(TranslateService);
    translate.setLanguage('en');
  });

  describe('Technical Error Detection', () => {
    it('detects Sequelize, database and SQL connection errors', () => {
      expect(service.isTechnical('SequelizeConnectionRefusedError: connect ECONNREFUSED 127.0.0.1:3306')).toBe(true);
      expect(service.isTechnical('SQLSTATE[HY000]: General error: 1024')).toBe(true);
      expect(service.isTechnical('Table `Orders` doesn\'t exist in database')).toBe(true);
      expect(service.isTechnical('SELECT * FROM Invoices WHERE id = ?')).toBe(true);
    });

    it('detects JavaScript runtime errors and stack traces', () => {
      expect(service.isTechnical('TypeError: Cannot read properties of undefined (reading \'price\')')).toBe(true);
      expect(service.isTechnical('Error at Object.<anonymous> (/var/app/node_modules/express/lib/router.js:45)')).toBe(true);
    });

    it('passes safe human-readable messages', () => {
      expect(service.isTechnical('Invalid email format')).toBe(false);
      expect(service.isTechnical('Only 3 items left in stock')).toBe(false);
      expect(service.isTechnical('Delivery address is required')).toBe(false);
    });
  });

  describe('Raw Translation Key Detection', () => {
    it('detects raw dotted translation keys', () => {
      expect(service.isRawKey('error.NETWORK_FAILURE')).toBe(true);
      expect(service.isRawKey('checkout.insufficient_stock')).toBe(true);
      expect(service.isRawKey('errors.general.unknown')).toBe(true);
    });

    it('does not flag plain sentences as raw keys', () => {
      expect(service.isRawKey('Please enter your full name.')).toBe(false);
      expect(service.isRawKey('Order total confirmed at checkout.')).toBe(false);
    });
  });

  describe('Sanitizing HTTP Errors into Safe Plain Language', () => {
    it('sanitizes status 0 network drops into polite messages in English and Khmer', () => {
      const netError = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' });

      translate.setLanguage('en');
      expect(service.sanitize(netError)).toBe('Network connection lost. Please check your internet connection and try again.');

      translate.setLanguage('km');
      expect(service.sanitize(netError)).toBe('ដាច់ការតភ្ជាប់បណ្តាញ។ សូមពិនិត្យការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នក ហើយព្យាយាមម្តងទៀត។');
    });

    it('sanitizes status 500 server crashes and suppresses technical leaks', () => {
      const serverCrash = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        error: { message: 'SequelizeUniqueConstraintError: Validation error on checkoutKey' },
      });

      translate.setLanguage('en');
      const sanitizedEn = service.sanitize(serverCrash);
      expect(sanitizedEn).toBe('Our services are temporarily busy. Please wait a moment and try again.');
      expect(sanitizedEn).not.toContain('Sequelize');

      translate.setLanguage('km');
      const sanitizedKm = service.sanitize(serverCrash);
      expect(sanitizedKm).toBe('ប្រព័ន្ធកំពុងមមាញឹកបណ្តោះអាសន្ន។ សូមរង់ចាំមួយភ្លែត ហើយព្យាយាមម្តងទៀត។');
    });

    it('sanitizes status 401 and 403 into clear authorization guidance', () => {
      const authError = new HttpErrorResponse({ status: 401 });
      const forbiddenError = new HttpErrorResponse({ status: 403 });

      translate.setLanguage('en');
      expect(service.sanitize(authError)).toBe('Please sign in to continue.');
      expect(service.sanitize(forbiddenError)).toBe('You do not have permission to access this resource.');

      translate.setLanguage('km');
      expect(service.sanitize(authError)).toBe('សូមចូលគណនីរបស់អ្នកដើម្បីបន្ត។');
      expect(service.sanitize(forbiddenError)).toBe('អ្នកមិនមានសិទ្ធិអនុវត្តសកម្មភាពនេះទេ។');
    });

    it('handles stock conflict messages safely in English and Khmer', () => {
      const stockConflict = new HttpErrorResponse({
        status: 409,
        error: { message: 'Only 1 left in stock' },
      });

      translate.setLanguage('en');
      expect(service.sanitize(stockConflict)).toBe('Only 1 left in stock');

      translate.setLanguage('km');
      expect(service.sanitize(stockConflict)).toBe('ចំនួនស្តុកទំនិញមិនគ្រប់គ្រាន់ទេ។ សូមពិនិត្យកន្ត្រករបស់អ្នក។');
    });
  });
});
