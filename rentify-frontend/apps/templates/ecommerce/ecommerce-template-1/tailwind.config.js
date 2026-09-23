const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    join(
      __dirname,
      '{src,pages/*,pages/*/components/*,components/*,app}/**/*!(*.stories|*.spec).{ts,tsx,html,jsx}'
    ),
    join(
      __dirname,
      '../../../../../libs/ui/src/shadcn/components/**/*.{js,ts,jsx,tsx}'
    ),
    join(__dirname, '../../../../../libs/ui-page/src/**/*.{js,ts,jsx,tsx}'),
    join(
      __dirname,
      '../../../../libs/product-management/src/**/*.{js,ts,jsx,tsx}'
    ),
    join(
      __dirname,
      '../../../../libs/shared/src/**/*.{js,ts,jsx,tsx}'
    ),
  ],
  theme: {
    extend: {
      colors: {
        primary: 'oklch(var(--primary))',
        'primary-foreground': 'oklch(var(--primary-foreground))',
        secondary: 'oklch(var(--secondary))',
        'secondary-foreground': 'oklch(var(--secondary-foreground))',
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        card: 'oklch(var(--card))',
        'card-foreground': 'oklch(var(--card-foreground))',
        popover: 'oklch(var(--popover))',
        'popover-foreground': 'oklch(var(--popover-foreground))',
        border: 'oklch(var(--border))',
        input: 'oklch(var(--input))',
        ring: 'oklch(var(--ring))',
        success: 'oklch(var(--success))',
        'success-foreground': 'oklch(var(--success-foreground))',
        warning: 'oklch(var(--warning))',
        'warning-foreground': 'oklch(var(--warning-foreground))',
        error: 'oklch(var(--error))',
        'error-foreground': 'oklch(var(--error-foreground))',
      },
      fontFamily: {
        primary: 'var(--font-primary, Inter, sans-serif)',
        secondary: 'var(--font-secondary, Inter, sans-serif)',
      },
      fontSize: {
        xs: 'var(--text-xs, 0.75rem)',
        sm: 'var(--text-sm, 0.875rem)',
        base: 'var(--text-base, 1rem)',
        lg: 'var(--text-lg, 1.125rem)',
        xl: 'var(--text-xl, 1.25rem)',
        '2xl': 'var(--text-2xl, 1.5rem)',
        '3xl': 'var(--text-3xl, 1.875rem)',
      },
      spacing: {
        xs: 'var(--spacing-xs, 0.5rem)',
        sm: 'var(--spacing-sm, 0.75rem)',
        md: 'var(--spacing-md, 1rem)',
        lg: 'var(--spacing-lg, 1.5rem)',
        xl: 'var(--spacing-xl, 2rem)',
        '2xl': 'var(--spacing-2xl, 3rem)', // Added for larger sections like heroes
      },
      borderRadius: {
        sm: 'var(--radius-sm, 0.375rem)',
        md: 'var(--radius-md, 0.5rem)',
        lg: 'var(--radius-lg, 0.75rem)',
        xl: 'var(--radius-xl, 1rem)', // Added for softer product images
        full: 'var(--radius-full, 9999px)',
      },
      fontWeight: {
        normal: 'var(--font-weight-normal, 400)',
        medium: 'var(--font-weight-medium, 500)',
        semibold: 'var(--font-weight-semibold, 600)',
        bold: 'var(--font-weight-bold, 700)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
