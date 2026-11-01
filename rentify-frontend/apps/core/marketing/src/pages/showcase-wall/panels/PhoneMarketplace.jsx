import React, { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Banknote,
  BadgeCheck,
  Check,
  ChevronLeft,
  Grid2x2,
  Home,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Share,
  ShoppingCart,
  Tag,
  Truck,
  User,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import rentifyLogo from '../../../assets/Logo.webp';
import { Tap } from '../../showcase/components/ShowcaseKit';
import { CATEGORIES, FLASH_DEALS, GLOW, MUNCHIE, PICKS, PROMOS, discount, money } from '../wallData';
import { Flight, IOS_EASE, Rolling, Scroller, Stars, Viewport, useCarousel, useCountdown, useTimeline } from '../wallKit';

// Browse first (home, deals, a category, a product with reviews), then buy
const SCRIPT = [
  ['home', 2600],
  ['scroll', 2500],
  ['scroll2', 2500],
  ['tapTab', 900],
  ['category', 2600],
  ['filter', 1900],
  ['tapProduct', 900],
  ['product', 2600],
  ['pdpScroll', 2600],
  ['tapAdd', 1300],
  ['added', 1500],
  ['tapCart', 850],
  ['cart', 1500],
  ['qty', 1400],
  ['tapCheckout', 850],
  ['checkout', 1700],
  ['payment', 1500],
  ['tapPlace', 800],
  ['placing', 1400],
  ['success', 3400],
];

const SCREEN_OF = {
  home: 0, scroll: 0, scroll2: 0, tapTab: 0,
  category: 1, filter: 1, tapProduct: 1,
  product: 2, pdpScroll: 2, tapAdd: 2, added: 2, tapCart: 2,
  cart: 3, qty: 3, tapCheckout: 3,
  checkout: 4, payment: 4, tapPlace: 4, placing: 4,
  success: 5,
};

const ITEM = GLOW.products[1];
const IN_CART = MUNCHIE.products[0];

// Push forward slides in from the right; going back slides the other way
const PUSH = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-28%', zIndex: dir > 0 ? 2 : 1, filter: 'brightness(1)' }),
  center: { x: 0, filter: 'brightness(1)' },
  exit: (dir) => ({ x: dir > 0 ? '-28%' : '100%', zIndex: dir > 0 ? 1 : 2, filter: dir > 0 ? 'brightness(0.85)' : 'brightness(1)' }),
};

const useDirection = (index) => {
  const ref = useRef({ index, dir: 1 });
  if (ref.current.index !== index) ref.current = { index, dir: index > ref.current.index ? 1 : -1 };
  return ref.current.dir;
};

const Badge = ({ count }) => (
  <motion.span
    key={count}
    initial={{ scale: 1.8 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 500, damping: 14 }}
    className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[10px] font-bold text-white ring-2 ring-white"
  >
    {count}
  </motion.span>
);

const Bar = ({ title, onBack = true, right }) => (
  <div className="flex h-12 shrink-0 items-center gap-2 border-b border-black/[0.05] bg-white px-3">
    {onBack && <ChevronLeft className="h-6 w-6 text-[#1d1d1f]" />}
    <p className="flex-1 text-[17px] font-semibold text-[#1d1d1f]">{title}</p>
    {right}
  </div>
);

const Price = ({ item, size = 'text-[15px]' }) => (
  <p className="flex items-baseline gap-1.5">
    <span className={cn('font-bold text-[#1d1d1f]', size)}>{money(item.price)}</span>
    {item.was && <span className="text-[11px] text-[#86868b] line-through">{money(item.was)}</span>}
  </p>
);

