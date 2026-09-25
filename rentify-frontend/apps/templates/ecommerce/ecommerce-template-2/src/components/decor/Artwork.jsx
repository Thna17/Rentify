/**
 * Original decorative artwork for Template 2. Everything is drawn from simple
 * geometry and filled with `currentColor`, so it follows the merchant's theme
 * and ships as a few KB of markup instead of image downloads. All artwork is
 * decorative and hidden from assistive technology.
 */

// Width fractions of a temple tower (prang) at each height fraction, drawn as
// the stepped corn-cob silhouette typical of Khmer temple towers.
const PRANG_PROFILE = [
  [0, 1], [0.14, 1], [0.14, 0.84], [0.3, 0.8], [0.3, 0.68], [0.45, 0.63], [0.45, 0.52],
  [0.59, 0.47], [0.59, 0.37], [0.72, 0.32], [0.72, 0.23], [0.84, 0.18], [0.84, 0.11], [0.95, 0.06], [1, 0],
];

const prang = (cx, base, width, height) => {
  const right = PRANG_PROFILE.map(([y, w]) => `${(cx + (w * width) / 2).toFixed(1)},${(base - y * height).toFixed(1)}`);
  const left = [...PRANG_PROFILE].reverse().map(([y, w]) => `${(cx - (w * width) / 2).toFixed(1)},${(base - y * height).toFixed(1)}`);
  return `M${right.join('L')}L${left.join('L')}Z`;
};

// Bell-shaped stupa with a ringed spire.
const stupa = (cx, base, width, height) => {
  const w = width / 2;
  const domeTop = base - height * 0.55;
  return [
    `M${cx - w},${base}h${width}v${-height * 0.1}h${-width}Z`,
    `M${cx - w * 0.8},${base - height * 0.1}C${cx - w * 0.8},${domeTop} ${cx + w * 0.8},${domeTop} ${cx + w * 0.8},${base - height * 0.1}Z`,
    `M${cx - w * 0.18},${domeTop + height * 0.08}L${cx},${base - height}L${cx + w * 0.18},${domeTop + height * 0.08}Z`,
  ].join('');
};

// Sugar palm: slim trunk and a round crown of fronds.
const sugarPalm = (cx, base, height) => {
  const top = base - height;
  const fronds = Array.from({ length: 11 }, (_, index) => {
    const angle = Math.PI + (index / 10) * Math.PI;
    const length = height * (0.34 + (index % 2) * 0.06);
    const x = cx + Math.cos(angle) * length;
    const y = top + Math.sin(angle) * length * 0.85 + length * 0.2;
    const spread = 0.12;
    const x2 = cx + Math.cos(angle + spread) * length * 0.9;
    const y2 = top + Math.sin(angle + spread) * length * 0.8 + length * 0.2;
    return `M${cx},${top}L${x.toFixed(1)},${y.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}Z`;
  }).join('');
  return `M${cx - 2.2},${base}L${cx - 1.2},${top}h2.4L${cx + 2.2},${base}Z${fronds}`;
};

const ground = (y, amplitude, width = 1440) =>
  `M0,200V${y}` +
  Array.from({ length: 8 }, (_, index) => {
    const x = ((index + 1) * width) / 8;
    const cp = x - width / 16;
    return `Q${cp},${y + (index % 2 ? amplitude : -amplitude)} ${x},${y}`;
  }).join('') +
  'V200Z';

const FAR_LAYER = [
  ground(172, 6),
  prang(170, 172, 30, 88),
  stupa(262, 172, 44, 70),
  sugarPalm(520, 172, 92),
  sugarPalm(548, 172, 70),
  prang(840, 172, 26, 72),
  stupa(1010, 172, 36, 58),
  sugarPalm(1250, 172, 86),
  prang(1360, 172, 28, 80),
].join('');

// Five-tower temple composition in the foreground, off-centre so logos and
// text on the left stay readable.
const NEAR_LAYER = [
  ground(186, 5),
  `M600,186h300v-12h-300Z`,
  prang(640, 176, 40, 102),
  prang(705, 176, 46, 124),
  prang(750, 176, 60, 158),
  prang(795, 176, 46, 124),
  prang(860, 176, 40, 102),
  sugarPalm(420, 186, 110),
  sugarPalm(980, 186, 124),
  sugarPalm(1010, 186, 96),
  stupa(1150, 186, 52, 84),
].join('');

/** `tone="solid"` draws the skyline as an opaque horizon (e.g. on top of the footer). */
export function KhmerSkyline({ className = '', tone = 'soft' }) {
  const [far, near] = tone === 'solid' ? [0.45, 1] : [0.12, 0.22];
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" className={className}>
      <path d={FAR_LAYER} fill="currentColor" opacity={far} />
      <path d={NEAR_LAYER} fill="currentColor" opacity={near} />
    </svg>
  );
}

