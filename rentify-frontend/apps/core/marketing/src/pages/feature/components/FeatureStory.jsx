import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { SHOWCASE } from '../../../data/templateMedia';
import { PhoneFrame, Screen } from '../../../components/site/DeviceFrames';
import { EASE, Reveal } from '../../../components/site/motion';
import { KhqrCard } from '../../../components/site/mockups/PaymentMocks';
import {
  CheckoutScreen,
  DashboardScreen,
  ProductFormScreen,
} from '../../../components/site/mockups/CommerceMocks';
import { Container, Heading, Section } from '../../../components/site/ui';

const SCREENS = [
  () => <ProductFormScreen />,
  () => <Screen src={SHOWCASE.beauty.mobile} alt={`${SHOWCASE.beauty.storeName} storefront`} />,
  () => (
    <CheckoutScreen>
      <KhqrCard className="w-[84%] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)]" />
    </CheckoutScreen>
  ),
  () => <DashboardScreen />,
];

const StoryStep = ({ index, active, title, body, onActive }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-45% 0px -45% 0px' });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  const ScreenComponent = SCREENS[index];

  return (
    <div ref={ref} className="flex flex-col justify-center py-10 lg:min-h-[78vh] lg:py-0">
      <div
        className={cn(
          'transition-opacity duration-700',
          active ? 'opacity-100' : 'lg:opacity-30'
        )}
      >
        <p className="text-[15px] font-semibold tabular-nums text-[#0071e3]">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h3 className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#1d1d1f] md:text-[44px]">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-[19px] leading-[1.45] text-[#6e6e73]">{body}</p>
      </div>
      <Reveal className="mx-auto mt-10 w-[64%] max-w-[280px] lg:hidden">
        <PhoneFrame>
          <ScreenComponent />
        </PhoneFrame>
      </Reveal>
    </div>
  );
};

const FeatureStory = () => {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const steps = [1, 2, 3, 4].map((n) => ({
    title: t(`site.features.story.s${n}.title`),
    body: t(`site.features.story.s${n}.body`),
  }));
  const ActiveScreen = SCREENS[active];

  return (
    <Section id="store" tone="gray">
      <Container>
        <Reveal>
          <Heading size="xl" className="text-center">
            {t('site.features.story.title')}
          </Heading>
        </Reveal>

        <div className="mt-12 lg:mt-8 lg:grid lg:grid-cols-[1fr_minmax(0,420px)] lg:gap-20 2xl:grid-cols-[1fr_minmax(0,480px)] 2xl:gap-32">
          <div>
            {steps.map((step, index) => (
              <StoryStep
                key={index}
                index={index}
                active={active === index}
                onActive={setActive}
                {...step}
              />
            ))}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-[14vh] flex h-[72vh] items-center justify-center">
              <PhoneFrame className="w-[300px] xl:w-[320px] 2xl:w-[360px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active}
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="absolute inset-0"
                  >
                    <ActiveScreen />
                  </motion.div>
                </AnimatePresence>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
};

export default FeatureStory;
