/**
 * Template 2 defaults: midnight navy and blue with a clean sans-serif display
 * face. Applied underneath the merchant's saved palette and theme
 * configuration, so any value the merchant sets wins. Values go through the
 * same sanitizer as merchant data.
 */
export const template2Theme = {
  colors: {
    primary: '#4d8eff',
    secondary: '#17253b',
    accent: '#17253b',
    // The shared theme service sets card, popover and muted colors from surface.
    // Supply a dark surface so its light defaults cannot override this theme.
    surface: '#131e30',
    background: '#0b1120',
    text: '#f7f9fc',
    textSecondary: '#a6b7cc',
    border: '#293a52',
    success: '#2f7a4d',
    warning: '#a15c07',
    error: '#b42318',
  },
  typography: {
    fontFamily: {
      primary: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      secondary: 'Inter, "Segoe UI", "Noto Sans Khmer", Arial, sans-serif',
    },
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.25rem',
  },
};
