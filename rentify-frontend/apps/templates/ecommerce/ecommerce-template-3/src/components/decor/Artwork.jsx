/**
 * Café line art drawn in `currentColor`, so every piece follows the merchant's
 * palette. Purely decorative: each SVG is hidden from assistive technology.
 */

const svgProps = { 'aria-hidden': true, focusable: 'false', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' };

/** A cup and saucer with three curls of steam; stands in when there is no photo. */
export function SteamCup({ className = '' }) {
  return (
    <svg viewBox="0 0 200 220" className={className} strokeWidth="2.5" {...svgProps}>
      <path className="steam steam-1" d="M78 70c-10-12 10-20 0-34s8-20 2-30" />
      <path className="steam steam-2" d="M100 64c-10-12 10-20 0-34s8-20 2-30" />
      <path className="steam steam-3" d="M122 70c-10-12 10-20 0-34s8-20 2-30" />
      <path d="M44 96h112v34c0 34-25 58-56 58s-56-24-56-58z" />
      <path d="M156 106h10a18 18 0 0 1 0 36h-14" />
      <ellipse cx="100" cy="196" rx="84" ry="12" />
      <path d="M62 116c10 6 22 8 38 8s28-2 38-8" opacity="0.5" />
    </svg>
  );
}

/** One coffee bean. */
export function CoffeeBean({ className = '' }) {
  return (
    <svg viewBox="0 0 40 56" className={className} strokeWidth="2.5" {...svgProps}>
      <ellipse cx="20" cy="28" rx="16" ry="25" />
      <path d="M20 4c-8 10 8 18 0 24s8 16 0 24" />
    </svg>
  );
}

/** Loose beans scattered across a band; used as a soft background texture. */
export function BeanScatter({ className = '' }) {
  const beans = [
    [30, 40, -20], [140, 90, 35], [260, 30, 10], [380, 110, -40], [520, 50, 25],
    [640, 120, -10], [760, 40, 40], [880, 100, -30], [1000, 30, 15], [1120, 90, -25],
  ];
  return (
    <svg viewBox="0 0 1200 160" preserveAspectRatio="xMidYMid slice" className={className} strokeWidth="2" {...svgProps}>
      {beans.map(([x, y, rotate]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${rotate})`}>
          <ellipse cx="0" cy="0" rx="9" ry="14" />
          <path d="M0-13c-4 6 4 10 0 13s4 9 0 13" />
        </g>
      ))}
    </svg>
  );
}

/** A latte-art rosetta, for the story band and empty photo frames. */
export function LatteArt({ className = '' }) {
  return (
    <svg viewBox="0 0 200 200" className={className} strokeWidth="2.5" {...svgProps}>
      <circle cx="100" cy="100" r="92" />
      <circle cx="100" cy="100" r="78" opacity="0.4" />
      <path d="M100 40v124" />
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const y = 58 + index * 17;
        const width = 44 - index * 5;
        return <path key={index} d={`M${100 - width} ${y + 12}c${width * 0.4}-14 ${width * 1.6}-14 ${width * 2} 0`} />;
      })}
      <path d="M86 150c6-8 22-8 28 0" />
    </svg>
  );
}

/** A thin ring like a cup mark on paper; a quiet ornament for the footer. */
export function CupRing({ className = '' }) {
  return (
    <svg viewBox="0 0 120 120" className={className} strokeWidth="3" {...svgProps}>
      <path d="M60 8a52 52 0 1 1-44 24" />
      <path d="M60 20a40 40 0 1 1-30 13" opacity="0.5" />
    </svg>
  );
}
