import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Globe, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Sheet, SheetClose, SheetContent, SheetTrigger } from '@rentify/shared/ui/sheet';
import { useLanguage } from '../../contexts/LanguageContext';

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
        { href: '/solutions#snack', label: 'Snack Stores', icon: '🍿' },
        { href: '/solutions#fashion', label: 'Fashion Boutiques', icon: '👕' },
        { href: '/solutions#electronics', label: 'Electronics Stores', icon: '📱' }
      ]
    },
    { href: '/feature', label: t('nav.feature') },
    { href: '/templates', label: t('nav.templates') },
    { href: '/pricing', label: t('nav.pricing') },
    { href: '/about', label: t('nav.about') },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav aria-label="Main navigation" className={`fixed inset-x-2 top-2 z-50 rounded-xl transition-all duration-500 sm:inset-x-3 sm:top-3 sm:rounded-2xl lg:top-4 ${
      isScrolled 
        ? 'bg-white/90 backdrop-blur-2xl shadow-lg border border-fuchsia-100/70'
        : 'bg-white/85 backdrop-blur-2xl shadow-[0_14px_45px_rgba(88,28,135,0.10)] border border-white/90'
    } ${language === 'KH' ? 'font-khmer' : 'font-sans'}`}>
      
      <div className="px-3 sm:px-5 md:px-6 lg:px-4 xl:px-8 2xl:px-12">
        <div className="flex h-16 items-center justify-between gap-3 sm:h-[72px] lg:h-16 lg:gap-3 xl:h-20 xl:gap-6">
          
          {/* Logo */}
          <Link 
            to="/" 
            className="group relative flex shrink-0 items-center gap-2.5 sm:gap-3 xl:gap-4"
          >
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-lg shadow-fuchsia-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl sm:h-11 sm:w-11 lg:h-10 lg:w-10 xl:h-12 xl:w-12 xl:rounded-2xl">
                <Sparkles className="h-6 w-6 text-white xl:h-7 xl:w-7" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight sm:text-xl lg:text-lg xl:text-[22px]">
                <span className="text-slate-950">Ren</span><span className="text-fuchsia-500">tify</span>
              </span>
              <span className="text-[10px] font-medium tracking-wide text-slate-500 sm:text-xs lg:text-[10px] xl:text-sm">
                For Cambodian SMEs
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center lg:flex lg:gap-3 xl:gap-6 2xl:gap-10">
            {navItems.map((item) => (
              <div key={item.href} className="relative">
                {item.dropdown ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`group flex items-center gap-1 px-1.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 xl:gap-2 xl:px-2 xl:py-3 xl:text-base ${
                          isActive(item.href)
                            ? 'text-fuchsia-600 bg-fuchsia-50'
                            : 'text-slate-600 hover:text-fuchsia-600 hover:bg-fuchsia-50/60'
                        }`}
                      >
                        {item.label}
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
                            className="flex items-center px-3 py-3 text-sm rounded-lg cursor-pointer transition-colors duration-150 hover:bg-fuchsia-50/70"
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
                    className={`flex items-center rounded-lg px-1.5 py-2 text-sm font-medium transition-all duration-200 xl:px-2 xl:py-3 xl:text-base ${
                      isActive(item.href)
                        ? 'text-fuchsia-600 bg-fuchsia-50'
                        : 'text-slate-600 hover:text-fuchsia-600 hover:bg-fuchsia-50/60'
                    }`}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden shrink-0 items-center lg:flex lg:gap-2 xl:gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex h-10 items-center gap-1.5 rounded-lg border-slate-200 bg-white/70 px-3 text-sm text-slate-700 transition-all duration-200 hover:border-fuchsia-300 hover:text-fuchsia-600 xl:h-12 xl:gap-3 xl:rounded-xl xl:px-5 xl:text-base"
                >
                  <Globe className="h-4 w-4 xl:h-5 xl:w-5" />
                  <span className="font-medium">{language}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 rounded-xl">
                <DropdownMenuItem onClick={toggleLanguage} className="cursor-pointer">
                  {language === 'EN' ? 'ខ្មែរ' : 'English'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Link to="/start">
              <Button className="group h-10 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 px-4 text-sm font-medium text-white shadow-lg shadow-fuchsia-500/20 transition-all duration-300 hover:from-fuchsia-600 hover:to-pink-700 hover:shadow-xl xl:h-12 xl:rounded-xl xl:px-7 xl:text-base">
                {t('nav.getstarted')}
                <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1 xl:ml-2 xl:h-5 xl:w-5" />
              </Button>
            </Link>
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="flex h-10 w-10 items-center text-slate-600 hover:text-fuchsia-600 lg:hidden sm:h-11 sm:w-11"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[92vw] max-w-sm rounded-l-2xl border-l border-gray-100/50 sm:w-[78vw] sm:max-w-md">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6">
                  <SheetClose asChild>
                    <Link to="/" className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-lg font-bold"><span className="text-slate-950">Ren</span><span className="text-fuchsia-500">tify</span></span>
                        <span className="text-xs text-gray-500">For Cambodian SMEs</span>
                      </div>
                    </Link>
                  </SheetClose>
                </div>

                {/* Mobile Navigation */}
                <div className="flex-1 space-y-1.5 overflow-y-auto p-4 sm:space-y-2 sm:p-6">
                  {navItems.map((item) => (
                    <div key={item.href} className="space-y-2">
                      <SheetClose asChild>
                        <Link
                          to={item.href}
                          className={`flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 sm:min-h-12 sm:px-4 sm:py-3 sm:text-base ${
                            isActive(item.href)
                              ? 'text-fuchsia-600 bg-fuchsia-50'
                              : 'text-gray-700 hover:text-fuchsia-600 hover:bg-fuchsia-50/60'
                          }`}
                        >
                          {item.label}
                        </Link>
                      </SheetClose>
                      
                      {item.dropdown && (
                        <div className="ml-4 space-y-1 border-l border-slate-100 pl-3">
                          {item.dropdown.map((dropdownItem) => (
                            <SheetClose asChild key={dropdownItem.href}>
                              <Link
                                to={dropdownItem.href}
                                className="flex min-h-10 items-center px-4 py-2 text-sm text-gray-600 hover:text-fuchsia-600 rounded-lg transition-colors duration-200"
                              >
                                <span className="text-lg mr-3">{dropdownItem.icon}</span>
                                {dropdownItem.label}
                              </Link>
                            </SheetClose>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Mobile Footer */}
                <div className="space-y-3 border-t border-gray-100 p-4 sm:space-y-4 sm:p-6">
                  <div className="flex items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleLanguage}
                      className="flex h-11 items-center gap-2 rounded-xl"
                    >
                      <Globe className="h-4 w-4" />
                      <span>{language}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <SheetClose asChild>
                    <Link to="/start" className="flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-600 font-medium text-white hover:from-fuchsia-600 hover:to-pink-700">
                      {t('nav.getstarted')}
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </Link>
                  </SheetClose>
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
