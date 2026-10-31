import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@rentify/utils';
import { EASE } from '../../../components/site/motion';

// Wraps a control the film "taps": it presses in and a finger ring ripples over it
export const Tap = ({ on, className, children }) => (
  <div className={cn('relative', className)}>
    <motion.div
      className="h-full w-full"
      animate={{ scale: on ? [1, 0.95, 1] : 1 }}
      transition={{ duration: 0.45, ease: EASE, delay: on ? 0.25 : 0 }}
    >
      {children}
    </motion.div>
    <AnimatePresence>
      {on && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 -ml-6 -mt-6 h-12 w-12 rounded-full border-2 border-white bg-[#1d1d1f]/25 shadow-[0_6px_20px_rgba(0,0,0,0.25)]"
          initial={{ opacity: 0, scale: 1.6 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [1.6, 1, 0.85, 1.4] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE, times: [0, 0.3, 0.55, 1] }}
        />
      )}
    </AnimatePresence>
  </div>
);

// Product photo on a soft tile, the way the real catalog crops seed images
export const ProductImage = ({ src, className }) => (
  <div className={cn('overflow-hidden rounded-[14px] bg-[#f5f5f7]', className)}>
    <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
  </div>
);

const CHIP_TONES = {
  pending: 'bg-[#fff4d6] text-[#9a6700]',
  paid: 'bg-[#e3f5e8] text-[#1a7f37]',
  neutral: 'bg-[#f0f0f2] text-[#424245]',
  blue: 'bg-[#e8f1fd] text-[#0066cc]',
};

export const Chip = ({ tone = 'neutral', className, children }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[12px] font-medium',
      CHIP_TONES[tone],
      className
    )}
  >
    {children}
  </span>
);

// Slides scene content up as if someone scrolled it
export const AutoScroll = ({ offset = 0, className, children }) => (
  <motion.div
    className={className}
    animate={{ y: offset }}
    transition={{ duration: 1.8, ease: [0.45, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

// A panel sliding over the app, from the bottom or the right edge
export const Sheet = ({ open, from = 'bottom', className, children }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          key="scrim"
          className="absolute inset-0 z-30 bg-black/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
        <motion.div
          key="sheet"
          className={cn(
            'absolute z-40 bg-white shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.35)]',
            from === 'bottom' ? 'inset-x-0 bottom-0 rounded-t-[24px]' : 'inset-y-0 right-0 w-[68%] max-w-[420px]',
            className
          )}
          initial={from === 'bottom' ? { y: '100%' } : { x: '100%' }}
          animate={from === 'bottom' ? { y: 0 } : { x: 0 }}
          exit={from === 'bottom' ? { y: '100%' } : { x: '100%' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          {children}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// Full-screen confirmation that closes every flow
export const Success = ({ open, icon: Icon, title, body, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white px-8 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
      >
        <motion.span
          className="flex h-20 w-20 items-center justify-center rounded-full bg-[#e3f5e8] text-[#1a7f37]"
          initial={{ scale: 0.4 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.1 }}
        >
          <Icon className="h-10 w-10" strokeWidth={2.2} />
        </motion.span>
        <p className="mt-6 text-[26px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{title}</p>
        <p className="mt-2 max-w-[340px] text-[16px] leading-snug text-[#6e6e73]">{body}</p>
        {children}
      </motion.div>
    )}
  </AnimatePresence>
);