const ProductCard = ({ item, flight, tap }) => {
  const off = discount(item);
  return (
    <Tap on={tap} className="w-[150px] shrink-0">
      <div className={cn('rounded-[16px] border bg-white p-2 transition-colors duration-300', tap ? 'border-[#0071e3]' : 'border-black/[0.06]')}>
        <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#f5f5f7]">
          <img src={item.image} alt="" data-flight={flight} className="h-full w-full object-cover" />
          {off > 0 && (
            <span className="absolute left-1.5 top-1.5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[10px] font-bold text-white">-{off}%</span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 h-[30px] text-[11.5px] font-medium leading-[15px] text-[#1d1d1f]">{item.name}</p>
        <p className="truncate text-[10px] text-[#86868b]">{item.store.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <Price item={item} size="text-[13px]" />
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f0f0f2]">
            <ShoppingCart className="h-3 w-3 text-[#1d1d1f]" />
          </span>
        </div>
      </div>
    </Tap>
  );
};

const HomeScreen = ({ tl, cartCount }) => {
  const { t } = useLanguage();
  const slides = [PROMOS.beauty, PROMOS.produce, PROMOS.fashion];
  const slide = useCarousel(slides.length, 2600);
  const [h, m, s] = useCountdown();

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <img src={rentifyLogo} alt="" className="h-8 w-8 rounded-[9px]" />
        <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-[#f2f2f4] px-3 text-[12.5px] text-[#86868b]">
          <Search className="h-3.5 w-3.5" />
          {t('site.wall.m.search')}
        </div>
        <span className="relative">
          <ShoppingCart className="h-[22px] w-[22px] text-[#1d1d1f]" />
          <Badge count={cartCount} />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5b5bd6] text-[12px] font-semibold text-white">S</span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Scroller anchor={tl.is('scroll') ? 'deals' : tl.from('scroll2') ? 'forYou' : null} offset={8} className="pb-24">
          <div className="relative mx-4 mt-1 h-[186px] overflow-hidden rounded-[22px] bg-[#f5f5f7]">
            <motion.div
              className="flex h-full"
              animate={{ x: `-${slide * 100}%` }}
              transition={{ duration: 0.9, ease: IOS_EASE }}
            >
              {slides.map((src) => (
                <img key={src} src={src} alt="" className="h-full w-full shrink-0 object-cover" />
              ))}
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/80">{t('site.wall.m.justLanded')}</p>
              <p className="mt-1 text-[19px] font-semibold leading-tight tracking-[-0.01em]">
                {t('site.wall.m.newArrivals')} <span className="text-[#fbbf24]">{t('site.wall.m.everyWeek')}</span>
              </p>
              <span className="mt-2.5 inline-flex h-7 items-center gap-1 rounded-full bg-white px-3 text-[11px] font-semibold text-[#1d1d1f]">
                {t('site.wall.m.seeNew')} <ArrowRight className="h-3 w-3" />
              </span>
            </div>
            <div className="absolute right-4 top-4 flex gap-1">
              {slides.map((src, i) => (
                <motion.span key={src} animate={{ width: i === slide ? 16 : 5 }} className="h-[5px] rounded-full bg-white" />
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between px-4">
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{t('site.wall.m.popular')}</p>
            <p className="text-[12px] text-[#0071e3]">{t('site.wall.viewAll')} →</p>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-y-3 px-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex flex-col items-center gap-1">
                <img src={cat.art} alt="" className="h-11 w-11 object-contain" />
                <span className="text-[10.5px] text-[#1d1d1f]">{t(`site.wall.cat.${cat.id}`)}</span>
              </div>
            ))}
          </div>

          <div data-anchor="deals" className="mt-6 flex items-center gap-2 px-4">
            <Tag className="h-4 w-4 text-[#ef4444]" />
            <p className="text-[15px] font-semibold text-[#1d1d1f]">{t('site.wall.m.flashDeals')}</p>
            <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#dc2626]">
              {t('site.wall.m.endsIn')} {h}:{m}:{s}
            </span>
            <span className="ml-auto text-[11px] text-[#0071e3]">{t('site.wall.viewAll')} →</span>
          </div>
          <div className="mt-3 flex gap-2.5 overflow-hidden pl-4">
            {FLASH_DEALS.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>

          <p data-anchor="forYou" className="mt-6 px-4 text-[15px] font-semibold text-[#1d1d1f]">{t('site.wall.m.forYou')}</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 px-4">
            {PICKS.map((item) => (
              <div key={item.id} className="rounded-[16px] border border-black/[0.06] p-2">
                <img src={item.image} alt="" className="aspect-square w-full rounded-[12px] object-cover" />
                <p className="mt-2 truncate text-[12px] font-medium text-[#1d1d1f]">{item.name}</p>
                <Price item={item} size="text-[13px]" />
              </div>
            ))}
          </div>
        </Scroller>
      </div>
      <TabBar active={0} cartCount={cartCount} tap={tl.is('tapTab') ? 1 : -1} />
    </div>
  );
};

const TabBar = ({ active, cartCount, tap = -1 }) => {
  const { t } = useLanguage();
  const tabs = [
    [Home, 'site.wall.m.tabHome'],
    [Grid2x2, 'site.wall.m.tabCategories'],
    [ShoppingCart, 'site.tour.ui.cart'],
    [User, 'site.wall.m.tabAccount'],
  ];
  return (
    <div className="grid h-[58px] shrink-0 grid-cols-4 border-t border-black/[0.06] bg-white/95 pb-2 pt-1.5 backdrop-blur">
      {tabs.map(([Icon, key], i) => (
        <Tap key={key} on={i === tap}>
          <span className={cn('flex flex-col items-center gap-0.5 text-[10px]', i === active ? 'text-[#0071e3]' : 'text-[#86868b]')}>
            <span className="relative">
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.8} />
              {i === 2 && <Badge count={cartCount} />}
            </span>
            {t(key)}
          </span>
        </Tap>
      ))}
    </div>
  );
};

const CHIPS = ['chipAll', 'chipCleansers', 'chipBody', 'chipHair'];

const CategoryScreen = ({ tl, cartCount }) => {
  const { t } = useLanguage();
  const chip = tl.from('filter') ? 1 : 0;
  return (
    <div className="flex h-full flex-col bg-white">
      <Bar title={t('site.wall.catLong.beauty')} right={<Search className="h-5 w-5 text-[#1d1d1f]" />} />
      <div className="flex gap-2 overflow-hidden px-4 pt-3">
        {CHIPS.map((key, i) => (
          <motion.span
            key={key}
            animate={{ backgroundColor: i === chip ? '#1d1d1f' : '#f2f2f4', color: i === chip ? '#ffffff' : '#1d1d1f' }}
            transition={{ duration: 0.35 }}
            className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium"
          >
            {t(`site.wall.m.${key}`)}
          </motion.span>
        ))}
      </div>
      <p className="px-4 pt-2.5 text-[11.5px] text-[#86868b]">{t('site.wall.mk.inStore', { count: GLOW.products.length, store: GLOW.name })}</p>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div key={chip} className="grid grid-cols-2 gap-2.5 px-4 pt-3">
          {GLOW.products.map((item, i) => {
            const tap = tl.is('tapProduct') && item.id === ITEM.id;
            const off = discount(item);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06, duration: 0.5, ease: IOS_EASE }}
              >
                <Tap on={tap}>
                  <div className={cn('rounded-[16px] border p-2 transition-colors duration-300', tap ? 'border-[#0071e3]' : 'border-black/[0.06]')}>
                    <div className="relative aspect-square overflow-hidden rounded-[12px] bg-[#f5f5f7]">
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                      {off > 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#ef4444] px-1.5 py-0.5 text-[10px] font-bold text-white">-{off}%</span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-[12px] font-medium text-[#1d1d1f]">{item.name}</p>
                    <div className="mt-0.5 flex items-center justify-between">
                      <Price item={item} size="text-[13px]" />
                      <Stars value={GLOW.rating} className="text-[10.5px] text-[#86868b]" />
                    </div>
                  </div>
                </Tap>
              </motion.div>
            );
          })}
        </div>
      </div>
      <TabBar active={1} cartCount={cartCount} />
    </div>
  );
};

