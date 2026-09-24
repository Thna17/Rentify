import React, { useState } from 'react';
import {
  ArrowUp,
  ChevronDown,
  Facebook,
  Instagram,
  Languages,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { AUTH_URL, DASHBOARD_URL } from '@rentify/shared/config/urls';
import { useLanguage } from '../../contexts/LanguageContext';
import useStartTrial from '../../hooks/useStartTrial';
import { CONTACT, SOCIAL } from '../../data/contact';
import { Container, SmartLink } from './ui';

const SOCIAL_ICONS = { telegram: Send, facebook: Facebook, instagram: Instagram };

// A link column; on phones it folds into a tap-to-open row like Apple's footer
const FooterColumn = ({ title, links }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-black/10 md:border-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-left md:pointer-events-none md:py-0"
      >
        <h3 className="text-[12px] font-semibold text-[#1d1d1f]">{title}</h3>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-[#86868b] transition-transform duration-300 md:hidden',
            open && 'rotate-180'
          )}
        />
      </button>
      <ul className={cn('space-y-2 pb-4 md:mt-2.5 md:block md:pb-0', !open && 'hidden')}>
        {links.map((link) => (
          <li key={link.label}>
            <SmartLink
              to={link.to}
              className="text-[12px] text-[#424245] transition-colors hover:text-[#1d1d1f] hover:underline"
            >
              {link.label}
            </SmartLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

// Opens the visitor's email app with a subscribe request addressed to the team
const NewsletterForm = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent(t('site.footer.subscribeSubject'));
    const body = encodeURIComponent(`${t('site.footer.subscribeSubject')}: ${email}`);
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2.5">
      <div className="flex rounded-full bg-white p-1 ring-1 ring-black/10 focus-within:ring-[#0071e3]">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('site.footer.emailPlaceholder')}
          aria-label={t('site.footer.emailPlaceholder')}
          className="min-w-0 flex-1 bg-transparent px-3 text-[12px] text-[#1d1d1f] outline-none placeholder:text-[#86868b]"
        />
        <button
          type="submit"
          className="rounded-full bg-[#1d1d1f] px-4 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-black"
        >
          {t('site.footer.subscribe')}
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-[#86868b]">{t('site.footer.subscribeNote')}</p>
    </form>
  );
};

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
        { label: t('site.footer.contact'), to: '/about#contact' },
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

  const contacts = [
    { icon: Phone, label: CONTACT.phone, to: CONTACT.phoneHref },
    { icon: Mail, label: CONTACT.email, to: `mailto:${CONTACT.email}` },
    { icon: MapPin, label: t('site.footer.location') },
  ];

  return (
    <footer
      className={cn(
        'bg-[#f5f5f7] text-[#6e6e73] antialiased',
        language === 'KH' ? 'font-site-kh' : 'font-site'
      )}
    >
      <Container className="py-8 md:py-10">
        <div className="grid md:grid-cols-4 md:gap-8 lg:grid-cols-[repeat(4,1fr)_1.5fr]">
          {columns.map((column) => (
            <FooterColumn key={column.title} {...column} />
          ))}

          <div className="pt-6 md:col-span-4 md:pt-0 lg:col-span-1">
            <h3 className="text-[12px] font-semibold text-[#1d1d1f]">{t('site.footer.stayUpdated')}</h3>
            <ul className="mt-2.5 space-y-2">
              {contacts.map(({ icon: Icon, label, to }) => (
                <li key={label} className="flex items-center gap-2 text-[12px] text-[#424245]">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#86868b]" strokeWidth={1.8} />
                  {to ? (
                    <SmartLink to={to} className="hover:text-[#1d1d1f] hover:underline">
                      {label}
                    </SmartLink>
                  ) : (
                    label
                  )}
                </li>
              ))}
            </ul>
            {socials.length > 0 && (
              <div className="mt-3 flex items-center gap-2" aria-label={t('site.footer.social')}>
                {socials.map((item) => {
                  const Icon = SOCIAL_ICONS[item.id];
                  return (
                    <SmartLink
                      key={item.id}
                      to={item.url}
                      aria-label={item.label}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1d1d1f] ring-1 ring-black/[0.06] transition-colors hover:bg-[#e8e8ed]"
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                    </SmartLink>
                  );
                })}
              </div>
            )}
            <p className="mt-4 text-[12px]">{t('site.footer.newsletterHint')}</p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-3 border-t border-black/10 pt-5 text-[12px] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>
              © {new Date().getFullYear()} Rentify. {t('site.footer.rights')}
            </span>
            <span className="hidden h-3 w-px bg-black/15 sm:block" aria-hidden />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t('site.footer.secure')}
            </span>
            <span className="flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t('site.footer.localSupport')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>{t('site.footer.madeIn')}</span>
            <span className="h-3 w-px bg-black/15" aria-hidden />
            <button
              type="button"
              onClick={toggleLanguage}
              className="text-[#424245] hover:text-[#1d1d1f] hover:underline"
            >
              {language === 'KH' ? 'English' : 'ខ្មែរ'}
            </button>
            <span className="h-3 w-px bg-black/15" aria-hidden />
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
