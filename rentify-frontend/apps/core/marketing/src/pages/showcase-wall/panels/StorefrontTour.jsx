import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Banknote, Heart, Lock, Search, ShoppingBag, Truck, User } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { STORES, money } from '../wallData';
import { IOS_EASE, Scroller, Viewport, useCarousel, useTimeline } from '../wallKit';

// A storefront preview: land on the hero, scroll slowly down the whole
// page, then hand over to the next store. Nothing is bought here.
const VISIT = [
  ['hero', 3200],
  ['products', 3400],
  ['collections', 3400],
  ['newIn', 3200],
  ['footer', 3000],
];
const SCRIPT = STORES.flatMap((_, s) => VISIT.map(([step, ms]) => [`${s}:${step}`, ms]));

const Mark = ({ store, className }) =>
  store.logo ? (
    <img src={store.logo} alt="" className={cn('rounded-full object-cover', className)} />
  ) : (
    <span className={cn('flex items-center justify-center rounded-full bg-[#1c1917] text-[13px] font-bold tracking-tight text-[#f3eee5]', className)}>
      SL
    </span>
  );

const Header = ({ store }) => {
  const { t } = useLanguage();
  const { theme } = store;
  const dark = store.hero === 'phone';
  return (
    <div className={cn('relative z-10 h-[68px] shrink-0 border-b', theme.line, theme.bg)}>
      <div className="flex h-full w-full items-center gap-8 px-14">
        <div className="flex items-center gap-3">
          <Mark store={store} className="h-9 w-9" />
          <span className={cn('text-[20px] font-bold tracking-[-0.02em]', theme.ink, store.hero === 'thrift' && 'uppercase tracking-[0.18em] text-[16px]')}>
            {store.name}
          </span>
        </div>
        <nav className={cn('flex gap-7 text-[15px]', theme.muted)}>
          {['shop', 'new', 'about'].map((key) => (
            <span key={key}>{t(`site.wall.sf.nav.${key}`)}</span>
          ))}
        </nav>
        <div className={cn('ml-auto flex h-10 w-[300px] items-center gap-2 rounded-full border px-4 text-[14px]', theme.line, theme.muted, dark && 'bg-white/5')}>
          <Search className="h-4 w-4" /> {t('site.wall.sf.search')}
        </div>
        <User className={cn('h-5 w-5', theme.ink)} />
        <ShoppingBag className={cn('h-5 w-5', theme.ink)} />
      </div>
    </div>
  );
};

const Button = ({ store, children, ghost }) => (
  <span
    className={cn(
      'inline-flex h-12 items-center gap-2 px-7 text-[15px] font-semibold',
      store.hero === 'thrift' ? 'rounded-none' : 'rounded-full',
      ghost ? cn('border', store.theme.line, store.theme.ink) : store.theme.accent
    )}
  >
    {children}
  </span>
);

const EYEBROWS = {
  pill: 'inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#9cc3ff]',
  plain: 'text-[13px] font-semibold uppercase tracking-[0.2em] text-[#be3d6a]',
  sticker: 'inline-block -rotate-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-[0.08em] text-[#ea580c] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)]',
  rule: 'flex items-center gap-3 text-[12px] font-medium uppercase tracking-[0.34em] text-[#1c1917]/70 before:h-px before:w-10 before:bg-[#1c1917]/50',
  pillBlue: 'inline-flex rounded-full bg-[#1d4ed8] px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white',
};

// Each store sets its headline in its own typeface; the second line carries the accent
const Copy = ({ store, align = 'left', size = 'text-[60px]', onColor = false }) => {
  const { t } = useLanguage();
  const k = `site.wall.sf.${store.hero}`;
  const { theme } = store;
  const [first, ...rest] = t(`${k}.title`).split('\n');
  return (
    <div className={cn(align === 'center' && 'text-center')}>
      <p className={cn(EYEBROWS[theme.eyebrow], align === 'center' && 'justify-center')}>
        {store.hero === 'phone' && <span className="h-1.5 w-1.5 rounded-full bg-[#60a5fa]" />}
        {t(`${k}.eyebrow`)}
      </p>
      <h2 className={cn('mt-5', size, theme.display, onColor ? 'text-white' : theme.ink)}>
        <span className="block">{first}</span>
        {rest.length > 0 && <span className={cn('block pb-1', theme.accentLine)}>{rest.join(' ')}</span>}
      </h2>
      <p
        className={cn(
          'mt-5 max-w-[440px] text-[17px] leading-relaxed',
          onColor ? 'text-white/85' : theme.muted,
          align === 'center' && 'mx-auto'
        )}
      >
        {t(`${k}.body`)}
      </p>
    </div>
  );
};

