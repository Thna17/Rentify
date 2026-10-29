// packages/design-tokens/index.js - Programmatic export of Rentify semantic design tokens

const tokens = require('./tokens.json');

/**
 * Maps semantic token paths to their corresponding CSS custom property names.
 */
const cssVariables = {
  // Brand & Surface
  brandPrimary: 'var(--rentify-color-brand-primary)',
  brandPrimaryHover: 'var(--rentify-color-brand-primary-hover)',
  brandPrimaryActive: 'var(--rentify-color-brand-primary-active)',
  brandPrimarySubtle: 'var(--rentify-color-brand-primary-subtle)',
  brandSecondary: 'var(--rentify-color-brand-secondary)',
  brandAccent: 'var(--rentify-color-brand-accent)',
  brandAccentSubtle: 'var(--rentify-color-brand-accent-subtle)',
  surfaceBase: 'var(--rentify-color-surface-base)',
  surfaceCanvas: 'var(--rentify-color-surface-canvas)',
  surfaceSubtle: 'var(--rentify-color-surface-subtle)',
  surfaceMuted: 'var(--rentify-color-surface-muted)',
  surfaceRaised: 'var(--rentify-color-surface-raised)',
  surfaceHover: 'var(--rentify-color-surface-hover)',
  surfaceInverse: 'var(--rentify-color-surface-inverse)',
  surfaceOverlay: 'var(--rentify-color-surface-overlay)',

  // Text
  textPrimary: 'var(--rentify-color-text-primary)',
  textSecondary: 'var(--rentify-color-text-secondary)',
  textMuted: 'var(--rentify-color-text-muted)',
  textInverse: 'var(--rentify-color-text-inverse)',
  textBrand: 'var(--rentify-color-text-brand)',
  textOnAccent: 'var(--rentify-color-text-on-accent)',
  textDisabled: 'var(--rentify-color-text-disabled)',

  // Borders
  borderDefault: 'var(--rentify-color-border-default)',
  borderSubtle: 'var(--rentify-color-border-subtle)',
  borderStrong: 'var(--rentify-color-border-strong)',
  borderInput: 'var(--rentify-color-border-input)',
  borderInteractive: 'var(--rentify-color-border-interactive)',
  borderFocus: 'var(--rentify-color-border-focus)',

  // Status
  successBase: 'var(--rentify-color-success-base)',
  successText: 'var(--rentify-color-success-text)',
  successSubtle: 'var(--rentify-color-success-subtle)',
  successBorder: 'var(--rentify-color-success-border)',

  warningBase: 'var(--rentify-color-warning-base)',
  warningText: 'var(--rentify-color-warning-text)',
  warningSubtle: 'var(--rentify-color-warning-subtle)',
  warningBorder: 'var(--rentify-color-warning-border)',

  dangerBase: 'var(--rentify-color-danger-base)',
  dangerText: 'var(--rentify-color-danger-text)',
  dangerSubtle: 'var(--rentify-color-danger-subtle)',
  dangerBorder: 'var(--rentify-color-danger-border)',

  infoBase: 'var(--rentify-color-info-base)',
  infoText: 'var(--rentify-color-info-text)',
  infoSubtle: 'var(--rentify-color-info-subtle)',
  infoBorder: 'var(--rentify-color-info-border)',

  neutralBase: 'var(--rentify-color-neutral-base)',
  neutralText: 'var(--rentify-color-neutral-text)',
  neutralSubtle: 'var(--rentify-color-neutral-subtle)',
  neutralBorder: 'var(--rentify-color-neutral-border)',

  // Price
  priceSale: 'var(--rentify-color-price-sale)',

  // Typography
  fontBody: 'var(--rentify-font-family-body)',
  fontHeading: 'var(--rentify-font-family-heading)',
  fontMono: 'var(--rentify-font-family-mono)',

  // Radius
  radiusXs: 'var(--rentify-radius-xs)',
  radiusSm: 'var(--rentify-radius-sm)',
  radiusMd: 'var(--rentify-radius-md)',
  radiusLg: 'var(--rentify-radius-lg)',
  radiusXl: 'var(--rentify-radius-xl)',
  radiusFull: 'var(--rentify-radius-full)',

  // Shadows
  shadowXs: 'var(--rentify-shadow-xs)',
  shadowSm: 'var(--rentify-shadow-sm)',
  shadowMd: 'var(--rentify-shadow-md)',
  shadowLg: 'var(--rentify-shadow-lg)',
  shadowFocus: 'var(--rentify-shadow-focus)',

  // Focus
  focusRingColor: 'var(--rentify-focus-ring-color)',
  focusRingWidth: 'var(--rentify-focus-ring-width)',
  focusRingOffset: 'var(--rentify-focus-ring-offset)',
};

/**
 * Calculates the relative luminance of a sRGB hex color according to WCAG 2.1 specs.
 * @param {string} hex - 6-character hex color (e.g. '#0e6b5c')
 * @returns {number} Relative luminance (0 to 1)
 */
function getLuminance(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Computes contrast ratio between two hex colors according to WCAG 2.1 specifications.
 * @param {string} foregroundHex
 * @param {string} backgroundHex
 * @returns {number} Contrast ratio (e.g. 7.42)
 */
function getContrastRatio(foregroundHex, backgroundHex) {
  const lum1 = getLuminance(foregroundHex);
  const lum2 = getLuminance(backgroundHex);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Verifies if contrast ratio meets WCAG 2.1 AA/AAA thresholds.
 * @param {string} foregroundHex
 * @param {string} backgroundHex
 * @param {'AA'|'AAA'} [level='AA']
 * @param {'normal'|'large'} [size='normal']
 * @returns {boolean}
 */
function isAccessible(foregroundHex, backgroundHex, level = 'AA', size = 'normal') {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  if (level === 'AAA') {
    return size === 'large' ? ratio >= 4.5 : ratio >= 7.0;
  }
  return size === 'large' ? ratio >= 3.0 : ratio >= 4.5;
}

module.exports = {
  tokens,
  cssVariables,
  getLuminance,
  getContrastRatio,
  isAccessible,
};