/** Small lotus-bud ornament used beside section titles. */
export function LotusOrnament({ className = '' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={className}>
      <path fill="currentColor" d="M12 3c2.4 2.3 3.4 4.8 3 7.6-.4 2.4-1.4 4.1-3 5.4-1.6-1.3-2.6-3-3-5.4-.4-2.8.6-5.3 3-7.6Z" />
      <path fill="currentColor" opacity="0.55" d="M4 9.5c2.6.2 4.6 1.4 6 3.6.6 1 .9 2 1 3.1-2.6-.2-4.5-1.3-5.7-3.3-.7-1.1-1.1-2.2-1.3-3.4Zm16 0c-.2 1.2-.6 2.3-1.3 3.4-1.2 2-3.1 3.1-5.7 3.3.1-1.1.4-2.1 1-3.1 1.4-2.2 3.4-3.4 6-3.6Z" />
      <path fill="currentColor" opacity="0.35" d="M5 19h14c-1.6 1.4-4 2-7 2s-5.4-.6-7-2Z" />
    </svg>
  );
}

const bloomPetal = (length, width) =>
  `M60,84C${60 - width},${84 - length * 0.45} ${60 - width * 0.4},${84 - length} 60,${84 - length}C${60 + width * 0.4},${84 - length} ${60 + width},${84 - length * 0.45} 60,84Z`;
const BLOOM_PETALS = [
  [-62, 40, 14],
  [62, 40, 14],
  [-30, 50, 17],
  [30, 50, 17],
  [0, 58, 19],
];

/** Free-standing lotus bloom on two leaves, for overlapping frames and cards. */
export function LotusBloom({ className = '' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 120 104" className={className}>
      <g className="text-primary" fill="currentColor">
        <path opacity="0.85" d="M60,88C44,70 18,66 4,78C16,96 44,100 60,88Z" />
        <path opacity="0.6" d="M60,88C76,70 102,66 116,78C104,96 76,100 60,88Z" />
      </g>
      <g className="text-card" fill="currentColor" stroke="oklch(var(--primary) / 0.4)" strokeWidth="1.5">
        {BLOOM_PETALS.map(([rotation, length, width]) => (
          <path key={rotation} transform={`rotate(${rotation} 60 84)`} d={bloomPetal(length, width)} />
        ))}
      </g>
      <circle cx="60" cy="76" r="6" className="text-warning" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

// A pointed leaf of the given length and half-width, drawn upward from its base.
const leafPath = (length, width) =>
  `M0,0C${width},${-length * 0.3} ${width * 0.6},${-length * 0.85} 0,${-length}C${-width * 0.6},${-length * 0.85} ${-width},${-length * 0.3} 0,0Z`;
// [x, y, rotation, length, width, opacity] along the sprig's stem.
const SPRIG_LEAVES = [
  [38, 204, -72, 44, 14, 0.75],
  [56, 184, 18, 50, 16, 0.9],
  [72, 160, -64, 52, 17, 0.8],
  [92, 136, 26, 54, 17, 1],
  [106, 110, -56, 50, 16, 0.85],
  [128, 86, 32, 48, 15, 0.95],
  [142, 62, -44, 42, 13, 0.8],
  [162, 38, 12, 34, 11, 1],
];

/** Botanical sprig with alternating leaves, for hero and section corners. */
export function LeafSprig({ className = '' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 200 240" className={className}>
      <path d="M22,232C64,184 118,112 172,26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      {SPRIG_LEAVES.map(([x, y, rotation, length, width, opacity]) => (
        <path key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rotation})`} d={leafPath(length, width)} fill="currentColor" opacity={opacity} />
      ))}
    </svg>
  );
}

const LINE_PETALS = [
  [-60, 70, 22],
  [60, 70, 22],
  [-30, 88, 28],
  [30, 88, 28],
  [0, 100, 30],
];
const linePetal = (length, width) =>
  `M100,150C${100 - width},${150 - length * 0.45} ${100 - width * 0.4},${150 - length} 100,${150 - length}C${100 + width * 0.4},${150 - length} ${100 + width},${150 - length * 0.45} 100,150Z`;

/** Line-drawn lotus with its stem and a pad, for quiet editorial backgrounds. */
export function LotusLineArt({ className = '' }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 200 320" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      {LINE_PETALS.map(([rotation, length, width]) => (
        <path key={rotation} transform={`rotate(${rotation} 100 150)`} d={linePetal(length, width)} />
      ))}
      <path d="M100,150C98,200 108,250 96,312" strokeLinecap="round" />
      <path d="M102,236C70,214 22,222 8,254C40,280 88,270 102,236Z" />
      <path d="M102,236C74,240 44,248 20,252M60,226L66,244M40,236L48,250" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
