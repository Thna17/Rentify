import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  CheckCircle, 
  Zap, 
  PlayCircle,
  PauseCircle,
  Store, 
  CreditCard, 
  FileText,
  Package,
  Users,
  BarChart3,
  MessageSquare,
  Smartphone,
  Wifi,
  Headphones,
  ArrowRight,
  Shield,
  Clock,
  Eye,
  ShoppingCart,
  Receipt,
  TrendingUp,
  SmartphoneCharging
} from "lucide-react";

import Navigation from "../../components/common/Navigation";
import Footer from "../../components/common/Footer";

// --- Video Player Component for Interactive Demos ---
const VideoPlayer = ({ src, thumbnail, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className={`relative rounded-xl overflow-hidden shadow-2xl ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        className="w-full h-auto"
        onClick={togglePlay}
      />
      {!isPlaying && (
        <div 
          className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="bg-white/90 rounded-full p-4 shadow-2xl">
            <PlayCircle className="h-12 w-12 text-blue-600" />
          </div>
        </div>
      )}
      {isPlaying && (
        <div 
          className="absolute bottom-4 right-4 bg-black/50 rounded-full p-2 cursor-pointer"
          onClick={togglePlay}
        >
          <PauseCircle className="h-6 w-6 text-white" />
        </div>
      )}
    </div>
  );
};

// --- Interactive Feature Card Component ---
const FeatureCard = ({ 
  feature, 
  index, 
  isActive, 
  onActivate,
  videoDemo 
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
        isActive 
          ? 'border-blue-500 bg-blue-50/50 shadow-md' 
          : 'border-gray-200 hover:border-blue-300'
      }`}
      onClick={onActivate}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${
            isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <feature.icon className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {feature.problem}
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              See how it works <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- Main Features Page Component ---
const FeaturesPage = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const features = [
    {
      icon: Store,
      title: "Professional Online Store",
      problem: "Selling only on Facebook looks unprofessional and limits your growth",
      solution: "Create a beautiful, mobile-friendly online store in minutes. No technical skills needed. Showcase your products professionally and sell 24/7.",
      painPoint: "Stop losing customers because you don't have a proper website",
      videoDemo: "https://example.com/storefront-demo.mp4",
      thumbnail: "https://i.ibb.co/Ldj5yhK3/Screenshot-2025-08-08-at-2-47-11-in-the-afternoon.png",
      benefits: [
        "Mobile-optimized for Cambodian customers",
        "Built-in Khmer language support",
        "SEO-friendly to attract new customers",
        "24/7 ordering without your involvement"
      ]
    },
    {
      icon: CreditCard,
      title: "Smart Point-of-Sale",
      problem: "Manual cash tracking leads to errors and lost revenue",
      solution: "Turn any smartphone or tablet into a powerful POS system. Accept cash, KHQR, and card payments seamlessly.",
      painPoint: "Stop worrying about calculation errors and missing cash",
      videoDemo: "https://example.com/pos-demo.mp4",
      thumbnail: "https://i.ibb.co/LzhtJfYc/localhost-4500-dashboard-invoices-1.png",
      benefits: [
        "Works offline when internet is unstable",
        "Instant KHQR payment processing",
        "Digital receipts via SMS or messenger",
        "Cash drawer integration support"
      ]
    },
    {
      icon: FileText,
      title: "Social Media Order Management",
      problem: "Facebook and Telegram orders get lost in conversations",
      solution: "Convert chat messages into professional invoices automatically. Track every order from inquiry to delivery.",
      painPoint: "Stop losing track of social media orders and disappointing customers",
      videoDemo: "https://example.com/invoice-demo.mp4",
      thumbnail: "https://i.ibb.co/album123/invoice-management.png",
      benefits: [
        "Create invoices in 30 seconds",
        "Payment links for instant collection",
        "Order status tracking for customers",
        "Automatic reminder messages"
      ]
    },
    {
      icon: Package,
      title: "Real-time Inventory Management",
      problem: "Selling out-of-stock items damages customer trust",
      solution: "Sync inventory across all sales channels automatically. Get low-stock alerts before you run out.",
      painPoint: "Stop overselling and disappointing your customers",
      videoDemo: "https://example.com/inventory-demo.mp4",
      thumbnail: "https://i.ibb.co/album123/inventory-management.png",
      benefits: [
        "Real-time stock updates across all platforms",
        "Low stock notifications via Telegram",
        "Bulk import from Excel spreadsheets",
        "Variant management (sizes, colors)"
      ]
    },
    {
      icon: Users,
      title: "Customer Relationship Management",
      problem: "You have customers but no way to bring them back",
      solution: "Build customer profiles with purchase history. Send targeted promotions and loyalty rewards.",
      painPoint: "Stop losing repeat business to competitors",
      videoDemo: "https://example.com/crm-demo.mp4",
      thumbnail: "https://i.ibb.co/album123/customer-management.png",
      benefits: [
        "Customer purchase history tracking",
        "Birthday and anniversary reminders",
        "Loyalty point system",
        "Bulk messaging for promotions"
      ]
    },
    {
      icon: BarChart3,
      title: "Business Analytics & Reports",
      problem: "Making decisions without data is like driving blindfolded",
      solution: "Understand your business performance with beautiful charts and insights. Know your best products and busiest times.",
      painPoint: "Stop guessing what's working in your business",
      videoDemo: "https://example.com/analytics-demo.mp4",
      thumbnail: "https://i.ibb.co/album123/analytics-dashboard.png",
      benefits: [
        "Daily sales reports in Khmer Riel",
        "Product performance rankings",
        "Customer behavior insights",
        "Export to Excel for accountant"
      ]
    }
  ];

  // Auto-rotate features every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [features.length]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section for Features Page */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-blue-50 via-white to-teal-50/30">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 px-4 py-1 bg-blue-100 text-blue-700 border-blue-200">
              Everything You Need to Grow
            </Badge>
            <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl mb-6">
              Built for <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">Cambodian Business</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Rentify isn't just software—it's your business partner. Every feature is designed to solve real problems faced by Cambodian SMEs every day.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                <Zap className="mr-2 h-4 w-4" /> Start Free Trial
              </Button>
              <Button variant="outline" size="lg">
                <PlayCircle className="mr-2 h-4 w-4" /> Watch Full Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Features Showcase */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Feature List */}
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-3xl font-bold md:text-4xl mb-4">Solve Your Biggest Business Challenges</h2>
                <p className="text-lg text-muted-foreground">
                  Click on each feature to see exactly how it works
                </p>
              </div>
              
              {features.map((feature, index) => (
                <FeatureCard
                  key={index}
                  feature={feature}
                  index={index}
                  isActive={activeFeature === index}
                  onActivate={() => setActiveFeature(index)}
                />
              ))}
            </div>

            {/* Feature Demo */}
            <div className="sticky top-24">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-xl border">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                    <Eye className="h-4 w-4" />
                    Live Demo
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{features[activeFeature].title}</h3>
                  <p className="text-red-600 font-semibold italic mb-3">
                    {features[activeFeature].painPoint}
                  </p>
                  <p className="text-muted-foreground mb-4">
                    {features[activeFeature].solution}
                  </p>
                </div>

                {/* Video Demo */}
                <VideoPlayer
                  src={features[activeFeature].videoDemo}
                  thumbnail={features[activeFeature].thumbnail}
                  className="mb-6"
                />

                {/* Benefits List */}
                <div className="grid gap-3">
                  {features[activeFeature].benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cambodia-Specific Features */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold md:text-4xl mb-4">Made for Cambodia, Loved by Cambodians</h2>
            <p className="text-lg text-muted-foreground">
              We built Rentify specifically for the unique needs of Cambodian businesses
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: SmartphoneCharging,
                title: "KHQR Payments",
                description: "Accept instant payments from any Cambodian bank account",
                color: "green"
              },
              {
                icon: Wifi,
                title: "Offline First",
                description: "Works perfectly even with unstable internet connections",
                color: "blue"
              },
              {
                icon: FileText,
                title: "Bilingual Interface",
                description: "Full Khmer and English support for you and your staff",
                color: "purple"
              },
              {
                icon: Headphones,
                title: "Local Support",
                description: "Get help via phone, Telegram, or in-person visits",
                color: "orange"
              }
            ].map((feature, index) => (
              <div key={index} className="text-center">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-${feature.color}-100 text-${feature.color}-600 mb-4`}>
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold md:text-4xl mb-4">From Chaos to Control</h2>
              <p className="text-lg text-muted-foreground">
                See how Rentify transforms your daily operations
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Before Rentify */}
              <Card className="border-red-200 bg-red-50/30">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full font-semibold">
                      Before Rentify
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "📱 Orders lost in Facebook messages",
                      "📓 Manual calculations in notebooks",
                      "💰 Cash tracking errors",
                      "📦 Overselling out-of-stock items",
                      "😞 Customer complaints",
                      "🌙 2+ hours nightly admin work"
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3 text-red-700">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* After Rentify */}
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="p-6">
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full font-semibold">
                      With Rentify
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {[
                      "🛍️ All orders in one dashboard",
                      "💳 Automatic calculations",
                      "📊 Real-time cash tracking",
                      "📈 Smart inventory alerts",
                      "😊 Happy returning customers",
                      "⚡ 30-minute daily admin"
                    ].map((item, index) => (
                      <li key={index} className="flex items-center gap-3 text-green-700">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold md:text-4xl mb-6">Everything Works Together</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Rentify connects all parts of your business seamlessly
            </p>
            
            <div className="relative bg-white rounded-2xl p-8 shadow-lg border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                  { icon: ShoppingCart, label: "Online Store" },
                  { icon: CreditCard, label: "POS System" },
                  { icon: MessageSquare, label: "Social Media" },
                  { icon: Receipt, label: "Invoices" }
                ].map((item, index) => (
                  <div key={index} className="text-center p-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-xl mb-2">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <TrendingUp className="h-12 w-12 text-blue-500" />
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
              </div>
              
              <div className="mt-8 text-center">
                <h3 className="text-xl font-bold mb-2">Unified Business Dashboard</h3>
                <p className="text-muted-foreground">
                  See all your sales, customers, and inventory in one beautiful view
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 to-teal-500 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Ready to See Rentify in Action?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of Cambodian businesses that have transformed their operations
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8">
              <Zap className="mr-2 h-4 w-4" /> Start Free 30-Day Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
              <PlayCircle className="mr-2 h-4 w-4" /> Watch Product Tour
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm opacity-80">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span>Setup in 10 minutes</span>
            </div>
            <div className="flex items-center">
              <Headphones className="h-4 w-4 mr-2" />
              <span>Free onboarding support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
};

export default FeaturesPage;