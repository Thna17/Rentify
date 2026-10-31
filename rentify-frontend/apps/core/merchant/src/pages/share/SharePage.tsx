import React from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { ShareSheet } from '@rentify/shared/ui';
import { useChannels } from '../../context/ChannelContext';
import { useSetupGuide } from '../../app/features/setup-guide/SetupGuideContext';
import { marketplaceStoreUrl, storefrontUrl } from '../../utils/storeLinks';

/** Share your store: links and a QR code for each place buyers can order (wireframe screen 7). */
export default function SharePage() {
  const { t } = useTranslation();
  const { store, hasMarketplace, hasStorefront } = useChannels();
  const { guide } = useSetupGuide();
  const storeLike = store as Parameters<typeof marketplaceStoreUrl>[0];
  const labels = {
    title: t('merchant.setup.shareTitle'),
    copy: t('merchant.setup.shareCopy'),
    telegram: t('merchant.setup.shareTelegram'),
    facebook: t('merchant.setup.shareFacebook'),
    qr: t('merchant.setup.shareQr'),
  };
  const links = [
    hasMarketplace && { key: 'marketplace', title: t('merchant.setup.shareMarketplace'), url: marketplaceStoreUrl(storeLike) },
    hasStorefront && { key: 'storefront', title: t('merchant.setup.shareOnlineStore'), url: storefrontUrl(storeLike) },
  ].filter(Boolean) as { key: string; title: string; url: string }[];
  // The link works before setup is finished; it just can't take orders yet, so say so instead of hiding it.
  const notLive = Boolean(guide && guide.steps.find((step) => step.id === 'live')?.state !== 'done');

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6 md:py-8">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight text-foreground">{t('merchant.setup.shareTitle')}</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">{t('merchant.setup.shareBody')}</p>
      </header>
      {notLive && (
        <p className="flex items-start gap-2 rounded-2xl bg-muted px-4 py-3 text-[13.5px] text-foreground/80" role="note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t('merchant.setup.shareNotLive')}
        </p>
      )}
      {links.map((link) => (
        <section key={link.key} className="space-y-3 rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)]">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{link.title}</h2>
            <p className="mt-1 break-all font-mono text-[13px] text-muted-foreground">{link.url}</p>
          </div>
          <ShareSheet url={link.url} labels={labels} />
        </section>
      ))}
    </div>
  );
}
