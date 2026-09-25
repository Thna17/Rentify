/**
 * Storefront theme resolution.
 *
 * Merchant theme data arrives from the public website API and ends up inside a
 * generated <style> element. Everything here therefore works on an allowlist:
 * only known token names survive, and every value must match a strict format
 * (hex / OKLCH triplet colors, simple CSS lengths, plain font-family lists).
 * Anything else is dropped so a merchant value can never close the rule and
 * inject arbitrary CSS.
 */
import type { Theme } from '@rentify/shared/types';
import { hexToOklch } from '@rentify/shared/Services/themes/themeService';

export type StorefrontTheme = Theme;

type UnknownRecord = Record<string, unknown>;

/** Color keys understood by the shared theme service. */
export const THEME_COLOR_KEYS = [
  'primary',
  'secondary',
  'accent',
  'background',
  'surface',
  'text',
  'textSecondary',
  'border',
  'success',
  'warning',
  'error',
] as const;

const SIZE_KEYS = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'base', 'full'];
const FONT_WEIGHT_KEYS = ['normal', 'medium', 'semibold', 'bold'];
const FONT_FAMILY_KEYS = ['primary', 'secondary'];

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const OKLCH_TRIPLET = /^(?:0(?:\.\d{1,4})?|1(?:\.0{1,4})?) \d(?:\.\d{1,4})? \d{1,3}(?:\.\d{1,4})?$/;
const CSS_LENGTH = /^\d{1,3}(?:\.\d{1,4})?(?:rem|px|em)$/;
const FONT_WEIGHT = /^[1-9]00$/;
const FONT_FAMILY = /^[A-Za-z0-9 ,'"-]{1,120}$/;

/** Khmer-capable system fonts appended to every font stack. */
export const KHMER_FONT_FALLBACK =
  '"Noto Sans Khmer", "Khmer Sangam MN", "Kantumruy Pro", system-ui, -apple-system, "Segoe UI", sans-serif';

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const expandHex = (hex: string) =>
  hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toLowerCase()
    : hex.toLowerCase();

/** Returns a normalized color string, or null when the value is not a safe color. */
export const sanitizeColor = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed)) return expandHex(trimmed);
  if (OKLCH_TRIPLET.test(trimmed)) return trimmed;
  return null;
};

const sanitizeFontFamily = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!FONT_FAMILY.test(trimmed)) return null;
  return `${trimmed}, ${KHMER_FONT_FALLBACK}`;
};

