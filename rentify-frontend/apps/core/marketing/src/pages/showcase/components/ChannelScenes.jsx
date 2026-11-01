import React, { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Banknote,
  Check,
  ChevronLeft,
  Globe,
  Menu,
  Printer,
  QrCode as QrIcon,
  ScanBarcode,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { EASE } from '../../../components/site/motion';
import { QrCode } from '../../../components/site/mockups/PaymentMocks';
import {
  HERO,
  MARKET_FEED,
  MUNCHIE,
  SNACKS,
  START_STOCK,
  THRIFT,
  THRIFT_ITEMS,
  money,
} from '../showcaseData';
import { AutoScroll, Chip, ProductImage, Sheet, Success, Tap } from './ShowcaseKit';

const StockTag = ({ count }) => {
  const { t } = useLanguage();
  return (
    <motion.span
      key={count}
      initial={{ scale: 1.25, opacity: 0.4 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="inline-flex rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-semibold text-[#9a6700]"
    >
      {t('site.tour.ui.left', { count })}
    </motion.span>
  );
};

const Row = ({ label, value, strong }) => (
  <div className={cn('flex justify-between text-[14px]', strong ? 'font-semibold text-[#1d1d1f]' : 'text-[#6e6e73]')}>
    <span>{label}</span>
    <span>{value}</span>
  </div>
);

const PaymentOptions = ({ method = 'khqr', onChange }) => {
  const { t } = useLanguage();
  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex items-center gap-3 rounded-[14px] border-2 p-3.5 transition-colors',
          method === 'khqr' ? 'border-[#0071e3] bg-[#f5f9ff]' : 'border-black/[0.08] bg-white opacity-70'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e8f1fd] text-[#0071e3]">
          <QrIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1d1d1f]">{t('site.tour.ui.khqr')}</p>
          <p className="text-[11px] text-[#6e6e73]">{t('site.tour.ui.khqrScanToPay')}</p>
        </div>
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border',
            method === 'khqr' ? 'border-[#0071e3] bg-[#0071e3]' : 'border-black/20'
          )}
        >
          {method === 'khqr' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>
      </div>

      <div
        className={cn(
          'flex items-center gap-3 rounded-[14px] border-2 p-3.5 transition-colors',
          method === 'cod' ? 'border-[#0071e3] bg-[#f5f9ff]' : 'border-black/[0.08] bg-white opacity-70'
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f5f5f7] text-[#1d1d1f]">
          <Truck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-[#1d1d1f]">{t('site.tour.ui.cod')}</p>
          <p className="text-[11px] text-[#6e6e73]">{t('site.tour.ui.payOnDelivery')}</p>
        </div>
        <span
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full border',
            method === 'cod' ? 'border-[#0071e3] bg-[#0071e3]' : 'border-black/20'
          )}
        >
          {method === 'cod' && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>
      </div>
    </div>
  );
};

const CodOption = () => {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-3 rounded-[14px] border-2 border-[#0071e3] bg-[#f5f9ff] px-4 py-3">
      <Truck className="h-5 w-5 text-[#0071e3]" />
      <span className="flex-1 text-[14px] font-medium text-[#1d1d1f]">{t('site.tour.ui.cod')}</span>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0071e3]">
        <Check className="h-3 w-3 text-white" strokeWidth={3} />
      </span>
    </div>
  );
};

// ── Marketplace: a buyer finds the wafer next to other stores and checks out COD
export const MarketplaceScene = memo(({ step, stock }) => {
  const { t } = useLanguage();
  const total = HERO.price + MUNCHIE.deliveryFee + THRIFT_ITEMS[0].price + THRIFT.deliveryFee;

  return (
    <div className="relative flex h-full flex-col bg-white">
      <header className="flex items-center gap-4 border-b border-black/[0.06] px-5 py-4">
        <span className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-amber-500 text-white">
            <ShoppingBag className="h-4 w-4" />
          </span>
          Rentify Market
        </span>
        <div className="flex h-10 flex-1 items-center gap-2 rounded-full bg-[#f5f5f7] px-4 text-[14px] text-[#86868b]">
          <Search className="h-4 w-4" />
          <span className="truncate">{t('site.tour.ui.search')}</span>
        </div>
        <span className="relative">
          <ShoppingCart className="h-6 w-6 text-[#1d1d1f]" />
          <motion.span
            key={step >= 5 ? 2 : 1}
            initial={{ scale: 1.6 }}
            animate={{ scale: 1 }}
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold text-white"
          >
            {step >= 5 ? 2 : 1}
          </motion.span>
        </span>
      </header>
      <div className="flex gap-2 overflow-hidden px-5 py-3">
        {['all', 'snacks', 'fashion', 'beauty', 'home'].map((key, index) => (
          <Chip key={key} tone={index === 0 ? 'blue' : 'neutral'} className="px-3.5 py-1.5 text-[13px]">
            {t(`site.tour.ui.cat.${key}`)}
          </Chip>
        ))}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AutoScroll offset={step >= 1 ? '-24%' : '0%'} className="px-5 pb-6">
          <p className="mb-3 text-[17px] font-semibold text-[#1d1d1f]">{t('site.tour.ui.popular')}</p>
          <div className="grid grid-cols-3 gap-4">
            {MARKET_FEED.map((item, index) => (
              <Tap key={`${item.id}-${index}`} on={step === 2 && index === 4}>
                <div className={cn('rounded-[18px] p-1.5 transition-shadow', step === 2 && index === 4 && 'ring-2 ring-amber-400')}>
                  <ProductImage src={item.image} className="aspect-square" />
                  <p className="mt-2 truncate text-[13px] font-medium text-[#1d1d1f]">{item.name}</p>
                  <p className="truncate text-[11px] text-[#86868b]">{item.store}</p>
                  <p className="mt-0.5 text-[14px] font-semibold text-[#1d1d1f]">{money(item.price)}</p>
                </div>
              </Tap>
            ))}
          </div>
        </AutoScroll>
      </div>

      <Sheet open={step === 3 || step === 4} className="p-6">
        <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-black/15" />
        <div className="flex gap-5">
          <ProductImage src={HERO.image} className="aspect-square w-[38%] shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[#1d1d1f]">{HERO.name}</p>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-[#6e6e73]">
              <img src={MUNCHIE.logo} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-black/10" />
              {MUNCHIE.name}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-[24px] font-semibold text-[#1d1d1f]">{money(HERO.price)}</span>
              <StockTag count={stock} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#6e6e73]">
              <Truck className="h-4 w-4" />
              {t('site.tour.ui.deliveryFrom', { fee: money(MUNCHIE.deliveryFee) })}
            </p>
          </div>
        </div>
        <Tap on={step === 4} className="mt-6">
          <div className="flex h-12 items-center justify-center rounded-full bg-amber-500 text-[16px] font-semibold text-white">
            {t('site.tour.ui.addToCart')}
          </div>
        </Tap>
      </Sheet>

      <Sheet open={step === 5 || step === 6} from="right" className="flex flex-col p-5">
        <p className="text-[20px] font-semibold text-[#1d1d1f]">{t('site.tour.ui.cart')}</p>
        <p className="text-[13px] text-[#6e6e73]">{t('site.tour.ui.ordersPerStore')}</p>
        <div className="mt-4 space-y-3">
          {[
            { store: MUNCHIE, item: HERO, fresh: true },
            { store: THRIFT, item: THRIFT_ITEMS[0] },
          ].map(({ store, item, fresh }) => (
            <motion.div
              key={store.name}
              initial={fresh ? { opacity: 0, y: -10 } : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className={cn('rounded-[16px] border p-3', fresh ? 'border-amber-300 bg-amber-50/50' : 'border-black/[0.08]')}
            >
              <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#424245]">
                <Store className="h-3.5 w-3.5" /> {store.name}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <ProductImage src={item.image} className="h-12 w-12 shrink-0 rounded-[10px]" />
                <p className="min-w-0 flex-1 truncate text-[13px] text-[#1d1d1f]">{item.name}</p>
                <p className="text-[13px] font-medium text-[#1d1d1f]">{money(item.price)}</p>
              </div>
              <p className="mt-2 flex justify-between text-[12px] text-[#6e6e73]">
                <span>{t('site.tour.ui.deliveryFee')}</span>
                <span>{money(store.deliveryFee)}</span>
              </p>
            </motion.div>
          ))}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#6e6e73]">{t('site.tour.ui.paymentMethod')}</p>
          <PaymentOptions method="cod" />
        </div>
        <div className="mt-auto space-y-3 pt-4">
          <Row label={t('site.tour.ui.total')} value={money(total)} strong />
          <Tap on={step === 6}>
            <div className="flex h-12 items-center justify-center rounded-full bg-[#1d1d1f] text-[15px] font-semibold text-white">
              {t('site.tour.ui.placeOrders', { count: 2 })}
            </div>
          </Tap>
        </div>
      </Sheet>

      <Success
        open={step === 7}
        icon={Check}
        title={t('site.tour.ui.ordersPlaced')}
        body={t('site.tour.ui.payOnDelivery')}
      >
        <div className="mt-5 flex gap-2">
          <Chip tone="pending">{t('site.tour.ui.pending')}</Chip>
          <Chip>{t('site.tour.ui.cod')}</Chip>
        </div>
      </Success>
    </div>
  );
});

// ── Storefront: the same product on the merchant's own branded site
export const StorefrontScene = memo(({ step, stock }) => {
  const { t } = useLanguage();
  const total = HERO.price + MUNCHIE.deliveryFee;

  return (
    <div className="relative flex h-full flex-col bg-[#fffaf3]">
      <header className="flex items-center gap-3 px-6 py-4">
        <img src={MUNCHIE.logo} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-black/10" />
        <span className="flex-1 text-[18px] font-bold tracking-[-0.02em] text-[#7c2d12]">{MUNCHIE.name}</span>
        <ShoppingCart className="h-6 w-6 text-[#7c2d12]" />
        <Menu className="h-6 w-6 text-[#7c2d12]" />
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <AutoScroll offset={step >= 1 ? '-38%' : '0%'} className="px-6 pb-8">
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#f97316] to-[#c2410c] p-7 text-white">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">
              {t('site.tour.ui.freshIn')}
            </p>
            <p className="mt-2 max-w-[60%] text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">
              {t('site.tour.ui.storeHero')}
            </p>
            <span className="mt-5 inline-flex h-11 items-center rounded-full bg-white px-6 text-[14px] font-semibold text-[#c2410c]">
              {t('site.tour.ui.shopNow')}
            </span>
            <img
              src={HERO.image}
              alt=""
              className="absolute -bottom-4 -right-4 h-[78%] rotate-[-8deg] rounded-[22px] object-cover shadow-2xl"
            />
          </div>
          <p className="mb-4 mt-8 text-[20px] font-bold tracking-[-0.02em] text-[#7c2d12]">
            {t('site.tour.ui.bestSellers')}
          </p>
          <div className="grid grid-cols-2 gap-5">
            {SNACKS.map((item) => (
              <div key={item.id} className="rounded-[22px] bg-white p-3 shadow-[0_10px_30px_-18px_rgba(124,45,18,0.4)]">
                <ProductImage src={item.image} className="aspect-square" />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#1d1d1f]">{item.name}</p>
                    <p className="mt-0.5 text-[15px] font-bold text-[#c2410c]">{money(item.price)}</p>
                  </div>
                  {item.id === HERO.id && <StockTag count={stock} />}
                </div>
                <Tap on={step === 2 && item.id === HERO.id} className="mt-3">
                  <div className="flex h-10 items-center justify-center rounded-full bg-[#7c2d12] text-[13px] font-semibold text-white">
                    {t('site.tour.ui.addToCart')}
                  </div>
                </Tap>
              </div>
            ))}
          </div>
        </AutoScroll>
      </div>

      <Sheet open={step === 3 || step === 4} from="right" className="flex flex-col p-6">
        <p className="text-[20px] font-bold text-[#7c2d12]">{t('site.tour.ui.cart')}</p>
        <div className="mt-4 flex items-center gap-3">
          <ProductImage src={HERO.image} className="h-16 w-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-[#1d1d1f]">{HERO.name}</p>
            <p className="text-[12px] text-[#6e6e73]">× 1</p>
          </div>
          <p className="text-[14px] font-semibold">{money(HERO.price)}</p>
        </div>
        <div className="mt-5 space-y-2 border-t border-black/[0.08] pt-4">
          <Row label={t('site.tour.ui.subtotal')} value={money(HERO.price)} />
          <Row label={t('site.tour.ui.deliveryFee')} value={money(MUNCHIE.deliveryFee)} />
          <Row label={t('site.tour.ui.total')} value={money(total)} strong />
        </div>
        <div className="mt-5">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#7c2d12]/70">{t('site.tour.ui.paymentMethod')}</p>
          <PaymentOptions method="khqr" />
        </div>
        <Tap on={step === 4} className="mt-auto">
          <div className="flex h-12 items-center justify-center rounded-full bg-[#c2410c] text-[15px] font-semibold text-white">
            {t('site.tour.ui.placeOrder')}
          </div>
        </Tap>
      </Sheet>

      <Success
        open={step === 5}
        icon={Check}
        title={t('site.tour.ui.orderPlaced')}
        body={t('site.tour.ui.payOnDelivery')}
      >
        <div className="mt-5 flex gap-2">
          <Chip tone="pending">{t('site.tour.ui.pending')}</Chip>
          <Chip>{money(total)}</Chip>
        </div>
      </Success>
    </div>
  );
});

const POS_TOTAL = HERO.price + SNACKS[1].price;
const TENDERED = 5;

// ── POS: the cashier rings up the wafer at the counter and takes cash
export const PosScene = memo(({ step, stock }) => {
  const { t } = useLanguage();
  const lines = [step >= 1 && HERO, step >= 2 && SNACKS[1]].filter(Boolean);
  const due = lines.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="relative flex h-full flex-col bg-[#f5f5f7]">
      <header className="flex items-center gap-3 bg-[#1d1d1f] px-5 py-3 text-white">
        <ScanBarcode className="h-5 w-5" />
        <span className="flex-1 truncate text-[15px] font-semibold">{MUNCHIE.name}</span>
        <span className="text-[13px] text-white/60">{t('site.tour.ui.register')}</span>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="mb-3 flex gap-2">
            {['all', 'snacks', 'drinks'].map((key, index) => (
              <Chip key={key} tone={index === 0 ? 'blue' : 'neutral'} className="px-3.5 py-1.5 text-[13px]">
                {t(`site.tour.ui.cat.${key}`)}
              </Chip>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
            {SNACKS.map((item) => (
              <Tap key={item.id} on={(step === 1 && item.id === HERO.id) || (step === 2 && item.id === 'momo')}>
                <div className="flex h-full flex-col rounded-[16px] bg-white p-2.5">
                  <ProductImage src={item.image} className="min-h-0 flex-1" />
                  <p className="mt-2 truncate text-[13px] font-medium text-[#1d1d1f]">{item.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold text-[#1d1d1f]">{money(item.price)}</span>
                    {item.id === HERO.id && <StockTag count={stock} />}
                  </div>
                </div>
              </Tap>
            ))}
          </div>
        </div>
        <aside className="flex w-[40%] shrink-0 flex-col border-l border-black/[0.06] bg-white p-4">
          <p className="text-[16px] font-semibold text-[#1d1d1f]">{t('site.tour.ui.ticket')}</p>
          <div className="mt-3 flex-1 space-y-2">
            {lines.length === 0 && (
              <p className="pt-8 text-center text-[13px] text-[#86868b]">{t('site.tour.ui.ticketEmpty')}</p>
            )}
            {lines.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex items-center gap-2 rounded-[12px] bg-[#f5f5f7] px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] text-[#1d1d1f]">{item.name}</span>
                <span className="text-[12px] text-[#6e6e73]">× 1</span>
                <span className="text-[13px] font-medium">{money(item.price)}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 space-y-2 border-t border-black/[0.06] pt-3">
            <Row label={t('site.tour.ui.subtotal')} value={money(due * 0.9)} />
            <Row label="Tax (10%)" value={money(due * 0.1)} />
            <Row label={t('site.tour.ui.total')} value={money(due)} strong />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#0071e3] bg-[#f5f9ff] py-2.5 text-xs font-semibold text-[#0071e3]">
              <QrIcon className="h-4 w-4" />
              <span>KHQR</span>
            </div>
            <div className="flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#f5f5f7] py-2.5 text-xs font-semibold text-[#1d1d1f]">
              <Banknote className="h-4 w-4 text-[#1a7f37]" />
              <span>{t('site.tour.ui.cash')}</span>
            </div>
          </div>

          <Tap on={step === 3} className="mt-3">
            <div
              className={cn(
                'flex h-11 items-center justify-center rounded-[14px] text-[15px] font-semibold text-white',
                lines.length ? 'bg-[#0071e3]' : 'bg-[#0071e3]/40'
              )}
            >
              Charge {money(due)}
            </div>
          </Tap>
        </aside>
      </div>

      <Sheet open={step >= 4 && step <= 6} className="p-6">
        <div className="flex items-center gap-2 text-[#1d1d1f]">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f1fd] text-[#0071e3]">
            <QrIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[17px] font-semibold text-[#1d1d1f]">Bakong KHQR</p>
            <p className="text-[12px] text-[#6e6e73]">Scan to pay with any bank app</p>
          </div>
          <span className="ml-auto text-[22px] font-bold text-[#1d1d1f]">{money(POS_TOTAL)}</span>
        </div>

        <div className="mt-5 flex flex-col items-center justify-center rounded-[20px] border border-black/[0.08] bg-[#f8f9fa] p-5">
          <div className="relative flex w-44 flex-col items-center overflow-hidden rounded-[18px] bg-white p-3 shadow-sm ring-1 ring-black/5">
            <div className="mb-2 flex w-full items-center justify-center rounded-lg bg-[#E1232E] py-1 text-center font-bold text-xs tracking-wider text-white">
              KHQR
            </div>
            <QrCode className="aspect-square w-32" />
            <p className="mt-2 text-center text-[11px] font-semibold text-[#1d1d1f]">{MUNCHIE.name}</p>
            <p className="text-[12px] font-bold text-[#E1232E]">{money(POS_TOTAL)} USD</p>
          </div>
          <Tap on={step === 5} className="mt-4 w-full">
            <div className="flex h-11 items-center justify-center rounded-xl bg-[#0071e3] text-sm font-semibold text-white">
              Simulate Customer Scan
            </div>
          </Tap>
        </div>

        <Tap on={step === 6} className="mt-4">
          <div className="flex h-12 items-center justify-center rounded-[14px] bg-[#1a7f37] text-[15px] font-semibold text-white">
            {t('site.tour.ui.completeSale')}
          </div>
        </Tap>
      </Sheet>

      <Success
        open={step === 7}
        icon={Check}
        title={t('site.tour.ui.saleComplete')}
        body={t('site.tour.ui.changeDue', { amount: money(TENDERED - POS_TOTAL) })}
      >
        <div className="mt-5 flex gap-2">
          <Chip tone="paid">{t('site.tour.ui.paid')}</Chip>
          <Chip>{money(POS_TOTAL)}</Chip>
        </div>
        <div className="mt-6 flex gap-3">
          <span className="inline-flex h-11 items-center gap-2 rounded-full border border-black/10 px-5 text-[14px] font-medium text-[#1d1d1f]">
            <Printer className="h-4 w-4" /> {t('site.tour.ui.printReceipt')}
          </span>
          <span className="inline-flex h-11 items-center rounded-full bg-[#1d1d1f] px-5 text-[14px] font-medium text-white">
            {t('site.tour.ui.newSale')}
          </span>
        </div>
      </Success>
    </div>
  );
});

export const CHANNEL_ICONS = { marketplace: ShoppingBag, storefront: Globe, pos: ScanBarcode };

const ORDERS = [
  { id: '1054', channel: 'pos', who: 'walkIn', amount: POS_TOTAL, status: 'paid' },
  { id: '1053', channel: 'storefront', who: 'Dara Kim', amount: HERO.price + MUNCHIE.deliveryFee, status: 'pending' },
  { id: '1052', channel: 'marketplace', who: 'Sokha Chan', amount: HERO.price + MUNCHIE.deliveryFee, status: 'pending' },
];

// Counts down to the shared stock figure
const StockCount = ({ to, run }) => {
  const [value, setValue] = React.useState(START_STOCK);
  React.useEffect(() => {
    if (!run) {
      setValue(START_STOCK);
      return undefined;
    }
    const timer = setInterval(() => setValue((v) => (v > to ? v - 1 : v)), 450);
    return () => clearInterval(timer);
  }, [run, to]);
  return (
    <motion.span key={value} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block">
      {value}
    </motion.span>
  );
};

// ── Merchant view: three channels, three orders, one stock count
export const InventoryScene = memo(({ step, stock }) => {
  const { t } = useLanguage();

  return (
    <div className="flex h-full flex-col bg-[#f5f5f7] p-5">
      <div className="flex items-center gap-2 text-[#1d1d1f]">
        <ChevronLeft className="h-5 w-5 text-[#86868b]" />
        <img src={MUNCHIE.logo} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-black/10" />
        <p className="text-[17px] font-semibold">{MUNCHIE.name}</p>
      </div>
      <div className="mt-4 grid min-h-0 flex-1 gap-4 [@media(orientation:landscape)]:grid-cols-[1.25fr_1fr]">
        <div className="rounded-[22px] bg-white p-4">
          <p className="text-[15px] font-semibold text-[#1d1d1f]">{t('site.tour.ui.orders')}</p>
          <div className="mt-3 space-y-2">
            {ORDERS.map((order, index) => {
              const Icon = CHANNEL_ICONS[order.channel];
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={step >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                  transition={{ duration: 0.6, ease: EASE, delay: index * 0.35 }}
                  className="flex items-center gap-3 rounded-[14px] bg-[#f5f5f7] px-3 py-2.5"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                    <Icon className="h-4 w-4 text-[#1d1d1f]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-[#1d1d1f]">
                      #{order.id} · {order.who === 'walkIn' ? t('site.tour.ui.walkIn') : order.who}
                    </p>
                    <p className="truncate text-[11px] text-[#86868b]">
                      {t(`site.tour.channels.${order.channel}`)}
                      {order.status === 'pending' && ` · ${t('site.tour.ui.cod')}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-[#1d1d1f]">{money(order.amount)}</p>
                    <Chip tone={order.status} className="px-2 text-[10px]">
                      {t(`site.tour.ui.${order.status}`)}
                    </Chip>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={step >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="flex flex-col rounded-[22px] bg-[#1d1d1f] p-5 text-white"
        >
          <p className="text-[13px] text-white/60">{t('site.tour.ui.stock')}</p>
          <div className="mt-3 flex items-center gap-4">
            <ProductImage src={HERO.image} className="h-16 w-16 shrink-0" />
            <p className="text-[15px] font-medium leading-snug">{HERO.name}</p>
          </div>
          <p className="mt-4 text-[64px] font-semibold leading-none tracking-[-0.04em]">
            <StockCount to={stock} run={step >= 2} />
            <span className="ml-2 text-[16px] font-normal tracking-normal text-white/60">
              {t('site.tour.ui.inStock')}
            </span>
          </p>
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            {Object.entries(CHANNEL_ICONS).map(([key, Icon]) => (
              <span key={key} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px]">
                <Icon className="h-3.5 w-3.5" />
                {t(`site.tour.channels.${key}`)}
                <Check className="h-3.5 w-3.5 text-[#30d158]" />
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
});
