import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  EN_TRANSLATIONS,
  KM_TRANSLATIONS,
  SupportedLanguage,
  TRANSLATION_MAP,
} from './translations';

const STORAGE_KEY = 'appLanguage';

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly document = inject(DOCUMENT);

  private readonly _currentLang = signal<SupportedLanguage>(this.detectInitialLanguage());

  readonly currentLang = computed(() => this._currentLang());

  constructor() {
    this.applyDocumentLang(this._currentLang());
  }

  setLanguage(lang: SupportedLanguage): void {
    if (lang !== 'en' && lang !== 'km') return;
    this._currentLang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    this.applyDocumentLang(lang);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const lang = this._currentLang();
    const dictionary = TRANSLATION_MAP[lang] ?? EN_TRANSLATIONS;
    let template = dictionary[key] ?? EN_TRANSLATIONS[key] ?? key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replaceAll(`{${k}}`, String(v));
      }
    }

    return template;
  }

  private detectInitialLanguage(): SupportedLanguage {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'km') return stored;
    } catch {}
    return 'en';
  }

  private applyDocumentLang(lang: SupportedLanguage): void {
    if (this.document?.documentElement) {
      this.document.documentElement.lang = lang;
    }
  }
}
