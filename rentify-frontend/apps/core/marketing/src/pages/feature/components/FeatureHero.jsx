import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import useStartTrial from '../../../hooks/useStartTrial';
import { SHOWCASE } from '../../../data/templateMedia';
import { BrowserFrame, PhoneFrame, Screen } from '../../../components/site/DeviceFrames';
import { EASE, Reveal } from '../../../components/site/motion';
import {
  ButtonLink,
  ChevronLink,
  Container,
  Eyebrow,
  Heading,
  Lead,
} from '../../../components/site/ui';

const FeatureHero = () => {
  const { t } = useLanguage();
  const { trialPath } = useStartTrial();
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const browserScale = useTransform(scrollYProgress, [0, 0.6], [1, 1.06]);
  const phoneY = useTransform(scrollYProgress, [0, 0.6], [0, -90]);

  return (
    <section id="overview" ref={ref} className="relative scroll-mt-14 overflow-hidden bg-white pb-24 pt-16 md:pb-36 md:pt-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-[38%] h-[70%] bg-[radial-gradient(50%_50%_at_50%_50%,rgba(0,113,227,0.08),transparent)]"
        aria-hidden
      />
      <Container className="relative text-center">
        <Reveal y={16}>
          <Eyebrow>{t('site.features.hero.eyebrow')}</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <Heading as="h1" size="display" className="mt-3">
            {t('site.features.hero.title')}
          </Heading>
        </Reveal>
        <Reveal delay={0.16}>
          <Lead className="mx-auto mt-6 max-w-2xl 2xl:max-w-3xl">{t('site.features.hero.lead')}</Lead>
        </Reveal>
        <Reveal delay={0.24} className="mt-9 flex flex-wrap items-center justify-center gap-x-7 gap-y-4">
          <ButtonLink to={trialPath} size="lg">
            {t('site.common.startTrial')}
          </ButtonLink>
          <ChevronLink to="/templates">{t('site.common.viewTemplates')}</ChevronLink>
        </Reveal>
      </Container>

      <Container className="relative mt-16 md:mt-24">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
          className="relative mx-auto max-w-[1320px] pr-[12%] md:pr-[14%]"
        >
          <motion.div style={reduce ? undefined : { scale: browserScale }} className="origin-top">
            <BrowserFrame url={SHOWCASE.beauty.domain}>
              <Screen
                src={SHOWCASE.beauty.desktop}
                alt={`${SHOWCASE.beauty.storeName} storefront built with Rentify`}
                eager
                className="h-auto"
              />
            </BrowserFrame>
          </motion.div>
          <motion.div
            style={reduce ? undefined : { y: phoneY }}
            className="absolute -bottom-[8%] right-0 w-[26%] md:w-[24%]"
          >
            <PhoneFrame>
              <Screen
                src={SHOWCASE.beauty.mobile}
                alt={`${SHOWCASE.beauty.storeName} on a phone`}
                eager
              />
            </PhoneFrame>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
};

export default FeatureHero;
