import type { Theme } from '../types';

export const templateThemes: Record<string, Record<string, Theme>> = {
  '1': {
    luxuryGoldTheme: {
      colors: {
        primary: '#D4AF37',
        secondary: '#1A1A1A',
        accent: '#C9A227',
        background: '#FFFFFF',
        surface: '#FAFAFA',
        text: '#1A1A1A',
        textSecondary: '#666666',
        border: '#E5E5E5',
      },
      typography: {
        fontFamily: {
          primary: 'Playfair Display, serif',
          secondary: 'Inter, sans-serif',
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        full: '9999px',
      },
    },
    modernEcommerceTheme: {
      colors: {
        primary: '#000000',
        secondary: '#666666',
        accent: '#FF4444',
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textSecondary: '#666666',
        border: '#E5E5E5',
      },
      typography: {
        fontFamily: {
          primary: 'Inter, sans-serif',
          secondary: 'Inter, sans-serif',
        },
        fontSize: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          semibold: '600',
          bold: '700',
        },
      },
      spacing: {
        xs: '0.5rem',
        sm: '0.75rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem',
      },
      borderRadius: {
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        full: '9999px',
      },
    },
  },
};

// Template 2 is another ecommerce storefront. It supports the same merchant
// palette keys as Template 1 while keeping its layout and components distinct.
templateThemes['2'] = templateThemes['1'];
