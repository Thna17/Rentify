import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, Monitor, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useGetTemplateQuery, useGetTemplatesQuery } from '@rentify/apis';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import SiteLayout from '../../components/site/SiteLayout';
import CtaBand from '../../components/site/CtaBand';
import { PhoneFrame } from '../../components/site/DeviceFrames';
import TemplateTile, {
  TemplateStage,
  categoryLabel,
  templatePages,
} from '../../components/site/TemplateTile';
import { EASE, Reveal, ScrollScale, Stagger, StaggerItem } from '../../components/site/motion';
import {
  ButtonLink,
  Container,
  Eyebrow,
  Heading,
  Lead,
  Section,
} from '../../components/site/ui';

const DEVICES = [
  { id: 'desktop', icon: Monitor, width: '100%', height: 720 },
  { id: 'tablet', icon: Tablet, width: 820, height: 720 },
  { id: 'phone', icon: Smartphone },
];

const SegmentedControl = ({ options, value, onChange, layoutId }) => (
  <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-black/[0.06]">
    {options.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        aria-label={option.label}
        className={cn(
          'relative flex items-center gap-2 rounded-full px-4 py-2 text-[13px] transition-colors',
          value === option.id ? 'text-white' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
        )}
      >
        {value === option.id && (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-full bg-[#1d1d1f]"
            transition={{ duration: 0.45, ease: EASE }}
          />
        )}
        {option.icon && <option.icon className="relative h-4 w-4" strokeWidth={1.7} />}
        <span className={cn('relative', option.icon && 'hidden sm:inline')}>{option.label}</span>
      </button>
    ))}
  </div>
);

const LivePreview = ({ template }) => {
  const { t } = useLanguage();
  const pages = templatePages(template);
  const [device, setDevice] = useState('desktop');
  const [route, setRoute] = useState(pages[0]?.route || '/');
  const active = DEVICES.find((item) => item.id === device);
  const frame = (
    <iframe
      key={route}
      src={`${template.baseUrl}${route}`}
      title={`${template.name} live preview`}
      className="h-full w-full border-0"
      sandbox="allow-same-origin allow-scripts allow-forms"
    />
  );

  return (
    <div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        {pages.length > 1 ? (
          <SegmentedControl
            layoutId="preview-page"
            value={route}
            onChange={setRoute}
            options={pages.map((page) => ({
              id: page.route,
              label: page.page.replace(/^\w/, (char) => char.toUpperCase()),
            }))}
          />
        ) : (
          <span />
        )}
        <SegmentedControl
          layoutId="preview-device"
          value={device}
          onChange={setDevice}
          options={DEVICES.map((item) => ({
            id: item.id,
            icon: item.icon,
            label: t(`site.templates.detail.devices.${item.id}`),
          }))}
        />
      </div>

      <div className="mt-8 flex justify-center">
        {device === 'phone' ? (
          <motion.div
            key="phone"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
            className="w-full max-w-[400px]"
          >
            <PhoneFrame screenClassName="bg-white">
              {frame}
            </PhoneFrame>
          </motion.div>
        ) : (
          <motion.div
            animate={{ width: active.width, height: active.height }}
            transition={{ duration: 0.7, ease: EASE }}
            className="max-w-full overflow-hidden rounded-[16px] bg-white shadow-[0_40px_100px_-40px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.08]"
          >
            {frame}
          </motion.div>
        )}
      </div>
    </div>
  );
};

const DetailColumn = ({ title, children }) => (
  <StaggerItem>
    <h3 className="border-b border-black/10 pb-4 text-[13px] font-semibold uppercase tracking-wider text-[#86868b]">
      {title}
    </h3>
    <div className="pt-5">{children}</div>
  </StaggerItem>
);

