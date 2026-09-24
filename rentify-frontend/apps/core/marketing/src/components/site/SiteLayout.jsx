import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

// Shell shared by the Solutions, Features, Templates, Pricing and About pages
const SiteLayout = ({ title, children }) => {
  const { language } = useLanguage();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (title) document.title = `${title} · Rentify`;
  }, [title]);

  // New pages start at the top; links with a hash jump to that section
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    const timer = setTimeout(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname, hash]);

  return (
    <div
      className={cn(
        'min-h-screen bg-white text-[#1d1d1f] antialiased',
        // Khmer script needs taller lines and no negative tracking
        language === 'KH'
          ? 'font-site-kh [&_h1]:leading-[1.32] [&_h1]:tracking-normal [&_h2]:leading-[1.32] [&_h2]:tracking-normal [&_h3]:leading-[1.4] [&_h3]:tracking-normal'
          : 'font-site'
      )}
    >
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
};

export default SiteLayout;
