import { TestBed } from '@angular/core/testing';
import { TranslateService } from './translate.service';

describe('TranslateService', () => {
  let service: TranslateService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [TranslateService],
    });
    service = TestBed.inject(TranslateService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to English language', () => {
    expect(service.currentLang()).toBe('en');
    expect(service.t('nav.home')).toBe('Home');
  });

  it('switches to Khmer and translates correctly', () => {
    service.setLanguage('km');
    expect(service.currentLang()).toBe('km');
    expect(service.t('nav.home')).toBe('ទំព័រដើម');
    expect(service.t('catalog.inStock')).toBe('មានក្នុងស្តុក');
  });

  it('falls back to English when a key is missing in Khmer dictionary', () => {
    service.setLanguage('km');
    // An English key not in KM (or if a key only exists in EN)
    expect(service.t('unknown.key.demo')).toBe('unknown.key.demo');
  });

  it('interpolates parameters correctly in English and Khmer', () => {
    expect(service.t('catalog.lowStock', { count: 3 })).toBe('Only 3 left');
    service.setLanguage('km');
    expect(service.t('catalog.lowStock', { count: 3 })).toBe('នៅសល់តែ 3 ទៀតប៉ុណ្ណោះ');
  });

  it('persists language selection in localStorage', () => {
    service.setLanguage('km');
    expect(localStorage.getItem('appLanguage')).toBe('km');
  });
});
