import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Globe, Palette, RefreshCw, Store } from 'lucide-react';
import { useGetWebsiteQuery } from '@rentify/apis';
import { useGetTemplatesQuery } from '@rentify/apis/apis/websiteTemplateApi';
import { useCheckDeploymentStatusQuery } from '@rentify/apis/apis/deploymentApi';
import { serializeLayout, TEMPLATE_SECTIONS } from '@rentify/storefront/preview';
import { useTranslation } from '@rentify/utils';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { MARKETING_URL } from '@rentify/shared/config/urls';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@rentify/shared/ui/tabs';
import { TemplateGallery, templateName } from './components/TemplateGallery';
import { LayoutPanel } from './components/LayoutPanel';
import { StorePreview } from './components/StorePreview';
import { templateThemes } from '@rentify/shared/themes';
import { StoreImages } from './components/StoreImages';
import { BrandColors } from './components/BrandColors';
import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
import { useLayoutDraft } from './useLayoutDraft';

function Message({ icon: Icon, tone = 'muted', title, body, action }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center"
    >
      <Icon className={`h-9 w-9 ${tone === 'error' ? 'text-destructive' : 'text-muted-foreground/60'}`} aria-hidden="true" />
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      {action}
    </div>
  );
}

function RetryButton({ onClick, t }) {
  return (
    <Button variant="outline" className="h-11" onClick={onClick}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      {t('merchant.storeDesign.retry')}
    </Button>
  );
}

function PageSkeleton({ t }) {
  return (
    <div role="status" aria-live="polite" className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <span className="sr-only">{t('merchant.storeDesign.loading')}</span>
      <div className="space-y-3">
        <Skeleton className="h-11 w-full rounded-xl" />
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-[480px] w-full rounded-xl" />
    </div>
  );
}

/**
 * Store design: preview the merchant's own store in each template and arrange
 * home-page sections. Templates only change the look; store data is shared.
 */
