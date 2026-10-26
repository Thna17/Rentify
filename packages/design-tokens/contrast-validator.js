// packages/design-tokens/contrast-validator.js - Deterministic WCAG 2.2 contrast ratio verification

const { tokens, getContrastRatio } = require('./index');

const STATUSES = ['success', 'warning', 'danger', 'info', 'neutral'];

// The same pairs are checked for the light palette and for each theme
function pairsFor(color, focus, theme) {
  const v = (token) => token.value;
  const label = (name) => (theme ? `[${theme}] ${name}` : name);
  const text = (name, fg, bg) => ({ name: label(name), fg: v(fg), bg: v(bg), minRatio: 4.5, level: 'AA' });
  const nonText = (name, fg, bg, level) => ({ name: label(name), fg: v(fg), bg: v(bg), minRatio: 3.0, level });

  return [
    // Text on page surfaces
    text('Primary Text on Base Surface', color.text.primary, color.surface.base),
    text('Secondary Text on Base Surface', color.text.secondary, color.surface.base),
    text('Muted Text on Base Surface', color.text.muted, color.surface.base),
    text('Brand Text on Base Surface', color.text.brand, color.surface.base),
    text('Primary Text on Canvas', color.text.primary, color.surface.canvas),
    text('Secondary Text on Canvas', color.text.secondary, color.surface.canvas),
    text('Muted Text on Canvas', color.text.muted, color.surface.canvas),
    text('Brand Text on Canvas', color.text.brand, color.surface.canvas),
    text('Primary Text on Subtle Surface', color.text.primary, color.surface.subtle),
    text('Secondary Text on Subtle Surface', color.text.secondary, color.surface.subtle),
    text('Muted Text on Subtle Surface', color.text.muted, color.surface.subtle),
    text('Brand Text on Brand Subtle', color.text.brand, color.brand.primarySubtle),
    text('Primary Text on Brand Subtle', color.text.primary, color.brand.primarySubtle),
    text('Sale Price on Base Surface', color.price.sale, color.surface.base),
    text('Sale Price on Canvas', color.price.sale, color.surface.canvas),

    // Brand and inverse surfaces
    text('Inverse Text on Primary Brand', color.text.inverse, color.brand.primary),
    text('Inverse Text on Primary Brand Hover', color.text.inverse, color.brand.primaryHover),
    text('Inverse Text on Primary Brand Active', color.text.inverse, color.brand.primaryActive),
    text('Inverse Text on Inverse Surface', color.text.inverse, color.surface.inverse),
    text('On-Accent Text on Accent', color.text.onAccent, color.brand.accent),
    text('Primary Text on Accent Subtle', color.text.primary, color.brand.accentSubtle),

    // Status text on status subtle surfaces
    ...STATUSES.map((status) =>
      text(
        `${status[0].toUpperCase()}${status.slice(1)} Text on ${status} Subtle`,
        color.status[status].text,
        color.status[status].subtle
      )
    ),

    // Non-text contrast (WCAG 1.4.11): form controls and focus
    nonText('Input Border on Base Surface', color.border.input, color.surface.base, 'Component'),
    nonText('Input Border on Canvas', color.border.input, color.surface.canvas, 'Component'),
    nonText('Focus Ring on Base Surface', focus.ringColor, color.surface.base, 'Focus Ring'),
    nonText('Focus Ring on Canvas', focus.ringColor, color.surface.canvas, 'Focus Ring'),
  ];
}

// A theme only overrides some values; everything else falls back to light
function merge(base, override) {
  if (!override) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = value && typeof value === 'object' && !('value' in value) ? merge(base[key] || {}, value) : value;
  }
  return out;
}

const REQUIRED_PAIRS = [
  ...pairsFor(tokens.color, tokens.focus),
  ...Object.entries(tokens.theme || {}).flatMap(([name, theme]) =>
    pairsFor(merge(tokens.color, theme.color), merge(tokens.focus, theme.focus), name)
  ),
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
  console.log('--- Rentify Semantic Design Tokens: WCAG 2.2 Contrast Audit ---');
  const { results, failures } = validateContrast();

  for (const r of results) {
    const mark = r.passed ? '✅' : '❌';
    console.log(`${mark} ${r.name.padEnd(48)} ${r.fg} on ${r.bg} -> ${r.ratio}:1 (Required: ${r.minRatio}:1 [${r.level}])`);
  }

  if (failures > 0) {
    console.error(`\n❌ Contrast validation failed with ${failures} violations.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${results.length} contrast pairs pass WCAG 2.2 AA criteria!`);
  }
}

module.exports = {
  REQUIRED_PAIRS,
  validateContrast,
};
