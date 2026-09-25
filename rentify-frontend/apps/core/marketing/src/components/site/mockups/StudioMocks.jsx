import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@rentify/utils';
import { EASE } from '../motion';

const useCycle = (length, interval) => {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || !inView) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), interval);
    return () => clearInterval(timer);
  }, [inView, reduce, length, interval]);

  return [ref, index];
};

const THEMES = [
  { accent: '#2D6A4F', soft: '#D8F3DC', name: 'Forest' },
  { accent: '#1d1d1f', soft: '#f0f0f2', name: 'Graphite' },
  { accent: '#2563EB', soft: '#DBEAFE', name: 'Ocean' },
  { accent: '#B4533C', soft: '#F8E1D8', name: 'Clay' },
  { accent: '#7C3AED', soft: '#EDE4FF', name: 'Orchid' },
];

const FONTS = ['Aa', 'Aa', 'Aa'];
const FONT_STYLES = ['font-semibold', 'font-serif', 'font-light tracking-wide'];

// Visual editor: theme controls on the left update the store preview on the right
export const EditorMock = ({ className }) => {
  const [ref, index] = useCycle(THEMES.length, 2400);
  const theme = THEMES[index];
  const fontIndex = index % FONTS.length;

  return (
    <div
      ref={ref}
      className={cn(
        'grid overflow-hidden rounded-[22px] bg-white text-left shadow-[0_40px_90px_-40px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06] sm:grid-cols-[0.8fr_1.6fr]',
        className
      )}
    >
      <div className="space-y-6 border-b border-black/5 bg-[#fbfbfd] p-5 sm:border-b-0 sm:border-r">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868b]">Color</p>
          <div className="mt-3 flex gap-2">
            {THEMES.map((item, i) => (
              <span
                key={item.name}
                className={cn(
                  'h-7 w-7 rounded-full ring-offset-2 transition-all duration-500',
                  i === index ? 'ring-2 ring-[#0071e3]' : 'ring-0'
                )}
                style={{ backgroundColor: item.accent }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868b]">Font</p>
          <div className="mt-3 flex gap-2">
            {FONTS.map((label, i) => (
              <span
                key={i}
                className={cn(
                  'flex h-10 w-12 items-center justify-center rounded-lg bg-white text-[17px] text-[#1d1d1f] ring-1 transition-all duration-500',
                  FONT_STYLES[i],
                  i === fontIndex ? 'ring-[#0071e3]' : 'ring-black/10'
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#86868b]">Logo</p>
          <div className="mt-3 flex h-12 items-center justify-center rounded-lg border border-dashed border-black/15 text-[12px] text-[#86868b]">
            logo.png
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="overflow-hidden rounded-[14px] ring-1 ring-black/[0.06]">
          <div className="flex items-center justify-between bg-white px-4 py-3">
            <span
              className={cn('text-[14px] text-[#1d1d1f] transition-all duration-500', FONT_STYLES[fontIndex])}
            >
              Aura Botanicals
            </span>
            <div className="flex gap-3 text-[10px] text-[#6e6e73]">
              <span>Shop</span>
              <span>About</span>
              <span>Cart</span>
            </div>
          </div>
          <motion.div
            className="px-4 py-8"
            animate={{ backgroundColor: theme.soft }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <p
              className={cn(
                'max-w-[70%] text-[20px] leading-tight text-[#1d1d1f] transition-all duration-500',
                FONT_STYLES[fontIndex]
              )}
            >
              Clean skin, naturally.
            </p>
            <motion.span
              className="mt-4 inline-block rounded-full px-4 py-1.5 text-[11px] font-medium text-white"
              animate={{ backgroundColor: theme.accent }}
              transition={{ duration: 0.8, ease: EASE }}
            >
              Shop now
            </motion.span>
          </motion.div>
          <div className="grid grid-cols-3 gap-2 bg-white p-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="space-y-1.5">
                <motion.div
                  className="aspect-square rounded-lg"
                  animate={{ backgroundColor: theme.soft }}
                  transition={{ duration: 0.8, ease: EASE, delay: item * 0.08 }}
                />
                <div className="h-1.5 w-3/4 rounded-full bg-[#e8e8ed]" />
                <div className="h-1.5 w-1/3 rounded-full bg-[#e8e8ed]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LABELS = [
  {
    lang: 'EN',
    name: 'Gentle Foaming Cleanser',
    category: 'Cleansers & Toners',
    cta: 'Add to cart',
    stock: 'In stock',
  },
  {
    lang: 'ខ្មែរ',
    name: 'ក្រែមលាងមុខពពុះស្រាល',
    category: 'ក្រែមលាងមុខ និងតូណឺ',
    cta: 'បន្ថែមទៅរទេះ',
    stock: 'មានក្នុងស្តុក',
  },
];

// A product card that switches between English and Khmer on its own
export const LanguageMock = ({ className }) => {
  const [ref, index] = useCycle(LABELS.length, 2600);
  const label = LABELS[index];

  return (
    <div
      ref={ref}
      className={cn(
        'w-full max-w-[360px] overflow-hidden rounded-[28px] bg-white text-left shadow-[0_40px_90px_-40px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]',
        className
      )}
    >
      <div className="flex justify-end p-4">
        <div className="relative flex rounded-full bg-[#f0f0f2] p-1 text-[12px]">
          {LABELS.map((item, i) => (
            <span key={item.lang} className="relative z-10 px-3 py-1">
              {i === index && (
                <motion.span
                  layoutId="language-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-white shadow-sm"
                  transition={{ duration: 0.5, ease: EASE }}
                />
              )}
              <span className={i === index ? 'text-[#1d1d1f]' : 'text-[#86868b]'}>
                {item.lang}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="mx-4 aspect-[4/3] rounded-[20px] bg-gradient-to-br from-[#ece8f7] via-[#f4f1fb] to-[#e2dcf2]">
        <div className="flex h-full items-center justify-center">
          <div className="h-[70%] w-[22%] rotate-[-14deg] rounded-[10px] bg-gradient-to-b from-[#4b3f9e] to-[#2d2475] shadow-[0_20px_30px_-12px_rgba(45,36,117,0.6)]" />
        </div>
      </div>
      <div className="p-6 font-site-kh">
        <AnimatePresence mode="wait">
          <motion.div
            key={label.lang}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <p className="text-[12px] text-[#0066cc]">{label.category}</p>
            <p className="mt-1 text-[19px] font-semibold text-[#1d1d1f]">{label.name}</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-[17px] font-semibold text-[#1d1d1f]">$24.00</p>
                <p className="text-[11px] text-[#1a7f37]">{label.stock}</p>
              </div>
              <span className="rounded-full bg-[#1d1d1f] px-4 py-2 text-[13px] font-medium text-white">
                {label.cta}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
