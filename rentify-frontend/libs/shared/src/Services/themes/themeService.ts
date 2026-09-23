// services/theme/theme.service.ts

import { lightTokens as baseLightTokens, darkTokens as baseDarkTokens } from '../../themes/styles/theme';
import { templateThemes } from '../../themes';
import { Theme } from '../../types';

// Hex to OKLCH conversion
const hexToOklch = (hex: string): string => {
  if (!hex.startsWith('#')) return hex;

  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b2 * b2);
  const H = (Math.atan2(b2, a) * 180) / Math.PI;

  return `${L.toFixed(3)} ${C.toFixed(3)} ${((H + 360) % 360).toFixed(1)}`;
};

// Parse OKLCH string
const parseOklch = (oklchStr: string): { l: number; c: number; h: number } => {
  const [l, c, h] = oklchStr.split(' ').map(Number);
  return { l, c, h };
};

// Adjust lightness
const adjustLightness = (oklchStr: string, delta: number): string => {
  const { l, c, h } = parseOklch(oklchStr);
  const newL = Math.max(0, Math.min(1, l + delta));
  return `${newL.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)}`;
};

// Mappings
const colorMappings: Record<string, string[]> = {
  primary: ['--primary'],
  secondary: ['--secondary'],
  accent: ['--accent'],
  background: ['--background', '--store-bg', '--dashboard-bg'],
  surface: ['--card', '--popover', '--muted', '--accent', '--product-bg', '--hero-bg', '--metric-bg', '--chart-bg'],
  text: ['--foreground'],
  textSecondary: ['--muted-foreground'],
  border: ['--border', '--input'],
};

const variantDeltas: Record<string, Record<string, number>> = {
  primary: { light: 0.1, dark: -0.1 },
  secondary: { light: 0.1 },
  success: { light: 0.1 },
};

const fontFamilyMapping = (key: string) => `--font-${key}`;
const fontSizeMapping = (key: string) => `--text-${key}`;
const fontWeightMapping = (key: string) => `--font-weight-${key}`;
const spacingMapping = (key: string) => `--spacing-${key}`;
const borderRadiusMapping = (key: string) => `--radius-${key}`;

export class ThemeService {
  /**
   * Retrieves a theme from templateThemes by templateId and optional themeKey
   */
  getThemeForTemplate(templateId: string, themeKey?: string): Theme | undefined {
    const themesForTemplate = templateThemes[templateId];
    if (!themesForTemplate) return undefined;

    if (themeKey) {
      return themesForTemplate[themeKey] ?? themesForTemplate.default;
    }
    return themesForTemplate.default;
  }

  /**
   * Applies a theme (or falls back to base tokens if theme is null/undefined)
   */
// Update the applyThemeToTokens method in ThemeService.ts
applyThemeToTokens(theme: Theme | null): {
  lightTokens: Record<string, string>;
  darkTokens: Record<string, string>;
} {
  // Always start fresh from the original base tokens
  const lightTokens: Record<string, string> = { ...baseLightTokens };
  const darkTokens: Record<string, string> = { ...baseDarkTokens };

  // If no theme provided or theme is empty (reset case) → return base tokens
  if (!theme || Object.keys(theme).length === 0) {
    return { lightTokens, darkTokens };
  }

  // Apply color overrides
  if (theme.colors && Object.keys(theme.colors).length > 0) {
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value !== 'string') return;

      const oklch = value.startsWith('#') ? hexToOklch(value) : value;
      const targets = colorMappings[key] || [`--${key}`];

      targets.forEach((target) => {
        lightTokens[target] = oklch;
        darkTokens[target] = oklch;
      });

      const deltas = variantDeltas[key];
      if (deltas) {
        Object.entries(deltas).forEach(([varName, delta]) => {
          const adjusted = adjustLightness(oklch, delta);
          targets.forEach((target) => {
            lightTokens[`${target}-${varName}`] = adjusted;
            darkTokens[`${target}-${varName}`] = adjusted;
          });
        });
      }
    });
  }

  // Apply typography overrides (only if specified)
  if (theme.typography) {
    if (theme.typography.fontFamily) {
      Object.entries(theme.typography.fontFamily).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const target = fontFamilyMapping(key);
        lightTokens[target] = value;
        darkTokens[target] = value;
      });
    }

    if (theme.typography.fontSize) {
      Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const target = fontSizeMapping(key);
        lightTokens[target] = value;
        darkTokens[target] = value;
      });
    }

    if (theme.typography.fontWeight) {
      Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const target = fontWeightMapping(key);
        lightTokens[target] = value;
        darkTokens[target] = value;
      });
    }
  }

  // Apply spacing overrides (only if specified)
  if (theme.spacing) {
    Object.entries(theme.spacing).forEach(([key, value]) => {
      if (typeof value !== 'string') return;
      const target = spacingMapping(key);
      lightTokens[target] = value;
      darkTokens[target] = value;
    });
  }

  // Apply border radius overrides (only if specified)
  if (theme.borderRadius) {
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      if (typeof value !== 'string') return;
      const target = borderRadiusMapping(key);
      lightTokens[target] = value;
      darkTokens[target] = value;
    });
  }

  return { lightTokens, darkTokens };
}
  /**
   * Generates CSS string from token objects
   */
  generateThemeCSS(
    lightTokens: Record<string, string>,
    darkTokens: Record<string, string>
  ): string {
    return `
:root {
  ${Object.entries(lightTokens)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ')}
}
.dark {
  ${Object.entries(darkTokens)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ')}
}
`.trim();
  }
}

// Singleton instance
export const themeService = new ThemeService();