import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Globe, ChevronDown, Star, Phone, Sparkles } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@rentify/shared/ui/sheet';
import { useLanguage } from '../../contexts/LanguageContext';
import { AUTH_URL } from '@rentify/shared/config/urls';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { t, language, toggleLanguage } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { 
      href: '/solutions', 
      label: t('nav.solutions'),
      dropdown: [
        { href: '/solutions#cafe', label: 'Cafes & Restaurants', icon: '☕' },
        { href: '/solutions#fashion', label: 'Fashion Boutiques', icon: '👕' },
        { href: '/solutions#electronics', label: 'Electronics Stores', icon: '📱' }
      ]
    },
    { href: '/templates', label: t('nav.templates') },

    { href: '/features', label: t('nav.feature') },
    
    { href: '/pricing', label: t('nav.pricing') },
    { href: '/live-demo', label: t('nav.live-demo') },
    { href: '/about', label: t('nav.about') },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-100/80' 
        : 'bg-white/80 backdrop-blur-lg border-b border-transparent'
    } ${language === 'KH' ? 'font-khmer' : 'font-sans'}`}>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-20">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group relative"
          >
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <div className="relative w-6 h-6">
                  <Sparkles className="w-6 h-6 text-white" />
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1">
                <div className="w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Rentify
              </span>
              <span className="text-xs text-gray-500 font-medium tracking-wide">
                For Cambodian SMEs
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <div key={item.href} className="relative">
                {item.dropdown ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group ${
                          isActive(item.href)
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50/50'
                        }`}
                      >
                        {item.label}
                        <ChevronDown className="ml-1 h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="start" 
                      className="w-64 p-2 rounded-xl shadow-xl border border-gray-100/80 backdrop-blur-lg"
                    >
                      {item.dropdown.map((dropdownItem) => (
                        <DropdownMenuItem key={dropdownItem.href} asChild>
                          <Link
                            to={dropdownItem.href}
                            className="flex items-center px-3 py-3 text-sm rounded-lg cursor-pointer transition-colors duration-150 hover:bg-blue-50/50"
                          >
                            <span className="text-lg mr-3">{dropdownItem.icon}</span>
                            <span className="text-gray-700">{dropdownItem.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    to={item.href}
                    className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2 border-gray-200 text-gray-600 hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
                >
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">{language === 'EN' ? 'ខ្មែរ' : 'EN'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 rounded-xl">
                <DropdownMenuItem onClick={toggleLanguage} className="cursor-pointer">
                  {language === 'EN' ? 'ខ្មែរ' : 'English'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="flex items-center space-x-2 text-gray-600 px-3 py-1 rounded-lg bg-gray-50/50">
              <Phone className="h-4 w-4" />
              <span className="text-sm font-medium">+855 96 123 4567</span>
            </div>
            
            <Link to={AUTH_URL}>
              <Button className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group">
                <Star className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                {t('nav.getstarted')}
              </Button>
            </Link>
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex items-center space-x-2 text-gray-600 hover:text-blue-600"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm sm:max-w-md rounded-l-2xl border-l border-gray-100/50">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                  <Link to="/" className="flex items-center space-x-3" onClick={() => document.getElementById('close-sheet')?.click()}>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-500 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-gray-900">Rentify</span>
                      <span className="text-xs text-gray-500">For Cambodian SMEs</span>
                    </div>
                  </Link>
                </div>

                {/* Mobile Navigation */}
                <div className="flex-1 p-6 space-y-2">
                  {navItems.map((item) => (
                    <div key={item.href} className="space-y-1">
                      <Link
                        to={item.href}
                        className={`flex items-center justify-between px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 ${
                          isActive(item.href)
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                        onClick={() => document.getElementById('close-sheet')?.click()}
                      >
                        {item.label}
                        {item.dropdown && <ChevronDown className="h-4 w-4" />}
                      </Link>
                      
                      {item.dropdown && (
                        <div className="ml-4 space-y-1">
                          {item.dropdown.map((dropdownItem) => (
                            <Link
                              key={dropdownItem.href}
                              to={dropdownItem.href}
                              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-blue-600 rounded-lg transition-colors duration-200"
                              onClick={() => document.getElementById('close-sheet')?.click()}
                            >
                              <span className="text-lg mr-3">{dropdownItem.icon}</span>
                              {dropdownItem.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile Footer */}
                <div className="p-6 space-y-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleLanguage}
                      className="flex items-center space-x-2"
                    >
                      <Globe className="h-4 w-4" />
                      <span>{language === 'EN' ? 'ខ្មែរ' : 'EN'}</span>
                    </Button>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>+855 96 123 4567</span>
                    </div>
                  </div>
                  
                  <Link to={AUTH_URL} className="block">
                    <Button className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white">
                      <Star className="h-4 w-4 mr-2" />
                      {t('nav.getstarted')}
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
