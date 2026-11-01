import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  Globe,
  Heart,
  LayoutGrid,
  List,
  MapPin,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Truck,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import rentifyLogo from '../../../assets/Logo.webp';
import { BRIGHT, CATEGORIES, PHONE, PROMOS, STORES, THRIFT, discount, money } from '../wallData';
import { Cursor, IOS_EASE, Scroller, Stars, Typed, Viewport, useTimeline } from '../wallKit';

const SCRIPT = [
  ['home', 1900],
  ['side1', 950],
  ['side2', 950],
  ['side3', 950],
  ['side4', 950],
  ['popular', 2300],
  ['clickCat', 450],
  ['category', 2600],
  ['hoverStore', 1300],
  ['clickStore', 450],
  ['store', 2600],
  ['searchFocus', 1100],
  ['typing', 1700],
  ['results', 2300],
  ['addCart', 1700],
];

const PAGE_OF = {
  home: 'home', side1: 'home', side2: 'home', side3: 'home', side4: 'home', popular: 'home', clickCat: 'home',
  category: 'category', hoverStore: 'category', clickStore: 'category',
  store: 'store', searchFocus: 'store', typing: 'store',
  results: 'results', addCart: 'results',
};

const CURSOR = {
  home: 'mk-hero', side1: 'mk-side-fashion', side2: 'mk-side-food', side3: 'mk-side-beauty', side4: 'mk-side-home',
  popular: 'mk-pop-fashion', clickCat: 'mk-pop-fashion',
  category: 'mk-prod-1', hoverStore: 'mk-store-link', clickStore: 'mk-store-link',
  store: 'mk-follow', searchFocus: 'mk-search', typing: 'mk-search',
  results: 'mk-add-0', addCart: 'mk-add-0',
};

const CALLOUT = {
  home: 'welcome', side1: 'byCategory', side2: 'byCategory', side3: 'byCategory', side4: 'byCategory',
  popular: 'oneMarketplace', clickCat: 'oneMarketplace',
  category: 'localStores', hoverStore: 'localStores', clickStore: 'localStores',
  store: 'storePage', searchFocus: 'storePage',
  typing: 'search', results: 'search', addCart: 'oneCart',
};

// Hero slide shown while each sidebar category is hovered
const HERO = {
  home: ['craft', PROMOS.silk],
  side1: ['fashion', PROMOS.fashion],
  side2: ['food', PROMOS.produce],
  side3: ['beauty', PROMOS.beauty],
  side4: ['home', PROMOS.homeware],
};
const CALLOUT_ORDER = { welcome: 1, byCategory: 2, oneMarketplace: 3, localStores: 4, storePage: 5, search: 6, oneCart: 7 };
const SIDE_ACTIVE = { side1: 'fashion', side2: 'food', side3: 'beauty', side4: 'home' };

const FASHION = [THRIFT.products[0], BRIGHT.products[0], THRIFT.products[1], THRIFT.products[5], BRIGHT.products[1], THRIFT.products[2], THRIFT.products[3], THRIFT.products[6]];
const STORE_ITEM = 2;
const QUERY = 'iphone';

