import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@rentify/shared/ui/alert';
import { Button } from '@rentify/shared/ui/button';

const valueOrFallback = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value : fallback;

export default function IdleState({
  t,
  language,
  onStart,
  isCreating,
  isDeploying,
  data,
}) {
  const businessName = valueOrFallback(
    data?.businessDetails?.businessName || data?.businessDetails?.name,
    'Your business'
  );
  const templateName = valueOrFallback(
    data?.template?.name,
    'Selected storefront template'
  );
  const packageName = valueOrFallback(data?.package?.name, 'Selected plan');
  const isBusy = isCreating || isDeploying;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-primary/10 via-white to-secondary/10 px-6 py-8 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
            <Cloud className="h-6 w-6" />
          </div>
          <h3
            className={`text-xl font-semibold tracking-tight text-slate-950 ${
              language === 'KH' ? 'font-khmer' : ''
            }`}
          >
            {language === 'KH'
              ? 'ពិនិត្យមើលមុនពេលដាក់ឱ្យដំណើរការ'
              : 'Ready to publish your storefront'}
          </h3>
          <p
            className={`mt-2 text-sm leading-6 text-slate-600 ${
              language === 'KH' ? 'font-khmer' : ''
            }`}
          >
            {language === 'KH'
              ? 'Rentify នឹងបង្កើតគេហទំព័ររបស់អ្នក ហើយផ្សាយវាភ្លាមៗនៅលើអាសយដ្ឋានផ្ទាល់ខ្លួនរបស់ហាង។'
              : 'Rentify will create your website and publish it right away on your store’s own web address.'}
          </p>
        </div>

        <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            ['Business', businessName],
            ['Template', templateName],
            ['Plan', packageName],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/80 bg-white/80 p-3 text-left shadow-sm backdrop-blur"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p
                className="mt-1 truncate text-sm font-semibold text-slate-800"
                title={value}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6 sm:px-8">
        <Alert className="border-blue-100 bg-blue-50/70 text-left">
          <AlertCircle className="h-4 w-4 text-blue-700" />
          <AlertTitle className={language === 'KH' ? 'font-khmer' : ''}>
            {t('deployment.confirm.title')}
          </AlertTitle>
          <AlertDescription className={language === 'KH' ? 'font-khmer' : ''}>
            {t('deployment.confirm.description')}
          </AlertDescription>
        </Alert>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="space-y-2 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {language === 'KH'
                ? 'URL របស់អ្នកនឹងមាននៅពេល build រួចរាល់'
                : 'Your live URL will be ready when the build succeeds.'}
            </p>
            <p className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              {language === 'KH'
                ? 'សោ និងព័ត៌មានសម្ងាត់មិនត្រូវបានបង្ហាញក្នុង browser ទេ'
                : 'Deployment credentials stay on the server.'}
            </p>
          </div>
          <Button
            disabled={isBusy}
            onClick={onStart}
            size="lg"
            className="w-full bg-gradient-to-r from-primary to-secondary text-white shadow-lg shadow-primary/20 sm:w-auto"
          >
            <Rocket className="mr-2 h-4 w-4" />
            {isBusy
              ? language === 'KH'
                ? 'កំពុងរៀបចំ…'
                : 'Preparing…'
              : t('deployment.confirm.button')}
          </Button>
        </div>
      </div>
    </section>
  );
}
