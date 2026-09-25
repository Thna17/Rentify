// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest';
import { readableForeground, resolveStorefrontTheme, sanitizeColor, sanitizeTheme } from '@rentify/storefront/theme';
import { themeService } from '@rentify/shared/Services/themes/themeService';
import { createThemeApplicationService } from '@rentify/shared/Services/themes/themeApplicationService';
import { template1Theme } from '../theme';

const presets = {
  luxuryGoldTheme: { colors: { primary: '#D4AF37', secondary: '#1A1A1A' } },
};

describe('theme fallback', () => {
  test('uses Template 1 defaults when the merchant has no theme data', () => {
    const theme = resolveStorefrontTheme({ fallback: template1Theme });
    expect(theme.colors.primary).toBe('#16504a');
    expect(theme.colors['primary-foreground']).toBe('0.99 0 0');
  });

  test.each([null, 'blue', 42, [], { colors: 'red' }, { colors: { primary: 'url(evil)' } }])(
    'falls back to defaults for malformed theme data: %j',
    (customTheme) => {
      const theme = resolveStorefrontTheme({ customTheme, palette: customTheme, fallback: template1Theme });
      expect(theme.colors.primary).toBe('#16504a');
    }
  );

  test('returns null when there is neither merchant data nor a fallback', () => {
    expect(resolveStorefrontTheme({})).toBeNull();
  });
});

describe('merchant theme', () => {
  test('applies a saved palette color map over the defaults', () => {
    const theme = resolveStorefrontTheme({
      palette: { primary: '#2D6A4F', secondary: '#52B788', background: '#F8F9FA' },
      fallback: template1Theme,
    });
    expect(theme.colors).toMatchObject({ primary: '#2d6a4f', secondary: '#52b788', background: '#f8f9fa', text: '#1d2124' });
  });

  test('resolves a named palette preset', () => {
    const theme = resolveStorefrontTheme({ palette: 'luxuryGoldTheme', presets, fallback: template1Theme });
    expect(theme.colors.primary).toBe('#d4af37');
    // Gold is light, so action text switches to dark for contrast.
    expect(theme.colors['primary-foreground']).toBe('0.2 0 0');
  });

  test('theme configuration takes precedence over the palette', () => {
    const theme = resolveStorefrontTheme({
      customTheme: { colors: { primary: '#7c3aed' } },
      palette: { primary: '#2D6A4F' },
      fallback: template1Theme,
    });
    expect(theme.colors.primary).toBe('#7c3aed');
    expect(theme.colors.ring).toBe('#7c3aed');
  });
});

describe('CSS injection protection', () => {
  test('drops values that could escape the generated CSS rule', () => {
    const theme = sanitizeTheme({
      colors: {
        primary: 'red; } body { display: none',
        secondary: '#123456',
        '--evil': '#000000',
        background: 'expression(alert(1))',
      },
      typography: { fontFamily: { primary: 'Inter; } * { color: red' } },
      borderRadius: { md: '4px; background: url(x)' },
    });
    expect(theme).toEqual({ colors: { secondary: '#123456' } });
  });

  test('accepts only hex and OKLCH triplets as colors', () => {
    expect(sanitizeColor('#abc')).toBe('#aabbcc');
    expect(sanitizeColor('0.62 0.14 185')).toBe('0.62 0.14 185');
    expect(sanitizeColor('rgb(0,0,0)')).toBeNull();
    expect(sanitizeColor('#12345')).toBeNull();
  });

  test('picks readable text for light and dark actions', () => {
    expect(readableForeground('#ffffff')).toBe('0.2 0 0');
    expect(readableForeground('#16504a')).toBe('0.99 0 0');
  });
});

describe('dynamic theme application', () => {
  const service = createThemeApplicationService(themeService);
  afterEach(() => service.cleanup());

  const primaryToken = () => document.getElementById('theme-style')?.textContent.match(/--primary: ([^;]+);/)?.[1];

  test('writes the merchant palette to CSS variables and updates when it changes', () => {
    service.applyThemeToDOM(resolveStorefrontTheme({ palette: { primary: '#2D6A4F' }, fallback: template1Theme }));
    const first = primaryToken();
    expect(first).toMatch(/^0\.\d+ 0\.\d+ \d+/);

    service.applyThemeToDOM(resolveStorefrontTheme({ palette: { primary: '#B91C1C' }, fallback: template1Theme }));
    const second = primaryToken();
    expect(second).not.toBe(first);
    expect(document.querySelectorAll('#theme-style')).toHaveLength(1);
  });

  test('never writes rejected merchant input into the stylesheet', () => {
    service.applyThemeToDOM(
      resolveStorefrontTheme({ customTheme: { colors: { primary: '#000; } body { display:none' } }, fallback: template1Theme })
    );
    const css = document.getElementById('theme-style').textContent;
    expect(css).not.toContain('display:none');
    expect(css.match(/\{/g)).toHaveLength(2); // only the :root and .dark rules
  });
});
