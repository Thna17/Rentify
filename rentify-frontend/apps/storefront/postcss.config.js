// Each template stylesheet names its own Tailwind config with `@config`, so
// every template keeps their own design tokens in this shared app.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
