import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  CheckCircle, 
  Zap, 
  Globe, 
  CreditCard, 
  Store, 
  ShoppingBag,
  BarChart3,
  QrCode,
  Star,
  PlayCircle,
  Smartphone,
  FileText,
  Wifi,
  Headphones,
  ArrowRight,
  Users,
  Shield,
  Clock,
  Palette,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Import your existing navigation component
import SiteHeader from "../../components/site/SiteHeader";
import heroProductMockup from "../../assets/rentify-hero-product-mockup-v2.png";
import storefrontPreview from "../../assets/site/onboarding-storefront.png";
import marketplacePreview from "../../assets/site/onboarding-marketplace.png";
import posPreview from "../../assets/site/onboarding-pos.png";

import SiteFooter from "../../components/site/SiteFooter";
import CtaBand from "../../components/site/CtaBand";
import useStartTrial from "../../hooks/useStartTrial";
import { useLanguage } from "../../contexts/LanguageContext";
import PlanCards from "../pricing/components/PlanCards";
import { Container, Heading, Lead, Section, SmartLink } from "../../components/site/ui";
import { MARKETPLACE_URL } from "@rentify/shared/config/urls";
import { Reveal } from "../../components/site/motion";

import { HomeFaq, HomeSolutions, HomeTemplates } from './components/HomeHighlights';
import { LanguageSection, PaymentsSection, PosSection } from '../feature/components/FeatureShowcases';

