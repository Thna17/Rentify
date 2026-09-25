import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  Boxes,
  Globe,
  Percent,
  ShieldCheck,
  Smartphone,
  UserRound,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  Reveal,
  ScrollScale,
  Stagger,
  StaggerItem,
} from '../../../components/site/motion';
import { KhqrCard } from '../../../components/site/mockups/PaymentMocks';
import PosMock from '../../../components/site/mockups/PosMock';
import { LanguageMock } from '../../../components/site/mockups/StudioMocks';
import {
  Container,
  Eyebrow,
  Heading,
  Lead,
  Section,
} from '../../../components/site/ui';

const key = (name) => `site.features.${name}`;

export const PaymentsSection = () => {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  return (
    <Section id="payments" tone="dark">
      <Container className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <div>
          <Reveal>
            <Eyebrow className="text-[#2997ff]">{t(key('payments.eyebrow'))}</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <Heading size="xl" className="mt-3 text-white">
              {t(key('payments.title'))}
            </Heading>
          </Reveal>
          <Reveal delay={0.16}>
            <Lead className="mt-6 max-w-lg text-[#a1a1a6]">{t(key('payments.lead'))}</Lead>
          </Reveal>
          <Stagger className="mt-12 grid gap-8 sm:grid-cols-3 lg:grid-cols-1 lg:gap-6 xl:grid-cols-3" delay={0.2}>
            {['f1', 'f2', 'f3'].map((fact) => (
              <StaggerItem key={fact} className="border-t border-white/15 pt-5">
                <p className="text-[17px] font-semibold text-white">
                  {t(key(`payments.${fact}.title`))}
                </p>
                <p className="mt-1.5 text-[15px] leading-snug text-[#a1a1a6]">
                  {t(key(`payments.${fact}.body`))}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <div className="relative flex justify-center py-10">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_45%_at_50%_50%,rgba(225,35,46,0.35),transparent_70%)] blur-2xl"
            aria-hidden
          />
          <ScrollScale from={0.8}>
            <motion.div
              animate={reduce ? undefined : { y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <KhqrCard className="w-[280px] md:w-[320px] 2xl:w-[380px]" />
            </motion.div>
          </ScrollScale>
        </div>
      </Container>
    </Section>
  );
};

export const PosSection = () => {
  const { t } = useLanguage();

  return (
    <Section id="pos" tone="gray">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <Eyebrow>{t(key('pos.eyebrow'))}</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <Heading size="xl" className="mt-3">
              {t(key('pos.title'))}
            </Heading>
          </Reveal>
          <Reveal delay={0.16}>
            <Lead className="mt-6">{t(key('pos.lead'))}</Lead>
          </Reveal>
        </div>
        <ScrollScale from={0.84} className="mx-auto mt-16 max-w-[1180px] md:mt-24">
          <PosMock />
        </ScrollScale>
      </Container>
    </Section>
  );
};

export const LanguageSection = () => {
  const { t } = useLanguage();

  return (
    <Section tone="white">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div className="order-2 flex justify-center lg:order-1">
          <Reveal className="w-full max-w-[360px] 2xl:max-w-[420px]">
            <LanguageMock />
          </Reveal>
        </div>
        <div className="order-1 lg:order-2">
          <Reveal>
            <Eyebrow>{t(key('language.eyebrow'))}</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <Heading size="lg" className="mt-3">
              {t(key('language.title'))}
            </Heading>
          </Reveal>
          <Reveal delay={0.16}>
            <Lead className="mt-6 max-w-md">{t(key('language.lead'))}</Lead>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
};

const MORE_ITEMS = [
  { id: 'domain', icon: Globe },
  { id: 'staff', icon: Users },
  { id: 'inventory', icon: Boxes },
  { id: 'discounts', icon: Percent },
  { id: 'reports', icon: BarChart3 },
  { id: 'customers', icon: UserRound },
  { id: 'secure', icon: ShieldCheck },
  { id: 'mobile', icon: Smartphone },
];

export const MoreGrid = () => {
  const { t } = useLanguage();

  return (
    <Section id="more" tone="gray">
      <Container>
        <Reveal>
          <Heading size="xl" className="text-center">
            {t(key('more.title'))}
          </Heading>
        </Reveal>
        <Stagger className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:mt-20 md:grid-cols-4 md:gap-x-10 md:gap-y-16">
          {MORE_ITEMS.map(({ id, icon: Icon }) => (
            <StaggerItem key={id}>
              <Icon className="h-8 w-8 text-[#1d1d1f]" strokeWidth={1.4} />
              <p className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">
                {t(key(`more.${id}.title`))}
              </p>
              <p className="mt-1 text-[15px] leading-snug text-[#6e6e73]">
                {t(key(`more.${id}.body`))}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
};
