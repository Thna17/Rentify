import React from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';

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
                {language === 'KH'
                  ? 'សូមបើក Dashboard ដើម្បីមើល URL របស់អ្នក។'
                  : 'Open the dashboard to view your storefront URL.'}
              </p>
            )}
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
                    {language === 'KH' ? 'បើក Dashboard' : 'Open dashboard'}
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
              language === 'KH'
                ? 'បើក Dashboard និងបន្ថែមផលិតផលរបស់អ្នក'
                : 'Open the dashboard and add your products.',
              language === 'KH'
                ? 'ពិនិត្យទំព័រហាងនៅលើទូរស័ព្ទ'
                : 'Review the storefront on a mobile phone.',
              language === 'KH'
                ? 'ចែករំលែក URL របស់ហាងជាមួយអតិថិជន'
                : 'Share your storefront URL with customers.',
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