// Five hero layouts, one per storefront template
const Hero = ({ store }) => {
  const { t } = useLanguage();
  const p = store.products;
  const shop = (
    <Button store={store}>
      {t('site.wall.sf.shopNow')} <ArrowRight className="h-4 w-4" />
    </Button>
  );
  const slide = useCarousel(3, 2200);

  if (store.hero === 'phone') {
    return (
      <div className="grid h-[400px] grid-cols-[1fr_1.05fr] items-center gap-12 px-14">
        <div>
          <Copy store={store} size="text-[64px]" />
          <div className="mt-8 flex gap-3">
            {shop}
            <Button store={store} ghost>{t('site.wall.sf.ourStory')}</Button>
          </div>
        </div>
        <div className="relative h-[330px] overflow-hidden rounded-[28px] bg-[#e9eef7]">
          <AnimatePresence initial={false}>
            <motion.img
              key={slide}
              src={p[slide].image}
              alt=""
              className="absolute inset-0 h-full w-full object-contain p-6"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: IOS_EASE }}
            />
          </AnimatePresence>
          <span className="absolute bottom-5 right-5 rounded-full bg-[#0b1220] px-5 py-2.5 text-[14px] font-semibold text-white">
            {p[slide].name.split(' · ')[0]}
          </span>
        </div>
      </div>
    );
  }
  if (store.hero === 'glow') {
    return (
      <div className="relative flex h-[400px] flex-col items-center justify-center px-14">
        {[
          [0, 'left-14 top-10 h-[300px] w-[230px]'],
          [2, 'right-14 top-16 h-[280px] w-[210px]'],
        ].map(([n, place], i) => (
          <motion.img
            key={n}
            src={p[n].image}
            alt=""
            className={cn('absolute rounded-t-full object-cover shadow-[0_30px_60px_-30px_rgba(59,29,39,0.5)]', place)}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: i * 1.5 }}
          />
        ))}
        <Copy store={store} align="center" size="text-[56px]" />
        <div className="mt-7">{shop}</div>
      </div>
    );
  }
  if (store.hero === 'munchie') {
    return (
      <div className="px-14 pt-6">
        <div className="relative flex h-[360px] items-center overflow-hidden rounded-[36px] bg-gradient-to-br from-[#fb923c] to-[#c2410c] px-14">
          <div className="relative z-10 max-w-[540px]">
            <Copy store={store} size="text-[64px]" onColor />
            <div className="mt-7">
              <span className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-[#c2410c]">
                {t('site.wall.sf.shopNow')} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
          {[0, 2].map((n, i) => (
            <motion.img
              key={n}
              src={p[n].image}
              alt=""
              className={cn('absolute h-[270px] w-[270px] rounded-[28px] object-cover shadow-2xl', i ? 'right-[60px] top-[60px] rotate-[8deg]' : 'right-[280px] top-[40px] -rotate-[8deg]')}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i * 1.2 }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (store.hero === 'thrift') {
    return (
      <div className="grid h-[400px] grid-cols-[1fr_1.1fr] gap-10 px-14 pt-6">
        <div className="flex flex-col justify-center">
          <Copy store={store} size="text-[104px]" />
          <span className="mt-6 inline-flex items-center gap-2 border-b-2 border-[#1c1917] pb-1 text-[15px] font-semibold text-[#1c1917] self-start">
            {t('site.wall.sf.shopEdit')} <ArrowRight className="h-4 w-4" />
          </span>
        </div>
        <div className="grid h-[360px] grid-cols-2 grid-rows-2 gap-3">
          <img src={p[0].image} alt="" className="row-span-2 h-full w-full object-cover" />
          <img src={p[1].image} alt="" className="h-full w-full object-cover" />
          <img src={p[2].image} alt="" className="h-full w-full object-cover" />
        </div>
      </div>
    );
  }
  return (
    <div className="grid h-[400px] grid-cols-[1.1fr_1fr] gap-5 px-14 pt-6">
      <div className="flex flex-col justify-center rounded-[32px] bg-[#fde047] px-12">
        <Copy store={store} size="text-[58px]" />
        <div className="mt-7">{shop}</div>
      </div>
      <div className="relative overflow-hidden rounded-[32px] bg-[#dbeafe]">
        <img src={p[1].image} alt="" className="h-full w-full object-cover" />
        <span className="absolute left-6 top-6 flex h-[92px] w-[92px] rotate-[-10deg] items-center justify-center rounded-full bg-[#1d4ed8] text-center text-[13px] font-bold leading-tight text-white">
          {t('site.wall.sf.bright.sticker')}
        </span>
      </div>
    </div>
  );
};

const ProductCard = ({ store, item }) => (
  <div>
    <div className={cn('relative aspect-square overflow-hidden', store.theme.radius, store.theme.surface)}>
      <img src={item.image} alt="" className="h-full w-full object-cover" />
      {item.was && (
        <span className={cn('absolute left-3 top-3 px-2.5 py-1 text-[12px] font-bold', store.theme.accent, store.hero === 'thrift' ? 'rounded-none' : 'rounded-full')}>
          -{Math.round((1 - item.price / item.was) * 100)}%
        </span>
      )}
    </div>
    <p className={cn('mt-3 truncate text-[16px] font-semibold', store.theme.ink)}>{item.name}</p>
    <p className="mt-0.5 flex items-baseline gap-2">
      <span className={cn('text-[16px] font-bold', store.theme.accentText)}>{money(item.price)}</span>
      {item.was && <span className={cn('text-[13px] line-through', store.theme.muted)}>{money(item.was)}</span>}
    </p>
  </div>
);

// Three collection banners built from the store's own photos
const Collections = ({ store }) => {
  const { t } = useLanguage();
  const p = store.products;
  const cards = [
    ['bestSellers', p[0], p[4]],
    ['newArrivals', p[2], p[6]],
    ['onSale', p[5], p[1]],
  ];
  return (
    <div data-anchor="collections" className="px-14 pb-14">
      <h3 className={cn('text-[30px] font-bold tracking-[-0.025em]', store.theme.ink)}>{t('site.wall.sf.collections')}</h3>
      <div className="mt-6 grid grid-cols-3 gap-6">
        {cards.map(([key, a, b]) => (
          <div key={key} className={cn('relative h-[300px] overflow-hidden', store.theme.radius, store.theme.surface)}>
            <img src={a.image} alt="" className="absolute inset-y-0 left-0 h-full w-[60%] object-cover" />
            <img src={b.image} alt="" className="absolute inset-y-0 right-0 h-full w-[40%] object-cover opacity-90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
              <p className={cn('text-[28px] leading-tight', store.theme.display)}>{t(`site.wall.sf.col.${key}`)}</p>
              <span className={cn('flex h-11 w-11 items-center justify-center bg-white/90 text-[#1d1d1f]', store.hero === 'thrift' ? 'rounded-none' : 'rounded-full')}>
                <ArrowRight className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// What every Rentify store promises, in the store's own colours
const StorePromise = ({ store }) => {
  const { t } = useLanguage();
  const items = [
    [Truck, t('site.wall.sf.deliveredBy', { store: store.name })],
    [Banknote, t('site.tour.ui.cod')],
    [Heart, t('site.wall.sf.local')],
  ];
  return (
    <div className="px-14 pb-14">
      <div className={cn('grid grid-cols-3 gap-6 border px-10 py-9', store.theme.line, store.theme.surface, store.theme.radius)}>
        {items.map(([Icon, label]) => (
          <div key={label} className="flex items-center gap-4">
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center', store.theme.accent, store.hero === 'thrift' ? 'rounded-none' : 'rounded-full')}>
              <Icon className="h-5 w-5" />
            </span>
            <p className={cn('text-[17px] font-semibold', store.theme.ink)}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Footer = ({ store }) => {
  const { t } = useLanguage();
  return (
    <div data-anchor="footer" className={cn('border-t px-14 pb-12 pt-10', store.theme.line)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Mark store={store} className="h-11 w-11" />
          <div>
            <p className={cn('text-[20px] font-bold', store.theme.ink)}>{store.name}</p>
            <p className={cn('text-[14px]', store.theme.muted)}>{store.domain}</p>
          </div>
        </div>
        <div className={cn('flex gap-10 text-[15px]', store.theme.muted)}>
          {['shop', 'new', 'about'].map((key) => (
            <span key={key}>{t(`site.wall.sf.nav.${key}`)}</span>
          ))}
        </div>
      </div>
      <p className={cn('mt-8 text-[13px]', store.theme.muted)}>
        © 2026 {store.name} · {t('site.wall.sf.powered')}
      </p>
    </div>
  );
};

const HomePage = ({ store, step }) => {
  const { t } = useLanguage();
  const anchor = step === 'hero' ? null : step;

  return (
    <div className="relative h-full overflow-hidden">
      <Scroller anchor={anchor} offset={28} duration={2.6}>
        <Hero store={store} />
        <div data-anchor="products" className="px-14 pb-16 pt-12">
          <div className="flex items-end justify-between">
            <h3 className={cn('text-[30px] font-bold tracking-[-0.025em]', store.theme.ink)}>{t('site.wall.sf.featured')}</h3>
            <span className={cn('text-[15px] font-semibold', store.theme.accentText)}>{t('site.wall.viewAll')} →</span>
          </div>
          <div className="mt-6 grid auto-cols-fr grid-flow-col gap-6">
            {store.products.slice(0, 8).map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: IOS_EASE, delay: 0.5 + i * 0.07 }}
              >
                <ProductCard store={store} item={item} />
              </motion.div>
            ))}
          </div>
        </div>
        <Collections store={store} />
        <div data-anchor="newIn" className="px-14 pb-14">
          <div className="flex items-end justify-between">
            <h3 className={cn('text-[30px] font-bold tracking-[-0.025em]', store.theme.ink)}>{t('site.wall.sf.newIn')}</h3>
            <span className={cn('text-[15px] font-semibold', store.theme.accentText)}>{t('site.wall.viewAll')} →</span>
          </div>
          <div className="mt-6 grid auto-cols-fr grid-flow-col gap-6">
            {[...store.products].reverse().map((item) => (
              <ProductCard key={item.id} store={store} item={item} />
            ))}
          </div>
        </div>
        <StorePromise store={store} />
        <Footer store={store} />
      </Scroller>
    </div>
  );
};

// Browser window previewing the storefronts one store after another
const StorefrontTour = ({ onStore }) => {
  const tl = useTimeline(SCRIPT);
  const [s, step] = tl.step.split(':');
  const store = STORES[Number(s)];

  React.useEffect(() => {
    onStore?.(store);
  }, [store, onStore]);

  return (
    <Viewport width={1440} minHeight={660}>
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-white font-site">
        <div className="flex h-11 shrink-0 items-center gap-4 border-b border-black/[0.06] bg-[#f5f5f7] px-5">
          <div className="flex gap-2">
            {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
              <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="mx-auto flex h-7 w-[560px] items-center justify-center gap-1.5 rounded-lg bg-white text-[13px] text-[#6e6e73]">
            <Lock className="h-3 w-3" />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={store.domain}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="truncate"
              >
                {store.domain}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          <AnimatePresence initial={false}>
            <motion.div
              key={store.id}
              className={cn('absolute inset-0 flex flex-col', store.theme.bg, store.theme.font)}
              initial={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.96, filter: 'blur(10px)' }}
              transition={{ duration: 0.9, ease: IOS_EASE }}
            >
              <Header store={store} />
              <div className="relative min-h-0 flex-1">
                <HomePage store={store} step={step} />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Viewport>
  );
};

export default StorefrontTour;
