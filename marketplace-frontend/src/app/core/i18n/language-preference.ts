// Shared UI language preference for every Rentify web app.
// Mirror of rentify-frontend/libs/utils/src/i18n/languagePreference.js — the
// apps run on different origins, so a cookie on the registrable domain carries
// the choice between them and localStorage is a per-origin fallback. Keep the
// copies in step.
import { SupportedLanguage } from './translations';

export const LANGUAGE_COOKIE = 'rentify_lang';
export const LANGUAGE_STORAGE_KEY = 'rentify.language';
export const LANGUAGE_EVENT = 'rentify:language';
const LEGACY_STORAGE_KEYS = ['appLanguage', 'rentify-language', 'rentify_auth_lang', 'adminLanguage'];
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function normalizeLanguage(value: unknown): SupportedLanguage | null {
  const code = String(value ?? '').trim().toLowerCase();
  if (code === 'km' || code === 'kh' || code.startsWith('km-')) return 'km';
  if (code === 'en' || code.startsWith('en-')) return 'en';
  return null;
}

function readCookie(doc: Document): SupportedLanguage | null {
  const match = doc.cookie.match(new RegExp(`(?:^|;\\s*)${LANGUAGE_COOKIE}=([^;]*)`));
  return match ? normalizeLanguage(decodeURIComponent(match[1])) : null;
}

function readStorage(): SupportedLanguage | null {
  try {
    const saved = normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    if (saved) return saved;
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = normalizeLanguage(localStorage.getItem(key));
      if (legacy) return legacy;
    }
  } catch {}
  return null;
}

function readBrowser(doc: Document): SupportedLanguage | null {
  const nav = doc.defaultView?.navigator;
  const languages = nav?.languages?.length ? nav.languages : [nav?.language ?? ''];
  return languages.some((lang) => normalizeLanguage(lang) === 'km') ? 'km' : null;
}

export function readLanguagePreference(doc: Document): SupportedLanguage {
  return readCookie(doc) ?? readStorage() ?? readBrowser(doc) ?? 'en';
}

// Browsers refuse cookies on public suffixes, so the broadest accepted domain
// is the registrable one shared by every Rentify subdomain.
export function writeLanguagePreference(doc: Document, lang: SupportedLanguage): void {
  const base = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  const host = doc.location?.hostname ?? '';
  const labels = host.split('.');
  const isIp = /^[\d.]+$/.test(host) || host.includes(':');
  let written = false;
  if (!isIp && labels.length > 1) {
    for (let i = labels.length - 2; i >= 0 && !written; i -= 1) {
      doc.cookie = `${base}; domain=.${labels.slice(i).join('.')}`;
      written = readCookie(doc) === lang;
    }
  }
  if (!written) doc.cookie = base;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {}
  doc.defaultView?.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }));
}

// Picks up a change made in another tab or another Rentify app.
export function subscribeLanguagePreference(doc: Document, onChange: (lang: SupportedLanguage) => void): () => void {
  const win = doc.defaultView;
  if (!win) return () => {};
  const sync = () => onChange(readLanguagePreference(doc));
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY) sync();
  };
  const onVisible = () => {
    if (doc.visibilityState === 'visible') sync();
  };
  win.addEventListener('storage', onStorage);
  win.addEventListener('focus', sync);
  doc.addEventListener('visibilitychange', onVisible);
  return () => {
    win.removeEventListener('storage', onStorage);
    win.removeEventListener('focus', sync);
    doc.removeEventListener('visibilitychange', onVisible);
  };
}

const pluralRules: Partial<Record<SupportedLanguage, Intl.PluralRules>> = {};

// key.one / key.other variants, chosen with Intl.PluralRules when
// params.count is a number. Khmer has a single plural form ('other').
export function pluralCandidates(lang: SupportedLanguage, key: string, params?: Record<string, unknown>): string[] {
  if (!params || typeof params['count'] !== 'number') return [key];
  const rules = (pluralRules[lang] ??= new Intl.PluralRules(lang === 'km' ? 'km-KH' : 'en-US'));
  return [`${key}.${rules.select(params['count'] as number)}`, `${key}.other`, key];
}
