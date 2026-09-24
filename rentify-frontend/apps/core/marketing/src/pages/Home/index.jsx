import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  CheckCircle, 
  Zap, 
  Globe, 
  CreditCard, 
  Store, 
  MessageSquare, 
  Star,
  PlayCircle,
  Smartphone,
  FileText,
  Wifi,
  Headphones,
  ArrowRight,
  Users,
  Shield,
  Clock
} from "lucide-react";

// Import your existing navigation component
import SiteHeader from "../../components/site/SiteHeader";
import heroProductMockup from "../../assets/rentify-hero-product-mockup-v2.png";

import SiteFooter from "../../components/site/SiteFooter";
// --- Enhanced Hero Section ---
const HeroSection = () => (
  <section className="relative overflow-hidden bg-[linear-gradient(135deg,#ffffff_0%,#f8fbff_55%,#eef6ff_100%)] pb-12 pt-8 sm:pt-10 lg:flex lg:min-h-[580px] lg:items-center lg:py-14">
    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/70 to-transparent" />

    <div className="container relative">
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-8 xl:gap-10">
        <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
          <Badge variant="secondary" className="mb-3.5 border-blue-100 bg-blue-50/90 px-3 py-1.5 text-blue-700 shadow-none">
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            For Cambodian SMEs
          </Badge>

          <h1 className="text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-slate-950 sm:text-5xl lg:text-[3.25rem] xl:text-[3.85rem]">
            Run Your Entire Business From{' '}
            <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">One Place</span>
          </h1>

          <p className="mx-auto mt-3.5 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0 xl:text-lg xl:leading-7">
            Sell online, manage orders, track sales, and grow your business with one simple platform built for Cambodian SMEs.
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button size="lg" className="h-12 rounded-xl bg-blue-600 px-7 shadow-[0_10px_24px_rgba(37,99,235,0.18)] hover:bg-blue-700">
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 rounded-xl border-slate-300 bg-white/70 px-7 text-slate-800 hover:bg-white">
              <PlayCircle className="mr-2 h-5 w-5 text-blue-600" /> Watch Demo
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500 lg:justify-start xl:text-sm">
            {['No credit card required', 'Free setup assistance', 'Cancel anytime'].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 fill-blue-600 text-white" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <figure className="relative mx-auto flex w-full max-w-[650px] items-center justify-center lg:justify-end">
          <img
            src={heroProductMockup}
            alt="Rentify dashboard on a laptop with a KhmerCraft marketplace phone and jasmine rice product card"
            className="h-auto w-full object-contain drop-shadow-[0_28px_30px_rgba(30,64,175,0.10)]"
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

// --- Feature Showcase Section ---
const FeatureShowcase = () => {
  const reduceMotion = useReducedMotion();
  const features = [
    {
      icon: Store,
      title: "Your Professional Online Store",
      problem: "Don't have a website? Selling only on Facebook looks unprofessional and is hard to manage.",
      solution: "Launch a beautiful, mobile-friendly online store in minutes. No coding required. Show off your products and accept orders 24/7.",
      image: "https://i.ibb.co/Ldj5yhK3/Screenshot-2025-08-08-at-2-47-11-in-the-afternoon.png",
    },
    {
      icon: CreditCard,
      title: "Simple Point-of-Sale (POS)",
      problem: "Using a calculator and a cash box for in-store sales is slow and error-prone.",
      solution: "Use your phone or tablet as a powerful POS. Track cash sales and accept instant KHQR payments seamlessly.",
      image: "https://i.ibb.co/Ldj5yhK3/Screenshot-2025-08-08-at-2-47-11-in-the-afternoon.png",
    },
    {
      icon: MessageSquare,
      title: "Invoices for Social Media",
      problem: "Tired of losing track of orders from Facebook, Instagram, and Telegram?",
      solution: "Create professional invoices with payment links in seconds. Send them via chat and get paid faster, with all orders tracked automatically.",
      image: "https://i.ibb.co/LzhtJfYc/localhost-4500-dashboard-invoices-1.png",
    },
  ];

  return (
    <section id="features" className="overflow-hidden bg-white py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mb-16 max-w-2xl text-center md:mb-20"
        >
          <h2 className="text-3xl font-bold md:text-4xl">One Platform, Endless Possibilities</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Rentify is more than a website builder. It's a complete toolkit designed for the way you work.
          </p>
        </motion.div>

        <div className="space-y-20 md:space-y-28">
          {features.map((feature, index) => {
            const imageOnRight = index % 2 === 0;

            return (
            <div
              key={feature.title}
              className="grid min-h-[520px] items-center gap-12 rounded-[32px] bg-gradient-to-br from-[#f8fbff] to-[#eef6ff] px-6 py-12 sm:px-10 md:grid-cols-2 md:px-12 lg:gap-20 lg:px-16"
            >
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: imageOnRight ? -56 : 56 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.78, ease: [0.22, 1, 0.36, 1] }}
                className={
                  imageOnRight
                    ? 'md:col-start-1 md:row-start-1'
                    : 'md:col-start-2 md:row-start-1'
                }
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold tracking-[0.14em] text-blue-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="max-w-lg text-3xl font-bold tracking-[-0.025em] text-slate-950 md:text-4xl">
                  {feature.title}
                </h3>
                <p className="mt-5 max-w-lg text-lg font-medium leading-7 text-slate-500">
                  {feature.problem}
                </p>
                <p className="mt-3 max-w-lg leading-7 text-slate-700">{feature.solution}</p>
                <Button variant="link" className="mt-5 p-0 text-blue-600 hover:text-blue-700">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>

              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: imageOnRight ? 110 : -110, scale: 0.96 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
                className={`overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-[0_28px_70px_rgba(30,100,190,0.14)] ${
                  imageOnRight
                    ? 'md:col-start-2 md:row-start-1'
                    : 'md:col-start-1 md:row-start-1'
                }`}
              >
                <img
                  src={feature.image}
                  alt={`${feature.title} preview`}
                  className="aspect-[4/3] w-full object-cover object-top"
                />
              </motion.div>
            </div>
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
const PricingSection = () => (
  <section className="py-16 md:py-24 bg-gray-50">
    <div className="container">
      <div className="mx-auto max-w-4xl text-center mb-12">
        <h2 className="text-3xl font-bold md:text-4xl">Simple, Transparent Pricing</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          No hidden fees. No surprises. Just everything you need to grow your business.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {/* Starter Plan */}
        <Card className="text-center border-2 border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold">Starter</h3>
            <div className="my-4">
              <span className="text-3xl font-bold">$0</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Perfect for small shops just getting started</p>
            <ul className="space-y-3 text-left mb-8">
              {["Up to 50 products", "Basic online store", "Mobile POS", "KHQR payments", "Email support"].map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full">Start Free</Button>
          </CardContent>
        </Card>
        
        {/* Professional Plan - Featured */}
        <Card className="text-center border-2 border-blue-500 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-500 text-white px-3">MOST POPULAR</Badge>
          </div>
          <CardContent className="p-6">
            <h3 className="text-xl font-bold">Professional</h3>
            <div className="my-4">
              <span className="text-3xl font-bold">$19</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">Everything growing businesses need</p>
            <ul className="space-y-3 text-left mb-8">
              {["Unlimited products", "Advanced online store", "Full POS system", "Inventory management", "Priority support", "Sales reports"].map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full bg-blue-600 hover:bg-blue-700">Start Free Trial</Button>
          </CardContent>
        </Card>
        
        {/* Business Plan */}
        <Card className="text-center border-2 border-gray-200">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold">Business</h3>
            <div className="my-4">
              <span className="text-3xl font-bold">$49</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">For established businesses with multiple locations</p>
            <ul className="space-y-3 text-left mb-8">
              {["Multi-location support", "Staff accounts", "Advanced analytics", "Custom integrations", "Dedicated account manager"].map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full">Contact Sales</Button>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center mt-8 text-sm text-muted-foreground">
        All plans include a 30-day free trial. No credit card required.
      </div>
    </div>
  </section>
);

// --- Final CTA Section ---
const FinalCTASection = () => (
  <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-teal-500 text-white">
    <div className="container text-center">
      <h2 className="text-3xl font-bold md:text-4xl mb-4">Ready to Transform Your Business?</h2>
      <p className="text-lg mb-8 max-w-2xl mx-auto opacity-90">
        Join hundreds of Cambodian businesses already using Rentify to save time and grow faster.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
          <Zap className="mr-2 h-4 w-4" /> Start Your Free Trial
        </Button>
        <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10">
          Schedule a Demo
        </Button>
      </div>
      <div className="mt-6 flex justify-center items-center gap-6 text-sm opacity-80">
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-1" />
          <span>500+ Cambodian Businesses</span>
        </div>
        <div className="flex items-center">
          <Shield className="h-4 w-4 mr-1" />
          <span>Secure & Reliable</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>5-Minute Setup</span>
        </div>
      </div>
    </div>
  </section>
);

// --- Main Homepage Component ---
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
      
      {/* How It Works */}
      <HowItWorks />
      
      {/* Feature Showcase */}
      <FeatureShowcase />
      
      {/* Local Features */}
      <LocalFeatures />
      
      {/* Pricing */}
      <PricingSection />
      
      {/* Final CTA */}
      <FinalCTASection />
      
      {/* Footer */}
      <SiteFooter />
    </main>
  );
};

export default Homepage;
