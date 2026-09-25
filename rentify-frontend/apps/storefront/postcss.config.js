// Each template stylesheet names its own Tailwind config with `@config`, so
// Template 1 and Template 2 keep their own design tokens in this shared app.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
