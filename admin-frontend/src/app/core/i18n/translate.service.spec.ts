import { TestBed } from '@angular/core/testing';
import { TranslateService } from './translate.service';
import { TranslatePipe } from './translate.pipe';

describe('I18n Translation Services', () => {
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

  it('initializes with default language en and translates English keys', () => {
    expect(service.currentLang()).toBe('en');
    expect(service.instant('support.title')).toBe('Support Case Workspace');
    expect(service.instant('common.save')).toBe('Save');
  });

  it('switches language to Khmer and returns Khmer translations', () => {
    service.setLanguage('km');
    expect(service.currentLang()).toBe('km');
    expect(service.instant('support.title')).toBe('កន្លែងគ្រប់គ្រងករណីគាំទ្រ');
    expect(service.instant('common.save')).toBe('រក្សាទុក');
    expect(localStorage.getItem('adminLanguage')).toBe('km');
  });

  it('falls back to key or English when key is missing or invalid', () => {
    expect(service.instant('non.existent.key')).toBe('non.existent.key');
  });

  it('TranslatePipe transforms translation keys in templates', () => {
    const pipe = new TranslatePipe(service);
    expect(pipe.transform('makerChecker.title')).toBe('Maker-Checker Approval Console');
    service.setLanguage('km');
    expect(pipe.transform('makerChecker.title')).toBe('ផ្ទាំងអនុម័តទ្វេភាគី (Maker-Checker)');
  });
});
