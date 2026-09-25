import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import SiteLayout from '../../components/site/SiteLayout';
import CtaBand from '../../components/site/CtaBand';
import Accordion from '../../components/site/Accordion';
import { Reveal } from '../../components/site/motion';
import {
  ChevronLink,
  Container,
  Heading,
  Lead,
  Section,
} from '../../components/site/ui';
import PlanCards from './components/PlanCards';
import CompareTable from './components/CompareTable';

const FAQ_COUNT = 6;

const PricingPage = () => {
  const { t } = useLanguage();
  const { packages, isLoading } = useStartTrial();

  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    question: t(`site.pricing.faq.q${i + 1}`),
    answer: t(`site.pricing.faq.a${i + 1}`),
  }));

  return (
    <SiteLayout title={t('site.pricing.title')}>
      <Section id="plans" tone="gray" className="pt-20 md:pt-28">
        <Container>
          <div className="mx-auto mb-16 max-w-3xl text-center md:mb-20">
            <Reveal>
              <Heading as="h1" size="display">
                {t('site.pricing.hero.title')}
              </Heading>
            </Reveal>
            <Reveal delay={0.1}>
              <Lead className="mt-6">{t('site.pricing.hero.lead')}</Lead>
            </Reveal>
          </div>
          <PlanCards plans={packages} isLoading={isLoading} />
        </Container>
      </Section>

      <Section id="compare" tone="white">
        <Container className="max-w-[1180px]">
          <Reveal>
            <Heading size="xl" className="mb-10 text-center md:mb-14">
              {t('site.pricing.compare.title')}
            </Heading>
          </Reveal>
          <CompareTable plans={packages} />
        </Container>
      </Section>

      <Section id="faq" tone="gray">
        <Container className="max-w-[960px]">
          <Reveal>
            <Heading size="xl" className="mb-12 text-center md:mb-16">
              {t('site.pricing.faq.title')}
            </Heading>
          </Reveal>
          <Reveal delay={0.1}>
            <Accordion items={faqs} />
          </Reveal>
          <Reveal className="mt-12 text-center">
            <p className="text-[17px] text-[#6e6e73]">{t('site.pricing.faq.more')}</p>
            <ChevronLink to="/about#contact" className="mt-1">
              {t('site.pricing.faq.contact')}
            </ChevronLink>
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </SiteLayout>
  );
};

export default PricingPage;
