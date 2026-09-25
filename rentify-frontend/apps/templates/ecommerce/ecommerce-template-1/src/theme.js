/**
 * Template 1 defaults. Applied underneath the merchant's saved palette and
 * theme configuration, so any value the merchant sets wins. Values go through
 * the same sanitizer as merchant data.
 */
export const template1Theme = {
  colors: {
    primary: '#16504a',
    secondary: '#1f2a2e',
    background: '#f6f6f3',
    text: '#1d2124',
    textSecondary: '#5d6468',
    border: '#e2e2dc',
    success: '#1f7a45',
    warning: '#a15c07',
    error: '#b42318',
  },
  typography: {
    fontFamily: {
      primary: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      secondary: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    },
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.25rem',
  },
};
