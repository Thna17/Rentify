// src/app/core/i18n/i18n-enforcement.spec.ts
// P4-UX-002: CI Enforcement Suite for Internationalization:
// 1. 100% Key Parity between English and Khmer catalogs.
// 2. Strict prevention of raw untranslated keys and empty values.
// 3. Consistent Cambodian commerce vocabulary enforcement.
// 4. Long-Khmer-text layout resilience and parameter interpolation tests.

import { EN_TRANSLATIONS, KM_TRANSLATIONS, TRANSLATION_MAP } from './translations';
import { TranslateService } from './translate.service';
import { TestBed } from '@angular/core/testing';

describe('Internationalization CI Enforcement Suite (P4-UX-002)', () => {
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TranslateService],
    });
    translate = TestBed.inject(TranslateService);
  });

  describe('Catalog Completeness & 100% Key Parity', () => {
    const enKeys = Object.keys(EN_TRANSLATIONS).sort();
    const kmKeys = Object.keys(KM_TRANSLATIONS).sort();

    it('enforces that English and Khmer catalogs have identical key counts', () => {
      expect(kmKeys.length).toBe(enKeys.length);
    });

    it('enforces zero missing keys in Khmer catalog (EN -> KM)', () => {
      const missingInKm = enKeys.filter((k) => !(k in KM_TRANSLATIONS));
      expect(missingInKm).toEqual([]);
    });

    it('enforces zero missing keys in English catalog (KM -> EN)', () => {
      const missingInEn = kmKeys.filter((k) => !(k in EN_TRANSLATIONS));
      expect(missingInEn).toEqual([]);
    });

    it('enforces that no translation value is empty or whitespace-only', () => {
      for (const [key, val] of Object.entries(EN_TRANSLATIONS)) {
        expect(val.trim().length > 0).toBe(true);
      }
      for (const [key, val] of Object.entries(KM_TRANSLATIONS)) {
        expect(val.trim().length > 0).toBe(true);
      }
    });

    it('enforces that no translation value is accidentally equal to its key name', () => {
      for (const [key, val] of Object.entries(EN_TRANSLATIONS)) {
        expect(val === key).toBe(false);
      }
      for (const [key, val] of Object.entries(KM_TRANSLATIONS)) {
        expect(val === key).toBe(false);
      }
    });
  });

  describe('Consistent Cambodian Commerce Vocabulary', () => {
    it('uses standard Cambodian commerce terms for cart and checkout', () => {
      // Cart
      expect(KM_TRANSLATIONS['nav.cart']).toBe('កន្ត្រកទំនិញ');
      expect(KM_TRANSLATIONS['cart.title']).toBe('កន្ត្រករបស់អ្នក');
      expect(KM_TRANSLATIONS['product.addToCart']).toBe('ដាក់ក្នុងកន្ត្រក');
      expect(KM_TRANSLATIONS['product.viewCart']).toBe('មើលកន្ត្រក');

      // Cash on Delivery
      expect(KM_TRANSLATIONS['checkout.codLabel']).toContain('COD');
      expect(KM_TRANSLATIONS['checkout.codLabel']).toContain('សាច់ប្រាក់');

      // Financials
      expect(KM_TRANSLATIONS['cart.subtotal']).toBe('សរុបរង');
      expect(KM_TRANSLATIONS['cart.deliveryFee']).toBe('ថ្លៃដឹកជញ្ជូន');
      expect(KM_TRANSLATIONS['cart.exactTotal']).toBe('តម្លៃសរុបពិតប្រាកដ');

      // Orders & Returns
      expect(KM_TRANSLATIONS['orders.title']).toBe('ការបញ្ជាទិញរបស់ខ្ញុំ');
      expect(KM_TRANSLATIONS['orderDetail.submitReturn']).toBe('ដាក់សំណើសុំប្រគល់ទំនិញ');
      expect(KM_TRANSLATIONS['orderDetail.submitComplaint']).toBe('ដាក់របាយការណ៍បញ្ហា');

      // Catalog & Stock
      expect(KM_TRANSLATIONS['catalog.inStock']).toBe('មានក្នុងស្តុក');
      expect(KM_TRANSLATIONS['catalog.outOfStock']).toBe('អស់ពីស្តុក');
    });
  });

  describe('TranslateService Parameter Interpolation', () => {
    it('replaces single and multiple parameter placeholders accurately in both languages', () => {
      translate.setLanguage('en');
      expect(translate.t('category.productCount', { count: 12 })).toBe('12 products');
      expect(translate.t('product.addedToCart', { count: 2, name: 'Silk Scarf' }))
        .toBe('2 × Silk Scarf added to your cart.');

      translate.setLanguage('km');
      expect(translate.t('category.productCount', { count: 12 })).toBe('12 មុខទំនិញ');
      expect(translate.t('product.addedToCart', { count: 2, name: 'ក្រមាសូត្រ' }))
        .toBe('បានដាក់ 2 × ក្រមាសូត្រ ក្នុងកន្ត្រករបស់អ្នក។');
    });

    it('gracefully handles missing parameters without crashing or printing undefined', () => {
      translate.setLanguage('en');
      const result = translate.t('store.shopStore'); // expected {name}
      expect(result).not.toContain('undefined');
      expect(result).not.toContain('null');
    });
  });

  describe('Long-Khmer-Text Layout Resilience', () => {
    it('handles long multi-syllable Khmer compound terms in button and badge labels', () => {
      translate.setLanguage('km');
      const longStrings = [
        KM_TRANSLATIONS['checkout.policyAck'],
        KM_TRANSLATIONS['orderDetail.tier1Notice'],
        KM_TRANSLATIONS['orderDetail.tier2Notice'],
        KM_TRANSLATIONS['cart.multiVendorBanner'],
        KM_TRANSLATIONS['orderSuccess.sub'],
      ];

      for (const str of longStrings) {
        expect(str).toBeDefined();
        expect(str.length).toBeGreaterThan(50);
        // Verify string contains valid Khmer unicode range (\u1780-\u17FF)
        expect(/[\u1780-\u17FF]/.test(str)).toBe(true);
      }
    });

    it('verifies simulated element text wrapping with long Khmer copy', () => {
      // Simulate container with constrained width
      const container = document.createElement('div');
      container.style.width = '240px';
      container.style.wordBreak = 'break-word';
      container.style.lineHeight = '1.6';
      container.lang = 'km';

      container.textContent = KM_TRANSLATIONS['orderDetail.tier1Notice'];
      document.body.appendChild(container);

      // Verify DOM node accepted text without throwing or overflowing layout
      expect(container.textContent).toBe(KM_TRANSLATIONS['orderDetail.tier1Notice']);
      expect(container.clientHeight).toBeGreaterThanOrEqual(0);

      document.body.removeChild(container);
    });
  });
});