export default function StoreDesign() {
  const { t } = useTranslation();
  const website = useGetWebsiteQuery();
  const websiteId = website.data?.id;
  const currentId = Number(website.data?.websiteTemplateId) || null;
  const deployment = useCheckDeploymentStatusQuery({ websiteId }, { skip: !websiteId });
  const templatesQuery = useGetTemplatesQuery(undefined, { skip: !websiteId });

  // Only templates the storefront can actually render.
  const templates = useMemo(
    () =>
      (Array.isArray(templatesQuery.data) ? templatesQuery.data : [])
        .map((template) => ({ ...template, websiteTemplateId: Number(template.websiteTemplateId) }))
        .filter((template) => TEMPLATE_SECTIONS[template.websiteTemplateId])
        .sort((a, b) => a.websiteTemplateId - b.websiteTemplateId),
    [templatesQuery.data]
  );

  const [previewRevision, setPreviewRevision] = useState(0);
  const [previewId, setPreviewId] = useState(null);
  useEffect(() => {
    if (previewId === null && currentId) setPreviewId(currentId);
  }, [currentId, previewId]);

  const activeId = previewId || currentId;
  const draft = useLayoutDraft(websiteId, activeId);
  const previewed = templates.find((template) => template.websiteTemplateId === activeId);
  const previewedLabel = previewed ? templateName(previewed) : '';

  const header = (
    <PageHeader
      title={t('merchant.storeDesign.title')}
      description={t('merchant.storeDesign.description')}
      icon={Palette}
      breadcrumb={[
        { label: t('merchant.storeDesign.breadcrumbHome'), href: '/overview' },
        { label: t('dashboard.store_management.title'), href: '/store-management' },
        { label: t('merchant.storeDesign.title') },
      ]}
    />
  );

  let body;
  if (website.isLoading) {
    body = <PageSkeleton t={t} />;
  } else if (website.isError && website.error?.status !== 404) {
    body = (
      <Message
        icon={AlertCircle}
        tone="error"
        title={t('merchant.storeDesign.errorTitle')}
        body={t('merchant.storeDesign.errorBody')}
        action={<RetryButton onClick={website.refetch} t={t} />}
      />
    );
  } else if (!websiteId) {
    body = (
      <Message
        icon={Store}
        title={t('merchant.storeDesign.noWebsiteTitle')}
        body={t('merchant.storeDesign.noWebsiteBody')}
        action={
          <Button asChild className="h-11">
            <a href={`${MARKETING_URL}/start`}>{t('merchant.storeDesign.noWebsiteAction')}</a>
          </Button>
        }
      />
    );
  } else {
    let preview;
    if (deployment.isLoading) {
      preview = <Skeleton className="h-[480px] w-full rounded-xl" />;
    } else if (deployment.isError) {
      preview = (
        <Message
          icon={AlertCircle}
          tone="error"
          title={t('merchant.storeDesign.preview.errorTitle')}
          body={t('merchant.storeDesign.errorBody')}
          action={<RetryButton onClick={deployment.refetch} t={t} />}
        />
      );
    } else if (!deployment.data?.url) {
      preview = (
        <Message
          icon={Globe}
          title={t('merchant.storeDesign.notPublishedTitle')}
          body={t('merchant.storeDesign.notPublishedBody')}
          action={
            <Button asChild variant="outline" className="h-11">
              <Link to="/store-management">{t('merchant.storeDesign.notPublishedAction')}</Link>
            </Button>
          }
        />
      );
    } else if (activeId) {
      preview = (
        <StorePreview key={previewRevision} storeUrl={deployment.data.url} templateId={activeId} layout={serializeLayout(draft.layout)} t={t} />
      );
    }

    body = (
      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Tabs defaultValue="templates" className="min-w-0 lg:sticky lg:top-4">
          <TabsList className="grid h-auto w-full grid-cols-3 p-1">
            <TabsTrigger value="templates" className="min-h-11">
              {t('merchant.storeDesign.tabs.templates')}
            </TabsTrigger>
            <TabsTrigger value="layout" className="min-h-11">
              {t('merchant.storeDesign.tabs.layout')}
            </TabsTrigger>
            <TabsTrigger value="colors" className="min-h-11">{t('merchant.storeDesign.colors.title')}</TabsTrigger>
          </TabsList>
          <TabsContent value="templates" className="mt-4">
            <TemplateGallery
              templates={templates}
              isLoading={templatesQuery.isLoading}
              isError={templatesQuery.isError}
              onRetry={templatesQuery.refetch}
              currentId={currentId}
              previewId={activeId}
              onPreview={setPreviewId}
              // Core has no template-switch endpoint yet (docs/notes.md).
              onApply={null}
              t={t}
            />
          </TabsContent>
          <TabsContent value="colors" className="mt-4 space-y-6">
            <StoreImages websiteId={websiteId} content={website.data?.WebsiteContents || website.data?.content || []}
              onSaved={() => { website.refetch(); setPreviewRevision((value) => value + 1); }} t={t} />
            <BrandColors key={websiteId} websiteId={websiteId}
              savedTheme={(website.data?.WebsiteContents || website.data?.content || []).find((item) => item.label === 'Theme Configuration')?.value || {}}
              initialPalette={
                (website.data?.selectedPalette && typeof website.data.selectedPalette === 'object'
                  ? website.data.selectedPalette.colors || website.data.selectedPalette
                  : templateThemes[currentId]?.[website.data?.selectedPalette]?.colors)
                || EDITORIAL_STYLES[currentId]?.palette || website.data?.colorPalette
              }
              onSaved={() => setPreviewRevision((value) => value + 1)} t={t} />
          </TabsContent>
          <TabsContent value="layout" className="mt-4">
            <LayoutPanel
              templateLabel={previewedLabel}
              layout={draft.layout}
              onMove={draft.move}
              onToggle={draft.toggle}
              onReset={draft.reset}
              isDefault={draft.isDefault}
              t={t}
            />
          </TabsContent>
        </Tabs>
        {preview}
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {header}
      <div className="mx-auto max-w-[1400px] px-4 pb-10 sm:px-6 md:px-8">{body}</div>
    </div>
  );
}
