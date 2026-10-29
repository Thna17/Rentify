// packages/design-tokens/test/tokens.test.js - Unit tests for design tokens, contrast ratios, and accessibility

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  tokens,
  cssVariables,
  getLuminance,
  getContrastRatio,
  isAccessible,
} = require('../index');
const { validateContrast } = require('../contrast-validator');

test('tokens schema: all required design token domains exist with valid types', () => {
  // 1. Color categories
  assert.ok(tokens.color.brand.primary.value);
  assert.ok(tokens.color.surface.base.value);
  assert.ok(tokens.color.surface.subtle.value);
  assert.ok(tokens.color.text.primary.value);
  assert.ok(tokens.color.text.secondary.value);
  assert.ok(tokens.color.text.muted.value);
  assert.ok(tokens.color.border.default.value);
  assert.ok(tokens.color.border.strong.value);

  // 2. Status colors (success, warning, danger, info)
  const statusTypes = ['success', 'warning', 'danger', 'info', 'neutral'];
  for (const st of statusTypes) {
    assert.ok(tokens.color.status[st].base.value, `status ${st} base must exist`);
    assert.ok(tokens.color.status[st].text.value, `status ${st} text must exist`);
    assert.ok(tokens.color.status[st].subtle.value, `status ${st} subtle must exist`);
    assert.ok(tokens.color.status[st].border.value, `status ${st} border must exist`);
  }

  // 3. Typography
  assert.ok(tokens.typography.fontFamily.body.value);
  assert.ok(tokens.typography.fontSize.base.value);
  assert.ok(tokens.typography.fontWeight.semibold.value);

  // 4. Spacing
  assert.ok(tokens.spacing['1'].value);
  assert.ok(tokens.spacing['4'].value);
  assert.ok(tokens.spacing['16'].value);

  // 5. Radius
  assert.ok(tokens.radius.sm.value);
  assert.ok(tokens.radius.md.value);
  assert.ok(tokens.radius.full.value);

  // 6. Shadows
  assert.ok(tokens.shadow.sm.value);
  assert.ok(tokens.shadow.focus.value);

  // 7. Breakpoints
  assert.ok(tokens.breakpoint.sm.value);
  assert.ok(tokens.breakpoint.lg.value);

  // 8. Focus & Disabled
  assert.ok(tokens.focus.ringColor.value);
  assert.ok(tokens.disabled.opacity.value);
  assert.ok(tokens.disabled.text.value);

  // 9. Motion
  assert.ok(tokens.motion.durationBase.value);
  assert.ok(tokens.motion.timingStandard.value);
});

test('accessibility: contrast ratios meet WCAG 2.1 AA requirements across all semantic pairs', () => {
  const { results, failures } = validateContrast();
  assert.equal(failures, 0, `Expected 0 contrast failures, got ${failures}`);

  // Specifically assert critical text readability
  assert.ok(getContrastRatio(tokens.color.text.primary.value, '#ffffff') >= 14.0, 'Primary text contrast on white must be >= 14:1');
  assert.ok(getContrastRatio(tokens.color.text.secondary.value, '#ffffff') >= 7.0, 'Secondary text contrast on white must be >= 7:1');
  assert.ok(getContrastRatio(tokens.color.text.muted.value, '#ffffff') >= 4.5, 'Muted text contrast on white must be >= 4.5:1');
  assert.ok(getContrastRatio(tokens.color.text.inverse.value, tokens.color.brand.primary.value) >= 4.5, 'White text on primary button must be >= 4.5:1');

  // Status badges text readability on subtle tinted backgrounds
  assert.ok(isAccessible(tokens.color.status.success.text.value, tokens.color.status.success.subtle.value, 'AA'));
  assert.ok(isAccessible(tokens.color.status.warning.text.value, tokens.color.status.warning.subtle.value, 'AA'));
  assert.ok(isAccessible(tokens.color.status.danger.text.value, tokens.color.status.danger.subtle.value, 'AA'));
  assert.ok(isAccessible(tokens.color.status.info.text.value, tokens.color.status.info.subtle.value, 'AA'));
});

test('focus visibility: keyboard focus ring provides high contrast against surfaces', () => {
  const focusRingColor = tokens.focus.ringColor.value;
  const whiteSurface = tokens.color.surface.base.value;
  const ringContrast = getContrastRatio(focusRingColor, whiteSurface);
  assert.ok(ringContrast >= 3.0, `Focus ring must meet non-text contrast >= 3:1 (got ${ringContrast}:1)`);
});