const TemplateDetailPage = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const { trialPath } = useStartTrial();
  const { data: template, isLoading, isError } = useGetTemplateQuery(id);
  const { data: allTemplates = [] } = useGetTemplatesQuery();
  const others = useMemo(
    () => allTemplates.filter((item) => item.id !== id).slice(0, 2),
    [allTemplates, id]
  );

  const title = template?.name || t('site.templates.title');
  const palette = Object.entries(template?.colorPalette || {});
  const pages = templatePages(template);

  return (
    <SiteLayout title={title}>
      <section className="bg-white pb-16 pt-10 md:pb-24 md:pt-14">
        <Container>
          <Link
            to="/templates"
            className="inline-flex items-center gap-0.5 text-[15px] text-[#0066cc] hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('site.templates.detail.back')}
          </Link>

          {isLoading ? (
            <div className="mt-10 space-y-6">
              <div className="h-16 w-2/3 animate-pulse rounded-2xl bg-[#f5f5f7]" />
              <div className="aspect-[16/10] animate-pulse rounded-[28px] bg-[#f5f5f7]" />
            </div>
          ) : isError || !template ? (
            <div className="py-32 text-center">
              <Heading size="md">{t('site.templates.detail.notFound')}</Heading>
            </div>
          ) : (
            <>
              <div className="mt-10 grid items-end gap-8 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <Reveal y={16}>
                    <Eyebrow>{categoryLabel(template.category, t)}</Eyebrow>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <Heading as="h1" size="xl" className="mt-3">
                      {template.name}
                    </Heading>
                  </Reveal>
                </div>
                <div>
                  <Reveal delay={0.16}>
                    <Lead className="text-[17px] md:text-[19px]">{template.description}</Lead>
                  </Reveal>
                  <Reveal delay={0.24} className="mt-7 flex flex-wrap gap-3">
                    <ButtonLink to={trialPath}>{t('site.templates.detail.use')}</ButtonLink>
                    {template.baseUrl && (
                      <ButtonLink to={template.baseUrl} variant="outline">
                        {t('site.templates.detail.openDemo')}
                      </ButtonLink>
                    )}
                  </Reveal>
                </div>
              </div>

              <ScrollScale from={0.92} className="mt-14 md:mt-20">
                <TemplateStage template={template} eager className="group" />
              </ScrollScale>
            </>
          )}
        </Container>
      </section>

      {template && (
        <>
          {template.baseUrl && (
            <Section id="preview" tone="gray">
              <Container>
                <div className="mx-auto mb-12 max-w-2xl text-center">
                  <Reveal>
                    <Heading size="lg">{t('site.templates.detail.previewTitle')}</Heading>
                  </Reveal>
                  <Reveal delay={0.1}>
                    <Lead className="mt-5">{t('site.templates.detail.previewLead')}</Lead>
                  </Reveal>
                </div>
                <Reveal>
                  <LivePreview key={template.id} template={template} />
                </Reveal>
              </Container>
            </Section>
          )}

          <Section tone="white">
            <Container>
              <Stagger className="grid gap-12 md:grid-cols-3 md:gap-10">
                <DetailColumn title={t('site.templates.detail.features')}>
                  <ul className="space-y-3">
                    {(template.features || []).map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[17px] text-[#1d1d1f]">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-[#0071e3]" strokeWidth={2.2} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </DetailColumn>
                <DetailColumn title={t('site.templates.detail.pages')}>
                  <ul className="space-y-3">
                    {pages.map((page) => (
                      <li key={page.route + page.page} className="flex justify-between text-[17px] text-[#1d1d1f]">
                        <span>{page.page.replace(/^\w/, (char) => char.toUpperCase())}</span>
                        <span className="font-mono text-[13px] text-[#86868b]">{page.route}</span>
                      </li>
                    ))}
                  </ul>
                </DetailColumn>
                <DetailColumn title={t('site.templates.detail.palette')}>
                  <div className="grid grid-cols-2 gap-4">
                    {palette.map(([name, color]) => (
                      <div key={name} className="flex items-center gap-3">
                        <span
                          className="h-10 w-10 shrink-0 rounded-full ring-1 ring-black/10"
                          style={{ backgroundColor: color }}
                        />
                        <div>
                          <p className="text-[15px] capitalize text-[#1d1d1f]">{name}</p>
                          <p className="font-mono text-[12px] uppercase text-[#86868b]">{color}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DetailColumn>
              </Stagger>
            </Container>
          </Section>

          {others.length > 0 && (
            <Section tone="gray">
              <Container>
                <Reveal>
                  <Heading size="lg" className="mb-14 text-center">
                    {t('site.templates.detail.more')}
                  </Heading>
                </Reveal>
                <Stagger className="grid gap-x-8 gap-y-16 md:grid-cols-2">
                  {others.map((item) => (
                    <StaggerItem key={item.id}>
                      <TemplateTile template={item} />
                    </StaggerItem>
                  ))}
                </Stagger>
              </Container>
            </Section>
          )}
        </>
      )}

      <CtaBand />
    </SiteLayout>
  );
};

export default TemplateDetailPage;
