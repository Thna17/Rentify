// packages/design-tokens/index.d.ts - TypeScript type declarations for Rentify design tokens

export interface TokenValue<T = string> {
  value: T;
  type?: string;
  description?: string;
}

export declare const tokens: {
  name: string;
  version: string;
  color: {
    brand: Record<string, TokenValue>;
    surface: Record<string, TokenValue>;
    text: Record<string, TokenValue>;
    border: Record<string, TokenValue>;
    status: {
      success: Record<string, TokenValue>;
      warning: Record<string, TokenValue>;
      danger: Record<string, TokenValue>;
      info: Record<string, TokenValue>;
    };
  };
  typography: Record<string, any>;
  spacing: Record<string, TokenValue>;
  radius: Record<string, TokenValue>;
  shadow: Record<string, TokenValue>;
  breakpoint: Record<string, TokenValue>;
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
