import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@rentify/utils';

// A minimal Safari-style window around a screenshot or mockup
export const BrowserFrame = ({ url, className, children }) => (
  <div
    className={cn(
      'overflow-hidden rounded-[10px] bg-white ring-1 ring-black/[0.08] shadow-[0_40px_100px_-30px_rgba(0,0,0,0.35)] md:rounded-[14px]',
      className
    )}
  >
    <div className="relative flex h-6 items-center border-b border-black/[0.06] bg-[#f5f5f7] px-3 md:h-8">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="h-2 w-2 rounded-full bg-black/[0.12] md:h-2.5 md:w-2.5"
          />
        ))}
      </div>
      {url && (
        <div className="absolute left-1/2 top-1/2 hidden max-w-[55%] -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-md bg-white/80 px-3 py-0.5 text-[10px] text-[#6e6e73] sm:flex md:text-[11px]">
          <Lock className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{url}</span>
        </div>
      )}
    </div>
    <div className="relative">{children}</div>
  </div>
);

// iOS status bar glyphs, drawn to scale with the phone (1cqw = 1% of screen width)
const SignalIcon = () => (
  <svg viewBox="0 0 18 12" className="h-[2.9cqw] w-[4.4cqw]" fill="currentColor" aria-hidden>
    <rect x="0" y="8" width="3" height="4" rx="0.8" />
    <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
    <rect x="10" y="3" width="3" height="9" rx="0.8" />
    <rect x="15" y="0" width="3" height="12" rx="0.8" />
  </svg>
);

const WifiIcon = () => (
  <svg viewBox="0 0 16 12" className="h-[2.9cqw] w-[3.9cqw]" fill="currentColor" aria-hidden>
    <path d="M8 2.3c2.4 0 4.6.9 6.3 2.5.2.2.5.2.7 0l.8-.8c.2-.2.2-.5 0-.7A11.3 11.3 0 0 0 8 0C5 0 2.3 1.1.2 3.3c-.2.2-.2.5 0 .7l.8.8c.2.2.5.2.7 0A9 9 0 0 1 8 2.3Z" />
    <path d="M8 6c1.4 0 2.6.5 3.6 1.4.2.2.5.2.7 0l.8-.8c.2-.2.2-.5 0-.7A7.7 7.7 0 0 0 8 3.8c-1.9 0-3.7.7-5.1 2.1-.2.2-.2.5 0 .7l.8.8c.2.2.5.2.7 0C5.4 6.5 6.6 6 8 6Z" />
    <path d="M10.3 9.2c.2-.2.2-.5 0-.7A3.4 3.4 0 0 0 8 7.6c-.9 0-1.7.3-2.3.9-.2.2-.2.5 0 .7l2 2c.2.2.4.2.6 0l2-2Z" />
  </svg>
);

const BatteryIcon = () => (
  <svg viewBox="0 0 27 13" className="h-[3.2cqw] w-[6.6cqw]" aria-hidden>
    <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" strokeOpacity="0.4" />
    <rect x="2" y="2" width="16.5" height="9" rx="2.4" fill="currentColor" />
    <path d="M25 4.3v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fill="currentColor" fillOpacity="0.45" />
  </svg>
);

const StatusBar = ({ tone }) => (
  <div
    className={cn(
      'relative z-20 flex h-[13.5cqw] shrink-0 items-center justify-between px-[7cqw] pt-[1.2cqw]',
      tone === 'light' ? 'text-white' : 'text-black'
    )}
  >
    <span className="w-[22cqw] text-center text-[length:4.3cqw] font-semibold tracking-[-0.01em]">
      9:41
    </span>
    <span className="flex w-[22cqw] items-center justify-center gap-[1.4cqw]">
      <SignalIcon />
      <WifiIcon />
      <BatteryIcon />
    </span>
  </div>
);

// Titanium side keys: Action button and volume on the left, side button on the right
const SIDE_KEYS = [
  { side: 'left', top: '17%', height: '4.2%' },
  { side: 'left', top: '24%', height: '7.5%' },
  { side: 'left', top: '33%', height: '7.5%' },
  { side: 'right', top: '26%', height: '11.5%' },
];

// An iPhone 15 Pro–style device: titanium band, black bezel, Dynamic Island,
// status bar and home indicator. Children render in the area below the status bar.
export const PhoneFrame = ({ className, screenClassName, tone = 'dark', children }) => (
  <div className={cn('relative', className)}>
    {SIDE_KEYS.map((key, index) => (
      <span
        key={index}
        aria-hidden
        className={cn(
          'absolute w-[1.6%] bg-[linear-gradient(90deg,#3a3a3c,#8e8e93_50%,#3a3a3c)]',
          key.side === 'left' ? '-left-[1.1%] rounded-l-[2px]' : '-right-[1.1%] rounded-r-[2px]'
        )}
        style={{ top: key.top, height: key.height }}
      />
    ))}

    <div className="relative rounded-[16.5%/7.8%] bg-[linear-gradient(145deg,#8e8e93_0%,#3a3a3c_18%,#2c2c2e_50%,#48484a_82%,#aeaeb2_100%)] p-[1.1%] shadow-[0_50px_90px_-35px_rgba(0,0,0,0.55)]">
      <div className="rounded-[15.8%/7.4%] bg-black p-[2.6%]">
        <div
          className={cn(
            'relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[12.5%/5.8%] bg-[#f5f5f7]',
            screenClassName
          )}
          style={{ containerType: 'inline-size' }}
        >
          <StatusBar tone={tone} />
          <span
            aria-hidden
            className="absolute left-1/2 top-[2.9cqw] z-30 h-[9.4cqw] w-[31cqw] -translate-x-1/2 rounded-full bg-black"
          />
          <div className="relative flex-1 overflow-hidden">{children}</div>
          <span
            aria-hidden
            className={cn(
              'absolute bottom-[2cqw] left-1/2 z-30 h-[1.35cqw] w-[34cqw] -translate-x-1/2 rounded-full',
              tone === 'light' ? 'bg-white/80' : 'bg-black/80'
            )}
          />
        </div>
      </div>
    </div>
  </div>
);

// Screenshot image that fills a frame
export const Screen = ({ src, alt, eager = false, className }) => (
  <img
    src={src}
    alt={alt}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    className={cn('block h-full w-full object-cover object-top', className)}
  />
);
