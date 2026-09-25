import React, { useMemo, useState } from 'react';
import { Badge } from '@rentify/shared/ui/badge';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { cn } from '@rentify/utils';
import {
  Check,
  ExternalLink,
  Eye,
  LayoutTemplate,
  Monitor,
  Palette,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useGetTemplatesByCategoryQuery } from '@rentify/apis';
import { getTemplateMedia } from '../../../data/templateMedia';
import StepHeader from './StepHeader';

const industries = [
  { value: 'ecommerce', labelKey: 'onboarding.templates.industries.ecommerce' },
  { value: 'Food & Beverage', labelKey: 'onboarding.templates.industries.food' },
  { value: 'Beauty & Wellness', labelKey: 'onboarding.templates.industries.beauty' },
  { value: 'Custom', labelKey: 'onboarding.templates.industries.custom' },
];

const previewPages = [
  { key: 'homepage', route: '/' },
  { key: 'products', route: '/products' },
  { key: 'cart', route: '/cart' },
];

const devices = [
  { key: 'mobile', icon: Smartphone, className: 'h-[667px] w-[375px]' },
  { key: 'tablet', icon: Tablet, className: 'h-[1024px] w-[768px]' },
  { key: 'desktop', icon: Monitor, className: 'h-full w-full' },
];

// The API returns features as a list of labels; older records used an object
// of boolean flags. Support both so the feature chips always render labels.
const toFeatureList = (features) => {
  if (Array.isArray(features)) return features;
  if (features && typeof features === 'object') {
    return Object.entries(features)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1));
  }
  return [];
};

const TemplateThumbnail = ({ template }) => {
  const [imageError, setImageError] = useState(false);
  const media = template.media || getTemplateMedia(template);
  const imgSrc = !imageError && (template.image || media?.desktop);
  const hasLiveWebDemo =
    template.liveDemo &&
    !template.liveDemo.includes('localhost') &&
    !template.liveDemo.includes('127.0.0.1');

  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={template.name}
          onError={() => setImageError(true)}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
      ) : hasLiveWebDemo ? (
        <iframe
          src={template.liveDemo}
          title={`Preview of ${template.name}`}
          sandbox="allow-same-origin allow-scripts"
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-200 text-slate-400">
          <LayoutTemplate className="h-10 w-10 text-slate-300" />
          <span className="text-xs font-medium text-slate-500">{template.name}</span>
        </div>
      )}
    </div>
  );
};

