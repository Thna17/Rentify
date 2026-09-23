import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  CheckCircle, 
  Zap, 
  Globe, 
  CreditCard, 
  Package, 
  Store, 
  MessageSquare, 
  BarChart3,
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
import Navigation from "../../components/common/Navigation";

import Footer from "../../components/common/Footer";
// --- Enhanced Hero Section ---
const HeroSection = () => (
  <section className="relative overflow-hidden pt-24 md:pt-32 bg-gradient-to-b from-white to-blue-50/30">
    {/* Sophisticated background elements */}
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-r from-blue-400/10 to-teal-400/10 rounded-full blur-3xl" />
    </div>
    
    <div className="container text-center">
      <Badge variant="secondary" className="mb-4 px-3 py-1 border-blue-200 bg-blue-50 text-blue-700">
        <Globe className="w-3 h-3 mr-1" />
        For Cambodian SMEs
      </Badge>
      
      <h1 className="text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
        Run Your Entire Business <br/> 
        From <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">One Place</span>
      </h1>
      
      <p className="mt-5 mx-auto max-w-2xl text-lg text-muted-foreground">
        Stop juggling between notebooks, Facebook messages, and cash boxes. Rentify brings everything together so you can focus on growing your business.
      </p>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
          <Zap className="mr-2 h-4 w-4" /> Start Free Trial
        </Button>
        <Button variant="outline" size="lg" className="border-gray-300">
          <PlayCircle className="mr-2 h-4 w-4" /> Watch Demo
        </Button>
      </div>
      
      <div className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
        <CheckCircle className="h-4 w-4 text-green-500" />
        No credit card required • Free setup assistance • Cancel anytime
      </div>

      {/* Enhanced hero image with floating devices */}
      <div className="relative mt-16 mx-auto max-w-6xl">
        <div className="relative">
          {/* Main dashboard on tablet */}
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="rounded-2xl border-4 border-white shadow-2xl shadow-blue-500/10">
              <img
                src="https://i.ibb.co/39H6cPKw/Gemini-Generated-Image-t406dxt406dxt406.png"
                alt="Rentify dashboard showing sales in Khmer language with Riel currency"
                className="rounded-lg w-full"
              />
            </div>
          </div>
          
          {/* Floating phone mockup */}
          <div className="absolute -bottom-8 -right-8 z-20 w-64 hidden lg:block">
            <div className="rounded-2xl border-2 border-white shadow-xl">
              <img
                src="https://i.ibb.co/LzhtJfYc/localhost-4500-dashboard-invoices-1.png"
                alt="Rentify mobile POS interface"
                className="rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// --- Enhanced Social Proof Section ---
const SocialProof = () => (
  <section className="py-16 md:py-24 bg-white">
    <div className="container">
      <h2 className="text-center text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-12">
        Trusted by Growing Businesses Across Cambodia
      </h2>
      
      {/* Business logos */}
      <div className="flex justify-center gap-8 flex-wrap items-center grayscale opacity-60 mb-16">
        {["BKK Cafe", "Toul Tom Poung Threads", "Riverside Books", "Orussey Electronics", "Central Market Goods"].map((business, index) => (
          <div key={index} className="px-4 py-2 bg-gray-50 rounded-lg">
            <p className="font-semibold text-gray-700">{business}</p>
          </div>
        ))}
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
    <section id="features" className="py-16 md:py-24 bg-white">
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold md:text-4xl">One Platform, Endless Possibilities</h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Rentify is more than a website builder. It's a complete toolkit designed for the way you work.
          </p>
        </div>
        <div className="grid gap-12">
          {features.map((feature, index) => (
            <div key={index} className={`grid items-center gap-10 md:grid-cols-2 ${index % 2 !== 0 ? 'md:grid-flow-row-dense md:[&>*:last-child]:col-start-1' : ''}`}>
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
                  <feature.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold">{feature.title}</h3>
                <p className="mt-3 text-lg font-semibold text-muted-foreground italic">{feature.problem}</p>
                <p className="mt-2 text-foreground">{feature.solution}</p>
                <Button variant="link" className="mt-4 p-0 text-blue-600">
                  Learn more <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <div className="overflow-hidden rounded-lg border shadow-lg">
                <img src={feature.image} alt={`${feature.title} preview`} className="w-full" />
              </div>
            </div>
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
      <Navigation />
      
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
      <Footer />
    </main>
  );
};

export default Homepage;