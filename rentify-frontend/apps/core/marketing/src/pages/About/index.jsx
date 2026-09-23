import React, { useState } from "react";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Input } from "@rentify/shared/ui/input";
import { Textarea } from "@rentify/shared/ui/textarea";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Send, 
  MessageCircle,
  Users,
  Target,
  Heart,
  Shield,
  Clock,
  CheckCircle,
  Facebook,
  Instagram
} from "lucide-react";

import Navigation from "../../components/common/Navigation";
import Footer from "../../components/common/Footer";
import { IconBrandTelegram } from "@tabler/icons-react";

// --- Hero Section ---
const HeroSection = () => (
  <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-blue-50/30 via-white to-teal-50/20 relative overflow-hidden">
    {/* Subtle Cambodian pattern in background */}
    <div className="absolute inset-0 -z-10 opacity-[0.02]">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%234F46E5%22%20fill-opacity%3D%220.4%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
    </div>
    
    <div className="container">
      <div className="max-w-4xl mx-auto text-center">
        <Badge variant="secondary" className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 border-blue-200 text-sm">
          <Heart className="h-3 w-3 mr-1" />
          Proudly Cambodian
        </Badge>
        <h1 className="text-4xl font-bold md:text-5xl lg:text-6xl mb-6">
          Our Story & Our Mission
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Built in Cambodia, for Cambodian Businesses
        </p>
      </div>

      {/* Team Photo Section */}
      <div className="mt-12 max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden shadow-2xl">
          <img 
            src="https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600&q=80"
            alt="The Rentify team in our Phnom Penh office"
            className="w-full h-auto"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          <div className="absolute bottom-6 left-6 text-white">
            <p className="text-sm opacity-90">The Rentify Team • Phnom Penh</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// --- Our Story Section ---
const OurStorySection = () => (
  <section className="py-16 md:py-24 bg-white">
    <div className="container">
      <div className="max-w-4xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl mb-6">Why We Started Rentify</h2>
            <div className="space-y-4 text-lg text-muted-foreground">
              <p>
                As Cambodian entrepreneurs ourselves, we saw firsthand the challenges local SMEs faced in the digital age—fragmented tools, high costs, and a lack of local support.
              </p>
              <p>
                We built Rentify to bridge that gap, empowering every business, no matter how small, to thrive online with simple, affordable, and effective digital tools.
              </p>
              <p className="font-semibold text-foreground">
                This is our commitment to Cambodia's entrepreneurial spirit.
              </p>
            </div>
            
            <div className="mt-8 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm">100% Cambodian Owned</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span className="text-sm">Local Business Hours</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-teal-100 rounded-2xl p-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
                  <Target className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Our Mission</h3>
                <p className="text-muted-foreground">
                  To empower every Cambodian SME with technology that understands their unique needs and helps them grow.
                </p>
              </div>
            </div>
            
            {/* Decorative element with Cambodian inspiration */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-r from-blue-500/10 to-teal-500/10 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// --- Team Section ---
const TeamSection = () => {
  const teamMembers = [
    {
      name: "Sokha Roth",
      title: "Founder & CEO",
      bio: "A visionary leader passionate about empowering local entrepreneurs through technology.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80"
    },
    {
      name: "Chantrea Lim",
      title: "Chief Technology Officer",
      bio: "Tech enthusiast dedicated to building solutions that work for Cambodian businesses.",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80"
    },
    {
      name: "Vannak Chen",
      title: "Head of Customer Success",
      bio: "Ensuring every Rentify customer gets the support they need to succeed.",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80"
    },
    {
      name: "Sreyneath Prak",
      title: "Head of Marketing",
      bio: "Spreading the word about how technology can transform Cambodian businesses.",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=400&q=80"
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">The Faces Behind the Platform</h2>
          <p className="text-lg text-muted-foreground">
            Meet the passionate team working every day to support Cambodian businesses
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {teamMembers.map((member, index) => (
            <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="mb-4">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white shadow-lg"
                  />
                </div>
                <h3 className="font-bold text-lg mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.title}</p>
                <p className="text-sm text-muted-foreground">{member.bio}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">Join our growing team of 15+ professionals</span>
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Contact Form Component ---
const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="p-8">
        <h3 className="text-2xl font-bold mb-6">Send us a message</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">Your Name</label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Sokha Roth"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">Email Address</label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="hello@rentify.com.kh"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">Your Message</label>
            <Textarea
              id="message"
              name="message"
              placeholder="How can we help your business?"
              rows={5}
              value={formData.message}
              onChange={handleChange}
              required
              className="w-full"
            />
          </div>
          
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// --- Contact Section ---
const ContactSection = () => (
  <section className="py-16 md:py-24 bg-white">
    <div className="container">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold md:text-4xl mb-4">Get In Touch</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We're here to help your business grow. Reach out to us through any channel that's convenient for you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div>
            <div className="space-y-8">
              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Phone className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Call Us Directly</h3>
                  <p className="text-2xl font-bold text-gray-900 mb-1">+855 (0) 96 123 4567</p>
                  <p className="text-sm text-muted-foreground">Monday-Friday, 8:00 AM - 5:00 PM</p>
                </div>
              </div>

              {/* Telegram */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Message on Telegram</h3>
                  <p className="text-lg font-medium text-gray-900 mb-1">@RentifySupport</p>
                  <p className="text-sm text-muted-foreground">Fast response, usually within minutes</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Send an Email</h3>
                  <p className="text-lg font-medium text-gray-900 mb-1">hello@rentify.com.kh</p>
                  <p className="text-sm text-muted-foreground">We'll respond within 24 hours</p>
                </div>
              </div>

              {/* Office Address */}
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <MapPin className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-2">Visit Our Office</h3>
                  <p className="text-lg font-medium text-gray-900 mb-1">
                    #123, Street 123, Boeung Keng Kang I
                  </p>
                  <p className="text-sm text-muted-foreground">Phnom Penh, Cambodia</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Directions
                  </Button>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="mt-12">
              <h3 className="font-bold text-lg mb-4">Follow Us</h3>
              <div className="flex gap-4">
                {[
                  { icon: Facebook, label: "Facebook", color: "blue" },
                  { icon: IconBrandTelegram, label: "Telegram", color: "blue" },
                  { icon: Instagram, label: "Instagram", color: "pink" }
                ].map((social, index) => (
                  <Button key={index} variant="outline" size="icon">
                    <social.icon className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h4 className="font-semibold mb-3">Why businesses trust Rentify</h4>
              <div className="space-y-2">
                {[
                  "✓ 500+ Cambodian businesses served",
                  "✓ 24/7 Khmer-speaking support",
                  "✓ Local data hosting for security",
                  "✓ Free setup and training"
                ].map((item, index) => (
                  <div key={index} className="flex items-center text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </div>
  </section>
);

// --- Values Section ---
const ValuesSection = () => (
  <section className="py-16 bg-gradient-to-r from-blue-600 to-teal-500 text-white">
    <div className="container">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold md:text-4xl mb-8">Our Commitment to Cambodia</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Heart,
              title: "Local First",
              description: "We prioritize Cambodian businesses and understand local challenges"
            },
            {
              icon: Shield,
              title: "Trust & Security",
              description: "Your data is safe with us, hosted locally in Cambodia"
            },
            {
              icon: Users,
              title: "Community Growth",
              description: "We reinvest in Cambodia's digital ecosystem"
            }
          ].map((value, index) => (
            <div key={index} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <value.icon className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-lg mb-2">{value.title}</h3>
              <p className="text-white/80">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);



// --- Main About/Contact Page Component ---
const AboutContactPage = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Our Story Section */}
      <OurStorySection />
      
      {/* Team Section */}
      <TeamSection />
      
      {/* Values Section */}
      <ValuesSection />
      
      {/* Contact Section */}
      <ContactSection />
      
      {/* Footer */}
      <Footer />
    </main>
  );
};

export default AboutContactPage;