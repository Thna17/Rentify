import React, { useMemo } from 'react';
import { cn } from '@rentify/utils';

// Small deterministic PRNG so the illustrative QR pattern never changes
const seeded = (seed) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SIZE = 25;

const isQuietZoneAroundFinder = (x, y) => {
  const near = (ox, oy) => x >= ox - 1 && x <= ox + 7 && y >= oy - 1 && y <= oy + 7;
  return near(0, 0) || near(SIZE - 7, 0) || near(0, SIZE - 7);
};

const isCenter = (x, y) => Math.abs(x - 12) <= 2 && Math.abs(y - 12) <= 2;

// Illustrative QR code (not scannable) drawn as SVG modules
export const QrCode = ({ seed = 7, className }) => {
  const modules = useMemo(() => {
    const random = seeded(seed);
    const cells = [];
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (isQuietZoneAroundFinder(x, y) || isCenter(x, y)) continue;
        if (random() > 0.5) cells.push([x, y]);
      }
    }
    return cells;
  }, [seed]);

  const finders = [
    [0, 0],
    [SIZE - 7, 0],
    [0, SIZE - 7],
  ];

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={className} shapeRendering="crispEdges">
      {modules.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#111" />
      ))}
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" rx="1.6" fill="#111" />
          <rect x={x + 1} y={y + 1} width="5" height="5" rx="1" fill="#fff" />
          <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" fill="#111" />
        </g>
      ))}
      <circle cx="12.5" cy="12.5" r="2.3" fill="#E1232E" />
      <text
        x="12.5"
        y="13.55"
        textAnchor="middle"
        fontSize="2.8"
        fontWeight="700"
        fill="#fff"
        fontFamily="-apple-system, sans-serif"
      >
        $
      </text>
    </svg>
  );
};

// A KHQR payment card in the style of Cambodia's national QR standard
export const KhqrCard = ({ merchant = 'Aura Botanicals', amount = '24.00', className }) => (
  <div
    className={cn(
      'w-[260px] overflow-hidden rounded-[22px] bg-white text-left shadow-[0_30px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5',
      className
    )}
  >
    <div className="relative flex h-14 items-center justify-center bg-[#E1232E]">
      <span className="text-[19px] font-bold tracking-[0.18em] text-white">KHQR</span>
      <span
        className="absolute -bottom-px right-0 h-0 w-0 border-b-[18px] border-l-[18px] border-b-white border-l-transparent"
        aria-hidden
      />
    </div>
    <div className="px-6 pb-2 pt-4">
      <p className="text-[12px] text-[#6e6e73]">{merchant}</p>
      <p className="mt-0.5 text-[26px] font-semibold tracking-tight text-[#1d1d1f]">
        {amount} <span className="text-[13px] font-medium text-[#6e6e73]">USD</span>
      </p>
    </div>
    <div className="mx-6 border-t border-dashed border-black/15" />
    <div className="p-6 pt-5">
      <QrCode className="aspect-square w-full" />
    </div>
  </div>
);
