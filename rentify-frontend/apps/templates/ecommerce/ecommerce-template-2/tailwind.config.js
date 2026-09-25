const { join } = require('path');

// Theme tokens are OKLCH triplets written to CSS variables by the storefront
// theme service, so every color accepts Tailwind's opacity modifier.
const token = (name) => `oklch(var(--${name}) / <alpha-value>)`;
// Line heights come from CSS variables so the Khmer locale can give stacked
// vowels and subscript consonants more room (see styles.css).
const size = (name, fontSize) => [fontSize, { lineHeight: `var(--leading-${name})` }];

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'index.html'),
    join(__dirname, 'src/**/*.{js,jsx,ts,tsx}'),
    join(__dirname, '../../../../libs/storefront/src/**/*.{js,jsx,ts,tsx}'),
  ],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: token('card'),
        'card-foreground': token('card-foreground'),
        popover: token('popover'),
        'popover-foreground': token('popover-foreground'),
        primary: token('primary'),
        'primary-foreground': token('primary-foreground'),
        secondary: token('secondary'),
        'secondary-foreground': token('secondary-foreground'),
        muted: token('muted'),
        'muted-foreground': token('muted-foreground'),
        accent: token('accent'),
        'accent-foreground': token('accent-foreground'),
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        success: token('success'),
        warning: token('warning'),
        error: token('error'),
        destructive: token('error'),
      },
      fontSize: {
        xs: size('xs', '0.75rem'),
        sm: size('sm', '0.875rem'),
        base: size('base', '1rem'),
        lg: size('lg', '1.125rem'),
        xl: size('xl', '1.25rem'),
        '2xl': size('2xl', '1.5rem'),
        '3xl': size('3xl', '1.875rem'),
        '4xl': size('4xl', '2.25rem'),
        '5xl': size('5xl', '3rem'),
      },
      fontFamily: {
        sans: ['var(--font-primary)'],
        display: ['var(--font-secondary)'],
        script: ['Caveat', 'var(--font-secondary)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm, 0.375rem)',
        md: 'var(--radius-md, 0.625rem)',
        lg: 'var(--radius-lg, 0.875rem)',
        xl: 'var(--radius-xl, 1.25rem)',
      },
      maxWidth: {
        store: '80rem',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
