import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  CheckCircle, 
  Zap, 
  Coffee, 
  Shirt,
  Smartphone,
  Store,
  CreditCard,
  Package,
  Users,
  BarChart3,
  MessageSquare,
  Globe,
  Shield,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Play,
  ExternalLink,
  Star,
  Award,
  Clock,
  ArrowRight
} from "lucide-react";

import Navigation from "../../components/common/Navigation";
import Footer from "../../components/common/Footer";

// ============================================================================
// PAGE 1: SOLUTIONS / FOR WHO?
// ============================================================================

const Solutions = () => {
  const industries = [
    {
      icon: Coffee,
      title: "For F&B: Cafes & Restaurants",
      features: [
        "Fast & Simple POS for quick checkouts",
        "QR Code Menus for table-side ordering",
        "Integration with local delivery partners",
        "Sales analytics to find your best-selling items"
      ],
      image: "https://i.ibb.co/6nL8Z9M/restaurant-dashboard.png",
      imageAlt: "Rentify QR Code Menu for Cambodian restaurants",
      reverse: false
    },
    {
      icon: Shirt,
      title: "For Retail: Fashion & Goods",
      features: [
        "Professional online storefront to showcase your brand",
        "Product Variants for size, color, and style",
        "Unified inventory management (online & in-store)",
        "Invoicing for Facebook & Instagram sales"
      ],
      image: "https://i.ibb.co/7QxY9hL/fashion-dashboard.png",
      imageAlt: "Rentify product management for fashion boutiques",
      reverse: true
    },
    {
      icon: Smartphone,
      title: "For Electronics Stores",
      features: [
        "Manage products with serial numbers",
        "Detailed product pages with tech specs",
        "Customer database for warranty tracking",
        "Secure online payments with KHQR & ABA Pay"
      ],
      image: "https://i.ibb.co/0QxW8zL/electronics-dashboard.png",
      imageAlt: "Rentify product page for electronics store",
      reverse: false
    }
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-blue-50/30 to-white">
        <div className="container text-center">
          <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl mb-6">
            A Platform Built For <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Your Business</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Whether you sell coffee or clothes, Rentify has specialized tools designed for the way you work in Cambodia.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
              <Zap className="mr-2 h-4 w-4" /> Start Free Trial
            </Button>
            <Button variant="outline" size="lg">
              <Play className="mr-2 h-4 w-4" /> Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Industry Sections */}
      {industries.map((industry, index) => (
        <section key={index} className={`py-16 md:py-24 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <div className="container">
            <div className={`grid md:grid-cols-2 gap-12 items-center ${industry.reverse ? 'md:grid-flow-row-dense' : ''}`}>
              {/* Text Content */}
              <div className={industry.reverse ? 'md:col-start-2' : ''}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <industry.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-bold">{industry.title}</h2>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {industry.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button variant="outline">
 Learn more about {(industry.title.split(':')[1] || industry.title).toLowerCase()}

                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Image Content */}
              <div className={industry.reverse ? 'md:col-start-1 md:row-start-1' : ''}>
                <div className="relative">
                  <div className="rounded-2xl overflow-hidden shadow-2xl">
                    <img 
                      src={industry.image} 
                      alt={industry.imageAlt}
                      className="w-full h-auto"
                    />
                  </div>
                  {/* Decorative element */}
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-full -z-10"></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-teal-500 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Ready to Find Your Perfect Fit?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join hundreds of Cambodian businesses already growing with Rentify
          </p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
            <Zap className="mr-2 h-4 w-4" /> Start Your Free Trial
          </Button>
          <p className="mt-4 text-sm opacity-80">No credit card required • Setup in 10 minutes</p>
        </div>
      </section>
            <Footer />
    </main>
  );
};



export default Solutions;