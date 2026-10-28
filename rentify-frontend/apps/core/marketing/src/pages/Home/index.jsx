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
const HeroSection = () => (
  <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef6ff_100%)] pb-20 pt-14 sm:pt-18 lg:flex lg:min-h-[820px] xl:min-h-[880px] lg:items-center lg:py-24 xl:py-28">
    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/85 to-transparent" />

    <div className="mx-auto w-full max-w-[1880px] px-3 sm:px-5 lg:pl-8 lg:pr-2 xl:pl-12 xl:pr-0 relative">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.12fr] xl:grid-cols-[1.05fr_1.22fr] lg:gap-8 xl:gap-10">
        <div className="mx-auto w-full text-center lg:mx-0 lg:text-left">
          <Badge variant="secondary" className="mb-6 inline-flex items-center gap-2 border-blue-100 bg-blue-50/90 px-4.5 py-2 text-sm font-bold text-blue-700 shadow-none rounded-full">
            <Globe className="h-4.5 w-4.5" />
            For Cambodian SMEs
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-[4.4rem] xl:text-[5.2rem] leading-[1.05]">
            Run Your Entire Business From{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 bg-clip-text text-transparent block sm:inline">
              One Place
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-slate-600 sm:text-2xl lg:mx-0 xl:text-[1.5rem] xl:leading-10">
            Sell online, manage orders, track sales, and grow your business with one simple platform built for Cambodian SMEs.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Button size="lg" className="h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl font-bold rounded-2xl bg-blue-600 shadow-[0_14px_32px_rgba(37,99,235,0.26)] hover:bg-blue-700 transition-all hover:scale-[1.03]">
              Start Free Trial <ArrowRight className="ml-2.5 size-5 sm:size-6" />
            </Button>
            <Button variant="outline" size="lg" className="h-14 sm:h-16 px-8 sm:px-10 text-lg sm:text-xl font-bold rounded-2xl border-slate-300 bg-white/80 text-slate-800 hover:bg-white transition-all hover:scale-[1.03]">
              <PlayCircle className="mr-2.5 size-5 sm:size-6 text-blue-600" /> Watch Demo
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 lg:justify-start sm:text-base">
            {['No credit card required', 'Free setup assistance', 'Cancel anytime'].map((item) => (
              <span key={item} className="flex items-center gap-2 font-medium">
                <CheckCircle className="h-4.5 w-4.5 fill-blue-600 text-white" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <figure className="relative mx-auto flex w-full items-center justify-center lg:justify-end lg:-mr-6 xl:-mr-10 2xl:-mr-12">
          <img
            src={heroProductMockup}
            alt="Rentify dashboard on a laptop with a KhmerCraft marketplace phone and jasmine rice product card"
            className="h-auto w-full max-w-[700px] lg:max-w-[800px] xl:max-w-[900px] 2xl:max-w-[980px] object-contain drop-shadow-[0_30px_48px_rgba(30,64,175,0.18)] ml-auto transition-transform duration-300 hover:scale-[1.02]"
          />
        </figure>
      </div>
    </div>
  </section>
);

const trustedBusinesses = [
  "BKK Cafe",
  "Toul Tom Poung Threads",
  "Riverside Books",
  "Orussey Electronics",
  "Central Market Goods",
];

// --- Enhanced Social Proof Section ---
const SocialProof = () => (
  <section className="py-12 md:py-16 bg-white">
    <div className="container">
      <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
        Trusted by Growing Businesses Across Cambodia
      </h2>
      
      {/* Continuously moving business names */}
      <div
        className="trusted-business-marquee mb-16 overflow-hidden"
        aria-label="Businesses using Rentify"
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
      
      {/* Enhanced testimonial */}
      <div className="mx-auto max-w-3xl">
        <Card className="bg-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-teal-500"></div>
          <CardContent className="p-8 text-center">
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100&q=80"
                alt="Srey Roth" 
                className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-lg"
              />
              <div className="absolute bottom-4 right-1/2 translate-x-12 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-4xl text-blue-400 mb-4">"</div>
            <blockquote className="text-xl font-medium text-gray-800 leading-relaxed">
              Before Rentify, I spent 2 hours every night matching Facebook orders with my sales book. Now everything is automated. It's essential for my business growth.
            </blockquote>
            <div className="mt-6">
              <p className="font-semibold text-gray-900">Srey Roth</p>
              <p className="text-sm text-muted-foreground">Owner, BKK Cafe • Phnom Penh</p>
              <div className="mt-2 flex justify-center items-center gap-1 text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
);

// --- How It Works Section ---
const HOW_IT_WORKS_STEPS = [
  ['Create Your Store', 'Sign up and tell us about your business. In minutes, your professional online storefront will be ready.'],
  ['Add Products & Manage Sales', "Easily add your products once. They'll appear on your website, POS, and invoices automatically."],
  ['Grow Your Business', 'Start accepting payments with KHQR, track your best-selling items, and manage all your customers in one place.'],
];

const HowItWorks = () => (
  <section className="py-10 md:py-24 bg-gray-50">
    <div className="container">
      <div className="mb-6 max-w-2xl md:mx-auto md:mb-12 md:text-center">
        <h2 className="text-[24px] font-bold leading-tight tracking-[-0.03em] md:text-4xl">Go Live in 3 Simple Steps</h2>
        <p className="mt-2 text-[14px] leading-snug text-muted-foreground md:mt-4 md:text-lg">
          You don't need to be a tech expert. If you can use Facebook, you can use Rentify.
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
              <h3 className="text-[16px] font-semibold leading-snug md:text-xl">{title}</h3>
              <p className="mt-1 text-[13.5px] leading-snug text-muted-foreground md:mt-2 md:text-base md:leading-normal">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

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
  const reduceMotion = useReducedMotion();
  const marketplaceHref = MARKETPLACE_URL || 'https://rentify-market.mekhla.digital/';

  const features = [
    {
      id: 'store',
      icon: Store,
      title: "Your Own Online Store",
      description: "Create your own professional online store in minutes. Add products, manage orders, and sell 24/7 without coding.",
      image: storefrontPreview,
      imageAlt: "Aura Botanicals storefront created with Rentify",
      href: '/feature#store',
      panel: 'bg-[#efedfb]',
      highlights: ['Custom design', 'Easy product setup', 'Sell 24/7'],
    },
    {
      id: 'marketplace',
      icon: ShoppingBag,
      title: "Rentify Marketplace",
      description: "List your products on the Rentify Marketplace, where customers can discover, compare, and buy from businesses across Cambodia.",
      image: marketplacePreview,
      imageAlt: "Rentify Marketplace store page with real product listings",
      href: marketplaceHref,
      panel: 'bg-[#fbeee4]',
      highlights: ['More customers', 'Trusted marketplace', 'More opportunities'],
    },
    {
      id: 'pos',
      icon: Smartphone,
      title: "Smart POS System",
      description: "Use Rentify at your physical store to manage sales, products, inventory, and accept KHQR payments — all in one simple POS system.",
      image: posPreview,
      imageAlt: "Rentify Smart POS product catalog and order screen",
      href: '/feature#pos',
      panel: 'bg-[#e6f2ec]',
      highlights: ['Fast checkout', 'Inventory management', 'KHQR payments'],
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 sm:text-xs">One connected workspace</p>
          <h2 className="mt-2.5 text-[26px] font-bold leading-tight tracking-[-0.035em] text-slate-950 sm:mt-3 md:text-4xl lg:text-5xl">
            One Platform, Endless Possibilities
          </h2>
          <p className="mt-2 text-[15px] text-slate-500 sm:mt-3 sm:text-lg">
            Rentify is more than a website builder. It's a complete toolkit designed for the way you work.
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
                <SmartLink
                  to={feature.href}
                  className="mt-2 inline-flex min-h-[32px] items-center gap-1.5 text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 md:mt-5 md:text-base"
                >
                  Learn more
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 md:h-5 md:w-5" />
                </SmartLink>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Local Features Section ---
const LocalFeatures = () => (
  <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
    <div className="container">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold">Built for Cambodia's Unique Business Needs</h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          We understand the challenges Cambodian businesses face. That's why we built features specifically for you.
        </p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Smartphone, title: "Works with KHQR", desc: "Accept instant payments from any Cambodian bank" },
          { icon: FileText, title: "Khmer & English", desc: "Fully bilingual interface for all your staff" },
          { icon: Wifi, title: "Offline Mode", desc: "Keep working even when internet is unstable" },
          { icon: Headphones, title: "Local Support", desc: "Phone, Telegram, and in-person assistance" }
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
        fallback={<section className="h-screen bg-gradient-to-b from-white to-blue-50" aria-label="Loading product showcase" />}
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
