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
  Clock
} from "lucide-react";

import Navigation from "../../components/common/Navigation";
import Footer from "../../components/common/Footer";


const LiveDemoPage = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-blue-50/30 to-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 border-blue-200">
              <Play className="h-3 w-3 mr-1" />
              Interactive Experience
            </Badge>
            
            <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl mb-6">
              Experience Rentify <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">in Action</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              No sign-up. No pressure. Click the button below to explore a fully functional demo store. 
              See how it feels to be a customer, place a test order, and discover the magic for yourself.
            </p>

            {/* Demo Store Mockup */}
            <div className="relative max-w-4xl mx-auto mb-8">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-8 border-gray-900">
                <img 
                  src="https://i.ibb.co/7QxY9hL/fashion-dashboard.png"
                  alt="Modern Cambodian Fashion Boutique - Rentify Demo Store"
                  className="w-full h-auto"
                />
                {/* Interactive cursor effect */}
                <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-blue-500/20 rounded-full border-2 border-blue-500 animate-pulse"></div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-20 h-20 bg-teal-500/10 rounded-full -z-10"></div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-blue-500/10 rounded-full -z-10"></div>
            </div>

            {/* Main CTA Button */}
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-12 py-6 text-lg">
              <ExternalLink className="mr-2 h-5 w-5" />
              Launch the Live Demo Store
            </Button>

            {/* Trust Indicators */}
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>100% safe demo environment</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>No time limit</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Instant access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Experience Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">What You'll Discover</h2>
            <p className="text-lg text-muted-foreground">
              Explore every feature as if you were running your own business
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Store,
                title: "Customer Experience",
                description: "See how your customers will browse and shop from your store"
              },
              {
                icon: CreditCard,
                title: "Checkout Process",
                description: "Test the complete payment flow with KHQR and local methods"
              },
              {
                icon: Package,
                title: "Order Management",
                description: "Experience how orders are processed and tracked"
              }
            ].map((item, index) => (
              <div key={index} className="text-center p-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Alternative CTA */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container text-center">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Prefer a Guided Tour?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let us walk you through the platform with a personalized demo
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
              <Play className="mr-2 h-4 w-4" /> Schedule a Live Demo
            </Button>
            <Button variant="outline" size="lg">
              <MessageSquare className="mr-2 h-4 w-4" /> Chat with Sales
            </Button>
          </div>
        </div>
      </section>
            <Footer />
    </main>
  );
};

export default LiveDemoPage;