const RentifyLaptopShowcase = React.lazy(() => import('./components/RentifyLaptopShowcase'));
// --- Enhanced Hero Section ---
// Stack the product image above the copy on mobile; use two columns on laptops.
const HeroSection = () => {
  const { t } = useLanguage();
  const { trialPath, isAuthenticated } = useStartTrial();
  return (
  <section className="relative overflow-hidden bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#e8f0ff_0%,#ffffff_100%)] pb-16 pt-6 sm:pb-20 sm:pt-10 lg:py-24">
    <div className="relative mx-auto grid w-full max-w-[1360px] items-center px-6 sm:px-10 lg:grid-cols-[1.05fr_1.15fr] lg:gap-14 lg:px-12 xl:px-16">
      <figure className="relative mx-auto w-full max-w-[1040px] lg:order-2 lg:min-w-0">
        <img
          src={heroProductMockup}
          alt={t('site.home.hero.imageAlt')}
          className="mx-auto h-auto w-full object-contain mix-blend-multiply"
        />
        {/* Fade the bottom of the devices into the page so the text can sit over it */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-white via-white/85 to-transparent lg:hidden" />
      </figure>

      <div className="relative z-10 mx-auto -mt-14 max-w-3xl text-center sm:-mt-24 lg:order-1 lg:mx-0 lg:mt-0 lg:min-w-0 lg:text-left">
        <Badge variant="secondary" className="mb-5 inline-flex items-center gap-2 rounded-full border-blue-100 bg-blue-50/90 px-4 py-1.5 text-sm font-bold text-blue-700 shadow-none">
          <Globe className="h-4 w-4" />
          {t('site.home.hero.badge')}
        </Badge>

        <h1 className="text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[3.25rem] xl:text-[4rem]">
          {t('site.home.hero.titleLead')}{' '}
          <span className="whitespace-nowrap bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 bg-clip-text text-transparent">
            {t('site.home.hero.titleEmphasis')}
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-xl lg:mx-0">
          {t('site.home.hero.lead')}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
          <SmartLink to={trialPath} target={isAuthenticated ? '_self' : undefined} className="inline-block">
            <Button size="lg" className="h-12 w-full rounded-2xl bg-blue-600 px-8 text-base font-bold shadow-[0_14px_32px_rgba(37,99,235,0.26)] transition-all hover:scale-[1.03] hover:bg-blue-700 sm:h-14 sm:w-auto sm:text-lg">
              {isAuthenticated ? t('site.nav.dashboard') : t('site.home.hero.startTrial')} <ArrowRight className="ml-2 size-5" />
            </Button>
          </SmartLink>
          <Button variant="outline" size="lg" className="h-12 rounded-2xl border-slate-300 bg-white/80 px-8 text-base font-bold text-slate-800 transition-all hover:scale-[1.03] hover:bg-white sm:h-14 sm:text-lg">
            <PlayCircle className="mr-2 size-5 text-blue-600" /> {t('site.home.hero.watchDemo')}
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 lg:justify-start">
          {['site.home.hero.noCard', 'site.home.hero.freeSetup', 'site.home.hero.cancelAnytime'].map((item) => (
            <span key={item} className="flex items-center gap-2 font-medium">
              <CheckCircle className="h-4 w-4 fill-blue-600 text-white" />
              {t(item)}
            </span>
          ))}
        </div>
      </div>
    </div>
  </section>
  );
};

const trustedBusinesses = [
  "BKK Cafe",
  "Toul Tom Poung Threads",
  "Riverside Books",
  "Orussey Electronics",
  "Central Market Goods",
];

// --- Enhanced Social Proof Section ---
const SocialProof = () => {
  const { t } = useLanguage();
  return (
  <section className="py-12 md:py-16 bg-white">
    <div className="container">
      <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
        {t('site.home.social.title')}
      </h2>
      
      {/* Continuously moving business names */}
      <div
        className="trusted-business-marquee overflow-hidden"
        aria-label={t('site.home.social.marqueeLabel')}
      >
        <div className="trusted-business-track flex w-max items-center">
          {[false, true].map((duplicate) => (
            <div
              key={String(duplicate)}
              className="flex shrink-0 items-center gap-6 pr-6 md:gap-8 md:pr-8"
              aria-hidden={duplicate || undefined}
            >
              {trustedBusinesses.map((business) => (
                <div
                  key={`${duplicate ? 'duplicate-' : ''}${business}`}
                  className="whitespace-nowrap rounded-xl border border-slate-100 bg-slate-50/80 px-6 py-3 shadow-sm"
                >
                  <p className="font-semibold text-slate-600">{business}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
  );
};

// --- How It Works Section ---
const HOW_IT_WORKS_STEPS = [
  ['site.home.steps.createTitle', 'site.home.steps.createBody'],
  ['site.home.steps.productsTitle', 'site.home.steps.productsBody'],
  ['site.home.steps.growTitle', 'site.home.steps.growBody'],
];

const HowItWorks = () => {
  const { t } = useLanguage();
  return (
  <section className="py-10 md:py-24 bg-gray-50">
    <div className="container">
      <div className="mb-6 max-w-2xl md:mx-auto md:mb-12 md:text-center">
        <h2 className="text-[24px] font-bold leading-tight tracking-[-0.03em] md:text-4xl">{t('site.home.steps.title')}</h2>
        <p className="mt-2 text-[14px] leading-snug text-muted-foreground md:mt-4 md:text-lg">
          {t('site.home.steps.lead')}
        </p>
      </div>
      {/* Phones: a compact vertical timeline. Tablet/desktop: three centred columns. */}
      <ol className="grid md:grid-cols-3 md:gap-8">
        {HOW_IT_WORKS_STEPS.map(([title, body], index) => (
          <li key={title} className="relative flex gap-3.5 pb-5 last:pb-0 md:block md:pb-0 md:text-center">
            {index < HOW_IT_WORKS_STEPS.length - 1 && (
              <span aria-hidden="true" className="absolute left-[17px] top-10 bottom-1 w-px bg-blue-200 md:hidden" />
            )}
            <div className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[15px] font-bold text-blue-600 md:mb-4 md:h-16 md:w-16 md:text-2xl">
              {index + 1}
            </div>
            <div className="min-w-0 pt-1 md:pt-0">
              <h3 className="text-[16px] font-semibold leading-snug md:text-xl">{t(title)}</h3>
              <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground md:mt-2 md:text-base md:leading-normal">{t(body)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
  );
};

// --- Handwritten Doodle Arrow SVGs ---
const ArrowDownLeft = ({ className = "w-10 h-10 text-blue-500" }) => (
  <svg className={className} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M38 6C28 10 14 18 12 36" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="4 2.5" />
    <path d="M6 28L12 36L20 34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ArrowDownRight = ({ className = "w-10 h-10 text-amber-500" }) => (
  <svg className={className} viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 6C22 10 36 18 38 36" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="4 2.5" />
    <path d="M44 28L38 36L30 34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- Feature Showcase Section ---
const FeatureShowcase = () => {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion();
  const marketplaceHref = MARKETPLACE_URL || 'https://rentify-market.mekhla.digital/';

  const features = [
    {
      id: 'store',
      icon: Store,
      title: t('site.home.features.storeTitle'),
      description: t('site.home.features.storeBody'),
      image: storefrontPreview,
      imageAlt: t('site.home.features.storeAlt'),
      href: '/feature#store',
      panel: 'bg-[#efedfb]',
      highlights: [t('site.home.features.storeH1'), t('site.home.features.storeH2'), t('site.home.features.storeH3')],
    },
    {
      id: 'marketplace',
      icon: ShoppingBag,
      title: "Rentify Marketplace",
      description: t('site.home.features.marketBody'),
      image: marketplacePreview,
      imageAlt: t('site.home.features.marketAlt'),
      href: marketplaceHref,
      panel: 'bg-[#fbeee4]',
      highlights: [t('site.home.features.marketH1'), t('site.home.features.marketH2'), t('site.home.features.marketH3')],
    },
    {
      id: 'pos',
      icon: Smartphone,
      title: t('site.home.features.posTitle'),
      description: t('site.home.features.posBody'),
      image: posPreview,
      imageAlt: t('site.home.features.posAlt'),
      href: '/feature#pos',
      panel: 'bg-[#e6f2ec]',
      highlights: [t('site.home.features.posH1'), t('site.home.features.posH2'), t('site.home.features.posH3')],
    },
  ];

  return (
    <section id="features" className="bg-white py-12 md:py-24">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 sm:text-xs">{t('site.home.features.eyebrow')}</p>
          <h2 className="mt-2.5 text-[26px] font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:mt-3 md:text-4xl lg:text-5xl">
            {t('site.home.features.title')}
          </h2>
          <p className="mt-2 text-[15px] text-slate-500 sm:mt-3 sm:text-lg">
            {t('site.home.features.lead')}
          </p>
        </motion.div>

        <div className="mt-6 grid gap-3 sm:mt-10 md:grid-cols-3 md:gap-6 lg:mt-12 lg:gap-8">
          {features.map((feature, index) => (
            <motion.article
              key={feature.id}
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="group grid grid-cols-[112px_minmax(0,1fr)] items-center gap-3.5 md:flex md:flex-col md:items-stretch md:gap-0"
            >
              {/* Picture panel */}
              <div className={`flex aspect-square items-center justify-center overflow-hidden rounded-2xl p-2 md:aspect-[16/10] md:rounded-[28px] md:p-6 lg:p-8 ${feature.panel}`}>
                <img
                  src={feature.image}
                  alt={feature.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-contain drop-shadow-xl transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>

              {/* Copy */}
              <div className="min-w-0 md:px-1 md:pt-7">
                <feature.icon className="hidden h-7 w-7 text-indigo-600 md:block" strokeWidth={1.6} />
                <h3 className="text-[16px] font-bold tracking-[-0.02em] text-slate-950 md:mt-4 md:text-2xl">{feature.title}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-500 md:mt-3 md:line-clamp-none md:text-base md:leading-relaxed">
                  {feature.description}
                </p>
                <p className="mt-3 hidden text-sm text-slate-400 md:block">{feature.highlights.join(' · ')}</p>
                <div className="flex justify-end md:justify-start">
                  <SmartLink
                    to={feature.href}
                    className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 md:mt-5 md:text-base"
                  >
                    {t('common.learn-more')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 md:h-5 md:w-5" />
                  </SmartLink>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Local Features Section ---
const LocalFeatures = () => {
  const { t } = useLanguage();
  return (
  <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
    <div className="container">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold">{t('site.home.local.title')}</h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('site.home.local.lead')}
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Smartphone, title: t('site.home.local.khqrTitle'), desc: t('site.home.local.khqrBody') },
          { icon: FileText, title: t('site.home.local.bilingualTitle'), desc: t('site.home.local.bilingualBody') },
          { icon: Wifi, title: t('site.home.local.offlineTitle'), desc: t('site.home.local.offlineBody') },
          { icon: Headphones, title: t('site.home.local.supportTitle'), desc: t('site.home.local.supportBody') }
        ].map((item, i) => (
          <div key={i} className="text-center p-6 bg-white rounded-lg shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <item.icon className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
  );
};

// --- Pricing Section ---
const PricingSection = () => {
  const { t } = useLanguage();
  const { packages, isLoading } = useStartTrial();

  return (
    <Section id="pricing" tone="gray" className="py-16 md:py-24">
      <Container>
        <div className="mx-auto mb-14 max-w-3xl text-center md:mb-18">
          <Reveal>
            <Heading as="h2" size="display">
              {t('site.pricing.hero.title')}
            </Heading>
          </Reveal>
          <Reveal delay={0.1}>
            <Lead className="mt-4">{t('site.pricing.hero.lead')}</Lead>
          </Reveal>
        </div>
        <PlanCards plans={packages} isLoading={isLoading} />
      </Container>
    </Section>
  );
};

// --- Final CTA Section ---
const Homepage = () => {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* SEO Component (uncomment when ready) */}
      {/* <SeoJsonLd /> */}
      
      {/* Navigation */}
      <SiteHeader />
      
      {/* Enhanced Hero Section */}
      <HeroSection />
      
      {/* Social Proof */}
      <SocialProof />
      
      {/* Scroll-driven product story */}
      <React.Suspense
        fallback={<section className="h-screen bg-gradient-to-b from-white to-blue-50" aria-label={t('site.home.showcaseLoading')} />}
      >
        <RentifyLaptopShowcase />
      </React.Suspense>

      {/* How It Works */}
      <HowItWorks />

      {/* Feature Showcase */}
      <FeatureShowcase />

      {/* KHQR payments and the POS on iPad, shared with the Features page */}
      <PaymentsSection />
      <PosSection />

      {/* Business types, shared with the Solutions page */}
      <HomeSolutions />

      {/* Store templates, shared with the Templates page */}
      <HomeTemplates />

      {/* Khmer and English storefronts */}
      <LanguageSection />

      {/* Local Features */}
      <LocalFeatures />

      {/* Pricing */}
      <PricingSection />

      {/* Questions, shared with the Pricing page */}
      <HomeFaq />
      
      {/* Final CTA */}
      <CtaBand />
      
      {/* Footer */}
      <SiteFooter />
    </main>
  );
};

export default Homepage;
