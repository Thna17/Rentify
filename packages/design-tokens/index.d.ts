// packages/design-tokens/index.d.ts - TypeScript type declarations for Rentify design tokens

export interface TokenValue<T = string> {
  value: T;
  type?: string;
  description?: string;
}

export interface ColorTokens {
  brand: Record<string, TokenValue>;
  surface: Record<string, TokenValue>;
  text: Record<string, TokenValue>;
  border: Record<string, TokenValue>;
  status: {
    success: Record<string, TokenValue>;
    warning: Record<string, TokenValue>;
    danger: Record<string, TokenValue>;
    info: Record<string, TokenValue>;
    neutral: Record<string, TokenValue>;
  };
  price: Record<string, TokenValue>;
}

export interface TypeScaleStep {
  mobile: { size: string; lineHeight: string };
  desktop: { size: string; lineHeight: string };
  weight: string;
  family?: 'mono';
}

export declare const tokens: {
  name: string;
  version: string;
  color: ColorTokens;
  theme: {
    dark: {
      description?: string;
      color: { [K in keyof ColorTokens]?: Partial<ColorTokens[K]> };
      focus: Record<string, TokenValue>;
    };
  };
  typography: {
    fontFamily: Record<'body' | 'heading' | 'mono', TokenValue>;
    fontSize: Record<string, TokenValue & { lineHeight: string }>;
    scale: Record<string, TypeScaleStep | string>;
    khmerLineHeightMultiplier: TokenValue;
    fontWeight: Record<string, TokenValue>;
  };
  spacing: Record<string, TokenValue>;
  radius: Record<string, TokenValue>;
  shadow: Record<string, TokenValue>;
  breakpoint: Record<string, TokenValue>;
  layout: Record<string, TokenValue>;
  focus: Record<string, TokenValue>;
  disabled: Record<string, TokenValue>;
  motion: Record<string, TokenValue>;
};

export declare const cssVariables: Record<string, string>;

export declare function getLuminance(hex: string): number;
export declare function getContrastRatio(foregroundHex: string, backgroundHex: string): number;
export declare function isAccessible(
  foregroundHex: string,
  backgroundHex: string,
  level?: 'AA' | 'AAA',
  size?: 'normal' | 'large'
): boolean;
