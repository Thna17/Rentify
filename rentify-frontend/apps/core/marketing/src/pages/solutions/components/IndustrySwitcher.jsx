import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SHOWCASE } from '../../../data/templateMedia';
import { BrowserFrame, PhoneFrame, Screen } from '../../../components/site/DeviceFrames';
import { EASE } from '../../../components/site/motion';
import PosMock from '../../../components/site/mockups/PosMock';
import {
  CatalogMock,
  InvoiceCard,
  TelegramStack,
} from '../../../components/site/mockups/CommerceMocks';
import { ChevronLink } from '../../../components/site/ui';

const ShowcaseVisual = ({ media }) => (
  <div className="relative w-full pb-[8%] pr-[12%]">
    <BrowserFrame url={media.domain}>
      <Screen src={media.desktop} alt={`${media.storeName} storefront`} className="h-auto" />
    </BrowserFrame>
    <div className="absolute bottom-0 right-0 w-[28%]">
      <PhoneFrame>
        <Screen src={media.mobile} alt={`${media.storeName} on a phone`} />
      </PhoneFrame>
    </div>
  </div>
);

const SocialVisual = () => (
  <div className="relative flex w-full max-w-[460px] justify-end pb-28 pt-4">
    <InvoiceCard className="max-w-[320px]" />
    <div className="absolute bottom-0 left-0 w-[78%]">
      <TelegramStack />
    </div>
  </div>
);

// Hash links from older pages (e.g. /solutions#cafe) open the matching tab
export const SEGMENTS = [
  { id: 'fashion', visual: () => <CatalogMock /> },
  { id: 'beauty', visual: () => <ShowcaseVisual media={SHOWCASE.beauty} />, template: true },
  { id: 'electronics', visual: () => <ShowcaseVisual media={SHOWCASE.tech} />, template: true },
  { id: 'cafe', visual: () => <PosMock className="w-full" /> },
  { id: 'social', visual: () => <SocialVisual /> },
];

const IndustrySwitcher = () => {
  const { t } = useLanguage();
  const { hash } = useLocation();
  const [active, setActive] = useState(SEGMENTS[0].id);
  const segment = SEGMENTS.find((item) => item.id === active);
  const key = (name) => `site.solutions.segments.${active}.${name}`;

  useEffect(() => {
    const fromHash = hash.replace('#', '');
    if (SEGMENTS.some((item) => item.id === fromHash)) setActive(fromHash);
  }, [hash]);

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="tablist"
          className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06]"
        >
          {SEGMENTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active === item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                'relative shrink-0 rounded-full px-4 py-2 text-[14px] transition-colors md:px-5',
                active === item.id ? 'text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
              )}
            >
              {active === item.id && (
                <motion.span
                  layoutId="segment-pill"
                  className="absolute inset-0 rounded-full bg-[#1d1d1f]"
                  transition={{ duration: 0.45, ease: EASE }}
                />
              )}
              <span className="relative">{t(`site.solutions.segments.${item.id}.name`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-14 min-h-[560px] md:mt-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            role="tabpanel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.2fr] lg:gap-16"
          >
            <div>
              <p className="text-[17px] font-semibold text-[#0071e3]">{t(key('name'))}</p>
              <h3 className="mt-3 whitespace-pre-line text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-[#1d1d1f] md:text-[52px]">
                {t(key('title'))}
              </h3>
              <ul className="mt-8 space-y-4">
                {['p1', 'p2', 'p3'].map((point, index) => (
                  <motion.li
                    key={point}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.15 + index * 0.08 }}
                    className="flex items-start gap-3 text-[17px] leading-snug text-[#1d1d1f] md:text-[19px]"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f1fd]">
                      <Check className="h-3.5 w-3.5 text-[#0071e3]" strokeWidth={2.4} />
                    </span>
                    {t(key(point))}
                  </motion.li>
                ))}
              </ul>
              {segment.template && (
                <ChevronLink to="/templates" className="mt-8">
                  {t('site.solutions.template')}
                </ChevronLink>
              )}
            </div>
            <div className="flex justify-center">{segment.visual()}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IndustrySwitcher;
