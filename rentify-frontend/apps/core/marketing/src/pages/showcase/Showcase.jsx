import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Maximize2, Minimize2, MonitorPlay, Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '@rentify/utils';
import SiteHeader from '../../components/site/SiteHeader';
import { EASE } from '../../components/site/motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { HERO, SCENES, SCENE_LENGTHS, START_STOCK, TOTAL_LENGTH, locate, stockAt } from './showcaseData';
import {
  CHANNEL_ICONS,
  InventoryScene,
  MarketplaceScene,
  PosScene,
  StorefrontScene,
} from './components/ChannelScenes';

const TICK = 100;
// A visitor who pauses and walks away should not leave the booth frozen
const AUTO_RESUME = 15000;

// ── Opening: three channels feed one stock count
const IntroScene = memo(({ step }) => {
  const { t } = useLanguage();
  return (
    <div className="flex h-full flex-col items-center justify-center bg-white px-8 text-center">
      <div className="flex items-end gap-4 sm:gap-8">
        {Object.entries(CHANNEL_ICONS).map(([key, Icon], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 24 }}
            animate={step >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.7, ease: EASE, delay: index * 0.15 }}
            className="flex flex-col items-center gap-3"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#f5f5f7] text-[#1d1d1f] sm:h-24 sm:w-24">
              <Icon className="h-9 w-9" strokeWidth={1.6} />
            </span>
            <span className="text-[15px] font-medium text-[#1d1d1f]">{t(`site.tour.channels.${key}`)}</span>
          </motion.div>
        ))}
      </div>
      <svg viewBox="0 0 300 70" className="my-3 h-16 w-[300px]" aria-hidden>
        {[50, 150, 250].map((x, index) => (
          <motion.path
            key={x}
            d={`M${x},0 C${x},40 150,30 150,70`}
            fill="none"
            stroke="#d2d2d7"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: step >= 2 ? 1 : 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: index * 0.1 }}
          />
        ))}
      </svg>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={step >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
        className="flex items-center gap-4 rounded-[24px] bg-[#1d1d1f] py-3 pl-3 pr-6 text-left text-white"
      >
        <img src={HERO.image} alt="" className="h-16 w-16 rounded-[16px] object-cover" />
        <div>
          <p className="text-[14px] text-white/60">{HERO.name}</p>
          <p className="text-[26px] font-semibold tracking-[-0.02em]">
            {t('site.tour.stock', { count: START_STOCK })}
          </p>
        </div>
      </motion.div>
    </div>
  );
});

const SCENE_COMPONENTS = {
  intro: IntroScene,
  marketplace: MarketplaceScene,
  storefront: StorefrontScene,
  pos: PosScene,
  inventory: InventoryScene,
};

const ChannelRail = ({ channel }) => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(CHANNEL_ICONS).map(([key, Icon]) => {
        const active = channel === key || channel === 'inventory';
        return (
          <span
            key={key}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-500',
              active ? 'bg-[#1d1d1f] text-white' : 'bg-white text-[#6e6e73] ring-1 ring-black/[0.06]'
            )}
          >
            <Icon className="h-4 w-4" />
            {t(`site.tour.channels.${key}`)}
          </span>
        );
      })}
    </div>
  );
};

const StockPill = ({ count }) => {
  const { t } = useLanguage();
  return (
    <div className="inline-flex items-center gap-3 rounded-full bg-white py-1.5 pl-1.5 pr-5 ring-1 ring-black/[0.06]">
      <img src={HERO.image} alt="" className="h-10 w-10 rounded-full object-cover" />
      <div className="leading-tight">
        <p className="text-[12px] text-[#6e6e73]">{t('site.tour.oneStock')}</p>
        <motion.p
          key={count}
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="text-[16px] font-semibold text-[#1d1d1f]"
        >
          {t('site.tour.stock', { count })}
        </motion.p>
      </div>
    </div>
  );
};

