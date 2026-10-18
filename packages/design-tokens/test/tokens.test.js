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
  const statusTypes = ['success', 'warning', 'danger', 'info'];
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
