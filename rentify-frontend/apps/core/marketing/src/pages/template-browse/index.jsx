import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Languages,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useGetTemplatesQuery } from '@rentify/apis';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import SiteLayout from '../../components/site/SiteLayout';
import CtaBand from '../../components/site/CtaBand';
import TemplateTile, { categoryLabel } from '../../components/site/TemplateTile';
import { EASE, Reveal, Stagger, StaggerItem } from '../../components/site/motion';
import { EditorMock } from '../../components/site/mockups/StudioMocks';
import {
  ButtonLink,
  Container,
  Eyebrow,
  Heading,
  Lead,
  Section,
} from '../../components/site/ui';
import TemplatesHeroVisual from './components/TemplatesHeroVisual';

const INCLUDED = [
  { id: 'responsive', icon: Smartphone },
  { id: 'bilingual', icon: Languages },
  { id: 'checkout', icon: ShoppingBag },
  { id: 'seo', icon: Search },
  { id: 'brand', icon: Palette },
  { id: 'secure', icon: ShieldCheck },
];

const CategoryFilter = ({ categories, value, onChange }) => {
  const { t } = useLanguage();
  const options = [{ id: 'all', label: t('site.templates.gallery.all') }].concat(
    categories.map((category) => ({ id: category, label: categoryLabel(category, t) }))
  );

  return (
    <div className="inline-flex flex-wrap justify-center gap-1 rounded-full bg-[#f5f5f7] p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            'relative rounded-full px-5 py-2 text-[14px] transition-colors',
            value === option.id ? 'text-[#1d1d1f]' : 'text-[#6e6e73] hover:text-[#1d1d1f]'
          )}
        >
          {value === option.id && (
            <motion.span
              layoutId="template-filter"
              className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              transition={{ duration: 0.45, ease: EASE }}
            />
          )}
          <span className="relative">{option.label}</span>
        </button>
      ))}
    </div>
  );
};

const TileSkeleton = () => (
  <div>
    <div className="aspect-[16/11] animate-pulse rounded-[28px] bg-[#f5f5f7]" />
    <div className="mt-6 h-6 w-1/2 animate-pulse rounded-full bg-[#f5f5f7]" />
    <div className="mt-3 h-4 w-1/3 animate-pulse rounded-full bg-[#f5f5f7]" />
  </div>
);

const BrowseTemplates = () => {
  const { t } = useLanguage();
  const { trialPath } = useStartTrial();
  const { data: templates = [], isLoading, isError } = useGetTemplatesQuery();
  const [category, setCategory] = useState('all');

  const categories = useMemo(
    () => [...new Set(templates.map((template) => template.category).filter(Boolean))],
    [templates]
  );
  const visible = useMemo(
    () =>
      category === 'all'
        ? templates
        : templates.filter((template) => template.category === category),
    [templates, category]
  );

  return (
    <SiteLayout title={t('site.templates.title')}>
      <section className="relative overflow-hidden bg-white pb-20 pt-16 md:pb-32 md:pt-24">
        <Container className="text-center">
          <Reveal y={16}>
            <Eyebrow>{t('site.templates.hero.eyebrow')}</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <Heading as="h1" size="display" className="mt-3">
              {t('site.templates.hero.title')}
            </Heading>
          </Reveal>
          <Reveal delay={0.16}>
            <Lead className="mx-auto mt-6 max-w-2xl">{t('site.templates.hero.lead')}</Lead>
          </Reveal>
          <Reveal delay={0.24} className="mt-9 flex justify-center">
            <ButtonLink to={trialPath} size="lg">
              {t('site.common.startTrial')}
            </ButtonLink>
          </Reveal>
        </Container>
        <TemplatesHeroVisual />
      </section>

      <Section id="gallery" tone="white" className="pt-8 md:pt-12">
        <Container>
          <div className="flex flex-col items-center gap-8 text-center">
            <Reveal>
              <Heading size="xl">{t('site.templates.gallery.title')}</Heading>
            </Reveal>
            {categories.length > 1 && (
              <Reveal delay={0.1}>
                <CategoryFilter categories={categories} value={category} onChange={setCategory} />
              </Reveal>
            )}
          </div>

          <div className="mt-14 md:mt-20">
            {isLoading ? (
              <div className="grid gap-x-8 gap-y-16 md:grid-cols-2">
                <TileSkeleton />
                <TileSkeleton />
              </div>
            ) : isError ? (
              <p className="text-center text-[17px] text-[#6e6e73]">{t('site.templates.gallery.error')}</p>
            ) : visible.length === 0 ? (
              <p className="text-center text-[17px] text-[#6e6e73]">{t('site.templates.gallery.empty')}</p>
            ) : (
              <motion.div layout className="grid gap-x-8 gap-y-16 md:grid-cols-2 md:gap-y-20">
                <AnimatePresence mode="popLayout">
                  {visible.map((template, index) => (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.8, ease: EASE, delay: index * 0.08 }}
                    >
                      <TemplateTile template={template} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </Container>
      </Section>

      <Section id="included" tone="gray">
        <Container>
          <Reveal>
            <Heading size="xl" className="text-center">
              {t('site.templates.included.title')}
            </Heading>
          </Reveal>
          <Stagger className="mx-auto mt-16 grid max-w-6xl grid-cols-2 gap-x-8 gap-y-14 md:mt-20 md:grid-cols-3">
            {INCLUDED.map(({ id, icon: Icon }) => (
              <StaggerItem key={id} className="text-center">
                <Icon className="mx-auto h-9 w-9 text-[#1d1d1f]" strokeWidth={1.3} />
                <p className="mt-5 text-[19px] font-semibold text-[#1d1d1f]">
                  {t(`site.templates.included.${id}.title`)}
                </p>
                <p className="mx-auto mt-1.5 max-w-[240px] text-[15px] leading-snug text-[#6e6e73]">
                  {t(`site.templates.included.${id}.body`)}
                </p>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </Section>

      <Section id="customize" tone="white">
        <Container className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.3fr] lg:gap-16">
          <div>
            <Reveal>
              <Eyebrow>{t('site.templates.customize.eyebrow')}</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <Heading size="lg" className="mt-3">
                {t('site.templates.customize.title')}
              </Heading>
            </Reveal>
            <Reveal delay={0.16}>
              <Lead className="mt-6 max-w-md">{t('site.templates.customize.lead')}</Lead>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <EditorMock />
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </SiteLayout>
  );
};

export default BrowseTemplates;
