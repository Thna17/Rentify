import React, { useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { Parallax } from 'react-scroll-parallax';
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  ArrowLeft, 
  Eye, 
  Monitor, 
  Palette, 
  Code, 
  Star, 
  Calendar,
  CreditCard, 
  TrendingUp, 
  CheckCircle 
} from 'lucide-react';
import TemplatePreviewCarousel from './components/TemplatePreviewCarousel';
import { useGetTemplateQuery } from '@rentify/apis';

const TemplateDetailPage = () => {
  const { id } = useParams();
  const { data: templateData } = useGetTemplateQuery(id);
  const filteredTemplates = templateData?.pages?.filter(
    (t, index) => t.id !== 1
  );

  const pages = filteredTemplates;
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const navigate = useNavigate();

  const rentalPlans = [
    {
      title: 'Basic Rental',
      price: '$50/mo',
      features: [
        '1 Website',
        'Basic Support',
        '5GB Storage',
        'Standard Features',
      ],
      popular: false,
    },
    {
      title: 'Pro Rental',
      price: '$150/mo',
      features: [
        '3 Websites',
        'Priority Support',
        '15GB Storage',
        'Advanced Features',
        'SEO Tools',
      ],
      popular: true,
    },
    {
      title: 'Enterprise',
      price: 'Custom',
      features: [
        'Unlimited Websites',
        '24/7 Support',
        'Custom Storage',
        'Dedicated SLAs',
        'API Access',
      ],
      popular: false,
    },
  ];

  const rentalProcess = [
    {
      icon: <Eye className="h-10 w-10" />,
      title: 'Preview Template',
      description: 'Explore live demo',
    },
    {
      icon: <TrendingUp className="h-10 w-10" />,
      title: 'Custom Template',
      description: 'Customize the template',
    },
    {
      icon: <CreditCard className="h-10 w-10" />,
      title: 'Publish Website',
      description: 'Automatic deployment',
    },
    {
      icon: <Calendar className="h-10 w-10" />,
      title: 'Manage Rental',
      description: 'Easy dashboard control',
    },
  ];

  const handleCustomizationNavigate = () => {
    navigate(`/customization/${templateId}`);
  };

  return (
    <div className="bg-background">
      {/* Floating Back Button */}
      <motion.div style={{ opacity }} className="fixed z-50 top-5 left-5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="w-12 h-12 bg-black/20 backdrop-blur-sm border border-white/20 hover:bg-black/40 hover:border-white/40 text-white"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Hero Section */}
      <div className="relative min-h-screen overflow-hidden">
        <div 
          className="relative min-h-screen overflow-hidden"
          style={{
            background: `
              repeating-linear-gradient(
                45deg,
                rgba(255,255,255,0.02) 0 1px,
                transparent 1px 10px
              ),
              linear-gradient(
                135deg,
                rgba(0,0,0,0.98) 60%,
                rgba(0,0,0,0.9)
              )
            `
          }}
        >
          {/* Animated Background */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(
                  45deg,
                  transparent 65%,
                  rgba(255,255,255,0.02) 100%
                )
              `,
              animation: 'binaryFlow 20s linear infinite'
            }}
          />

          {/* Quantum Grid Overlay */}
          <div 
            className="absolute w-[200%] h-[200%] opacity-30"
            style={{
              background: `
                linear-gradient(90deg, 
                  transparent 49.9%, 
                  rgba(255,255,255,0.03) 50%, 
                  transparent 50.1%
                ),
                linear-gradient(
                  transparent 49.9%, 
                  rgba(255,255,255,0.03) 50%, 
                  transparent 50.1%
                )`,
              backgroundSize: '40px 40px',
              transform: 'rotate(45deg)',
            }}
          />

          {/* Container replacement */}
          <div className="relative z-10 h-full flex items-center py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
              {/* Left Text Content */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
              >
                <h1 className="font-light tracking-tight leading-tight text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-white">
                  {templateData?.name?.split(' ').map((word, i) => (
                    <span
                      key={i}
                      className="font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
                    >
                      {word}{' '}
                    </span>
                  ))}
                </h1>

                <p className="text-xl text-white/90 leading-relaxed">
                  {templateData?.description}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <motion.div whileHover={{ scale: 1.05 }}>
                    <Button
                      variant="outline"
                      onClick={handleCustomizationNavigate}
                      className="px-8 py-3 rounded-none border-2 bg-black/50 backdrop-blur-sm text-white border-white/30 hover:bg-black/80 hover:border-white/60 transition-all duration-300"
                    >
                      Customize Now
                    </Button>
                  </motion.div>

                  <motion.div whileHover={{ scale: 1.05 }}>
                    <Button
                      variant="ghost"
                      onClick={() => window.open(templateData?.baseUrl, '_blank')}
                      className="px-8 py-3 text-white/70 hover:text-white hover:bg-black/50 backdrop-blur-sm transition-all duration-300"
                    >
                      Live Demo
                    </Button>
                  </motion.div>
                </div>
              </motion.div>

              {/* Right Carousel */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative"
              >
                <div className="relative after:absolute after:inset-[-20%] after:bg-radial after:from-white/10 after:via-transparent after:to-transparent after:blur-3xl after:z-[-1]">
                  <TemplatePreviewCarousel
                    baseUrl={templateData?.baseUrl}
                    pages={pages}
                    className="h-[300px] md:h-[500px] w-full rounded-lg overflow-hidden border border-white/10 shadow-2xl shadow-white/20 relative"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Template Details */}
      <div className="py-20 relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Rental Process */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">
            Simple 4-Step Rental Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {rentalProcess.map((step, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -10 }}
                className="h-full"
              >
                <Card className="bg-card border-2 border-primary/10 hover:border-primary h-full text-center transition-all duration-300 hover:shadow-xl">
                  <CardContent className="p-6 h-full flex flex-col items-center">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                      {step.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground flex-1">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Rental Plans (Commented out in original) */}
        {/* <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">
            Flexible Rental Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rentalPlans.map((plan, index) => (
              <motion.div key={index} whileHover={{ scale: 1.02 }}>
                <Card className={`
                  relative h-full p-6 border-2
                  ${plan.popular 
                    ? 'bg-primary/10 border-primary' 
                    : 'bg-card border-transparent'
                  }
                `}>
                  {plan.popular && (
                    <Badge 
                      className="absolute -top-3 left-1/2 transform -translate-x-1/2"
                      variant="default"
                    >
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-0 space-y-4">
                    <h3 className="text-2xl font-bold">{plan.title}</h3>
                    <div className="text-4xl font-black">{plan.price}</div>
                    <div className="space-y-3">
                      {plan.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button
                      className={`w-full py-3 rounded-full ${
                        plan.popular ? '' : 'variant-outline'
                      }`}
                    >
                      Start Rental
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div> */}

        {/* Final CTA (Commented out in original) */}
        {/* <Card className="bg-primary/10 border-2 border-dashed border-primary/30 p-12 text-center">
          <CardContent className="space-y-6">
            <h3 className="text-4xl font-bold">Ready to Launch?</h3>
            <p className="text-xl text-muted-foreground">
              Start your 7-day free trial today
            </p>
            <Button
              className="px-12 py-4 rounded-full text-lg bg-gradient-to-r from-blue-600 to-purple-600"
            >
              Start Free Trial
            </Button>
          </CardContent>
        </Card> */}
      </div>

      <style jsx>{`
        @keyframes binaryFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .bg-radial {
          background: radial-gradient(circle at 50% 50%, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 60%, var(--tw-gradient-to) 100%);
        }
      `}</style>
    </div>
  );
};

export default TemplateDetailPage;