const Progress = ({ elapsed, onSeek }) => {
  const { t } = useLanguage();
  const inLoop = elapsed % TOTAL_LENGTH;
  let start = 0;

  return (
    <div className="flex flex-1 gap-1.5">
      {SCENES.map((scene, index) => {
        const fill = Math.min(1, Math.max(0, (inLoop - start) / SCENE_LENGTHS[index]));
        const sceneStart = start;
        start += SCENE_LENGTHS[index];
        return (
          <button
            key={scene.id}
            type="button"
            onClick={() => onSeek(sceneStart)}
            aria-label={t(`site.tour.scenes.${scene.id}.title`)}
            className="flex h-11 items-center"
            style={{ flex: SCENE_LENGTHS[index] }}
          >
            <span className="block h-1 w-full overflow-hidden rounded-full bg-black/10">
              <span
                className="block h-full rounded-full bg-[#1d1d1f] transition-[width] duration-100 ease-linear"
                style={{ width: `${fill * 100}%` }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
};

const ControlButton = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1d1d1f] ring-1 ring-black/[0.06] transition-colors hover:bg-[#e8e8ed]"
  >
    {children}
  </button>
);

const requestFullscreen = (element) =>
  (element.requestFullscreen || element.webkitRequestFullscreen)?.call(element);
const exitFullscreen = () => (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;

// Self-playing tour for booths and screens: marketplace, storefront and POS
// selling from one stock count, looping forever.
const ShowcasePage = () => {
  const { t, language } = useLanguage();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [kiosk, setKiosk] = useState(params.get('kiosk') === '1');
  const rootRef = useRef(null);

  const { scene, step } = locate(elapsed);
  const current = SCENES[scene];
  const stock = stockAt(scene, step);
  const SceneView = SCENE_COMPONENTS[current.id];

  useEffect(() => {
    document.title = `${t('site.tour.title')} · Rentify`;
  }, [t]);

  useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => setElapsed((value) => value + TICK), TICK);
    return () => clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    if (playing) return undefined;
    const timer = setTimeout(() => setPlaying(true), AUTO_RESUME);
    return () => clearTimeout(timer);
  }, [playing]);

  // Keep a standby tablet's screen awake while the tour plays
  useEffect(() => {
    if (!playing || !navigator.wakeLock) return undefined;
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
  }, [playing]);

  const togglePlay = useCallback(() => setPlaying((value) => !value), []);
  const restart = useCallback(() => {
    setElapsed(0);
    setPlaying(true);
  }, []);
  const seek = useCallback((ms) => {
    setElapsed(ms);
    setPlaying(true);
  }, []);

  const toggleKiosk = useCallback(() => {
    if (kiosk) {
      if (fullscreenElement()) exitFullscreen();
      setKiosk(false);
      return;
    }
    setKiosk(true);
    if (rootRef.current) Promise.resolve(requestFullscreen(rootRef.current)).catch(() => undefined);
  }, [kiosk]);

  useEffect(() => {
    const onChange = () => !fullscreenElement() && setKiosk(false);
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.target.closest?.('input, textarea')) return;
      if (event.key === ' ') {
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'r' || event.key === 'R') {
        restart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, restart]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        className={cn(
          'flex h-[100dvh] flex-col overflow-hidden bg-[#f5f5f7] text-[#1d1d1f] antialiased',
          language === 'KH' ? 'font-site-kh' : 'font-site'
        )}
      >
        {!kiosk && <SiteHeader />}

        <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 flex-col gap-4 p-4 sm:p-6 [@media(orientation:landscape)]:grid [@media(orientation:landscape)]:grid-cols-[minmax(240px,30%)_1fr] [@media(orientation:landscape)]:grid-rows-[1fr_auto] [@media(orientation:landscape)]:gap-6">
          <aside className="flex flex-col gap-4 [@media(orientation:landscape)]:justify-center">
            <ChannelRail channel={current.channel} />
            <div aria-live="polite" className="min-h-[96px] sm:min-h-[120px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <h1
                    className={cn(
                      'text-[26px] font-semibold sm:text-[34px]',
                      language === 'KH' ? 'leading-[1.35]' : 'leading-[1.08] tracking-[-0.03em]'
                    )}
                  >
                    {t(`site.tour.scenes.${current.id}.title`)}
                  </h1>
                  <p className="mt-2 max-w-[520px] text-[15px] leading-[1.5] text-[#6e6e73] sm:text-[17px]">
                    {t(`site.tour.scenes.${current.id}.body`)}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="hidden [@media(orientation:landscape)]:block">
              <StockPill count={stock} />
            </div>
          </aside>

          <div className="relative min-h-0 flex-1 [@media(orientation:landscape)]:row-span-2">
            {/* Tapping the screen pauses; keyboard users have Space and the controls */}
            <div
              onClick={togglePlay}
              className="absolute inset-0 cursor-pointer select-none overflow-hidden rounded-[28px] bg-white text-left shadow-[0_40px_100px_-40px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={current.id}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <SceneView step={step} stock={stock} />
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>
                {!playing && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[60] flex items-center justify-center bg-white/50 backdrop-blur-[2px]"
                  >
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-3 text-[15px] font-medium text-white">
                      <Play className="h-4 w-4" /> {t('site.tour.paused')}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-3 [@media(orientation:landscape)]:col-start-1">
            <div className="hidden sm:block [@media(orientation:landscape)]:hidden">
              <StockPill count={stock} />
            </div>
            <Progress elapsed={elapsed} onSeek={seek} />
            <ControlButton label={playing ? t('site.tour.pause') : t('site.tour.play')} onClick={togglePlay}>
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </ControlButton>
            <ControlButton label={t('site.tour.restart')} onClick={restart}>
              <RotateCcw className="h-4 w-4" />
            </ControlButton>
            <ControlButton label={t('site.tour.wall')} onClick={() => navigate('/showcase/wall')}>
              <MonitorPlay className="h-4 w-4" />
            </ControlButton>
            <ControlButton label={kiosk ? t('site.tour.exitFullscreen') : t('site.tour.fullscreen')} onClick={toggleKiosk}>
              {kiosk ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </ControlButton>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
};

export default ShowcasePage;
