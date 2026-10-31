import { Injectable, computed, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import {
  EN_TRANSLATIONS,
  KM_TRANSLATIONS,
  SupportedLanguage,
  TRANSLATION_MAP,
} from './translations';
import {
  normalizeLanguage,
  pluralCandidates,
  readLanguagePreference,
  subscribeLanguagePreference,
  writeLanguagePreference,
} from './language-preference';


@Injectable({ providedIn: 'root' })
export class TranslateService {
  private readonly document = inject(DOCUMENT);

  private readonly _currentLang = signal<SupportedLanguage>(this.detectInitialLanguage());

  readonly currentLang = computed(() => this._currentLang());

  constructor() {
    this.applyDocumentLang(this._currentLang());
    // Follow a switch made in another tab or another Rentify app.
    subscribeLanguagePreference(this.document, (lang) => {
      if (lang !== this._currentLang()) {
        this._currentLang.set(lang);
        this.applyDocumentLang(lang);
      }
    });
  }

  setLanguage(value: SupportedLanguage | string): void {
    const lang = normalizeLanguage(value);
    if (!lang) return;
    this._currentLang.set(lang);
    writeLanguagePreference(this.document, lang);
    this.applyDocumentLang(lang);
  }

  t(key: string, params?: Record<string, string | number>): string {
    const lang = this._currentLang();
    const dictionary = TRANSLATION_MAP[lang] ?? EN_TRANSLATIONS;
    // Plural variant, then the key, in the active language and then English.
    const candidates = pluralCandidates(lang, key, params);
    let template =
      candidates.map((k) => dictionary[k]).find((v) => v !== undefined) ??
      candidates.map((k) => EN_TRANSLATIONS[k]).find((v) => v !== undefined) ??
      key;

    if (params) {
      for (const [k, v] of Object.entries(params)) {
        template = template.replaceAll(`{${k}}`, String(v));
      }
    }

    return template;
  }

  private detectInitialLanguage(): SupportedLanguage {
    return readLanguagePreference(this.document);
  }

  private applyDocumentLang(lang: SupportedLanguage): void {
    if (this.document?.documentElement) {
      this.document.documentElement.lang = lang;
    }
  }
}
