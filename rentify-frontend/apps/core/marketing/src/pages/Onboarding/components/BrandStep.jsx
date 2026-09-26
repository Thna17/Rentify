import React, { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Check, ExternalLink, ImageIcon, Palette, Upload } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useGetTemplatesQuery } from '@rentify/apis';
import { useLanguage } from '../../../contexts/LanguageContext';
import { EASE } from '../../../components/site/motion';
import { getTemplateMedia } from '../../../data/templateMedia';
import { Field, SectionHeading } from './OnboardingFields';
import StorePreview, { brandColorOf } from './StorePreview';

const SWATCHES = ['#0071e3', '#1d1d1f', '#2d6a4f', '#0f766e', '#6d28d9', '#e11d48', '#ea580c', '#b45309'];

const toFeatureList = (features) => {
  if (Array.isArray(features)) return features;
  try {
    return JSON.parse(features || '[]');
  } catch {
    return [];
  }
};

// Same shape TemplatePickStep saved, so deployment keeps working
const toTemplate = (template) => {
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
};

const Panel = ({ title, description, children }) => (
  <div className="rounded-[24px] bg-white p-5 ring-1 ring-black/[0.05] sm:p-6">
    <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{title}</h2>
    {description && <p className="mt-1 text-[13px] text-[#6e6e73]">{description}</p>}
    <div className="mt-5">{children}</div>
  </div>
);

