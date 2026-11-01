import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Pause } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { PhoneFrame } from '../../components/site/DeviceFrames';
import { WallClock } from './wallKit';
import { STORES } from './wallData';
import PhoneMarketplace from './panels/PhoneMarketplace';
import StorefrontTour from './panels/StorefrontTour';
import DesktopMarketplace from './panels/DesktopMarketplace';

const LABEL = 22;

const Label = ({ children, aside }) => (
  <div className="flex shrink-0 items-center gap-2.5 text-[13px] text-[#1d1d1f]/60" style={{ height: LABEL }}>
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#30d158] opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#30d158]" />
    </span>
    <span className="font-medium text-[#1d1d1f]/85">{children}</span>
    {aside && <span className="ml-auto text-[#1d1d1f]/45">{aside}</span>}
  </div>
);

// Soft colour glows drifting slowly behind the screens
const GLOWS = [
  { color: '#8ec1ff', place: 'left-[-12%] top-[-25%] h-[75vh] w-[55vw]', x: [0, 70, 0], y: [0, 50, 0], duration: 22 },
  { color: '#c9b8ff', place: 'right-[-14%] top-[0%] h-[70vh] w-[50vw]', x: [0, -60, 0], y: [0, 70, 0], duration: 27 },
  { color: '#ffd1b3', place: 'left-[18%] bottom-[-30%] h-[65vh] w-[50vw]', x: [0, 80, 0], y: [0, -40, 0], duration: 31 },
  { color: '#b6f0d8', place: 'right-[2%] bottom-[-25%] h-[55vh] w-[40vw]', x: [0, -50, 0], y: [0, -50, 0], duration: 25 },
];

const Backdrop = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[#f4f6fb]">
    {GLOWS.map((glow) => (
      <motion.div
        key={glow.color}
        className={cn('absolute rounded-full opacity-60 blur-[100px] will-change-transform', glow.place)}
        style={{ background: glow.color }}
        animate={{ x: glow.x, y: glow.y, scale: [1, 1.08, 1] }}
        transition={{ duration: glow.duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    ))}
    {/* A faint dot grid gives the light background some texture */}
    <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(15,23,42,0.10)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
  </div>
);

// Every store in the tour; the one on screen grows into a chip with its name
const StoreSwitcher = ({ current }) => (
  <span className="flex items-center gap-1">
    {STORES.map((item) => {
      const active = item.id === current?.id;
      return (
        <motion.span
          key={item.id}
          layout
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className={cn(
            'flex items-center gap-1.5 rounded-full p-0.5',
            active && 'bg-white pr-2.5 text-[#1d1d1f] shadow-sm ring-1 ring-black/5'
          )}
        >
          {item.logo ? (
            <img
              src={item.logo}
              alt=""
              className={cn('h-[18px] w-[18px] rounded-full object-cover transition-opacity duration-500', !active && 'opacity-45 grayscale')}
            />
          ) : (
            <span
              className={cn(
                'flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1c1917] text-[7px] font-bold text-white transition-opacity duration-500',
                !active && 'opacity-45'
              )}
            >
              SL
            </span>
          )}
          {active && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap text-[12px] font-medium">
              {item.name}
            </motion.span>
          )}
        </motion.span>
      );
    })}
  </span>
);

const toggleFullscreen = () => {
  const doc = document;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
  } else {
    const el = doc.documentElement;
    Promise.resolve((el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)).catch(() => undefined);
  }
};

// Monitor wall for events: iPhone marketplace, storefront tour and desktop
// marketplace, each looping on its own clock.
const ShowcaseWall = () => {
  const { t, language } = useLanguage();
  const [paused, setPaused] = useState(false);
  const [idle, setIdle] = useState(false);
  const [hint, setHint] = useState(true);
  const [store, setStore] = useState(null);
  const idleTimer = useRef(null);

  useEffect(() => {
    document.title = `${t('site.wall.title')} · Rentify`;
  }, [t]);

  useEffect(() => {
    const timer = setTimeout(() => setHint(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Hide the mouse when nobody is touching it
  useEffect(() => {
    const wake = () => {
      setIdle(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIdle(true), 2500);
    };
    wake();
    window.addEventListener('mousemove', wake);
    return () => {
      window.removeEventListener('mousemove', wake);
      clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        setPaused((value) => !value);
      } else if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Keep the monitor awake for the whole event
  useEffect(() => {
    if (!navigator.wakeLock) return undefined;
    let lock;
    let cancelled = false;
    const acquire = () =>
      navigator.wakeLock
        .request('screen')
        .then((sentinel) => {
          if (cancelled) sentinel.release();
          else lock = sentinel;
        })
        .catch(() => undefined);
    const onVisible = () => document.visibilityState === 'visible' && acquire();
    acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      lock?.release().catch(() => undefined);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const onStore = useCallback((next) => setStore(next), []);

  return (
    <WallClock.Provider value={{ paused }}>
      <MotionConfig reducedMotion="user">
        <div
          onDoubleClick={toggleFullscreen}
          className={cn(
            'relative isolate flex h-[100dvh] flex-col gap-2.5 overflow-hidden px-3 pb-3 pt-2 antialiased xl:gap-3 xl:px-4 xl:pb-4 xl:pt-2.5',
            language === 'KH' ? 'font-site-kh' : 'font-site',
            idle && 'cursor-none'
          )}
        >
          <Backdrop />
          {/* The phone column is as wide as the row is tall allows, so the iPhone always fits */}
          <div className="min-h-0 flex-[48]" style={{ containerType: 'size' }}>
            <div
              className="grid h-full gap-3 xl:gap-4"
              style={{ gridTemplateColumns: `calc((100cqh - ${LABEL + 2}px) * 0.47) 1fr` }}
            >
              <section className="flex min-h-0 flex-col">
                <Label>{t('site.wall.panels.phone')}</Label>
                <div className="flex min-h-0 flex-1 items-start justify-center">
                  <PhoneFrame className="w-full" screenClassName="bg-white">
                    <PhoneMarketplace />
                  </PhoneFrame>
                </div>
              </section>
              <section className="flex min-h-0 flex-col">
                <Label aside={<StoreSwitcher current={store} />}>
                  {t('site.wall.panels.storefront')}
                </Label>
                <div className="min-h-0 flex-1 overflow-hidden rounded-[14px] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.06]">
                  <StorefrontTour onStore={onStore} />
                </div>
              </section>
            </div>
          </div>

          <section className="flex min-h-0 flex-[52] flex-col">
            <div className="min-h-0 flex-1 overflow-hidden rounded-[14px] bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.06]">
              <DesktopMarketplace />
            </div>
          </section>

          <AnimatePresence>
            {(hint || paused) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute bottom-8 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1d1d1f]/85 px-5 py-2.5 text-[14px] text-white backdrop-blur"
              >
                {paused && <Pause className="h-4 w-4" />}
                {paused ? t('site.wall.paused') : t('site.wall.hint')}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </WallClock.Provider>
  );
};

export default ShowcaseWall;
