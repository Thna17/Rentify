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
          accent: {
            DEFAULT: 'var(--rentify-color-brand-accent)',
            subtle: 'var(--rentify-color-brand-accent-subtle)',
          },
          surface: {
            base: 'var(--rentify-color-surface-base)',
            canvas: 'var(--rentify-color-surface-canvas)',
            subtle: 'var(--rentify-color-surface-subtle)',
            muted: 'var(--rentify-color-surface-muted)',
            raised: 'var(--rentify-color-surface-raised)',
            hover: 'var(--rentify-color-surface-hover)',
            inverse: 'var(--rentify-color-surface-inverse)',
            overlay: 'var(--rentify-color-surface-overlay)',
          },
          text: {
            primary: 'var(--rentify-color-text-primary)',
            secondary: 'var(--rentify-color-text-secondary)',
            muted: 'var(--rentify-color-text-muted)',
            inverse: 'var(--rentify-color-text-inverse)',
            brand: 'var(--rentify-color-text-brand)',
            'on-accent': 'var(--rentify-color-text-on-accent)',
            disabled: 'var(--rentify-color-text-disabled)',
          },
          border: {
            DEFAULT: 'var(--rentify-color-border-default)',
            subtle: 'var(--rentify-color-border-subtle)',
            strong: 'var(--rentify-color-border-strong)',
            input: 'var(--rentify-color-border-input)',
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
          neutral: {
            DEFAULT: 'var(--rentify-color-neutral-base)',
            text: 'var(--rentify-color-neutral-text)',
            subtle: 'var(--rentify-color-neutral-subtle)',
            border: 'var(--rentify-color-neutral-border)',
          },
          price: {
            sale: 'var(--rentify-color-price-sale)',
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
      fontSize: {
        'rentify-display': [
          'var(--rentify-text-display-size)',
          { lineHeight: 'var(--rentify-text-display-line-height)', fontWeight: 'var(--rentify-text-display-weight)' },
        ],
        'rentify-h1': [
          'var(--rentify-text-h1-size)',
          { lineHeight: 'var(--rentify-text-h1-line-height)', fontWeight: 'var(--rentify-text-h1-weight)' },
        ],
        'rentify-h2': [
          'var(--rentify-text-h2-size)',
          { lineHeight: 'var(--rentify-text-h2-line-height)', fontWeight: 'var(--rentify-text-h2-weight)' },
        ],
        'rentify-h3': [
          'var(--rentify-text-h3-size)',
          { lineHeight: 'var(--rentify-text-h3-line-height)', fontWeight: 'var(--rentify-text-h3-weight)' },
        ],
        'rentify-body': [
          'var(--rentify-text-body-size)',
          { lineHeight: 'var(--rentify-text-body-line-height)', fontWeight: 'var(--rentify-text-body-weight)' },
        ],
        'rentify-body-sm': [
          'var(--rentify-text-body-sm-size)',
          { lineHeight: 'var(--rentify-text-body-sm-line-height)', fontWeight: 'var(--rentify-text-body-sm-weight)' },
        ],
        'rentify-label': [
          'var(--rentify-text-label-size)',
          { lineHeight: 'var(--rentify-text-label-line-height)', fontWeight: 'var(--rentify-text-label-weight)' },
        ],
        'rentify-caption': [
          'var(--rentify-text-caption-size)',
          { lineHeight: 'var(--rentify-text-caption-line-height)', fontWeight: 'var(--rentify-text-caption-weight)' },
        ],
        'rentify-price-lg': [
          'var(--rentify-text-price-lg-size)',
          { lineHeight: 'var(--rentify-text-price-lg-line-height)', fontWeight: 'var(--rentify-text-price-lg-weight)' },
        ],
        'rentify-price': [
          'var(--rentify-text-price-size)',
          { lineHeight: 'var(--rentify-text-price-line-height)', fontWeight: 'var(--rentify-text-price-weight)' },
        ],
      },
      maxWidth: {
        'rentify-content': 'var(--rentify-layout-content-max)',
      },
      transitionDuration: {
        'rentify-fast': 'var(--rentify-transition-duration-fast)',
        'rentify-base': 'var(--rentify-transition-duration-base)',
        'rentify-slow': 'var(--rentify-transition-duration-slow)',
      },
      fontFamily: {
        rentify: ['var(--rentify-font-family-body)'],
        'rentify-heading': ['var(--rentify-font-family-heading)'],
        'rentify-mono': ['var(--rentify-font-family-mono)'],
      },
    },
  },
};
