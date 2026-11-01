import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ChevronDown,
  Facebook,
  Globe,
  Instagram,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Send,
  Store,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { AUTH_URL, DASHBOARD_URL, MARKETPLACE_URL } from '@rentify/shared/config/urls';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import { CONTACT, SOCIAL } from '../../data/contact';
import rentifyLogo from '../../assets/Logo.webp';
import { Container, SmartLink } from './ui';

const SOCIAL_ICONS = { telegram: Send, facebook: Facebook, instagram: Instagram };

// Same visual system as the marketplace footer (marketplace-frontend footer.component.ts)
const HEADING = 'text-[12.5px] font-bold tracking-[-0.01em] text-[#263c31]';
const LINK = 'block w-fit py-[3px] text-[12.5px] leading-[1.35] text-[#475069] transition-colors hover:text-[#263c31]';
const ACTION =
  'inline-flex min-h-[30px] items-center gap-1.5 rounded-md px-2 text-[12.5px] text-[#475069] transition-colors hover:bg-[#e8ebf3] hover:text-[#0f172a]';

const Badge = ({ to, icon: Icon, caption, label }) => (
  <SmartLink
    to={to}
    className="inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg bg-[#0f172a] py-1 pl-2.5 pr-3 text-white transition-colors hover:bg-[#263c31]"
  >
    <Icon className="h-[17px] w-[17px]" strokeWidth={1.75} />
    <span className="flex flex-col leading-[1.15]">
      <small className="text-[9px] font-medium opacity-75">{caption}</small>
      <b className="text-[12.5px] font-semibold tracking-[-0.01em]">{label}</b>
    </span>
  </SmartLink>
);

const SiteFooter = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { trialPath } = useStartTrial();
  const socials = SOCIAL.filter((item) => item.url);
  const marketplaceHref = MARKETPLACE_URL || 'https://rentify-market.mekhla.digital/';

  const columns = [
    {
      title: t('site.footer.platform'),
      links: [
        { label: t('site.footer.links.marketplace'), to: marketplaceHref },
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

  const badges = (
    <div className="mt-3 flex flex-wrap gap-2">
      <Badge to={trialPath} icon={Store} caption={t('site.footer.account')} label={t('site.common.startTrial')} />
      <Badge to={AUTH_URL} icon={LogIn} caption="Rentify" label={t('site.nav.signIn')} />
    </div>
  );

  return (
    <footer
      className={cn(
        'border-t border-[#e6e9f0] bg-[#f8f9fb] text-[#0f172a] antialiased',
        language === 'KH' ? 'font-site-kh' : 'font-site'
      )}
    >
      <Container className="grid gap-5 pb-5 pt-6 md:pt-8 lg:grid-cols-[minmax(240px,1.2fr)_minmax(0,2.4fr)_minmax(260px,1.1fr)] lg:gap-x-10">
        {/* Brand */}
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-[16px] tracking-[-0.02em] text-[#263c31]">
            <img src={rentifyLogo} alt="" className="h-[26px] w-[26px] rounded-[6px] object-cover" />
            <strong className="font-bold">Rentify</strong>
          </Link>
          <p className="mt-2.5 max-w-[34ch] text-[12.5px] leading-[1.55] text-[#475069]">
            {t('site.footer.companyTagline')}
          </p>
          {socials.length > 0 && (
            <nav className="mt-3.5 flex gap-1.5" aria-label={t('site.footer.social')}>
              {socials.map((item) => {
                const Icon = SOCIAL_ICONS[item.id];
                return (
                  <SmartLink
                    key={item.id}
                    to={item.url}
                    aria-label={item.label}
                    className="grid h-10 w-10 place-items-center rounded-lg border border-[#e6e9f0] bg-white text-[#475069] transition-colors hover:border-[#263c31] hover:bg-[rgba(47,122,79,0.08)] hover:text-[#263c31] lg:h-8 lg:w-8"
                  >
                    <Icon className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  </SmartLink>
                );
              })}
            </nav>
          )}
          {/* Tablet only: actions sit right under the socials (hidden on mobile) */}
          <div className="hidden sm:block lg:hidden">{badges}</div>
        </div>

        {/* Link columns: grid on tablet/desktop, accordions on phones */}
        <div className="hidden gap-4 border-t border-[#e6e9f0] pt-5 sm:grid sm:grid-cols-4 lg:border-0 lg:pt-0">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h4 className={cn(HEADING, 'mb-2.5')}>{column.title}</h4>
              {column.links.map((link) => (
                <SmartLink key={link.label} to={link.to} className={LINK}>
                  {link.label}
                </SmartLink>
              ))}
            </nav>
          ))}
        </div>

        {/* Sell on Rentify (desktop placed at the right after account column) */}
        <div className="hidden lg:block">
          <h4 className={HEADING}>{t('site.cta.title')}</h4>
          <p className="mt-2.5 max-w-[30ch] text-[12.5px] leading-[1.55] text-[#475069]">{t('site.cta.lead')}</p>
          {badges}
        </div>

        <nav className="border-t border-[#e6e9f0] sm:hidden" aria-label={t('site.footer.platform')}>
          {columns.map((column) => (
            <details key={column.title} className="group border-b border-[#e6e9f0]">
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between px-1 text-[13px] font-semibold text-[#263c31] [&::-webkit-details-marker]:hidden">
                {column.title}
                <ChevronDown className="h-4 w-4 text-[#7a8299] transition-transform group-open:rotate-180" strokeWidth={1.75} />
              </summary>
              <div className="grid pb-2 pl-1">
                {column.links.map((link) => (
                  <SmartLink key={link.label} to={link.to} className="flex min-h-[40px] items-center text-[13px] text-[#475069]">
                    {link.label}
                  </SmartLink>
                ))}
              </div>
            </details>
          ))}
        </nav>
      </Container>

      {/* Bottom bar: copyright left, utilities right */}
      <div className="border-t border-[#e6e9f0]">
        <Container className="flex flex-col gap-1.5 py-2 md:flex-row md:flex-wrap md:items-center md:justify-between">
          <span className="text-[12px] text-[#7a8299]">
            © {new Date().getFullYear()} Rentify. {t('site.footer.rights')}
          </span>
          <div className="-mx-2 flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={toggleLanguage} className={ACTION}>
              <Globe className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {language === 'KH' ? 'English' : 'ភាសាខ្មែរ'}
            </button>
            <SmartLink to={CONTACT.phoneHref} className={ACTION}>
              <Phone className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {CONTACT.phone}
            </SmartLink>
            <SmartLink to={`mailto:${CONTACT.email}`} className={ACTION}>
              <Mail className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {CONTACT.email}
            </SmartLink>
            <span className="inline-flex min-h-[26px] items-center gap-1.5 rounded-full bg-[rgba(47,122,79,0.08)] px-2.5 text-[12px] font-medium text-[#263c31]">
              <MapPin className="h-[14px] w-[14px]" strokeWidth={1.75} />
              {t('site.footer.location')}
            </span>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={ACTION}
            >
              {t('site.footer.backToTop')}
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </Container>
      </div>
    </footer>
  );
};

export default SiteFooter;
