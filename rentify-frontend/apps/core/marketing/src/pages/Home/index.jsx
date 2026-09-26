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
import { Container, Heading, Lead, Section } from "../../components/site/ui";
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
const HowItWorks = () => (
  <section className="py-16 md:py-24 bg-gray-50">
    <div className="container">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Go Live in 3 Simple Steps</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          You don't need to be a tech expert. If you can use Facebook, you can use Rentify.
        </p>
      </div>
      <div className="grid gap-8 md:grid-cols-3">
        {/* Step 1 */}
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-2xl">1</div>
          <h3 className="text-xl font-semibold">Create Your Store</h3>
          <p className="mt-2 text-muted-foreground">Sign up and tell us about your business. In minutes, your professional online storefront will be ready.</p>
        </div>
        {/* Step 2 */}
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-2xl">2</div>
          <h3 className="text-xl font-semibold">Add Products & Manage Sales</h3>
          <p className="mt-2 text-muted-foreground">Easily add your products once. They'll appear on your website, POS, and invoices automatically.</p>
        </div>
        {/* Step 3 */}
        <div className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold text-2xl">3</div>
          <h3 className="text-xl font-semibold">Grow Your Business</h3>
          <p className="mt-2 text-muted-foreground">Start accepting payments with KHQR, track your best-selling items, and manage all your customers in one place.</p>
        </div>
      </div>
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

  const features = [
    {
      id: 'store',
      icon: Store,
      number: '01',
      title: "Your Own Online Store",
      description: "Create your own professional online store in minutes. Add products, manage orders, and sell 24/7 without coding.",
      image: storefrontPreview,
      imageAlt: "Aura Botanicals storefront created with Rentify",
      tone: 'blue',
      callout: {
        lines: ["Your brand", "Your website", "Your customers"],
        type: "down-left",
        className: "top-3 right-4 sm:top-5 sm:right-8 lg:right-12",
        textColor: "text-blue-600/90",
        arrowColor: "text-blue-500/80"
      },
      highlights: [
        { icon: Palette, label: 'Custom design', sublabel: 'Make it your brand' },
        { icon: Package, label: 'Easy product setup', sublabel: 'Manage with ease' },
        { icon: Globe, label: 'Sell 24/7', sublabel: 'Reach more customers' },
      ],
    },
    {
      id: 'marketplace',
      icon: ShoppingBag,
      number: '02',
      title: "Rentify Marketplace",
      description: "List your products on the Rentify Marketplace, where customers can discover, compare, and buy from businesses across Cambodia.",
      image: marketplacePreview,
      imageAlt: "Rentify Marketplace store page with real product listings",
      tone: 'amber',
      callout: {
        lines: ["Discover", "thousands of", "products"],
        type: "down-right",
        className: "top-3 left-4 sm:top-5 sm:left-8 lg:left-12",
        textColor: "text-amber-700/90",
        arrowColor: "text-amber-600/80"
      },
      highlights: [
        { icon: Users, label: 'More customers', sublabel: 'Reach wider audience' },
        { icon: Shield, label: 'Trusted marketplace', sublabel: 'Safe and secure' },
        { icon: BarChart3, label: 'More opportunities', sublabel: 'Grow your business' },
      ],
    },
    {
      id: 'pos',
      icon: Smartphone,
      number: '03',
      title: "Smart POS System",
      description: "Use Rentify at your physical store to manage sales, products, inventory, and accept KHQR payments — all in one simple POS system.",
      image: posPreview,
      imageAlt: "Rentify Smart POS product catalog and order screen",
      tone: 'emerald',
      callout: {
        lines: ["Faster checkout", "Track inventory", "Accept KHQR"],
        type: "down-left",
        className: "top-3 right-4 sm:top-5 sm:right-8 lg:right-12",
        textColor: "text-emerald-700/90",
        arrowColor: "text-emerald-600/80"
      },
      highlights: [
        { icon: Zap, label: 'Fast checkout', sublabel: 'Serve customers quickly' },
        { icon: Layers, label: 'Inventory management', sublabel: 'Track stock in real-time' },
        { icon: QrCode, label: 'KHQR payments', sublabel: 'Accept local payments' },
      ],
    },
  ];

  const tones = {
    blue: {
      panel: 'border-blue-100/90 bg-[linear-gradient(135deg,#f4f8ff_0%,#e8f2ff_100%)] shadow-md',
      icon: 'bg-blue-100/80 text-blue-600',
      number: 'text-blue-600 border-blue-200/80',
      button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20',
      highlightIcon: 'text-blue-600',
    },
    amber: {
      panel: 'border-amber-100/90 bg-[linear-gradient(135deg,#fffdf5_0%,#fff5e0_100%)] shadow-md',
      icon: 'bg-amber-100/80 text-amber-600',
      number: 'text-amber-600 border-amber-200/80',
      button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
      highlightIcon: 'text-amber-600',
    },
    emerald: {
      panel: 'border-emerald-100/90 bg-[linear-gradient(135deg,#f2fbf7_0%,#e0f7eb_100%)] shadow-sm',
      icon: 'bg-emerald-100/80 text-emerald-600',
      number: 'text-emerald-600 border-emerald-200/80',
      button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20',
      highlightIcon: 'text-emerald-600',
    },
  };

  return (
    <section id="features" className="overflow-hidden bg-white py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.4 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-16 max-w-3xl text-center md:mb-20"
        >
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">
            One Platform, Endless Possibilities
          </h2>
          <p className="mt-4 text-lg text-slate-600 sm:text-xl">
            Rentify is more than a website builder. It's a complete toolkit designed for the way you work.
          </p>
        </motion.div>

        {/* Stacked Cards with Alternating Slide-In Effect */}
        <div className="space-y-16 md:space-y-24 lg:space-y-28">
          {features.map((feature, index) => {
            const imageOnRight = index % 2 === 0;
            const itemTone = tones[feature.tone];
            // Alternating entry:
            // Card 1 (index 0): --> []  (slides in from left: x: -100 -> 0)
            // Card 2 (index 1): [] <--  (slides in from right: x: 100 -> 0)
            // Card 3 (index 2): ---> [] (slides in from left: x: -100 -> 0)
            const slideFromLeft = index % 2 === 0;

            return (
              <motion.div
                key={feature.id}
                initial={reduceMotion ? false : { opacity: 0, x: slideFromLeft ? -100 : 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                className={`grid min-h-[480px] md:min-h-[540px] lg:min-h-[580px] overflow-hidden rounded-[36px] border ${
                  imageOnRight
                    ? 'md:grid-cols-[1fr_1.35fr] xl:grid-cols-[1fr_1.45fr]'
                    : 'md:grid-cols-[1.35fr_1fr] xl:grid-cols-[1.45fr_1fr]'
                } ${itemTone.panel}`}
              >
                {/* Text Side */}
                <div
                  className={`order-1 md:order-none flex flex-col justify-center px-6 py-10 sm:px-10 md:px-10 lg:px-14 xl:px-16 ${
                    imageOnRight
                      ? 'md:col-start-1 md:row-start-1'
                      : 'md:col-start-2 md:row-start-1'
                  }`}
                >
                  <div className="mb-6 flex items-center gap-3">
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${itemTone.icon} shadow-xs`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <span className={`inline-flex items-center justify-center rounded-full bg-white/95 border ${itemTone.number} px-3.5 py-1 text-xs font-extrabold tracking-[0.16em] shadow-xs`}>
                      {feature.number}
                    </span>
                  </div>

                  <h3 className="text-3xl font-extrabold tracking-[-0.035em] text-slate-950 lg:text-[2.65rem] lg:leading-[1.08]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:text-xl">
                    {feature.description}
                  </p>

                  <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                    {feature.highlights.map(({ icon: HighlightIcon, label, sublabel }) => (
                      <div key={label} className="min-w-0">
                        <HighlightIcon className={`mb-2.5 h-6 w-6 ${itemTone.highlightIcon}`} />
                        <p className="text-sm font-extrabold leading-tight text-slate-900 sm:text-base">{label}</p>
                        <p className="mt-1 text-xs font-medium leading-snug text-slate-500 sm:text-sm">{sublabel}</p>
                      </div>
                    ))}
                  </div>

                  <Button className={`mt-9 h-12 w-fit rounded-full px-7 text-base font-semibold text-white shadow-lg transition-all hover:scale-[1.03] ${itemTone.button}`}>
                    Learn more <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>

                {/* Image / Visual Side */}
                <div
                  className={`relative order-2 md:order-none flex min-h-[360px] items-center justify-center p-3 sm:p-6 md:min-h-[520px] lg:p-8 ${
                    imageOnRight
                      ? 'md:col-start-2 md:row-start-1'
                      : 'md:col-start-1 md:row-start-1'
                  }`}
                >
                  {/* Handwritten Callout Doodle */}
                  {feature.callout && (
                    <div className={`hidden sm:flex flex-col items-center absolute z-20 pointer-events-none select-none ${feature.callout.className}`}>
                      <div className={`font-sans italic font-bold text-xs lg:text-sm xl:text-base ${feature.callout.textColor} leading-tight text-center tracking-wide drop-shadow-xs`}>
                        {feature.callout.lines.map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                      </div>
                      {feature.callout.type === 'down-left' ? (
                        <ArrowDownLeft className={`w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 ${feature.callout.arrowColor} mt-0.5 transform -rotate-12`} />
                      ) : (
                        <ArrowDownRight className={`w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 ${feature.callout.arrowColor} mt-0.5 transform rotate-12`} />
                      )}
                    </div>
                  )}

                  {/* Main Mockup Image */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={feature.image}
                      alt={feature.imageAlt}
                      className="w-full h-auto max-h-[460px] md:max-h-[520px] lg:max-h-[580px] object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-[1.03]"
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
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