const TemplatePickStep = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const [selectedTemplate, setSelectedTemplate] = useState(data.template);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [filter, setFilter] = useState('ecommerce');
  const [currentPreviewPage, setCurrentPreviewPage] = useState('/');
  const [deviceMode, setDeviceMode] = useState('desktop');
  const { data: apiTemplates = [], isLoading } =
    useGetTemplatesByCategoryQuery(filter);

  const templates = useMemo(
    () =>
      apiTemplates.map((template) => {
        const media = getTemplateMedia(template);
        return {
          id: template.id,
          name: template.name,
          category: template.category,
          websiteTemplateId: template.websiteTemplateId,
          image: template.thumbnailUrl || media?.desktop || null,
          media,
          description: template.description,
          features: toFeatureList(template.features),
          liveDemo: media?.previewUrl || template.baseUrl,
          colorPalette: template.colorPalette,
        };
      }),
    [apiTemplates]
  );

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    onUpdate({ template });
    setPreviewTemplate(null);
  };

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setCurrentPreviewPage('/');
  };

  const activeDevice = devices.find((device) => device.key === deviceMode);

  return (
    <div className="space-y-8">
      <StepHeader
        icon={Palette}
        title={t('onboarding.templates.title')}
        description={t('onboarding.templates.description')}
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {industries.map((industry) => (
          <Button
            key={industry.value}
            size="sm"
            variant={filter === industry.value ? 'default' : 'outline'}
            onClick={() => setFilter(industry.value)}
            className="rounded-full"
          >
            {t(industry.labelKey)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="gap-0 overflow-hidden py-0">
              <Skeleton className="aspect-[16/10] rounded-none" />
              <CardContent className="space-y-3 p-5">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card className="border-dashed py-0">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('onboarding.templates.empty')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {templates.map((template) => {
            const isSelected = selectedTemplate?.id === template.id;

            return (
              <Card
                key={template.id}
                className={cn(
                  'group gap-0 overflow-hidden py-0 transition-all duration-300',
                  isSelected
                    ? 'ring-2 ring-primary shadow-lg'
                    : 'hover:-translate-y-0.5 hover:shadow-lg'
                )}
              >
                <div className="relative">
                  <TemplateThumbnail template={template} />
                  {isSelected && (
                    <Badge className="absolute right-3 top-3 gap-1 bg-primary shadow-md">
                      <Check className="h-3 w-3" />
                      {t('onboarding.templates.selected')}
                    </Badge>
                  )}
                  {template.media?.domain && (
                    <span className="absolute bottom-2.5 left-2.5 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-mono text-white/90 backdrop-blur-sm shadow-sm pointer-events-none">
                      {template.media.domain}
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t('onboarding.templates.preview')}
                    </Button>
                  </div>
                </div>

                <CardContent className="space-y-4 p-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {template.name}
                      </h3>
                      {template.colorPalette && (
                        <div className="flex -space-x-1">
                          {['primary', 'secondary', 'accent']
                            .map((key) => template.colorPalette[key])
                            .filter(Boolean)
                            .map((color) => (
                              <span
                                key={color}
                                className="h-4 w-4 rounded-full border-2 border-background"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </div>

                  {template.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {template.features.slice(0, 3).map((feature) => (
                        <Badge
                          key={feature}
                          variant="outline"
                          className="font-normal text-muted-foreground"
                        >
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      {t('onboarding.templates.preview')}
                    </Button>
                    <Button
                      className="flex-1"
                      variant={isSelected ? 'secondary' : 'default'}
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isSelected
                        ? t('onboarding.templates.selected')
                        : t('onboarding.templates.choose')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 animate-in fade-in-0 sm:p-4">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-background">
            <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-lg font-semibold">{previewTemplate.name}</h3>
                {previewTemplate.liveDemo && (
                  <a
                    href={previewTemplate.liveDemo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-muted/60 px-2.5 py-0.5 text-xs font-mono text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <span>{previewTemplate.media?.domain || previewTemplate.liveDemo.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewTemplate(null)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-muted/50 px-4 py-3 sm:px-6">
              <div className="flex flex-1 flex-wrap gap-2">
                {previewPages.map((page) => (
                  <Button
                    key={page.key}
                    size="sm"
                    variant={
                      currentPreviewPage === page.route ? 'default' : 'outline'
                    }
                    onClick={() => setCurrentPreviewPage(page.route)}
                  >
                    {t(`onboarding.templates.pages.${page.key}`)}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border bg-background p-1">
                {devices.map((device) => (
                  <Button
                    key={device.key}
                    size="sm"
                    variant={deviceMode === device.key ? 'secondary' : 'ghost'}
                    onClick={() => setDeviceMode(device.key)}
                    aria-label={t(`onboarding.templates.devices.${device.key}`)}
                  >
                    <device.icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center overflow-auto bg-muted p-4">
              <div
                className={cn(
                  'relative overflow-hidden rounded-xl border bg-white shadow-xl transition-all',
                  activeDevice.className
                )}
              >
                {previewTemplate.liveDemo &&
                !previewTemplate.liveDemo.includes('localhost') &&
                !previewTemplate.liveDemo.includes('127.0.0.1') ? (
                  <iframe
                    key={`${previewTemplate.liveDemo}${currentPreviewPage}`}
                    src={`${previewTemplate.liveDemo}${currentPreviewPage}`}
                    className="h-full w-full border-0"
                    title={`Preview of ${previewTemplate.name}`}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                ) : (
                  <div className="h-full w-full overflow-y-auto bg-slate-50">
                    <img
                      src={
                        (deviceMode === 'mobile' && previewTemplate.media?.mobile) ||
                        previewTemplate.media?.desktop ||
                        previewTemplate.image
                      }
                      alt={`${previewTemplate.name} preview`}
                      className="w-full h-auto object-cover object-top"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end border-t bg-muted/50 px-4 py-3 sm:px-6">
              <Button onClick={() => handleTemplateSelect(previewTemplate)}>
                <Check className="mr-2 h-4 w-4" />
                {t('onboarding.templates.chooseThis')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatePickStep;
