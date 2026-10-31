// Shared UI language preference for every Rentify web app.
//
// Each app runs on its own origin (localhost ports in dev, subdomains in
// production), so localStorage alone cannot carry the choice between the
// marketing site, auth, merchant, admin and marketplace. A first-party cookie
// on the registrable domain is shared by all of them; localStorage is kept as
// a per-origin fallback. The backend has no UI-language field yet (see
// docs/notes.md), so the preference lives in the browser only.
//
// The Angular apps (marketplace-frontend, admin-frontend) keep a copy of this
// logic in core/i18n/language-preference.ts; keep the two in step.

export const SUPPORTED_LANGUAGES = ['en', 'km'];
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_COOKIE = 'rentify_lang';
export const LANGUAGE_STORAGE_KEY = 'rentify.language';
export const LANGUAGE_EVENT = 'rentify:language';

// Keys written by earlier per-app switchers. Read once so a saved choice
// survives the move to the shared preference.
const LEGACY_STORAGE_KEYS = ['appLanguage', 'rentify-language', 'rentify_auth_lang', 'adminLanguage'];

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function normalizeLanguage(value) {
  const code = String(value || '').trim().toLowerCase();
  if (code === 'km' || code === 'kh' || code.startsWith('km-')) return 'km';
  if (code === 'en' || code.startsWith('en-')) return 'en';
  return null;
}

function readCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${LANGUAGE_COOKIE}=([^;]*)`));
  return match ? normalizeLanguage(decodeURIComponent(match[1])) : null;
}

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readStorage() {
  const store = storage();
  if (!store) return null;
  try {
    const saved = normalizeLanguage(store.getItem(LANGUAGE_STORAGE_KEY));
    if (saved) return saved;
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = normalizeLanguage(store.getItem(key));
      if (legacy) return legacy;
    }
  } catch {
    // Storage can be blocked in private windows; fall through.
  }
  return null;
}

function readBrowser() {
  if (typeof navigator === 'undefined') return null;
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return languages.some((lang) => normalizeLanguage(lang) === 'km') ? 'km' : null;
}

export function readLanguagePreference() {
  return readCookie() || readStorage() || readBrowser() || DEFAULT_LANGUAGE;
}

// Write the cookie on the broadest domain the browser accepts. Browsers refuse
// public suffixes (com.kh, vercel.app), so the first accepted candidate from
// the top is the registrable domain shared by every Rentify subdomain.
function writeCookie(lang) {
  if (typeof document === 'undefined' || typeof location === 'undefined') return;
  const base = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  const host = location.hostname;
  const labels = host.split('.');
  const isIp = /^[\d.]+$/.test(host) || host.includes(':');
  if (!isIp && labels.length > 1) {
    for (let i = labels.length - 2; i >= 0; i -= 1) {
      const domain = labels.slice(i).join('.');
      document.cookie = `${base}; domain=.${domain}`;
      if (readCookie() === lang) return;
    }
  }
  document.cookie = base;
}

export function writeLanguagePreference(value) {
  const lang = normalizeLanguage(value) || DEFAULT_LANGUAGE;
  writeCookie(lang);
  const store = storage();
  try {
    store?.setItem(LANGUAGE_STORAGE_KEY, lang);
    LEGACY_STORAGE_KEYS.forEach((key) => store?.removeItem(key));
  } catch {
    // The cookie still carries the choice.
  }
  applyDocumentLanguage(lang);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: lang }));
  }
  return lang;
}

export function applyDocumentLanguage(lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
}

// Calls onChange when the preference changes in this tab, another tab of the
// same app, or another Rentify app (picked up when this tab regains focus).
export function subscribeLanguagePreference(onChange) {
  if (typeof window === 'undefined') return () => {};
  const sync = () => onChange(readLanguagePreference());
  const onStorage = (event) => {
    if (event.key === LANGUAGE_STORAGE_KEY) sync();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') sync();
  };
  window.addEventListener(LANGUAGE_EVENT, sync);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', sync);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, sync);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', sync);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

export function intlLocale(lang) {
  return lang === 'km' ? 'km-KH' : 'en-US';
}

const pluralRulesCache = {};

// Resolve a message from a flat or nested catalog: plural variant first
// (key.one / key.other, chosen with Intl.PluralRules when params.count is a
// number), then the key itself, in the active language and then English.
export function resolveMessage(catalogs, lang, key, params) {
  const lookup = (dictionary, path) => {
    if (!dictionary || !path) return undefined;
    if (typeof dictionary[path] === 'string') return dictionary[path];
    const nested = path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), dictionary);
    return typeof nested === 'string' ? nested : undefined;
  };
  const candidates = [];
  if (params && typeof params.count === 'number') {
    const locale = intlLocale(lang);
    pluralRulesCache[locale] ||= new Intl.PluralRules(locale);
    const category = pluralRulesCache[locale].select(params.count);
    candidates.push(`${key}.${category}`, `${key}.other`);
  }
  candidates.push(key);
  for (const dictionary of [catalogs[lang], catalogs[DEFAULT_LANGUAGE]]) {
    for (const candidate of candidates) {
      const found = lookup(dictionary, candidate);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

// Supports both {{name}} (merchant catalogs) and {name} (auth/marketplace).
export function interpolate(template, params) {
  if (!params || typeof template !== 'string') return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g, (match, a, b) => {
    const value = params[a || b];
    return value === undefined || value === null ? match : String(value);
  });
}

export function formatNumber(lang, value, options) {
  return new Intl.NumberFormat(intlLocale(lang), options).format(value);
}

export function formatDate(lang, value, options = { dateStyle: 'medium' }) {
  if (value === null || value === undefined || value === '') return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlLocale(lang), options).format(date);
}