const pickValid = (
  source: unknown,
  keys: readonly string[],
  sanitize: (value: unknown) => string | null
): Record<string, string> | undefined => {
  if (!isRecord(source)) return undefined;
  const result: Record<string, string> = {};
  for (const key of keys) {
    const clean = sanitize(source[key]);
    if (clean) result[key] = clean;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const lengthOrNull = (value: unknown) =>
  typeof value === 'string' && CSS_LENGTH.test(value.trim()) ? value.trim() : null;
const weightOrNull = (value: unknown) => {
  const text = typeof value === 'number' ? String(value) : value;
  return typeof text === 'string' && FONT_WEIGHT.test(text) ? text : null;
};

/** Keeps only allowlisted, well-formed tokens from untrusted theme data. */
export const sanitizeTheme = (raw: unknown): StorefrontTheme | null => {
  if (!isRecord(raw)) return null;

  const theme: StorefrontTheme = {};
  const colors = pickValid(raw.colors, THEME_COLOR_KEYS, sanitizeColor);
  if (colors) theme.colors = colors;

  if (isRecord(raw.typography)) {
    const fontFamily = pickValid(raw.typography.fontFamily, FONT_FAMILY_KEYS, sanitizeFontFamily);
    const fontSize = pickValid(raw.typography.fontSize, SIZE_KEYS, lengthOrNull);
    const fontWeight = pickValid(raw.typography.fontWeight, FONT_WEIGHT_KEYS, weightOrNull);
    if (fontFamily || fontSize || fontWeight) {
      theme.typography = {
        ...(fontFamily && { fontFamily }),
        ...(fontSize && { fontSize }),
        ...(fontWeight && { fontWeight }),
      } as StorefrontTheme['typography'];
    }
  }

  const spacing = pickValid(raw.spacing, SIZE_KEYS, lengthOrNull);
  if (spacing) theme.spacing = spacing as StorefrontTheme['spacing'];
  const borderRadius = pickValid(raw.borderRadius, SIZE_KEYS, lengthOrNull);
  if (borderRadius) theme.borderRadius = borderRadius as StorefrontTheme['borderRadius'];

  return Object.keys(theme).length > 0 ? theme : null;
};

/** Approximate perceptual lightness (0–1) of a sanitized color. */
export const colorLightness = (color: string): number | null => {
  if (OKLCH_TRIPLET.test(color)) return Number(color.split(' ')[0]);
  if (!HEX_COLOR.test(color)) return null;
  const hex = expandHex(color);
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // OKLab lightness is roughly the cube root of relative luminance.
  return Math.cbrt(luminance);
};

const DARK_TEXT = '0.2 0 0';
const LIGHT_TEXT = '0.99 0 0';

/** Chooses dark or light text for content placed on top of `color`. */
export const readableForeground = (color: string | undefined): string | undefined => {
  if (!color) return undefined;
  const lightness = colorLightness(color);
  if (lightness === null) return undefined;
  return lightness > 0.72 ? DARK_TEXT : LIGHT_TEXT;
};

/** A shade of `color` at the given lightness, keeping its hue with a softened chroma. */
const shade = (color: string, lightness: number, maxChroma: number) => {
  const [, chroma = 0, hue = 0] = (HEX_COLOR.test(color) ? hexToOklch(expandHex(color)) : color).split(' ').map(Number);
  const l = Math.min(1, Math.max(0, lightness));
  return `${l.toFixed(3)} ${Math.min(chroma, maxChroma).toFixed(3)} ${hue.toFixed(1)}`;
};

/**
 * A merchant palette often sets only `background`. When the template's text
 * colours would then be unreadable on it (for example a dark navy background
 * under dark template text), derive text, surface and border colours from the
 * background's own hue instead. Colours the merchant set explicitly are never
 * replaced.
 */
const deriveReadableSurfaces = (colors: Record<string, string>, merchantColors: Record<string, unknown>) => {
  if (!merchantColors.background || merchantColors.text || !colors.background) return;
  const background = colorLightness(colors.background);
  const text = colors.text ? colorLightness(colors.text) : null;
  if (background === null || (text !== null && Math.abs(background - text) >= 0.45)) return;

  const dark = background < 0.6;
  const foreground = dark ? '0.96 0 0' : DARK_TEXT;
  colors.text = foreground;
  colors.textSecondary = shade(colors.background, dark ? 0.78 : 0.45, 0.02);
  if (!merchantColors.surface) colors.surface = shade(colors.background, dark ? background + 0.06 : Math.max(background, 0.985), 0.04);
  if (!merchantColors.border) colors.border = shade(colors.background, dark ? background + 0.15 : background - 0.09, 0.04);
  for (const key of ['card-foreground', 'popover-foreground', 'accent-foreground']) colors[key] = foreground;
};

const mergeThemes = (base: StorefrontTheme | null, override: StorefrontTheme | null) => {
  if (!base) return override;
  if (!override) return base;
  return {
    colors: { ...base.colors, ...override.colors },
    typography: {
      ...base.typography,
      ...override.typography,
      fontFamily: { ...base.typography?.fontFamily, ...override.typography?.fontFamily },
      fontSize: { ...base.typography?.fontSize, ...override.typography?.fontSize },
      fontWeight: { ...base.typography?.fontWeight, ...override.typography?.fontWeight },
    },
    spacing: { ...base.spacing, ...override.spacing },
    borderRadius: { ...base.borderRadius, ...override.borderRadius },
  } as StorefrontTheme;
};

export interface ResolveThemeInput {
  /** `Theme Configuration` content value saved from the merchant theme editor. */
  customTheme?: unknown;
  /** `Color Palette` content value: a preset name or a `{ primary, ... }` color map. */
  palette?: unknown;
  /** Named presets available to the template, keyed by palette name. */
  presets?: Record<string, StorefrontTheme | undefined>;
  /** Template defaults used when the merchant has not configured a value. */
  fallback?: StorefrontTheme | null;
}

/**
 * Resolves the theme to apply. Precedence: merchant theme configuration,
 * then the selected palette (preset name or color map), then template
 * defaults. The result is always sanitized and always carries readable
 * foreground colors for primary and secondary actions.
 */
export const resolveStorefrontTheme = ({
  customTheme,
  palette,
  presets = {},
  fallback = null,
}: ResolveThemeInput): StorefrontTheme | null => {
  const safeFallback = sanitizeTheme(fallback);
  const custom = sanitizeTheme(customTheme);

  let paletteTheme: StorefrontTheme | null = null;
  if (typeof palette === 'string' && Object.prototype.hasOwnProperty.call(presets, palette)) {
    paletteTheme = sanitizeTheme(presets[palette]);
  } else if (isRecord(palette)) {
    paletteTheme = sanitizeTheme(isRecord(palette.colors) ? palette : { colors: palette });
  }

  const resolved = mergeThemes(mergeThemes(safeFallback, paletteTheme), custom);
  if (!resolved) return null;

  const colors = { ...resolved.colors };
  deriveReadableSurfaces(colors, { ...paletteTheme?.colors, ...custom?.colors });
  const primaryForeground = readableForeground(colors.primary);
  const secondaryForeground = readableForeground(colors.secondary);
  if (primaryForeground) colors['primary-foreground'] = primaryForeground;
  if (secondaryForeground) colors['secondary-foreground'] = secondaryForeground;
  if (colors.primary) colors.ring = colors.primary;

  return { ...resolved, colors };
};
