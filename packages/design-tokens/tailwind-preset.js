// packages/design-tokens/tailwind-preset.js - Tailwind CSS preset for Rentify semantic design tokens

module.exports = {
  theme: {
    extend: {
      colors: {
        rentify: {
          brand: {
            DEFAULT: 'var(--rentify-color-brand-primary)',
            hover: 'var(--rentify-color-brand-primary-hover)',
            active: 'var(--rentify-color-brand-primary-active)',
            subtle: 'var(--rentify-color-brand-primary-subtle)',
            secondary: 'var(--rentify-color-brand-secondary)',
          },
          surface: {
            base: 'var(--rentify-color-surface-base)',
            subtle: 'var(--rentify-color-surface-subtle)',
            muted: 'var(--rentify-color-surface-muted)',
            raised: 'var(--rentify-color-surface-raised)',
            hover: 'var(--rentify-color-surface-hover)',
            overlay: 'var(--rentify-color-surface-overlay)',
          },
          text: {
            primary: 'var(--rentify-color-text-primary)',
            secondary: 'var(--rentify-color-text-secondary)',
            muted: 'var(--rentify-color-text-muted)',
            inverse: 'var(--rentify-color-text-inverse)',
            brand: 'var(--rentify-color-text-brand)',
            disabled: 'var(--rentify-color-text-disabled)',
          },
          border: {
            DEFAULT: 'var(--rentify-color-border-default)',
            subtle: 'var(--rentify-color-border-subtle)',
            strong: 'var(--rentify-color-border-strong)',
            interactive: 'var(--rentify-color-border-interactive)',
            focus: 'var(--rentify-color-border-focus)',
          },
          success: {
            DEFAULT: 'var(--rentify-color-success-base)',
            text: 'var(--rentify-color-success-text)',
            subtle: 'var(--rentify-color-success-subtle)',
            border: 'var(--rentify-color-success-border)',
          },
          warning: {
            DEFAULT: 'var(--rentify-color-warning-base)',
            text: 'var(--rentify-color-warning-text)',
            subtle: 'var(--rentify-color-warning-subtle)',
            border: 'var(--rentify-color-warning-border)',
          },
          danger: {
            DEFAULT: 'var(--rentify-color-danger-base)',
            text: 'var(--rentify-color-danger-text)',
            subtle: 'var(--rentify-color-danger-subtle)',
            border: 'var(--rentify-color-danger-border)',
          },
          info: {
            DEFAULT: 'var(--rentify-color-info-base)',
            text: 'var(--rentify-color-info-text)',
            subtle: 'var(--rentify-color-info-subtle)',
            border: 'var(--rentify-color-info-border)',
          },
        },
      },
      borderRadius: {
        'rentify-xs': 'var(--rentify-radius-xs)',
        'rentify-sm': 'var(--rentify-radius-sm)',
        'rentify-md': 'var(--rentify-radius-md)',
        'rentify-lg': 'var(--rentify-radius-lg)',
        'rentify-xl': 'var(--rentify-radius-xl)',
        'rentify-full': 'var(--rentify-radius-full)',
      },
      boxShadow: {
        'rentify-xs': 'var(--rentify-shadow-xs)',
        'rentify-sm': 'var(--rentify-shadow-sm)',
        'rentify-md': 'var(--rentify-shadow-md)',
        'rentify-lg': 'var(--rentify-shadow-lg)',
        'rentify-focus': 'var(--rentify-shadow-focus)',
      },
      fontFamily: {
        rentify: ['var(--rentify-font-family-body)'],
        'rentify-heading': ['var(--rentify-font-family-heading)'],
        'rentify-mono': ['var(--rentify-font-family-mono)'],
      },
    },
  },
};
