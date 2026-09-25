/**
 * Template 2 defaults: deep botanical green on warm cream with a serif display
 * face. Applied underneath the merchant's saved palette and theme
 * configuration, so any value the merchant sets wins. Values go through the
 * same sanitizer as merchant data.
 */
export const template2Theme = {
  colors: {
    primary: '#2f5b45',
    secondary: '#1f2b25',
    accent: '#eef0e8',
    // No `surface` here: the theme service writes it to --accent and --muted as
    // well, which would flatten the soft sage accent to white.
    background: '#faf9f5',
    text: '#1d2420',
    textSecondary: '#5c655f',
    border: '#e6e4dc',
    success: '#2f7a4d',
    warning: '#a15c07',
    error: '#b42318',
  },
  typography: {
    fontFamily: {
      primary: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      secondary: '"Playfair Display", "Noto Serif Khmer", Georgia, "Times New Roman", serif',
    },
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.25rem',
  },
};