const Card = ({ item, cursor, storeCursor, addCursor, hot }) => {
  const off = discount(item);
  return (
    <motion.div
      data-cursor={cursor}
      animate={{ y: hot ? -6 : 0 }}
      transition={{ duration: 0.45, ease: IOS_EASE }}
      className={cn(
        'rounded-[18px] border bg-white p-2.5 transition-shadow duration-500',
        hot ? 'border-transparent shadow-[0_26px_50px_-24px_rgba(0,0,0,0.35)]' : 'border-black/[0.06]'
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-[14px] bg-[#f5f5f7]">
        <motion.img src={item.image} alt="" className="h-full w-full object-cover" animate={{ scale: hot ? 1.06 : 1 }} transition={{ duration: 0.7 }} />
        {off > 0 && <span className="absolute left-2 top-2 rounded-full bg-[#ef4444] px-2 py-0.5 text-[11px] font-bold text-white">-{off}%</span>}
        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
          <Heart className="h-3.5 w-3.5 text-[#1d1d1f]" />
        </span>
      </div>
      <p className="mt-2.5 truncate text-[14px] font-medium text-[#1d1d1f]">{item.name}</p>
      <p data-cursor={storeCursor} className={cn('mt-0.5 inline-flex items-center gap-1 text-[12px]', storeCursor ? 'text-[#0071e3] underline-offset-2' : 'text-[#86868b]')}>
        <Store className="h-3 w-3" /> {item.store.name}
      </p>
      <div className="mt-1.5 flex items-center justify-between">
        <p className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-bold text-[#1d1d1f]">{money(item.price)}</span>
          {item.was && <span className="text-[12px] text-[#86868b] line-through">{money(item.was)}</span>}
        </p>
        <span data-cursor={addCursor} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0058d6] text-white">
          <ShoppingCart className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.div>
  );
};

const Header = ({ tl, cart }) => {
  const { t } = useLanguage();
  const typing = tl.from('typing');
  return (
    <div className="relative z-20 h-[68px] shrink-0 border-b border-black/[0.06] bg-white">
      <div className="mx-auto flex h-full max-w-[2000px] items-center gap-6 px-8">
        <div className="flex items-center gap-2.5">
          <img src={rentifyLogo} alt="" className="h-10 w-10 rounded-[11px]" />
          <p className="text-[21px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Rentify <span className="font-normal text-[#424245]">Marketplace</span>
          </p>
      </div>
      <motion.div
        data-cursor="mk-search"
        animate={{ boxShadow: tl.from('searchFocus') && !tl.from('results') ? '0 0 0 3px rgba(0,113,227,0.25)' : '0 0 0 0px rgba(0,113,227,0)' }}
        className="flex h-11 flex-1 items-center gap-2.5 rounded-full border border-black/[0.08] bg-[#f5f5f7] px-5 text-[15px]"
      >
        <Search className="h-4 w-4 text-[#86868b]" />
        {typing ? (
          <span className="text-[#1d1d1f]">
            <Typed text={QUERY} run={tl.is('typing')} />
            {!tl.is('typing') && QUERY}
          </span>
        ) : (
          <span className="text-[#86868b]">{t('site.wall.m.search')}</span>
        )}
      </motion.div>
      <Globe className="h-5 w-5 text-[#1d1d1f]" />
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-[#1d1d1f]" />
        <div className="leading-tight">
          <p className="text-[11px] text-[#86868b]">{t('site.wall.mk.deliverTo')}</p>
          <p className="text-[14px] font-semibold text-[#1d1d1f]">{t('site.wall.mk.phnomPenh')}</p>
        </div>
      </div>
      <span className="relative">
        <ShoppingCart className="h-6 w-6 text-[#1d1d1f]" />
        <motion.span
          key={cart}
          initial={{ scale: 1.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0071e3] text-[11px] font-bold text-white ring-2 ring-white"
        >
          {cart}
        </motion.span>
      </span>
      <span className="flex h-10 items-center gap-2 rounded-full bg-[#f0f0ff] pl-1 pr-4 text-[14px] font-medium text-[#3f3fb3]">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5b5bd6] text-white">S</span> Sokha
      </span>
      </div>
    </div>
  );
};

const HomePage = ({ tl }) => {
  const { t } = useLanguage();
  const [slideKey, image] = HERO[tl.step] || HERO.side4;
  const active = SIDE_ACTIVE[tl.step];

  return (
    <Scroller anchor={tl.from('popular') ? 'popular' : null} offset={20} duration={1.8} className="px-8 pb-10 pt-5">
      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="rounded-[22px] border border-black/[0.06] bg-white p-2.5">
          <p className="flex h-11 items-center gap-3 rounded-[14px] bg-[#eef0ff] px-3.5 text-[15px] font-semibold text-[#3f3fb3]">
            <LayoutGrid className="h-[18px] w-[18px]" /> {t('site.wall.mk.allCategories')}
            <ChevronRight className="ml-auto h-4 w-4" />
          </p>
          {CATEGORIES.slice(0, 6).map((cat) => (
            <motion.p
              key={cat.id}
              data-cursor={`mk-side-${cat.id}`}
              animate={{ backgroundColor: active === cat.id ? 'rgba(0,113,227,0.08)' : 'rgba(0,113,227,0)', x: active === cat.id ? 4 : 0 }}
              transition={{ duration: 0.35 }}
              className={cn('mt-0.5 flex h-9 items-center gap-3 rounded-[12px] px-3.5 text-[14.5px]', active === cat.id ? 'font-semibold text-[#0058d6]' : 'text-[#1d1d1f]')}
            >
              <cat.icon className="h-[18px] w-[18px]" strokeWidth={1.7} /> {t(`site.wall.catLong.${cat.id}`)}
              <ChevronRight className="ml-auto h-4 w-4 text-[#aeaeb2]" />
            </motion.p>
          ))}
          <p className="mt-0.5 flex h-9 items-center gap-3 px-3.5 text-[14.5px] text-[#86868b]">
            <List className="h-[18px] w-[18px]" /> {t('site.wall.mk.viewMore')}
          </p>
        </div>
        <div className="relative h-[352px] overflow-hidden rounded-[28px] bg-[#f1eefb]">
          <AnimatePresence initial={false}>
            <motion.img
              key={image}
              src={image}
              alt=""
              className="absolute right-0 top-0 h-full w-[52%] object-cover"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: IOS_EASE }}
            />
          </AnimatePresence>
          <div className="absolute inset-y-0 left-0 flex w-[48%] flex-col justify-center pl-12">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#5b5bd6]">{t('site.wall.mk.madeIn')}</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={slideKey}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: IOS_EASE }}
                className="mt-3 whitespace-pre-line text-[46px] font-bold leading-[1.02] tracking-[-0.04em] text-[#1d1d1f]"
              >
                {t(`site.wall.mk.hero.${slideKey}`)}
              </motion.h2>
            </AnimatePresence>
            <span data-cursor="mk-hero" className="mt-6 inline-flex h-12 w-fit items-center gap-2 rounded-[14px] bg-[#0058d6] px-6 text-[16px] font-semibold text-white">
              {t('site.wall.mk.explore')} <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>

      <div data-anchor="popular" className="mt-9 flex items-end justify-between">
        <p className="text-[28px] font-bold tracking-[-0.025em] text-[#1d1d1f]">{t('site.wall.m.popular')}</p>
        <p className="text-[16px] font-medium text-[#0058d6]">{t('site.wall.viewAll')} →</p>
      </div>
      <div className="mt-5 grid grid-cols-6 gap-4">
        {CATEGORIES.slice(0, 6).map((cat) => {
          const hot = cat.id === 'fashion' && tl.from('popular');
          return (
            <motion.div
              key={cat.id}
              data-cursor={`mk-pop-${cat.id}`}
              animate={{ y: hot ? -6 : 0, scale: hot && tl.is('clickCat') ? 0.97 : 1 }}
              transition={{ duration: 0.4, ease: IOS_EASE }}
              className={cn('relative h-[170px] overflow-hidden rounded-[22px] bg-gradient-to-br p-5', cat.tone, hot && 'shadow-[0_26px_50px_-24px_rgba(0,0,0,0.35)]')}
            >
              <p className="relative z-10 max-w-[60%] text-[17px] font-semibold leading-tight text-[#1d1d1f]">{t(`site.wall.catLong.${cat.id}`)}</p>
              <img src={cat.art} alt="" className="absolute -bottom-2 -right-2 h-[130px] w-[130px] object-contain" />
              <span className="absolute bottom-4 left-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/80">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-9 text-[28px] font-bold tracking-[-0.025em] text-[#1d1d1f]">{t('site.wall.mk.shopByStore')}</p>
      <div className="mt-5 grid grid-cols-5 gap-4">
        {STORES.map((store) => (
          <div key={store.id} className="flex items-center gap-3 rounded-[20px] border border-black/[0.06] p-4">
            {store.logo ? (
              <img src={store.logo} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1c1917] text-[13px] font-bold text-white">SL</span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-[#1d1d1f]">{store.name}</p>
              <Stars value={store.rating} className="text-[12px] text-[#6e6e73]" />
            </div>
          </div>
        ))}
      </div>
    </Scroller>
  );
};

const CategoryPage = ({ tl }) => {
  const { t } = useLanguage();
  return (
    <Scroller anchor="grid" offset={12} duration={1.6} className="px-8 pb-10 pt-6">
      <p className="text-[13px] text-[#86868b]">
        {t('site.wall.m.tabHome')} / {t('site.wall.catLong.fashion')}
      </p>
      <div className="mt-2 flex items-end justify-between">
        <div>
          <p className="text-[32px] font-bold tracking-[-0.03em] text-[#1d1d1f]">{t('site.wall.catLong.fashion')}</p>
          <p className="text-[14px] text-[#6e6e73]">{t('site.wall.mk.fromStores', { count: 48, stores: 2 })}</p>
        </div>
        <span className="flex h-10 items-center gap-2 rounded-full border border-black/[0.08] px-4 text-[14px] text-[#1d1d1f]">
          <SlidersHorizontal className="h-4 w-4" /> {t('site.wall.mk.sort')}
        </span>
      </div>
      <div className="mt-4 flex gap-2">
        {['allStores', 'price', 'rating', 'inStock'].map((key, i) => (
          <span key={key} className={cn('rounded-full px-4 py-2 text-[13.5px]', i === 0 ? 'bg-[#1d1d1f] text-white' : 'bg-[#f2f2f4] text-[#1d1d1f]')}>
            {t(`site.wall.mk.filter.${key}`)}
          </span>
        ))}
      </div>
      <div data-anchor="grid" className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
        {FASHION.map((item, i) => (
          <Card
            key={item.id}
            item={item}
            cursor={`mk-prod-${i}`}
            storeCursor={i === STORE_ITEM ? 'mk-store-link' : undefined}
            hot={(i === 1 && tl.is('category')) || (i === STORE_ITEM && tl.from('hoverStore'))}
          />
        ))}
      </div>
    </Scroller>
  );
};

const StorePage = ({ tl }) => {
  const { t } = useLanguage();
  return (
    <Scroller anchor={tl.from('searchFocus') ? 'products' : null} offset={16} duration={1.8} className="pb-10">
      <div className="relative mx-8 mt-5 h-[170px] overflow-hidden rounded-[26px]">
        <img src={PROMOS.fashion} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
      </div>
      <div className="mx-8 -mt-10 flex items-end gap-5 px-6">
        <span className="relative flex h-[92px] w-[92px] items-center justify-center rounded-full bg-[#1c1917] text-[24px] font-bold text-[#f3eee5] ring-4 ring-white">SL</span>
        <div className="pb-1">
          <p className="flex items-center gap-2 text-[28px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
            {THRIFT.name} <BadgeCheck className="h-6 w-6 text-[#0071e3]" />
          </p>
          <p className="flex items-center gap-3 text-[14px] text-[#6e6e73]">
            <Stars value={THRIFT.rating} className="text-[#1d1d1f]" /> · {t('site.wall.mk.products', { count: 64 })} ·
            <span className="inline-flex items-center gap-1">
              <Truck className="h-4 w-4" /> {t('site.tour.ui.deliveryFee')} {money(THRIFT.deliveryFee)}
            </span>
          </p>
        </div>
        <motion.span
          data-cursor="mk-follow"
          animate={{ backgroundColor: tl.from('store') ? '#0058d6' : '#1d1d1f' }}
          className="mb-2 ml-auto inline-flex h-11 items-center rounded-full px-6 text-[15px] font-semibold text-white"
        >
          {t('site.wall.mk.visitStore')}
        </motion.span>
      </div>
      <div className="mx-8 mt-6 flex gap-7 border-b border-black/[0.06] text-[15px]">
        {['products', 'about', 'reviews'].map((key, i) => (
          <span key={key} className={cn('pb-3', i === 0 ? 'border-b-2 border-[#1d1d1f] font-semibold text-[#1d1d1f]' : 'text-[#86868b]')}>
            {t(`site.wall.mk.tab.${key}`)}
          </span>
        ))}
      </div>
      <div data-anchor="products" className="mx-8 mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
        {THRIFT.products.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
    </Scroller>
  );
};

const ResultsPage = ({ tl }) => {
  const { t } = useLanguage();
  return (
    <div className="px-8 pt-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[30px] font-bold tracking-[-0.03em] text-[#1d1d1f]">{t('site.wall.mk.resultsFor', { q: QUERY })}</p>
          <p className="text-[14px] text-[#6e6e73]">{t('site.wall.mk.inStore', { count: PHONE.products.length, store: PHONE.name })}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
        {PHONE.products.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07, duration: 0.6, ease: IOS_EASE }}
          >
            <Card item={item} addCursor={i === 0 ? 'mk-add-0' : undefined} hot={i === 0 && tl.from('results')} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const PAGES = { home: HomePage, category: CategoryPage, store: StorePage, results: ResultsPage };

// Desktop browser: a guided walk through what the marketplace offers
const DesktopMarketplace = () => {
  const { t } = useLanguage();
  const tl = useTimeline(SCRIPT);
  const rootRef = useRef(null);
  const page = PAGE_OF[tl.step];
  const Page = PAGES[page];
  const callout = CALLOUT[tl.step];
  const click = ['clickCat', 'clickStore', 'addCart'].includes(tl.step) ? tl.step : null;

  return (
    <Viewport width={1680} minHeight={620}>
      <div ref={rootRef} className="relative flex h-full w-full flex-col overflow-hidden bg-white font-site">
        <div className="h-9 shrink-0 bg-[#101828] text-[13px] text-white/80">
          <div className="mx-auto flex h-full max-w-[2000px] items-center gap-5 px-8">
            <span className="inline-flex items-center gap-2">
              <Truck className="h-4 w-4" /> {t('site.wall.mk.grouped')}
            </span>
            <span className="text-white/30">·</span>
            <span>{t('site.tour.ui.cod')}</span>
          </div>
        </div>
        <Header tl={tl} cart={tl.is('addCart') ? 2 : 1} />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.div
              key={page}
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: IOS_EASE }}
            >
              <div className="mx-auto h-full max-w-[2000px]">
                <Page tl={tl} />
              </div>
            </motion.div>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div
              key={callout}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: IOS_EASE }}
              className="absolute bottom-6 right-8 z-30 flex items-center gap-3 rounded-full bg-[#1d1d1f]/90 py-3 pl-3 pr-6 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[14px] font-bold">
                {CALLOUT_ORDER[callout]}
              </span>
              <span className="text-[18px] font-semibold tracking-[-0.01em]">{t(`site.wall.mk.callout.${callout}`)}</span>
            </motion.div>
          </AnimatePresence>
        </div>
        <Cursor rootRef={rootRef} target={CURSOR[tl.step]} clickKey={click} />
      </div>
    </Viewport>
  );
};


export default DesktopMarketplace;
