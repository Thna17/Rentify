import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { 
  Facebook, 
  MessageCircle, 
  Instagram, 
  Mail, 
  Phone, 
  MapPin, 
  Globe,
  ArrowUp,
  Star,
  Shield,
  Clock,
  Users
} from 'lucide-react';

const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e) => {
    e.preventDefault();
    // Handle subscription logic
    console.log('Subscribed:', email);
    setEmail('');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
      </div>
      
      {/* Main Footer Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
                <img 
                  src='https://i.ibb.co/hFhZHpkh/Logo.png' 
                  alt="Rentify" 
                  className="w-6 h-6 filter brightness-0 invert"
                />
              </div>
              <div>
                <span className="text-2xl font-bold">Rentify</span>
                <span className="block text-sm text-teal-300 font-medium">For Cambodian SMEs</span>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed max-w-md">
              Empowering Cambodian businesses with modern, affordable technology solutions. 
              From local startups to established enterprises, we help you build, sell, and grow in the digital age.
            </p>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                <Shield className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium">100% Secure</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium">24/7 Support</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-3">
              {[
                { icon: Facebook, label: 'Facebook', color: 'hover:bg-blue-500' },
                { icon: MessageCircle, label: 'Telegram', color: 'hover:bg-blue-400' },
                { icon: Instagram, label: 'Instagram', color: 'hover:bg-pink-500' },
              ].map((social, index) => (
                <a
                  key={index}
                  href="#"
                  className={`w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${social.color}`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white flex items-center">
              <span className="w-2 h-2 bg-teal-400 rounded-full mr-3"></span>
              Platform
            </h3>
            <ul className="space-y-3">
              {[
                'Online Store Builder',
                'POS System',
                'Inventory Management',
                'Invoice Generator',
                'Customer CRM',
                'Analytics Dashboard'
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-300 hover:text-teal-300 transition-colors duration-200 text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
              Resources
            </h3>
            <ul className="space-y-3">
              {[
                'Help Center',
                'Documentation',
                'Video Tutorials',
                'Blog & News',
                'Case Studies',
                'Developer API'
              ].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-300 hover:text-teal-300 transition-colors duration-200 text-sm">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
              Stay Updated
            </h3>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3 text-gray-300">
                <Phone className="h-4 w-4 text-green-400" />
                <span className="text-sm">+855 96 123 4567</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <Mail className="h-4 w-4 text-blue-400" />
                <span className="text-sm">hello@rentify.com.kh</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-300">
                <MapPin className="h-4 w-4 text-red-400" />
                <span className="text-sm">Phnom Penh, Cambodia</span>
              </div>
            </div>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-teal-400 transition-colors duration-200 text-sm"
                  required
                />
              </div>
              <Button 
                type="submit"
                className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Star className="h-4 w-4 mr-2" />
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            
            {/* Copyright */}
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 text-sm text-gray-400">
              <p>&copy; 2024 Rentify Solutions. All rights reserved.</p>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-teal-300 transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="hover:text-teal-300 transition-colors duration-200">Terms of Service</a>
                <a href="#" className="hover:text-teal-300 transition-colors duration-200">Cookie Policy</a>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-400">
                <Globe className="h-4 w-4" />
                <span className="text-sm">Made with ❤️ in Cambodia</span>
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="border-white/20 text-gray-300 hover:border-teal-400 hover:text-teal-300 transition-all duration-200"
                onClick={scrollToTop}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Back to Top
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;