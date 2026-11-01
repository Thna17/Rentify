import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
import { useState } from 'react';
import {
  AlertCircle,
  Check,
  LayoutTemplate,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@rentify/shared/ui/alert-dialog';

const KEPT = ['info', 'products', 'categories', 'social', 'theme'];

/** What a template switch never touches. */
export function KeptContent({ t, className = '' }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-foreground">
        {t('merchant.storeDesign.keepsTitle')}
      </p>
      <ul className="mt-2 space-y-1.5">
        {KEPT.map((key) => (
          <li
            key={key}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {t(`merchant.storeDesign.keeps.${key}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Template names and descriptions are Core's admin-managed template data. */
export const templateName = (template) => template.name || '';

/**
 * Templates the storefront can render. Picking one previews it with the
 * merchant's own store; applying it asks for confirmation first.
 */
export function TemplateGallery({
  templates,
  isLoading,
  isError,
  onRetry,
  currentId,
  previewId,
  onPreview,
  onApply,
  isApplying,
  t,
}) {
  const [confirming, setConfirming] = useState(false);
  const previewed = templates.find(
    (template) => template.websiteTemplateId === previewId
  );

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <span className="sr-only">{t('merchant.storeDesign.loading')}</span>
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl border border-border px-4 py-10 text-center"
      >
        <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
        <p className="text-sm font-medium text-foreground">
          {t('merchant.storeDesign.templatesError')}
        </p>
        <Button variant="outline" className="h-11" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('merchant.storeDesign.retry')}
        </Button>
      </div>
    );
  }

  if (!templates.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-border px-4 py-10 text-center">
        <LayoutTemplate
          className="h-8 w-8 text-muted-foreground/60"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-foreground">
          {t('merchant.storeDesign.templatesEmptyTitle')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('merchant.storeDesign.templatesEmptyBody')}
        </p>
      </div>
    );
  }

  const isCurrent = previewId === currentId;

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-1" aria-label={t('merchant.storeDesign.tabs.templates')}>
        {templates.map((template) => {
          const id = template.websiteTemplateId;
          const selected = id === previewId;
          const style = EDITORIAL_STYLES[id];
          const swatches = Object.values(
            style?.palette || template.colorPalette || {}
          ).slice(0, 3);
          return (
            <li key={template.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onPreview(id)}
                className={`flex h-full min-h-11 w-full flex-col items-start gap-3 rounded-xl border p-4 text-left lg:flex-row transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <span
                  className="mt-0.5 flex shrink-0 overflow-hidden rounded-md border border-border"
                  aria-hidden="true"
                >
                  {swatches.map((color, index) => (
                    <span
                      key={index}
                      className="h-10 w-3"
                      style={{ background: color }}
                    />
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  {style && (
                    <span
                      className="relative mb-3 block overflow-hidden rounded-lg"
                      style={{ background: style.heroBase }}
                    >
                      <img
                        src={style.preview || style.image}
                        alt=""
                        loading="lazy"
                        className="aspect-[16/10] w-full object-cover"
                      />
                      {!style.preview && (
                        <span
                          className="absolute inset-y-0 left-0 flex w-1/2 items-center px-3 text-xs font-semibold"
                          style={{
                            color: style.heroText,
                            background: `linear-gradient(90deg, ${style.heroBase}, transparent)`,
                          }}
                        >
                          {style.name}
                        </span>
                      )}
                    </span>
                  )}
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {templateName(template)}
                    </span>
                    {id === currentId && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {t('merchant.storeDesign.current')}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 hidden text-sm text-muted-foreground lg:block">{style?.layoutDescription || template.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3 rounded-xl bg-muted/50 p-4">
        <KeptContent t={t} />
        {!isCurrent && (
          <div className="space-y-2 pt-2">
            <Button className="h-11 w-full" disabled={!onApply || isApplying} onClick={() => setConfirming(true)}>
              {t(isApplying ? 'merchant.storeDesign.saving' : 'merchant.storeDesign.useTemplate')}
            </Button>
            {!onApply && (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('merchant.storeDesign.switchBlocked')}
              </p>
            )}
          </div>
        )}
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('merchant.storeDesign.confirmTitle', {
                name: previewed ? templateName(previewed) : '',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('merchant.storeDesign.confirmBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <KeptContent t={t} />
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">
              {t('merchant.storeDesign.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() => onApply?.(previewId)}
            >
              {t('merchant.storeDesign.confirmAction')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
