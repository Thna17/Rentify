import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTemplateMedia } from '../../data/templateMedia';
import { BrowserFrame, PhoneFrame, Screen } from './DeviceFrames';
import { ChevronLink } from './ui';

export const categoryLabel = (category, t) => {
  const key = `site.templates.categories.${category}`;
  const label = t(key);
  if (label !== key) return label;
  return String(category || '').replace(/^\w/, (char) => char.toUpperCase());
};

// Unique, customer-facing pages of a template ("global setting" is internal)
export const templatePages = (template) => {
  const seen = new Set();
  return (template?.pages || []).filter((page) => {
    const name = String(page.page || '').toLowerCase();
    if (name === 'global setting' || seen.has(name) || seen.has(page.route)) return false;
    seen.add(name);
    seen.add(page.route);
    return true;
  });
};

export const PaletteDots = ({ palette, className }) => {
  const colors = ['primary', 'secondary', 'accent']
    .map((key) => palette?.[key])
    .filter(Boolean);
  if (!colors.length) return null;

  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {colors.map((color) => (
        <span
          key={color}
          className="h-5 w-5 rounded-full ring-2 ring-white"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
};

// Scaled-down live preview for templates that have no screenshots yet
const LivePreview = ({ template }) => (
  <div className="relative aspect-[16/10] overflow-hidden bg-[#f5f5f7]">
    <iframe
      src={template.baseUrl}
      title={`Preview of ${template.name}`}
      tabIndex={-1}
      loading="lazy"
      sandbox="allow-same-origin allow-scripts"
      className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
    />
  </div>
);

// Browser and phone shots of a template on a softly tinted stage
export const TemplateStage = ({ template, eager = false, className }) => {
  const media = getTemplateMedia(template);
  const tint = template?.colorPalette?.accent || '#e8e8ed';

  return (
    <div
      className={cn('relative overflow-hidden rounded-[28px]', className)}
      style={{ background: `linear-gradient(160deg, ${tint} 0%, #f5f5f7 75%)` }}
    >
      <div className="relative px-[7%] pt-[9%]">
        <div className="translate-y-[6%] transition-transform duration-700 ease-out group-hover:translate-y-[3%]">
          <BrowserFrame url={media?.domain}>
            {media ? (
              <Screen
                src={media.desktop}
                alt={`${template.name} on desktop`}
                eager={eager}
                className="h-auto"
              />
            ) : (
              <LivePreview template={template} />
            )}
          </BrowserFrame>
        </div>
        {media?.mobile && (
          <div className="absolute bottom-[-10%] right-[5%] w-[22%] transition-transform duration-700 ease-out group-hover:-translate-y-[4%]">
            <PhoneFrame>
              <Screen src={media.mobile} alt={`${template.name} on a phone`} eager={eager} />
            </PhoneFrame>
          </div>
        )}
      </div>
    </div>
  );
};

const TemplateTile = ({ template }) => {
  const { t } = useLanguage();
  const pages = templatePages(template);

  return (
    <article className="group">
      <Link to={`/templates/${template.id}`} aria-label={template.name} className="block">
        <TemplateStage template={template} />
      </Link>
      <div className="mt-6 flex items-start justify-between gap-4 px-1">
        <div className="min-w-0">
          <h3 className="text-[21px] font-semibold tracking-[-0.015em] text-[#1d1d1f] md:text-[24px]">
            {template.name}
          </h3>
          <p className="mt-1 text-[15px] text-[#6e6e73]">
            {categoryLabel(template.category, t)}
            {pages.length > 0 && ` · ${pages.length} ${t('site.templates.detail.pages').toLowerCase()}`}
          </p>
        </div>
        <PaletteDots palette={template.colorPalette} className="mt-2" />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 px-1">
        <ChevronLink to={`/templates/${template.id}`} className="text-[17px] md:text-[17px]">
          {t('site.templates.gallery.preview')}
        </ChevronLink>
        {template.baseUrl && (
          <ChevronLink to={template.baseUrl} className="text-[17px] md:text-[17px]">
            {t('site.templates.gallery.liveDemo')}
          </ChevronLink>
        )}
      </div>
    </article>
  );
};

export default TemplateTile;
