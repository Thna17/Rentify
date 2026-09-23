// services/theme/theme-application.service.ts

import { ThemeService } from './themeService';
import { Theme } from '../../types';

export class ThemeApplicationService {
  private styleElement: HTMLStyleElement | null = null;
  private currentTheme: Theme | null = null;

  constructor(private themeService: ThemeService) {}

  /**
   * Applies the given theme to the DOM.
   * If theme is null/undefined, applies the default base tokens.
   */
  applyThemeToDOM(theme: Theme | null): void {
    // Always re-apply to ensure consistency (safe and simple)
    this.currentTheme = theme;

    // Generate tokens (this handles null → base tokens internally)
    const { lightTokens, darkTokens } = this.themeService.applyThemeToTokens(theme);

    // Generate CSS string
    const css = this.themeService.generateThemeCSS(lightTokens, darkTokens);

    // Optional debug: check if CSS was generated
    // console.log('[ThemeApplicationService] Generated CSS length:', css.length);
    // console.log('[ThemeApplicationService] Sample CSS:', css.substring(0, 300));

    this.injectStyle(css);
  }

  /**
   * Injects the CSS into a <style> tag in <head>
   */
  private injectStyle(css: string): void {
    // Safety: only run in browser environment
    if (typeof document === 'undefined') {
      return;
    }

    // Guard against empty CSS
    if (!css || css.trim() === '') {
      console.warn('[ThemeApplicationService] Empty CSS string received. Skipping injection.');
      return;
    }

    // Create style element if it doesn't exist
    if (!this.styleElement) {
      this.styleElement = document.createElement('style');
      this.styleElement.id = 'theme-style';
      this.styleElement.setAttribute('data-source', 'theme-application-service');
      document.head.appendChild(this.styleElement);
    }

    // Use textContent for <style> elements (more reliable than innerHTML)
    this.styleElement.textContent = css;
  }

  /**
   * Removes the injected style tag (useful for cleanup on unmount)
   */
  cleanup(): void {
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.parentNode.removeChild(this.styleElement);
      this.styleElement = null;
    }
    this.currentTheme = null;
  }

  /**
   * Force re-apply current theme (useful if tokens change externally)
   */
  refresh(): void {
    if (this.currentTheme !== undefined) {
      this.applyThemeToDOM(this.currentTheme);
    }
  }
}

/**
 * Factory function to create a new instance
 */
export const createThemeApplicationService = (themeService: ThemeService): ThemeApplicationService => {
  return new ThemeApplicationService(themeService);
};