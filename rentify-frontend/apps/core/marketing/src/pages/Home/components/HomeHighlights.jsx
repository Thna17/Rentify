import React from 'react';
import { useGetTemplatesQuery } from '@rentify/apis';
import { useLanguage } from '../../../contexts/LanguageContext';
import Accordion from '../../../components/site/Accordion';
import TemplateTile from '../../../components/site/TemplateTile';
import { Reveal, Stagger, StaggerItem } from '../../../components/site/motion';
import {
  ChevronLink,
  Container,
  Heading,
  Lead,
  Section,
} from '../../../components/site/ui';
import IndustrySwitcher from '../../solutions/components/IndustrySwitcher';

// Home page summaries of the Solutions, Templates and Pricing pages.
// They reuse the same components, so the home page stays in sync with them.

export const HomeSolutions = () => {
  const { t } = useLanguage();

  return (
    <Section id="solutions" tone="gray">
      <Container>
        <div className="mx-auto mb-14 max-w-3xl text-center md:mb-20">
          <Reveal>
            <Heading size="xl">{t('site.solutions.hero.title')}</Heading>
          </Reveal>
          <Reveal delay={0.1}>
            <Lead className="mt-5">{t('site.solutions.hero.lead')}</Lead>
          </Reveal>
        </div>
        <Reveal>
          <IndustrySwitcher />
        </Reveal>
      </Container>
    </Section>
  );
};

export const HomeTemplates = () => {
  const { t } = useLanguage();
  const { data: templates = [] } = useGetTemplatesQuery();
  if (!templates.length) return null;

  return (
    <Section id="templates" tone="white">
      <Container>
        <div className="mb-14 flex flex-col items-center gap-5 text-center md:mb-20">
          <Reveal>
            <Heading size="xl">{t('site.templates.hero.title')}</Heading>
          </Reveal>
          <Reveal delay={0.1}>
            <Lead className="max-w-2xl">{t('site.templates.hero.lead')}</Lead>
          </Reveal>
          <Reveal delay={0.15}>
            <ChevronLink to="/templates">{t('site.common.viewTemplates')}</ChevronLink>
          </Reveal>
        </div>
        <Stagger className="grid gap-x-8 gap-y-16 md:grid-cols-2">
          {templates.slice(0, 2).map((template) => (
            <StaggerItem key={template.id}>
              <TemplateTile template={template} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
};

const FAQ_COUNT = 6;

export const HomeFaq = () => {
  const { t } = useLanguage();
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    question: t(`site.pricing.faq.q${i + 1}`),
    answer: t(`site.pricing.faq.a${i + 1}`),
  }));

  return (
    <Section id="faq" tone="white">
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
          <ChevronLink to="/contact" className="mt-1">
            {t('site.pricing.faq.contact')}
          </ChevronLink>
        </Reveal>
      </Container>
    </Section>
  );
};
