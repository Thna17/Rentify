// packages/design-tokens/contrast-validator.js - Deterministic WCAG 2.1 contrast ratio verification

const { tokens, getContrastRatio } = require('./index');

const REQUIRED_PAIRS = [
  // Text on white background
  { name: 'Primary Text on White Surface', fg: tokens.color.text.primary.value, bg: tokens.color.surface.base.value, minRatio: 4.5, level: 'AA' },
  { name: 'Secondary Text on White Surface', fg: tokens.color.text.secondary.value, bg: tokens.color.surface.base.value, minRatio: 4.5, level: 'AA' },
  { name: 'Muted Text on White Surface', fg: tokens.color.text.muted.value, bg: tokens.color.surface.base.value, minRatio: 4.5, level: 'AA' },
  { name: 'Brand Text on White Surface', fg: tokens.color.text.brand.value, bg: tokens.color.surface.base.value, minRatio: 4.5, level: 'AA' },

  // Text on subtle background
  { name: 'Primary Text on Subtle Surface', fg: tokens.color.text.primary.value, bg: tokens.color.surface.subtle.value, minRatio: 4.5, level: 'AA' },
  { name: 'Secondary Text on Subtle Surface', fg: tokens.color.text.secondary.value, bg: tokens.color.surface.subtle.value, minRatio: 4.5, level: 'AA' },

  // Inverse text on brand primary button
  { name: 'Inverse Text on Primary Brand', fg: tokens.color.text.inverse.value, bg: tokens.color.brand.primary.value, minRatio: 4.5, level: 'AA' },
  { name: 'Inverse Text on Primary Brand Hover', fg: tokens.color.text.inverse.value, bg: tokens.color.brand.primaryHover.value, minRatio: 4.5, level: 'AA' },

  // Status text on status subtle surfaces
  { name: 'Success Text on Success Subtle', fg: tokens.color.status.success.text.value, bg: tokens.color.status.success.subtle.value, minRatio: 4.5, level: 'AA' },
  { name: 'Warning Text on Warning Subtle', fg: tokens.color.status.warning.text.value, bg: tokens.color.status.warning.subtle.value, minRatio: 4.5, level: 'AA' },
  { name: 'Danger Text on Danger Subtle', fg: tokens.color.status.danger.text.value, bg: tokens.color.status.danger.subtle.value, minRatio: 4.5, level: 'AA' },
  { name: 'Info Text on Info Subtle', fg: tokens.color.status.info.text.value, bg: tokens.color.status.info.subtle.value, minRatio: 4.5, level: 'AA' },

  // Non-text contrast (UI component boundaries and focus)
  { name: 'Strong Border on White Surface', fg: tokens.color.border.strong.value, bg: tokens.color.surface.base.value, minRatio: 1.4, level: 'Component' },
  { name: 'Focus Ring on White Surface', fg: tokens.focus.ringColor.value, bg: tokens.color.surface.base.value, minRatio: 3.0, level: 'Focus Ring' },
];

function validateContrast() {
  const results = [];
  let failures = 0;

  for (const pair of REQUIRED_PAIRS) {
    const ratio = getContrastRatio(pair.fg, pair.bg);
    const passed = ratio >= pair.minRatio;
    results.push({
      ...pair,
      ratio: Number(ratio.toFixed(2)),
      passed,
    });
    if (!passed) failures++;
  }

  return { results, failures };
}

if (require.main === module) {
  console.log('--- Rentify Semantic Design Tokens: WCAG 2.1 Contrast Audit ---');
  const { results, failures } = validateContrast();

  for (const r of results) {
    const mark = r.passed ? '✅' : '❌';
    console.log(`${mark} ${r.name.padEnd(40)} ${r.fg} on ${r.bg} -> ${r.ratio}:1 (Required: ${r.minRatio}:1 [${r.level}])`);
  }

  if (failures > 0) {
    console.error(`\n❌ Contrast validation failed with ${failures} violations.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${results.length} contrast pairs pass WCAG 2.1 accessibility criteria!`);
  }
}

module.exports = {
  REQUIRED_PAIRS,
  validateContrast,
};
