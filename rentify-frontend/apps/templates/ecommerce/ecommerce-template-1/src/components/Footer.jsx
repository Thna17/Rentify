import { Link } from 'react-router-dom';
import { ArrowUp, Mail, MapPin, Phone } from 'lucide-react';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { KhmerSkyline, LotusBloom, LotusOrnament, RiversideScene } from './decor/Artwork';
import { SocialIcons } from './SocialIcons';
import { PaymentMethods } from './PaymentMethods';

const SCENES = { heritage: KhmerSkyline, riverside: RiversideScene };

function FooterHeading({ children }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
      <LotusOrnament className="h-4 w-4 opacity-70" />
      {children}
    </h2>
  );
}

/**
 * Store footer. The header's scene stands on top of it as a solid horizon in
 * the merchant's colour; below are the brand, shop links and only the contact
 * details the merchant actually provided.
 */
export function Footer() {
  const { t } = useI18n();
  const { identity } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const year = new Date().getFullYear();
  const hasContact = identity.phone || identity.email || identity.location;
  const Scene = SCENES[identity.headerStyle];
  const telHref = identity.phone ? `tel:${identity.phone.replace(/[^\d+]/g, '')}` : null;
  const initial = identity.name?.trim().charAt(0).toUpperCase() || '•';
  const link = 'rounded opacity-80 transition-opacity hover:opacity-100 hover:underline underline-offset-4';

  return (
    <footer className="mt-12 sm:mt-16">
      {/* Horizon: the scene rises out of the footer into the page. */}
      {Scene && (
        <div className="relative -mb-px aspect-[36/5] max-h-56 min-h-16 w-full" aria-hidden="true">
          {/* Full width at the art's own 36:5 ratio; very narrow or very wide screens crop the sides or sky, never the towers. */}
          <Scene tone="solid" className="absolute inset-0 h-full w-full text-primary" />
          <LotusBloom className="absolute bottom-1 right-[6%] h-10 w-12 sm:h-14 sm:w-16" />
        </div>
      )}

      <div className={`bg-primary text-primary-foreground ${Scene ? '' : 'rounded-t-[1.75rem]'}`}>
        <div className="store-container grid gap-10 pb-10 pt-10 sm:grid-cols-2 sm:pt-12 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to={PATHS.HOME} className="inline-flex items-center gap-3">
              <span className="rounded-full border-2 border-primary-foreground/70 bg-card p-0.5 shadow-sm">
                {identity.logoUrl ? (
                  <img src={identity.logoUrl} alt="" className="h-12 w-12 rounded-full object-contain" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                    {initial}
                  </span>
                )}
              </span>
              <span className="text-xl font-bold tracking-tight">{identity.name}</span>
            </Link>
            {identity.heroSubtitle && <p className="mt-4 max-w-sm text-sm opacity-80">{identity.heroSubtitle}</p>}
            <SocialIcons
              links={identity.socialLinks}
              label={t('footer.follow')}
              className="mt-5"
              itemClassName="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary-foreground/60 transition-colors hover:bg-primary-foreground hover:text-primary"
            />
          </div>

          <nav aria-labelledby="footer-shop">
            <FooterHeading>
              <span id="footer-shop">{t('footer.shop')}</span>
            </FooterHeading>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-1">
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
              <li>
                <Link to={PATHS.ACCOUNT} className={link}>
                  {t('nav.account')}
                </Link>
              </li>
            </ul>
          </nav>

          {hasContact && (
            <div>
              <FooterHeading>{t('footer.contact')}</FooterHeading>
              <ul className="mt-4 space-y-3 text-sm">
                {identity.phone && (
                  <li className="flex gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    <a href={telHref} className={link}>
                      {identity.phone}
                    </a>
                  </li>
                )}
                {identity.email && (
                  <li className="flex gap-2.5">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    <a href={`mailto:${identity.email}`} className={`${link} break-all`}>
                      {identity.email}
                    </a>
                  </li>
                )}
                {identity.location && (
                  <li className="flex gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
                    <span className="opacity-80">{identity.location}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="store-container">
          <PaymentMethods tone="primary" className="pb-6" />
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-primary-foreground/20" />
            <LotusOrnament className="h-5 w-5 opacity-60" />
            <span className="h-px flex-1 bg-primary-foreground/20" />
          </div>
          <div className="flex flex-col gap-3 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
            <p className="opacity-75">{identity.copyright || `© ${year} ${identity.name}`}</p>
            <div className="flex items-center gap-4">
              {!/rentify/i.test(identity.copyright) && <p className="opacity-75">{t('footer.poweredBy')}</p>}
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-foreground/60 transition-colors hover:bg-primary-foreground hover:text-primary"
                aria-label={t('footer.backToTop')}
                title={t('footer.backToTop')}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