// Step 2: brand, storefront template and colours, with the live preview beside them
const BrandStep = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const colorInputRef = useRef(null);
  const details = data.businessDetails || {};
  const customColor = details.colorPalette?.primary;
  const templatePrimary = data.template?.colorPalette?.primary;

  const { data: apiTemplates = [], isLoading } = useGetTemplatesQuery();
  const templates = useMemo(() => apiTemplates.map(toTemplate), [apiTemplates]);

  const updateDetails = (patch) =>
    onUpdate({ businessDetails: { ...data.businessDetails, ...patch } });

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) updateDetails({ logo: URL.createObjectURL(file), file });
  };

  const handleCoverChange = (event) => {
    const file = event.target.files[0];
    if (file) updateDetails({ cover: URL.createObjectURL(file), coverFile: file });
  };

  const pickColor = (color) => updateDetails({ colorPalette: color ? { primary: color } : null });

  return (
    <section>
      <SectionHeading title={t('onboarding.brand.title')} description={t('onboarding.brand.description')} />

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-5">
          {/* Brand */}
          <Panel title={t('onboarding.brand.brandTitle')}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('business.logo.label')} htmlFor="store-logo">
                <input
                  id="store-logo"
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/svg+xml"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-[54px] w-full items-center gap-3 rounded-xl border border-dashed border-black/[0.15] px-3 text-left transition hover:border-[#0071e3] hover:bg-[#0071e3]/[0.03]"
                >
                  {details.logo ? (
                    <img src={details.logo} alt="" className="h-9 w-9 rounded-lg object-cover ring-1 ring-black/[0.06]" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                      <Upload className="h-4 w-4 text-[#6e6e73]" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#1d1d1f]">
                      {details.logo ? t('business.logo.change') : t('business.logo.upload')}
                    </span>
                    <span className="block truncate text-[11px] text-[#86868b]">{t('business.logo.format')}</span>
                  </span>
                </button>
              </Field>

              <Field label={t('onboarding.brand.cover')} htmlFor="store-cover">
                <input
                  id="store-cover"
                  ref={coverInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleCoverChange}
                  accept="image/png, image/jpeg, image/webp"
                />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="flex h-[54px] w-full items-center gap-3 rounded-xl border border-dashed border-black/[0.15] px-3 text-left transition hover:border-[#0071e3] hover:bg-[#0071e3]/[0.03]"
                >
                  {details.cover ? (
                    <img src={details.cover} alt="" className="h-9 w-14 rounded-lg object-cover ring-1 ring-black/[0.06]" />
                  ) : (
                    <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-[#f5f5f7]">
                      <ImageIcon className="h-4 w-4 text-[#6e6e73]" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#1d1d1f]">
                      {details.cover ? t('onboarding.brand.coverChange') : t('onboarding.brand.coverUpload')}
                    </span>
                    <span className="block truncate text-[11px] text-[#86868b]">{t('onboarding.brand.coverFormat')}</span>
                  </span>
                </button>
              </Field>
            </div>
          </Panel>

          {/* Template */}
          <Panel title={t('onboarding.brand.templateTitle')} description={t('onboarding.brand.templateBody')}>
            <div className="grid gap-4 sm:grid-cols-2">
              {isLoading &&
                [0, 1].map((key) => <div key={key} className="aspect-[16/11] animate-pulse rounded-2xl bg-[#f5f5f7]" />)}
              {templates.map((template) => {
                const selected = data.template?.id === template.id;
                return (
                  <div
                    key={template.id}
                    className={cn(
                      'group relative overflow-hidden rounded-2xl text-left transition-all duration-300',
                      selected ? 'ring-2 ring-[#0071e3]' : 'ring-1 ring-black/[0.08] hover:ring-black/20'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onUpdate({ template })}
                      aria-pressed={selected}
                      className="block w-full text-left"
                    >
                      <div className="aspect-[16/10] overflow-hidden bg-[#f5f5f7]">
                        {template.image && (
                          <img
                            src={template.image}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 px-4 py-3">
                        <span className="truncate text-[14px] font-medium text-[#1d1d1f]">{template.name}</span>
                        {template.colorPalette && (
                          <span className="flex shrink-0 -space-x-1">
                            {['primary', 'secondary', 'accent']
                              .map((key) => template.colorPalette[key])
                              .filter(Boolean)
                              .map((color) => (
                                <span
                                  key={color}
                                  className="h-3.5 w-3.5 rounded-full ring-2 ring-white"
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                          </span>
                        )}
                      </div>
                    </button>
                    {selected && (
                      <motion.span
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#0071e3] text-white shadow-md"
                      >
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      </motion.span>
                    )}
                    {template.liveDemo && (
                      <a
                        href={template.liveDemo}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#1d1d1f] opacity-0 shadow-sm backdrop-blur transition-opacity group-hover:opacity-100"
                      >
                        {t('onboarding.brand.liveDemo')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Colours */}
          <Panel title={t('onboarding.brand.colorTitle')} description={t('onboarding.brand.colorBody')}>
            <div className="flex flex-wrap items-center gap-3">
              {templatePrimary && (
                <button
                  type="button"
                  onClick={() => pickColor(null)}
                  className={cn(
                    'flex h-10 items-center gap-2 rounded-full pl-1.5 pr-4 text-[13px] transition',
                    !customColor ? 'bg-[#1d1d1f] text-white' : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#ebebed]'
                  )}
                >
                  <span className="h-7 w-7 rounded-full ring-2 ring-white" style={{ backgroundColor: templatePrimary }} />
                  {t('onboarding.brand.templateColors')}
                </button>
              )}
              {SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => pickColor(color)}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full transition-transform hover:scale-105',
                    customColor === color && 'ring-2 ring-offset-2'
                  )}
                  style={{ backgroundColor: color, '--tw-ring-color': color }}
                >
                  {customColor === color && <Check className="h-4 w-4 text-white" strokeWidth={2.5} />}
                </button>
              ))}
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className={cn(
                  'relative flex h-10 items-center gap-2 rounded-full bg-[#f5f5f7] pl-1.5 pr-4 text-[13px] text-[#1d1d1f] transition hover:bg-[#ebebed]',
                  customColor && !SWATCHES.includes(customColor) && 'ring-2 ring-[#0071e3]'
                )}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-[conic-gradient(#ff3b30,#ff9500,#ffcc00,#34c759,#0071e3,#af52de,#ff3b30)]"
                  style={customColor && !SWATCHES.includes(customColor) ? { background: customColor } : undefined}
                >
                  <Palette className="h-3.5 w-3.5 text-white" />
                </span>
                {customColor && !SWATCHES.includes(customColor) ? customColor.toUpperCase() : t('onboarding.brand.customColor')}
                <input
                  ref={colorInputRef}
                  type="color"
                  value={customColor || brandColorOf(data)}
                  onChange={(event) => pickColor(event.target.value)}
                  className="pointer-events-none absolute bottom-0 left-4 h-0 w-0 opacity-0"
                  tabIndex={-1}
                  aria-hidden
                />
              </button>
            </div>
          </Panel>
        </div>

        <div className="xl:sticky xl:top-[100px]">
          <StorePreview data={data} />
        </div>
      </div>
    </section>
  );
};

export default BrandStep;
