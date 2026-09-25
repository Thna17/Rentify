import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@rentify/utils';
import { AUTH_URL } from '@rentify/shared/config/urls';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import { ButtonLink, Container } from './ui';
import { EASE } from './motion';

export const NAV_ITEMS = [
  { to: '/solutions', key: 'site.nav.solutions' },
  { to: '/feature', key: 'site.nav.features' },
  { to: '/templates', key: 'site.nav.templates' },
  { to: '/pricing', key: 'site.nav.pricing' },
  { to: '/live-demo', key: 'site.nav.liveDemo' },
  { to: '/about', key: 'site.nav.about' },
];

export const Wordmark = ({ className }) => (
  <Link
    to="/"
    aria-label="Rentify"
    className={cn(
      'text-[19px] font-semibold tracking-[-0.02em] text-[#1d1d1f]',
      className
    )}
  >
    Rentify
  </Link>
);

const LanguageToggle = ({ className }) => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        'text-[13px] text-[#1d1d1f]/80 transition-colors hover:text-[#1d1d1f]',
        className
      )}
    >
      {language === 'KH' ? 'English' : 'ខ្មែរ'}
    </button>
  );
};

const MenuIcon = ({ open }) => (
  <span className="relative block h-3 w-[18px]" aria-hidden>
    <span
      className={cn(
        'absolute left-0 h-[1.5px] w-full rounded-full bg-[#1d1d1f] transition-all duration-300',
        open ? 'top-[5px] rotate-45' : 'top-0'
      )}
    />
    <span
      className={cn(
        'absolute left-0 h-[1.5px] w-full rounded-full bg-[#1d1d1f] transition-all duration-300',
        open ? 'top-[5px] -rotate-45' : 'top-[10px]'
      )}
    />
  </span>
);

// The one navigation bar used across the whole marketing site, Home included
const SiteHeader = () => {
  const { t, language } = useLanguage();
  const { pathname } = useLocation();
  const { trialPath } = useStartTrial();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isActive = (to) => pathname.startsWith(to);
  // Set here too, so the bar looks identical on pages outside SiteLayout
  const font = language === 'KH' ? 'font-site-kh' : 'font-site';

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 antialiased backdrop-blur-xl backdrop-saturate-150',
          font
        )}
      >
        <Container className="flex h-12 items-center justify-between md:h-[52px]">
          <Wordmark />

          <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? 'page' : undefined}
                className={cn(
                  'text-[13px] transition-colors',
                  isActive(item.to)
                    ? 'font-medium text-[#1d1d1f]'
                    : 'text-[#1d1d1f]/60 hover:text-[#1d1d1f]'
                )}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 md:flex">
            <LanguageToggle />
            <a
              href={AUTH_URL}
              className="text-[13px] text-[#1d1d1f]/80 transition-colors hover:text-[#1d1d1f]"
            >
              {t('site.nav.signIn')}
            </a>
            <ButtonLink to={trialPath} size="sm">
              {t('site.nav.getStarted')}
            </ButtonLink>
          </div>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center md:hidden"
            onClick={() => setOpen(true)}
            aria-label={t('site.nav.menu')}
            aria-expanded={open}
          >
            <MenuIcon open={false} />
          </button>
        </Container>
      </header>

      {/* Rendered outside the header: its backdrop blur would trap a fixed overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('fixed inset-0 z-[60] overflow-y-auto bg-white antialiased md:hidden', font)}
            role="dialog"
            aria-modal="true"
          >
            <Container className="flex h-12 items-center justify-between">
              <Wordmark />
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center"
                onClick={() => setOpen(false)}
                aria-label={t('site.nav.close')}
              >
                <MenuIcon open />
              </button>
            </Container>
            <Container className="flex min-h-[calc(100%-3rem)] flex-col pb-10 pt-6">
              <motion.nav
                className="flex flex-col gap-1"
                initial="hidden"
                animate="show"
                variants={{
                  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
                }}
              >
                {NAV_ITEMS.map((item) => (
                  <motion.div
                    key={item.to}
                    variants={{
                      hidden: { opacity: 0, y: -8 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                    }}
                  >
                    <Link
                      to={item.to}
                      className="block py-2 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]"
                    >
                      {t(item.key)}
                    </Link>
                  </motion.div>
                ))}
              </motion.nav>

              <div className="mt-auto space-y-4 pt-10">
                <ButtonLink to={trialPath} size="lg" className="w-full">
                  {t('site.nav.getStarted')}
                </ButtonLink>
                <div className="flex items-center justify-between text-[15px]">
                  <a href={AUTH_URL} className="text-[#0066cc]">
                    {t('site.nav.signIn')}
                  </a>
                  <LanguageToggle className="text-[15px]" />
                </div>
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SiteHeader;
