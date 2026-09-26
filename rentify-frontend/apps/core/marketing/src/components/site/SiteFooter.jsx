import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  Facebook,
  Instagram,
  Languages,
  Mail,
  MapPin,
  Phone,
  Send,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { AUTH_URL, DASHBOARD_URL } from '@rentify/shared/config/urls';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import { CONTACT, SOCIAL } from '../../data/contact';
import rentifyLogo from '../../assets/Logo.webp';
import { Container, SmartLink } from './ui';

const SOCIAL_ICONS = { telegram: Send, facebook: Facebook, instagram: Instagram };

const SiteFooter = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { trialPath } = useStartTrial();
  const socials = SOCIAL.filter((item) => item.url);

  const columns = [
    {
      title: t('site.footer.platform'),
      links: [
        { label: t('site.footer.links.onlineStore'), to: '/feature#store' },
        { label: t('site.footer.links.pos'), to: '/feature#pos' },
        { label: t('site.footer.links.inventory'), to: '/feature#more' },
        { label: t('site.footer.links.invoices'), to: '/feature#tools' },
        { label: t('site.footer.links.crm'), to: '/feature#more' },
        { label: t('site.footer.links.analytics'), to: '/feature#tools' },
      ],
    },
    {
      title: t('site.footer.resources'),
      links: [
        { label: t('site.nav.templates'), to: '/templates' },
        { label: t('site.nav.solutions'), to: '/solutions' },
        { label: t('site.footer.links.liveDemo'), to: '/live-demo' },
        { label: t('site.nav.pricing'), to: '/pricing' },
        { label: t('site.footer.links.faq'), to: '/pricing#faq' },
      ],
    },
    {
      title: t('site.footer.company'),
      links: [
        { label: t('site.nav.about'), to: '/about' },
        { label: t('site.footer.team'), to: '/about#team' },
        { label: t('site.footer.contact'), to: '/contact' },
      ],
    },
    {
      title: t('site.footer.account'),
      links: [
        { label: t('site.common.startTrial'), to: trialPath },
        { label: t('site.nav.signIn'), to: AUTH_URL },
        { label: t('site.footer.dashboard'), to: DASHBOARD_URL },
      ],
    },
  ];

  return (
    <footer
      className={cn(
        'bg-[#f5f5f7] text-[12px] text-[#6e6e73] antialiased',
        language === 'KH' ? 'font-site-kh' : 'font-site'
      )}
    >
      <Container className="py-10">
        <div className="flex flex-col gap-10 sm:grid sm:grid-cols-2 lg:grid-cols-[1.2fr_repeat(4,1fr)] lg:gap-6">
          <div className="flex flex-col gap-3">
            <Link to="/" className="inline-flex shrink-0 items-center gap-2">
              <img src={rentifyLogo} alt="Rentify" className="h-6 w-6 rounded-[6px] object-cover ring-1 ring-black/10" />
              <span className="text-[14px] font-bold tracking-tight text-[#1d1d1f]">Rentify</span>
            </Link>
            {socials.length > 0 && (
              <div className="flex shrink-0 items-center gap-1.5" aria-label={t('site.footer.social')}>
                {socials.map((item) => {
                  const Icon = SOCIAL_ICONS[item.id];
                  return (
                    <SmartLink
                      key={item.id}
                      to={item.url}
                      aria-label={item.label}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[#1d1d1f] ring-1 ring-black/[0.06] transition-colors hover:bg-[#e8e8ed]"
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </SmartLink>
                  );
                })}
              </div>
            )}
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#1d1d1f]">
                {column.title}
              </span>
              {column.links.map((link) => (
                <SmartLink
                  key={link.label}
                  to={link.to}
                  className="text-[#424245] transition-colors hover:text-[#1d1d1f] hover:underline"
                >
                  {link.label}
                </SmartLink>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-black/10 pt-5 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span>© {new Date().getFullYear()} Rentify. {t('site.footer.rights')}</span>
            <SmartLink to={CONTACT.phoneHref} className="flex items-center gap-1.5 hover:text-[#1d1d1f]">
              <Phone className="h-3.5 w-3.5" strokeWidth={1.8} />
              {CONTACT.phone}
            </SmartLink>
            <SmartLink to={`mailto:${CONTACT.email}`} className="flex items-center gap-1.5 hover:text-[#1d1d1f]">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
              {CONTACT.email}
            </SmartLink>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t('site.footer.location')}
            </span>
          </div>
          <div className="flex items-center gap-x-4">
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-[#424245] hover:text-[#1d1d1f] hover:underline"
            >
              <Languages className="h-3.5 w-3.5" strokeWidth={1.8} />
              {language === 'KH' ? 'English' : 'ខ្មែរ'}
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-1 text-[#424245] hover:text-[#1d1d1f] hover:underline"
            >
              {t('site.footer.backToTop')}
              <ArrowUp className="h-3 w-3" />
            </button>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default SiteFooter;