test('css adapter: index.css contains all semantic variables and reduced-motion guard', () => {
  const cssPath = path.resolve(__dirname, '../index.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  // Core variables present
  assert.ok(cssContent.includes('--rentify-color-brand-primary'));
  assert.ok(cssContent.includes('--rentify-color-surface-base'));
  assert.ok(cssContent.includes('--rentify-color-text-primary'));
  assert.ok(cssContent.includes('--rentify-color-success-subtle'));
  assert.ok(cssContent.includes('--rentify-color-warning-text'));
  assert.ok(cssContent.includes('--rentify-shadow-focus'));
  assert.ok(cssContent.includes('--rentify-focus-ring-color'));

  // Reduced motion media query present
  assert.ok(cssContent.includes('@media (prefers-reduced-motion: reduce)'));
});

// CSS variable for a color token path, e.g. ['status', 'success', 'base'] -> --rentify-color-success-base
const kebab = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
function cssNameFor(path) {
  if (path[0] === 'status') return `--rentify-color-${path[1]}-${kebab(path[2])}`;
  return `--rentify-color-${path[0]}-${kebab(path[1])}`;
}

function colorEntries(group, path = []) {
  return Object.entries(group).flatMap(([key, value]) =>
    value && typeof value === 'object' && 'value' in value
      ? [[[...path, key], value.value]]
      : colorEntries(value, [...path, key])
  );
}

function declarations(block) {
  return Object.fromEntries(
    [...block.matchAll(/(--rentify-[a-z0-9-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim().toLowerCase()])
  );
}

const css = fs.readFileSync(path.resolve(__dirname, '../index.css'), 'utf8');
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));
const darkBlock = css.slice(css.indexOf("[data-theme='dark'] {"), css.indexOf('}', css.indexOf("[data-theme='dark'] {")));
const systemStart = css.indexOf("[data-theme='system'] {");
const systemBlock = css.slice(systemStart, css.indexOf('}', systemStart));

test('jade & saffron: brand values and new v1 tokens exist (02 §2)', () => {
  assert.equal(tokens.color.brand.primary.value, '#0e6b5c');
  assert.equal(tokens.color.brand.primaryHover.value, '#0a5549');
  assert.equal(tokens.color.brand.primarySubtle.value, '#e3f2ee');
  assert.equal(tokens.color.brand.accent.value, '#f2a516');
  assert.equal(tokens.color.brand.accentSubtle.value, '#fdf3dc');
  assert.equal(tokens.color.surface.canvas.value, '#faf8f4');
  assert.equal(tokens.color.surface.inverse.value, '#111418');
  assert.equal(tokens.color.border.input.value, '#8b867d');
  assert.equal(tokens.color.status.neutral.base.value, '#5b616b');
  assert.equal(tokens.color.price.sale.value, '#c2261c');
  assert.equal(tokens.focus.ringColor.value, tokens.color.brand.primary.value);
});

test('css adapter: every light color token matches its :root variable', () => {
  const declared = declarations(rootBlock);
  for (const [tokenPath, value] of colorEntries(tokens.color)) {
    const name = cssNameFor(tokenPath);
    assert.equal(declared[name], value.toLowerCase(), `${name} must equal color.${tokenPath.join('.')}`);
  }
  assert.equal(declared['--rentify-focus-ring-color'], tokens.focus.ringColor.value);
});

test('dark theme: opt-in blocks match tokens.theme.dark and never apply to :root by default', () => {
  const dark = declarations(darkBlock);
  const system = declarations(systemBlock);
  for (const [tokenPath, value] of colorEntries(tokens.theme.dark.color)) {
    const name = cssNameFor(tokenPath);
    assert.equal(dark[name], value.toLowerCase(), `[data-theme=dark] ${name}`);
    assert.equal(system[name], value.toLowerCase(), `[data-theme=system] ${name}`);
  }
  assert.equal(dark['--rentify-focus-ring-color'], tokens.theme.dark.focus.ringColor.value);
  // Apps that still hard-code light colors must not be darkened by the OS setting
  assert.ok(!/prefers-color-scheme:\s*dark\)\s*{\s*:root/.test(css));
});

test('typography: Kantumruy Pro, JetBrains Mono and the Khmer line-height rule', () => {
  assert.match(tokens.typography.fontFamily.body.value, /^'Kantumruy Pro'/);
  assert.match(tokens.typography.fontFamily.mono.value, /^'JetBrains Mono'/);
  assert.equal(tokens.typography.khmerLineHeightMultiplier.value, '1.15');
  for (const step of ['display', 'h1', 'h2', 'h3', 'body', 'bodySm', 'label', 'caption', 'priceLg', 'price']) {
    assert.ok(tokens.typography.scale[step].mobile.size, `scale ${step}`);
    assert.ok(css.includes(`--rentify-text-${kebab(step)}-size:`), `css scale ${step}`);
  }
  assert.ok(css.includes(':lang(km) {'));
  assert.ok(css.includes('--rentify-line-height-km-multiplier: 1.15;'));
  // Captions are the smallest text anywhere (12px)
  assert.equal(tokens.typography.scale.caption.mobile.size, '0.75rem');
});

test('shape and motion follow 02 §4', () => {
  assert.deepEqual(
    ['xs', 'sm', 'md', 'lg', 'xl'].map((key) => tokens.radius[key].value),
    ['4px', '8px', '12px', '16px', '24px']
  );
  assert.equal(tokens.motion.durationFast.value, '120ms');
  assert.equal(tokens.motion.durationSlow.value, '260ms');
  assert.equal(tokens.layout.contentMax.value, '1280px');
});

test('versions agree between tokens.json and package.json', () => {
  const pkg = require('../package.json');
  assert.equal(tokens.version, pkg.version);
});
