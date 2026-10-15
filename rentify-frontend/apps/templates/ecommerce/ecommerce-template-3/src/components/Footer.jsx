import { Link } from 'react-router-dom';
import { ArrowUp, Mail, MapPin, Phone } from 'lucide-react';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { getTemplateContent } from '../storeContent';
import { CupRing } from './decor/Artwork';
import { SocialIcons } from './SocialIcons';
import { StoreMark } from './StoreMark';
import { PaymentMethods } from './PaymentMethods';

function Column({ title, children }) {
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm">{children}</ul>
    </div>
  );
}

const link = 'rounded text-secondary-foreground/80 transition-colors hover:text-secondary-foreground';
const MAX_FOOTER_HOURS = 4;

/**
 * Dark espresso footer: the café's categories, customer pages, contact
 * details, a short opening-hours list and social links — each only when the
 * merchant has provided it.
 */
export function Footer() {
  const { t } = useI18n();
  const { identity, content } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const { visit } = getTemplateContent(content, categories);
  const year = new Date().getFullYear();
  const telHref = identity.phone ? `tel:${identity.phone.replace(/[^\d+]/g, '')}` : null;
  const hasSocial = identity.socialLinks.length > 0;
  const hours = visit.hours.slice(0, MAX_FOOTER_HOURS);

  return (
    <footer className="relative mt-20 overflow-hidden bg-secondary text-secondary-foreground sm:mt-24">
      <CupRing className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 text-secondary-foreground/[0.06]" />

      <div className="store-container relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link to={PATHS.HOME} className="inline-flex items-center gap-3 rounded-full">
            <StoreMark identity={identity} size="lg" inverted />
          </Link>
          {identity.heroSubtitle && <p className="mt-4 max-w-xs text-sm text-secondary-foreground/70">{identity.heroSubtitle}</p>}
          {hasSocial && (
            <SocialIcons
              links={identity.socialLinks}
              label={t('footer.followUs')}
              className="mt-6"
              itemClassName="flex h-10 w-10 items-center justify-center rounded-full border border-secondary-foreground/20 text-secondary-foreground transition-colors hover:border-secondary-foreground hover:bg-secondary-foreground hover:text-secondary"
            />
          )}
        </div>

        <Column title={t('footer.menu')}>
          <li>
            <Link to={PATHS.PRODUCTS} className={link}>
              {t('nav.shopAll')}
            </Link>
          </li>
          {categories.slice(0, 6).map((category) => (
            <li key={category.id}>
              <Link to={catalogPath({ category: category.id })} className={link}>
                {category.name}
              </Link>
            </li>
          ))}
        </Column>

        <Column title={t('footer.help')}>
          <li>
            <Link to={PATHS.ACCOUNT} className={link}>
              {t('nav.account')}
            </Link>
          </li>
          <li>
            <Link to={PATHS.CART} className={link}>
              {t('nav.cart')}
            </Link>
          </li>
          {identity.phone && (
            <li className="flex gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
              <a href={telHref} className={link}>
                {identity.phone}
              </a>
            </li>
          )}
          {identity.email && (
            <li className="flex gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
              <a href={`mailto:${identity.email}`} className={`${link} break-all`}>
                {identity.email}
              </a>
            </li>
          )}
          {identity.location && (
            <li className="flex gap-2 text-secondary-foreground/80">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-60" aria-hidden="true" />
              {identity.location}
            </li>
          )}
        </Column>

        {hours.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-secondary-foreground/60">{t('visit.hours')}</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              {hours.map((entry, index) => (
                <div key={`${entry.label}-${index}`} className="flex justify-between gap-4">
                  <dt className="text-secondary-foreground/80">{entry.label}</dt>
                  <dd className="text-right tabular-nums">{entry.closed ? t('visit.closed') : entry.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="store-container relative">
        <PaymentMethods tone="secondary" className="border-t border-secondary-foreground/10 py-5" />
      </div>

      <div className="store-container relative flex flex-col items-center gap-4 border-t border-secondary-foreground/10 py-6 text-xs text-secondary-foreground/70 sm:flex-row sm:justify-between">
        <p>
          {identity.copyright || `© ${year} ${identity.name}`}
          {!/rentify/i.test(identity.copyright) && <span> · {t('footer.poweredBy')}</span>}
        </p>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="inline-flex items-center gap-2 rounded-full border border-secondary-foreground/25 px-4 py-2 font-medium text-secondary-foreground transition-colors hover:bg-secondary-foreground hover:text-secondary"
        >
          <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          {t('footer.backToTop')}
        </button>
      </div>
    </footer>
  );
}
