import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import SiteLayout from '../../components/site/SiteLayout';
import CtaBand from '../../components/site/CtaBand';
import FeatureHero from './components/FeatureHero';
import FeatureBento from './components/FeatureBento';
import FeatureStory from './components/FeatureStory';
import {
  LanguageSection,
  MoreGrid,
  PaymentsSection,
  PosSection,
} from './components/FeatureShowcases';

const FeaturesPage = () => {
  const { t } = useLanguage();

  return (
    <SiteLayout title={t('site.features.title')}>
      <FeatureHero />
      <FeatureBento />
      <FeatureStory />
      <PaymentsSection />
      <PosSection />
      <LanguageSection />
      <MoreGrid />
      <CtaBand />
    </SiteLayout>
  );
};

export default FeaturesPage;
