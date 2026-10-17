/**
 * Template 3 defaults: a café palette of roasted caramel and espresso on warm
 * cream, with a soft serif display face. Applied underneath the merchant's
 * saved palette and theme configuration, so any value the merchant sets wins.
 * Values go through the same sanitizer as merchant data.
 */
export const template3Theme = {
  colors: {
    primary: '#8a4b2a',
    secondary: '#2b1d16',
    accent: '#f3e7d8',
    // No `surface` here: the theme service writes it to --accent and --muted as
    // well, which would flatten the latte accent to white.
    background: '#fbf7f1',
    text: '#2b1d16',
    textSecondary: '#6f5d52',
    border: '#eadfd2',
    success: '#2f7a4d',
    warning: '#a15c07',
    error: '#b42318',
  },
  typography: {
    fontFamily: {
      primary: 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      secondary: 'Fraunces, "Noto Serif Khmer", Georgia, "Times New Roman", serif',
    },
  },
  borderRadius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1.5rem',
  },
};
