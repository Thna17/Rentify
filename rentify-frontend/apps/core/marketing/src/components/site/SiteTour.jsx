import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, X } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { EASE } from './motion';

// Pages the tour visits, in order, before looping back to the start
const STOPS = [
  { path: '/', key: 'site.tour.site.home' },
  { path: '/solutions', key: 'site.nav.solutions' },
  { path: '/feature', key: 'site.nav.features' },
  { path: '/templates', key: 'site.nav.templates' },
  { path: '/pricing', key: 'site.nav.pricing' },
];

// The tour glides half a screen, rests so the eye can settle, then glides again
const STRIDE = 0.55; // share of the viewport per glide
const GLIDE = 1700; // ms per glide
const REST = 1600; // ms between glides
const START_DELAY = 1500; // rest at the top of each page
const END_DELAY = 1500; // rest at the bottom before moving on
const USER_HOLD = 15000; // after a visitor stops touching the page, resume this much later

// Slow start, slow finish
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

// Website tour for events: any page opened with ?tour=1 scrolls itself to the
// bottom, then moves to the next page, looping forever.
const SiteTour = () => {
  const { t } = useLanguage();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const active = new URLSearchParams(search).get('tour') === '1';
  const [paused, setPaused] = useState(false);
  // A visitor scrolling takes over; the tour waits until they leave it alone
  const [userPaused, setUserPaused] = useState(false);
  const pausedRef = useRef(false);
  const resumeTimer = useRef(null);

  const index = Math.max(0, STOPS.findIndex((stop) => stop.path === pathname));
  const next = STOPS[(index + 1) % STOPS.length];

  const isPaused = paused || userPaused;
  pausedRef.current = isPaused;

  useEffect(() => {
    if (!active) return undefined;
    let frame;
    let done = false;
    let last = performance.now();
    let glide = null;
    let restUntil = last + START_DELAY;
    let atEndSince = 0;
    window.scrollTo({ top: 0, behavior: 'instant' });

    const step = (now) => {
      if (done) return;
      last = now;
      if (pausedRef.current) {
        glide = null; // resume with a fresh glide from wherever the page is
        atEndSince = 0;
        restUntil = now + REST;
        return;
      }
      if (glide) {
        const expected = glide.from + (glide.to - glide.from) * ease(Math.min(1, (now - glide.start) / GLIDE));
        // A visitor moved the page mid-glide: let go and rest
        if (Math.abs(window.scrollY - glide.at) > 6) {
          glide = null;
          restUntil = now + REST;
          return;
        }
        window.scrollTo({ top: expected, behavior: 'instant' });
        glide.at = window.scrollY;
        if (now - glide.start >= GLIDE) {
          glide = null;
          restUntil = now + REST;
        }
        return;
      }
      if (now < restUntil) return;
      const from = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (from < max - 2) {
        atEndSince = 0;
        glide = { from, to: Math.min(max, from + window.innerHeight * STRIDE), start: now, at: from };
      } else if (!atEndSince) {
        atEndSince = now;
      } else if (now - atEndSince > END_DELAY) {
        done = true;
        navigate(`${next.path}?tour=1`);
      }
    };
    const loop = (now) => {
      step(now);
      if (!done) frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    // Browsers stop animation frames for background windows; keep the tour moving
    const backup = setInterval(() => {
      const now = performance.now();
      if (now - last > 250) step(now);
    }, 300);
    return () => {
      done = true;
      cancelAnimationFrame(frame);
      clearInterval(backup);
    };
  }, [active, pathname, navigate, next.path]);

  // Reads the ref so the key handler below always sees the current state
  const togglePause = () => {
    if (pausedRef.current) {
      clearTimeout(resumeTimer.current);
      setUserPaused(false);
      setPaused(false);
    } else {
      setPaused(true);
    }
  };

  // Scrolling, touching or typing pauses the tour; Space toggles it, Esc ends it
  useEffect(() => {
    if (!active) return undefined;
    const hold = () => {
      setUserPaused(true);
      clearTimeout(resumeTimer.current);
      resumeTimer.current = setTimeout(() => setUserPaused(false), USER_HOLD);
    };
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea')) return;
      if (event.key === ' ') {
        event.preventDefault();
        togglePause();
      } else if (event.key === 'Escape') {
        navigate(pathname);
      } else {
        hold();
      }
    };
    // Dragging the scrollbar sends no wheel event, so a press counts too
    const onPress = (event) => {
      if (!event.target.closest?.('[data-site-tour]')) hold();
    };
    window.addEventListener('wheel', hold, { passive: true });
    window.addEventListener('touchmove', hold, { passive: true });
    window.addEventListener('mousedown', onPress);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', hold);
      window.removeEventListener('touchmove', hold);
      window.removeEventListener('mousedown', onPress);
      window.removeEventListener('keydown', onKey);
      clearTimeout(resumeTimer.current);
      setUserPaused(false);
    };
  }, [active, navigate, pathname]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: EASE }}
          data-site-tour
          className="fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 whitespace-nowrap rounded-full bg-[#1d1d1f]/90 py-2 pl-4 pr-2 text-[13px] text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <span className="relative flex h-2 w-2">
            {!isPaused && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#30d158] opacity-60" />}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', isPaused ? 'bg-white/50' : 'bg-[#30d158]')} />
          </span>
          <span className="font-medium">{t(isPaused ? 'site.tour.site.paused' : 'site.tour.site.label')}</span>
          <span className="flex items-center gap-1.5">
            {STOPS.map((stop, i) => (
              <motion.span
                key={stop.path}
                layout
                className={cn(
                  'rounded-full',
                  i === index ? 'bg-white px-2 py-1 text-[11px] font-medium leading-none text-[#1d1d1f]' : 'h-1.5 w-1.5 bg-white/35'
                )}
              >
                {i === index && t(stop.key)}
              </motion.span>
            ))}
          </span>
          <button
            type="button"
            onClick={togglePause}
            aria-label={isPaused ? t('site.tour.play') : t('site.tour.pause')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate(pathname)}
            aria-label={t('site.tour.site.stop')}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SiteTour;
