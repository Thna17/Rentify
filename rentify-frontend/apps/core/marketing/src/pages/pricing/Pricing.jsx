import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; 
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@rentify/shared/ui/accordion";
import { Switch } from "@rentify/shared/ui/switch";
import { Label } from "@rentify/shared/ui/label";
import { 
  CheckCircle, 
  XCircle,
  Zap, 
  Star,
  Award,
  Shield,
  Clock,
  Globe,
  MessageSquare,
  Phone,
  Users,
  Store,
  CreditCard,
  Package,
  BarChart3,
  Truck,
  Mail,
  Smartphone,
  Crown,
  Rocket,
  Target,
  Calendar,
  TrendingUp,
  Building,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";

import Navigation from "../../components/common/Navigation";
import Footer from "../../components/common/Footer";

const PricingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [currency, setCurrency] = useState('USD');
  const [showAnnualSavings, setShowAnnualSavings] = useState(true);
  const navigate = useNavigate();

  const handleStartTrial = (planId) => {

    navigate(`/onboarding/${planId}`);
  };

  const plans = [
    {
      name: "STARTER",
      id: "278181bd-dbaa-4582-9116-f05b2320a659",
      tagline: "Get Online & Get Organized",
      price: billingPeriod === 'annual' ? 90 : 9,
      priceKHR: billingPeriod === 'annual' ? 360000 : 36000,
      period: billingPeriod === 'annual' ? 'per year' : 'per month',
      description: "Perfect for new entrepreneurs and Facebook/Instagram sellers",
      icon: Store,
      color: "blue",
      popular: false,
      cta: "Start Free Trial",
      features: {
        included: [
          { text: "Professional Online Storefront", icon: Globe, detail: "yourstore.rentify.com.kh" },
          { text: "Social Media Invoicing", icon: MessageSquare, detail: "Facebook/Instagram/Telegram" },
          { text: "Unified Order Management", icon: Package },
          { text: "Product Management", icon: Package, detail: "up to 100 products" },
          { text: "Basic Inventory Tracking", icon: Package },
          { text: "Customer Database (CRM Lite)", icon: Users },
          { text: "Basic Sales Analytics", icon: BarChart3 },
          { text: "KHQR, ABA Pay & Cash on Delivery", icon: CreditCard },
          { text: "Standard Template Access", icon: Store }
        ],
        excluded: [
          "Point-of-Sale (POS) System",
          "Custom Domain (yourstore.com)",
          "Multiple Staff Accounts (limited to 1)"
        ]
      },
      target: "Solo entrepreneurs, Facebook/Instagram sellers, brand-new businesses"
    },
    {
      name: "GROWTH",
      id: "c39ec705-0767-4bde-8ad5-ce51e2bba217",
      tagline: "Unify All Your Sales Channels",
      price: billingPeriod === 'annual' ? 150 : 15,
      priceKHR: billingPeriod === 'annual' ? 600000 : 60000,
      period: billingPeriod === 'annual' ? 'per year' : 'per month',
      description: "Ideal for established SMEs, cafes, and retail shops",
      icon: Rocket,
      color: "teal" ,
      popular: true,
      cta: "Start Free Trial",
      features: {
        included: [
          { text: "Everything in STARTER", icon: CheckCircle },
          { text: "Full Point-of-Sale (POS) System", icon: CreditCard },
          { text: "Unlimited Products", icon: Package },
          { text: "Staff Accounts", icon: Users, detail: "up to 5 users" },
          { text: "Customer Loyalty Tools", icon: Star },
          { text: "QR Code Menu Generator", icon: Smartphone },
          { text: "Custom Domain", icon: Globe, detail: "www.yourstore.com" },
          { text: "Advanced Template Customization", icon: Store },
          { text: "Standard Email & Chat Support", icon: MessageSquare }
        ],
        excluded: [
          "Delivery Partner Integration",
          "Advanced Analytics & Reports",
          "Multi-Location Management"
        ]
      },
      target: "Established SMEs, cafes, retail shops with physical storefront"
    },
    {
      name: "PRO",
      tagline: "Optimize & Scale Your Business",
      price: billingPeriod === 'annual' ? 590 : 59,
      priceKHR: billingPeriod === 'annual' ? 2360000 : 236000,
      period: billingPeriod === 'annual' ? 'per year' : 'per month',
      description: "For serious, scaling businesses that want data-driven growth",
      icon: Crown,
      color: "purple",
      popular: false,
      comingSoon: true,
      cta: "Join Waitlist",
      features: {
        included: [
          { text: "Everything in GROWTH", icon: CheckCircle },
          { text: "Delivery Partner Integration", icon: Truck, detail: "Grab, Nham24" },
          { text: "Advanced Analytics & Profit Reports", icon: BarChart3 },
          { text: "Marketing Tools", icon: Mail, detail: "Email/SMS campaigns" },
          { text: "Multi-Location Management", icon: Building },
          { text: "Advanced Staff Roles & Permissions", icon: Users },
          { text: "Priority Support", icon: Award },
          { text: "Advanced API Access", icon: Zap },
          { text: "Custom Reporting", icon: TrendingUp }
        ],
        excluded: []
      },
      target: "Larger businesses, multi-location businesses, data-driven owners"
    }
  ];

  const faqs = [
    {
      question: "Is there a free trial available?",
      answer: "Yes! All plans include a 30-day free trial. No credit card required. You can test all features during this period and cancel anytime without charges."
    },
    {
      question: "Can I switch plans later?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Your data will be preserved during the transition, and we'll prorate the charges accordingly."
    },
    {
      question: "What payment methods do you accept in Cambodia?",
      answer: "We accept all major Cambodian payment methods: KHQR, ABA Pay, ACLEDA, Wing, and credit cards. All transactions are secure and encrypted with bank-level security."
    },
    {
      question: "Do you offer discounts for annual billing?",
      answer: "Yes! Save 16% when you choose annual billing. This is equivalent to getting 2 months free every year. You can switch between monthly and annual billing anytime."
    },
    {
      question: "What happens if I exceed my plan's limits?",
      answer: "We'll notify you before you reach any limits. You can easily upgrade your plan to access higher limits and additional features. No immediate cutoffs - we give you time to adjust."
    },
    {
      question: "Is there a setup fee or hidden costs?",
      answer: "No hidden fees. The price you see is the price you pay. We include free setup assistance and migration help for all new customers. No surprise charges ever."
    },
    {
      question: "When will PRO features be available?",
      answer: "We're actively developing PRO features based on customer feedback. Join the waitlist to get early access and influence which features we prioritize next."
    }
  ];

  const PriceDisplay = ({ plan }) => {
    const displayPrice = currency === 'USD' ? plan.price : plan.priceKHR;
    const symbol = currency === 'USD' ? '$' : '៛';
    const formattedPrice = currency === 'USD' ? 
      displayPrice.toFixed(0) : 
      Math.round(displayPrice).toLocaleString('en-US');
    
    return (
      <div className="mb-4">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold">{symbol}{formattedPrice}</span>
          <span className="text-muted-foreground">/{plan.period}</span>
        </div>
        {billingPeriod === 'annual' && showAnnualSavings && (
          <div className="text-sm text-green-600 font-medium mt-1 flex items-center justify-center gap-1">
            <Sparkles className="h-3 w-3" />
            Save 16% with annual billing
          </div>
        )}
      </div>
    );
  };

  const FeatureBadge = ({ plan }) => {
    if (plan.comingSoon) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
          <Clock className="h-3 w-3 mr-1" />
          Coming Soon
        </Badge>
      );
    }
    
    if (plan.popular) {
      return (
        <Badge className="bg-gradient-to-r from-teal-500 to-green-500 text-white px-4 py-1">
          <Award className="h-3 w-3 mr-1" />
          MOST POPULAR
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-50/50 via-white to-teal-50/30">
        <div className="container text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-2 bg-blue-100 text-blue-700 border-blue-200">
            <Shield className="h-3 w-3 mr-1" />
            No Hidden Fees • Cancel Anytime
          </Badge>
          
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl mb-6 leading-tight">
            Pricing That <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Grows With You</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            Start small, scale big. Choose the perfect plan for your business journey in Cambodia. 
            All plans include a 30-day free trial with full features.
          </p>

          {/* Controls */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl p-6 max-w-md mx-auto border border-gray-100 shadow-sm">
            <div className="space-y-6">
              {/* Currency Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="currency-toggle" className="text-sm font-medium">
                  Currency
                </Label>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${currency === 'USD' ? 'font-semibold' : 'text-muted-foreground'}`}>
                    USD
                  </span>
                  <Switch
                    id="currency-toggle"
                    checked={currency === 'KHR'}
                    onCheckedChange={(checked) => setCurrency(checked ? 'KHR' : 'USD')}
                  />
                  <span className={`text-sm ${currency === 'KHR' ? 'font-semibold' : 'text-muted-foreground'}`}>
                    KHR
                  </span>
                </div>
              </div>

              {/* Billing Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="billing-toggle" className="text-sm font-medium">
                  Billing Period
                </Label>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm ${billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}`}>
                    Monthly
                  </span>
                  <Switch
                    id="billing-toggle"
                    checked={billingPeriod === 'annual'}
                    onCheckedChange={(checked) => setBillingPeriod(checked ? 'annual' : 'monthly')}
                  />
                  <span className={`text-sm ${billingPeriod === 'annual' ? 'font-semibold' : 'text-muted-foreground'}`}>
                    Annual
                  </span>
                </div>
              </div>

              {/* Savings Toggle */}
              <div className="flex items-center justify-between">
                <Label htmlFor="savings-toggle" className="text-sm font-medium">
                  Show Annual Savings
                </Label>
                <Switch
                  id="savings-toggle"
                  checked={showAnnualSavings}
                  onCheckedChange={setShowAnnualSavings}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 md:py-24 bg-gray-50/30">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const IconComponent = plan.icon;
              const gradientClass = {
                blue: 'from-blue-500 to-blue-600',
                teal: 'from-teal-500 to-teal-600',
                purple: 'from-purple-500 to-purple-600'
              }[plan.color];

              return (
                <Card key={index} className={`relative border-2 transition-all duration-300 hover:shadow-lg ${
                  plan.popular 
                    ? 'border-teal-300 shadow-lg scale-105' 
                    : plan.comingSoon 
                    ? 'border-purple-200 opacity-95'
                    : 'border-gray-200'
                } ${plan.comingSoon ? 'relative overflow-hidden' : ''}`}>
                  
                  {/* Coming Soon Overlay */}
                  {plan.comingSoon && (
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 z-10" />
                  )}

                  {/* Feature Badge */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <FeatureBadge plan={plan} />
                  </div>

                  <CardContent className="p-8 relative z-20">
                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${gradientClass} text-white mb-4 shadow-lg`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-lg font-semibold text-teal-600 mb-1">{plan.tagline}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{plan.target}</p>
                    </div>

                    {/* Price */}
                    <PriceDisplay plan={plan} />

                    {/* Description */}
                    <p className="text-center text-muted-foreground mb-6 leading-relaxed">{plan.description}</p>

                    {/* CTA Button */}
                    <Button 
                      onClick={() => handleStartTrial(plan.id)}
                      disabled={plan.comingSoon}
                      className={`w-full py-3 text-lg font-semibold transition-all duration-300 ${
                        plan.comingSoon
                          ? 'bg-gradient-to-r from-purple-400 to-blue-400 cursor-not-allowed opacity-80'
                          : plan.popular 
                          ? 'bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 shadow-lg hover:shadow-xl'
                          : `bg-gradient-to-r ${gradientClass} hover:opacity-90 shadow-lg hover:shadow-xl`
                      } text-white`}
                    >
                      {plan.comingSoon ? (
                        <>
                          <Calendar className="h-5 w-5 mr-2" />
                          Join Waitlist
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-2" />
                          {plan.cta}
                        </>
                      )}
                    </Button>

                    {/* Features List */}
                    <div className="mt-8 space-y-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        What's Included:
                      </h4>
                      
                      {plan.features.included.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-start gap-3 group">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{feature.text}</span>
                            {feature.detail && (
                              <span className="text-xs text-muted-foreground block mt-1">{feature.detail}</span>
                            )}
                          </div>
                        </div>
                      ))}

                      {plan.features.excluded.length > 0 && (
                        <>
                          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3 mt-6 flex items-center">
                            <XCircle className="h-4 w-4 mr-2 text-red-400" />
                            Not Included:
                          </h4>
                          
                          {plan.features.excluded.map((feature, featureIndex) => (
                            <div key={featureIndex} className="flex items-start gap-3 opacity-60">
                              <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                              <span className="text-sm line-through">{feature}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Trust Badges */}
          <div className="text-center mt-16">
            <div className="inline-flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border">
                <Shield className="h-4 w-4 text-green-500" />
                <span>30-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>No contracts, cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border">
                <Globe className="h-4 w-4 text-teal-500" />
                <span>Local Cambodian support team</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRO Waitlist Section */}
      <section id="pro-waitlist" className="py-16 md:py-24 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Crown className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <Badge variant="outline" className="mb-4 bg-purple-100 text-purple-700 border-purple-200">
              Early Access Program
            </Badge>
            
            <h2 className="text-3xl font-bold md:text-4xl mb-4">
              Be the First to Access <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">PRO Features</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join our exclusive waitlist to get early access to PRO features, influence our development roadmap, 
              and receive special founding member pricing.
            </p>

            <Card className="max-w-md mx-auto">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business" className="text-sm font-medium">Business Type</Label>
                    <select
                      id="business"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select your business type</option>
                      <option value="retail">Retail Store</option>
                      <option value="restaurant">Restaurant/Cafe</option>
                      <option value="fashion">Fashion Boutique</option>
                      <option value="electronics">Electronics Store</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                    <Zap className="h-4 w-4 mr-2" />
                    Join PRO Waitlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold md:text-4xl mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-lg text-muted-foreground">
                Everything you need to know about our pricing and plans
              </p>
            </div>
            
            <Accordion type="single" collapsible className="space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg px-6">
                  <AccordionTrigger className="hover:no-underline py-6 text-left">
                    <span className="font-semibold text-lg">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-teal-500 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Ready to Transform Your Business?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join 500+ Cambodian businesses already growing with Rentify
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 font-semibold"
              onClick={() => handleStartTrial("278181bd-dbaa-4582-9116-f05b2320a659")}
            >
              <Zap className="mr-2 h-4 w-4" /> Start 30-Day Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 px-8 font-semibold"
            >
              <Phone className="mr-2 h-4 w-4" /> Call +855 96 123 4567
            </Button>
          </div>
          <p className="mt-4 text-sm opacity-80">
            No credit card required • Free setup assistance • Cancel anytime
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default PricingPage;