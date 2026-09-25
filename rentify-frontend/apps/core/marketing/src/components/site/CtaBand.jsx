import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import { formatDuration } from '../../utils/planFormat';
import { Reveal } from './motion';
import { ButtonLink, Container, Heading, Lead } from './ui';

// Closing call to action shown at the end of every marketing page
const CtaBand = ({ title, lead }) => {
  const { t } = useLanguage();
  const { trialPath, trial } = useStartTrial();

  return (
    <section className="relative overflow-hidden bg-white py-28 md:py-40">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-[radial-gradient(60%_60%_at_50%_100%,rgba(0,113,227,0.10),transparent)]"
        aria-hidden
      />
      <Container className="relative text-center">
        <Reveal>
          <Heading size="xl">{title || t('site.cta.title')}</Heading>
        </Reveal>
        <Reveal delay={0.1}>
          <Lead className="mx-auto mt-5 max-w-xl">{lead || t('site.cta.lead')}</Lead>
        </Reveal>
        <Reveal delay={0.2} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink to={trialPath} size="lg">
            {t('site.common.startTrial')}
          </ButtonLink>
          <ButtonLink to="/pricing" variant="outline" size="lg">
            {t('site.cta.secondary')}
          </ButtonLink>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="mt-6 text-[13px] text-[#86868b]">
            {trial
              ? `${t('site.common.freeFor')} ${formatDuration(trial.duration, t)} · `
              : ''}
            {t('site.common.noCard')}
          </p>
        </Reveal>
      </Container>
    </section>
  );
};

export default CtaBand;