const REVIEWS = [
  ['Srey Leak', 'site.wall.m.review1'],
  ['Dara Kim', 'site.wall.m.review2'],
];

const ProductScreen = ({ tl, cartCount }) => {
  const { t } = useLanguage();
  const gallery = [ITEM.image, GLOW.products[0].image, GLOW.products[2].image];
  const slide = useCarousel(gallery.length, 1500, tl.is('product'));
  const added = tl.from('added');

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Scroller anchor={tl.is('pdpScroll') ? 'reviews' : null} offset={0} duration={1.3}>
          <div className="relative aspect-square shrink-0 overflow-hidden bg-[#f5f5f7]">
            <motion.div className="flex h-full" animate={{ x: `-${slide * 100}%` }} transition={{ duration: 0.8, ease: IOS_EASE }}>
              {gallery.map((src, i) => (
                <img key={src} src={src} alt="" data-flight={i === 0 ? 'pdp' : undefined} className="h-full w-full shrink-0 object-cover" />
              ))}
            </motion.div>
            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm">
                <ChevronLeft className="h-5 w-5" />
              </span>
              <div className="flex gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm">
                  <Share className="h-4 w-4" />
                </span>
                <span data-flight="cart" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm">
                  <ShoppingCart className="h-4 w-4" />
                  <Badge count={cartCount} />
                </span>
              </div>
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
              {gallery.map((src, i) => (
                <motion.span key={src} animate={{ width: i === slide ? 16 : 6, opacity: i === slide ? 1 : 0.5 }} className="h-1.5 rounded-full bg-[#1d1d1f]" />
              ))}
            </div>
          </div>
          <div className="flex-1 px-4 pt-4">
            <div className="flex items-center gap-2">
              <img src={GLOW.logo} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-black/10" />
              <span className="text-[12.5px] font-medium text-[#1d1d1f]">{GLOW.name}</span>
              <BadgeCheck className="h-4 w-4 text-[#0071e3]" />
              <Stars value={GLOW.rating} className="ml-auto text-[12px] text-[#6e6e73]" />
            </div>
            <p className="mt-3 text-[21px] font-semibold leading-tight tracking-[-0.01em] text-[#1d1d1f]">{ITEM.name}</p>
            <div className="mt-2 flex items-center gap-2">
              <Price item={ITEM} size="text-[24px]" />
              <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[11px] font-bold text-[#dc2626]">-{discount(ITEM)}%</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#fff4d6] px-2.5 py-1 text-[11px] font-semibold text-[#9a6700]">
                {t('site.wall.m.inStock', { count: 12 })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f0f0f2] px-2.5 py-1 text-[11px] text-[#424245]">
                <Truck className="h-3.5 w-3.5" /> {t('site.tour.ui.deliveryFee')} {money(GLOW.deliveryFee)}
              </span>
            </div>
            <p className="mt-4 text-[12.5px] leading-relaxed text-[#6e6e73]">{t('site.wall.m.about', { store: GLOW.name })}</p>
            <div data-anchor="reviews" className="mt-6 border-t border-black/[0.06] pt-4">
              <div className="flex items-end justify-between">
                <p className="text-[16px] font-semibold text-[#1d1d1f]">{t('site.wall.m.reviews')}</p>
                <p className="text-[12px] text-[#86868b]">{t('site.wall.m.reviewCount', { count: 128 })}</p>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[34px] font-semibold tracking-tight text-[#1d1d1f]">{GLOW.rating.toFixed(1)}</span>
                <div className="flex-1 space-y-1">
                  {[86, 10, 3].map((w, i) => (
                    <div key={w} className="flex items-center gap-2 text-[10px] text-[#86868b]">
                      <span>{5 - i}★</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f0f2]">
                        <motion.span
                          className="block h-full rounded-full bg-[#f5a623]"
                          initial={{ width: 0 }}
                          animate={{ width: tl.from('pdpScroll') ? `${w}%` : 0 }}
                          transition={{ duration: 0.9, delay: 0.4 + i * 0.1 }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {REVIEWS.map(([name, key]) => (
                  <div key={name} className="rounded-[14px] bg-[#f5f5f7] p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-semibold text-[#1d1d1f]">{name}</p>
                      <Stars value={5} className="text-[11px] text-[#6e6e73]" />
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-[#424245]">{t(key)}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-[14px] font-semibold text-[#1d1d1f]">{t('site.wall.m.moreFrom', { store: GLOW.name })}</p>
              <div className="mt-2.5 flex gap-2.5 pb-6">
                {[GLOW.products[0], GLOW.products[2], GLOW.products[4]].map((item) => (
                  <div key={item.id} className="w-[110px] shrink-0">
                    <img src={item.image} alt="" className="aspect-square w-full rounded-[12px] object-cover" />
                    <p className="mt-1.5 truncate text-[11px] text-[#1d1d1f]">{item.name}</p>
                    <Price item={item} size="text-[12px]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Scroller>
      </div>
      <div className="shrink-0 border-t border-black/[0.05] px-4 pb-6 pt-3">
        <Tap on={tl.is('tapAdd')}>
          <motion.div
            animate={{ backgroundColor: added ? '#1a7f37' : '#0071e3' }}
            transition={{ duration: 0.4 }}
            className="flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold text-white"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={added ? 'added' : 'add'}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-2"
              >
                {added ? <Check className="h-4 w-4" strokeWidth={3} /> : <ShoppingCart className="h-4 w-4" />}
                {t(added ? 'site.wall.m.added' : 'site.tour.ui.addToCart')}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        </Tap>
      </div>
    </div>
  );
};

const Stepper = ({ qty, tap }) => (
  <div className="flex items-center gap-2.5 rounded-full bg-[#f2f2f4] px-1.5 py-1">
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
      <Minus className="h-3 w-3" />
    </span>
    <motion.span key={qty} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-3 text-center text-[13px] font-semibold">
      {qty}
    </motion.span>
    <Tap on={tap}>
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
        <Plus className="h-3 w-3" />
      </span>
    </Tap>
  </div>
);

const CartScreen = ({ tl }) => {
  const { t } = useLanguage();
  const qty = tl.from('qty') ? 2 : 1;
  const subtotal = IN_CART.price + ITEM.price * qty;
  const delivery = MUNCHIE.deliveryFee + GLOW.deliveryFee;

  return (
    <div className="flex h-full flex-col bg-[#f5f5f7]">
      <Bar title={`${t('site.tour.ui.cart')} (${1 + qty})`} />
      <div className="flex-1 space-y-3 overflow-hidden px-4 pt-4">
        {[
          [MUNCHIE, IN_CART, 1, false],
          [GLOW, ITEM, qty, tl.is('qty')],
        ].map(([store, item, count, tap]) => (
          <div key={store.id} className="rounded-[18px] bg-white p-3">
            <p className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1d1d1f]">
              <img src={store.logo} alt="" className="h-6 w-6 rounded-full object-cover" /> {store.name}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <img src={item.image} alt="" className="h-16 w-16 rounded-[12px] object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[#1d1d1f]">{item.name}</p>
                <Price item={item} size="text-[14px]" />
              </div>
              <Stepper qty={count} tap={tap} />
            </div>
            <p className="mt-3 flex justify-between border-t border-black/[0.05] pt-2 text-[11.5px] text-[#6e6e73]">
              <span>{t('site.tour.ui.deliveryFee')}</span>
              <span>{money(store.deliveryFee)}</span>
            </p>
          </div>
        ))}
        <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-[#6e6e73]">
          <Truck className="h-3.5 w-3.5" /> {t('site.wall.m.eachStore')}
        </p>
      </div>
      <div className="shrink-0 space-y-1.5 rounded-t-[22px] bg-white px-4 pb-6 pt-4 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.3)]">
        <p className="flex justify-between text-[13px] text-[#6e6e73]">
          <span>{t('site.tour.ui.subtotal')}</span>
          <Rolling value={subtotal} />
        </p>
        <p className="flex justify-between text-[13px] text-[#6e6e73]">
          <span>{t('site.tour.ui.deliveryFee')}</span>
          <span>{money(delivery)}</span>
        </p>
        <p className="flex justify-between pb-2 text-[16px] font-semibold text-[#1d1d1f]">
          <span>{t('site.tour.ui.total')}</span>
          <Rolling value={subtotal + delivery} />
        </p>
        <Tap on={tl.is('tapCheckout')}>
          <div className="flex h-12 items-center justify-center rounded-full bg-[#0071e3] text-[15px] font-semibold text-white">
            {t('site.wall.m.checkout')}
          </div>
        </Tap>
      </div>
    </div>
  );
};

const CheckoutScreen = ({ tl }) => {
  const { t } = useLanguage();
  const total = IN_CART.price + ITEM.price * 2 + MUNCHIE.deliveryFee + GLOW.deliveryFee;
  const placing = tl.is('placing');

  return (
    <div className="flex h-full flex-col bg-[#f5f5f7]">
      <Bar title={t('site.wall.m.checkout')} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Scroller anchor={tl.from('payment') ? 'payment' : null} offset={12} className="space-y-3 px-4 pb-6 pt-4">
          <div className="rounded-[18px] bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">{t('site.wall.m.deliverTo')}</p>
            <div className="mt-2 flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f1fd]">
                <MapPin className="h-4 w-4 text-[#0071e3]" />
              </span>
              <div>
                <p className="text-[13.5px] font-medium text-[#1d1d1f]">Sokha Chan · 012 345 678</p>
                <p className="text-[12px] text-[#6e6e73]">St. 271, Toul Tom Poung, Phnom Penh</p>
              </div>
            </div>
          </div>
          <div className="rounded-[18px] bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">
              {t('site.wall.m.ordersCount', { count: 2 })}
            </p>
            {[
              [MUNCHIE, IN_CART.price, 1],
              [GLOW, ITEM.price * 2, 2],
            ].map(([store, sum, count]) => (
              <div key={store.id} className="mt-3 flex items-center gap-3">
                <img src={store.logo} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{store.name}</p>
                  <p className="text-[11.5px] text-[#86868b]">
                    {t('site.wall.m.items', { count })} · {t('site.tour.ui.deliveryFee')} {money(store.deliveryFee)}
                  </p>
                </div>
                <p className="text-[13px] font-semibold text-[#1d1d1f]">{money(sum + store.deliveryFee)}</p>
              </div>
            ))}
          </div>
          <div data-anchor="payment" className="rounded-[18px] bg-white p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]">{t('site.wall.m.payment')}</p>
            <div className="mt-2.5 flex items-center gap-3 rounded-[14px] border-2 border-[#0071e3] bg-[#f5f9ff] p-3">
              <Banknote className="h-5 w-5 text-[#1a7f37]" />
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold text-[#1d1d1f]">{t('site.tour.ui.cod')}</p>
                <p className="text-[11.5px] text-[#6e6e73]">{t('site.wall.m.codNote')}</p>
              </div>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0071e3]">
                <Check className="h-3 w-3 text-white" strokeWidth={3} />
              </span>
            </div>
          </div>
        </Scroller>
      </div>
      <div className="shrink-0 bg-white px-4 pb-6 pt-3 shadow-[0_-10px_30px_-20px_rgba(0,0,0,0.3)]">
        <p className="mb-2.5 flex justify-between text-[16px] font-semibold text-[#1d1d1f]">
          <span>{t('site.tour.ui.total')}</span>
          <span>{money(total)}</span>
        </p>
        <Tap on={tl.is('tapPlace')}>
          <motion.div
            animate={{ opacity: placing ? 0.85 : 1 }}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#1d1d1f] text-[15px] font-semibold text-white"
          >
            {placing && <Loader2 className="h-4 w-4 animate-spin" />}
            {t(placing ? 'site.wall.m.placing' : 'site.tour.ui.placeOrders', { count: 2 })}
          </motion.div>
        </Tap>
      </div>
    </div>
  );
};

const SuccessScreen = () => {
  const { t } = useLanguage();
  return (
    <div className="flex h-full flex-col items-center bg-white px-6 pt-20 text-center">
      <svg viewBox="0 0 80 80" className="h-24 w-24">
        <motion.circle
          cx="40" cy="40" r="36" fill="#e3f5e8" stroke="#1a7f37" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.7, ease: IOS_EASE }}
        />
        <motion.path
          d="M25 41 L35 51 L56 30" fill="none" stroke="#1a7f37" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.55, ease: 'easeOut' }}
        />
      </svg>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7, duration: 0.6, ease: IOS_EASE }}>
        <p className="mt-6 text-[24px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{t('site.tour.ui.ordersPlaced')}</p>
        <p className="mt-1.5 text-[13.5px] text-[#6e6e73]">{t('site.wall.m.successBody', { count: 2 })}</p>
      </motion.div>
      <div className="mt-7 w-full space-y-2.5">
        {[
          [MUNCHIE, 'RF-1053'],
          [GLOW, 'RF-1054'],
        ].map(([store, id], i) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + i * 0.15, duration: 0.6, ease: IOS_EASE }}
            className="flex items-center gap-3 rounded-[16px] bg-[#f5f5f7] p-3 text-left"
          >
            <img src={store.logo} alt="" className="h-9 w-9 rounded-full object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{store.name}</p>
              <p className="text-[11.5px] text-[#86868b]">#{id}</p>
            </div>
            <span className="rounded-full bg-[#fff4d6] px-2.5 py-0.5 text-[11px] font-semibold text-[#9a6700]">
              {t('site.tour.ui.pending')}
            </span>
          </motion.div>
        ))}
      </div>
      <span className="mt-auto mb-8 flex h-12 w-full items-center justify-center rounded-full border border-black/10 text-[15px] font-semibold text-[#1d1d1f]">
        {t('site.wall.m.continue')}
      </span>
    </div>
  );
};

const SCREENS = [HomeScreen, CategoryScreen, ProductScreen, CartScreen, CheckoutScreen, SuccessScreen];

// iPhone: a buyer browses the marketplace and a category, opens a product,
// then adds it to the cart and checks out (COD)
const PhoneMarketplace = () => {
  const tl = useTimeline(SCRIPT);
  const rootRef = useRef(null);
  const screen = SCREEN_OF[tl.step];
  const dir = useDirection(screen);
  const cartCount = tl.from('added') && screen < 5 ? 2 : 1;
  const Screen = SCREENS[screen];

  return (
    <Viewport width={390}>
      <div ref={rootRef} className="relative h-full w-full overflow-hidden bg-white font-site">
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={screen}
            custom={dir}
            variants={PUSH}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.6, ease: IOS_EASE }}
            className="absolute inset-0 shadow-[-20px_0_40px_-20px_rgba(0,0,0,0.25)]"
          >
            <Screen tl={tl} cartCount={cartCount} />
          </motion.div>
        </AnimatePresence>
        <Flight rootRef={rootRef} from="pdp" to="cart" src={ITEM.image} run={tl.is('added')} duration={0.9} fade rounded={40} />
      </div>
    </Viewport>
  );
};

export default PhoneMarketplace;
