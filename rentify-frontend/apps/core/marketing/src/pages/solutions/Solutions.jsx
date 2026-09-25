import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import SiteLayout from '../../components/site/SiteLayout';
import CtaBand from '../../components/site/CtaBand';
import { EASE, Reveal, Stagger, StaggerItem } from '../../components/site/motion';
import {
  ButtonLink,
  ChevronLink,
  Container,
  Eyebrow,
  Heading,
  Lead,
  Section,
  Tile,
} from '../../components/site/ui';
import IndustrySwitcher, { SEGMENTS } from './components/IndustrySwitcher';

const SWITCH_ROWS = ['r1', 'r2', 'r3', 'r4'];
const STAGES = ['s1', 's2', 's3'];

// "Old way" is struck through as the row scrolls into view
const SwitchRow = ({ from, to, index }) => (
  <motion.div
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.6 }}
    className="grid items-center gap-3 border-t border-white/15 py-8 md:grid-cols-[1fr_auto_1fr] md:gap-10 md:py-10"
  >
    <div className="relative w-fit">
      <p className="text-[21px] leading-snug text-[#86868b] md:text-[28px]">{from}</p>
      <motion.span
        className="absolute left-0 top-1/2 h-[2px] w-full origin-left bg-[#86868b]"
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }}
        transition={{ duration: 0.8, ease: EASE, delay: 0.2 + index * 0.05 }}
      />
    </div>
    <ArrowRight className="hidden h-6 w-6 text-[#86868b] md:block" strokeWidth={1.5} />
    <motion.p
      className="text-[21px] font-semibold leading-snug text-white md:text-[28px]"
      variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.6 + index * 0.05 }}
    >
      {to}
    </motion.p>
  </motion.div>
);

const Solutions = () => {
  const { t } = useLanguage();
  const { trialPath, packages } = useStartTrial();

  return (
    <SiteLayout title={t('site.solutions.title')}>
      <section className="bg-white pb-8 pt-16 md:pt-24">
        <Container className="text-center">
          <Reveal y={16}>
            <Eyebrow>{t('site.solutions.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <Heading as="h1" size="display" className="mt-3">
              {t('site.solutions.hero.title')}
            </Heading>
          </Reveal>
          <Reveal delay={0.16}>
            <Lead className="mx-auto mt-6 max-w-2xl">{t('site.solutions.hero.lead')}</Lead>
          </Reveal>
          <Reveal delay={0.24} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
            <ButtonLink to={trialPath} size="lg">
              {t('site.common.startTrial')}
            </ButtonLink>
            <ChevronLink to="/feature">{t('site.common.learnMore')}</ChevronLink>
          </Reveal>
        </Container>
      </section>

      <Section id="industries" tone="gray" className="mt-16 md:mt-24">
        {SEGMENTS.map((segment) => (
          <span key={segment.id} id={segment.id} className="absolute top-0 scroll-mt-14" aria-hidden />
        ))}
        <Container>
          <Reveal>
            <IndustrySwitcher />
          </Reveal>
        </Container>
      </Section>

      <Section id="switch" tone="dark">
        <Container className="max-w-[1240px]">
          <Reveal>
            <Heading size="xl" className="mb-14 text-white md:mb-20">
              {t('site.solutions.switch.title')}
            </Heading>
          </Reveal>
          <div className="border-b border-white/15">
            {SWITCH_ROWS.map((row, index) => (
              <SwitchRow
                key={row}
                index={index}
                from={t(`site.solutions.switch.${row}.from`)}
                to={t(`site.solutions.switch.${row}.to`)}
              />
            ))}
          </div>
        </Container>
      </Section>

      <Section id="stages" tone="white">
        <Container>
          <Reveal>
            <Heading size="xl" className="text-center">
              {t('site.solutions.stages.title')}
            </Heading>
          </Reveal>
          <Stagger className="mt-16 grid gap-5 md:mt-20 md:grid-cols-3">
            {STAGES.map((stage, index) => {
              const plan = packages[index];
              return (
                <StaggerItem key={stage}>
                  <Tile className="flex h-full flex-col p-8 md:p-10">
                    <p className="text-[15px] font-semibold tabular-nums text-[#86868b]">
                      {String(index + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-4 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
                      {t(`site.solutions.stages.${stage}.title`)}
                    </h3>
                    <p className="mt-3 flex-1 text-[17px] leading-snug text-[#6e6e73]">
                      {t(`site.solutions.stages.${stage}.body`)}
                    </p>
                    {plan && (
                      <div className="mt-10 border-t border-black/10 pt-6">
                        <p className="text-[13px] text-[#86868b]">{t('site.solutions.stages.plan')}</p>
                        <p className="mt-1 text-[19px] font-semibold text-[#1d1d1f]">{plan.name}</p>
                      </div>
                    )}
                    <ChevronLink to="/pricing" className="mt-5 text-[17px] md:text-[17px]">
                      {t('site.solutions.stages.seePlans')}
                    </ChevronLink>
                  </Tile>
                </StaggerItem>
              );
            })}
          </Stagger>
        </Container>
      </Section>

      <CtaBand />
    </SiteLayout>
  );
};

export default Solutions;
