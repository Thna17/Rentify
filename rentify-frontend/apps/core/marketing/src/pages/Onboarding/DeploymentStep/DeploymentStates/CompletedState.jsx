import {
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Rocket,
  ShoppingBag,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { useEffect, useState } from 'react';
import { MARKETPLACE_URL, POS_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';

const normalizeUrl = (value) => {
  if (!value || typeof value !== 'string') return null;
  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;
};

export default function CompletedState({
  t,
  language,
  siteUrl,
  dashboardUrl,
  onCopy,
}) {
  const storefrontUrl = normalizeUrl(siteUrl);
  const dashboardLink = normalizeUrl(dashboardUrl);
  const posLink = normalizeUrl(POS_URL);

  // Every new store is also listed on the marketplace; show its page and the
  // real approval state from Core rather than assuming it is public yet.
  const [marketStore, setMarketStore] = useState(undefined);
  useEffect(() => {
    let active = true;
    fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (active) setMarketStore(result?.data || null); })
      .catch(() => { if (active) setMarketStore(null); });
    return () => { active = false; };
  }, []);
  const marketplaceLink = marketStore?.id ? `${MARKETPLACE_URL}/stores/${marketStore.id}` : null;
  const marketplaceLive = marketStore?.marketplaceEnabled !== false &&
    marketStore?.marketplaceApprovalStatus === 'approved';

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 px-6 py-8 text-center shadow-sm sm:px-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h2
          className={`mt-5 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl ${
            language === 'KH' ? 'font-khmer' : ''
          }`}
        >
          {t('deployment.completed.title')}
        </h2>
        <p
          className={`mx-auto mt-2 max-w-xl text-slate-600 ${
            language === 'KH' ? 'font-khmer' : ''
          }`}
        >
          {t('deployment.completed.description')}
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-blue-100 p-2.5 text-blue-700">
                <Rocket className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">
                  {t('deployment.completed.websiteTitle')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {t('deployment.completed.websiteDesc')}
                </p>
              </div>
            </div>
            {storefrontUrl ? (
              <>
                <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-slate-700">
                    {storefrontUrl}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Copy storefront URL"
                    onClick={() => onCopy(storefrontUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  asChild
                  className="mt-3 w-full bg-slate-900 text-white hover:bg-slate-800"
                >
                  <a
                    href={storefrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('deployment.completed.visitSite')}
                  </a>
                </Button>
              </>
            ) : (
              <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                {t('deployment.openTheDashboardToView')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{t('deployment.completed.marketTitle')}</p>
                <p className="mt-1 text-sm text-slate-600">{t('deployment.completed.marketDesc')}</p>
              </div>
            </div>
            <div className="mt-auto pt-5">
              {marketStore === undefined ? (
                <p className="text-sm text-slate-500">{t('deployment.completed.marketLoading')}</p>
              ) : marketplaceLink && marketplaceLive ? (
                <Button asChild className="w-full bg-slate-900 text-white hover:bg-slate-800">
                  <a href={marketplaceLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('deployment.completed.visitMarket')}
                  </a>
                </Button>
              ) : (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('deployment.completed.marketPending')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {t('deployment.completed.dashboardTitle')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {t('deployment.completed.dashboardDesc')}
                </p>
              </div>
            </div>
            <div className="mt-auto pt-5">
              {dashboardLink && (
                <Button asChild variant="outline" className="w-full">
                  <a href={dashboardLink}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    {t('deployment.openDashboard')}
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex h-full flex-col p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-700">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {t('deployment.pointOfSalePos')}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {t('deployment.fastInStoreRegisterBarcode')}
                </p>
              </div>
            </div>
            {posLink && (
              <div className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                <span className="min-w-0 flex-1 truncate px-1 text-sm font-medium text-slate-700">
                  {posLink}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Copy POS URL"
                  onClick={() => onCopy(posLink)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="mt-auto pt-3">
              {posLink && (
                <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                  <a href={posLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {t('deployment.launchPosRegister')}
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-slate-50/70 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3
              className={`font-semibold text-slate-900 ${
                language === 'KH' ? 'font-khmer' : ''
              }`}
            >
              {t('deployment.completed.nextSteps')}
            </h3>
          </div>
          <ol className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            {[
              t('deployment.openTheDashboardAndAdd'),
              t('deployment.reviewTheStorefrontOnA'),
              t('deployment.shareYourStorefrontUrlWith'),
            ].map((step, index) => (
              <li
                key={step}
                className="flex gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
