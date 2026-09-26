import React from 'react';
import { motion } from 'framer-motion';
import { LayoutTemplate, Mail, MapPin, Phone } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';

const initialsOf = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'R';

// The merchant's own colour wins, then the template's, then Rentify blue
export const brandColorOf = (data) =>
  data.businessDetails?.colorPalette?.primary || data.template?.colorPalette?.primary || '#0071e3';

const Row = ({ icon: Icon, value, fallback }) => (
  <p className={cn('flex items-center gap-2 truncate text-[12px]', value ? 'text-[#6e6e73]' : 'text-[#c7c7cc]')}>
    <Icon className="h-3.5 w-3.5 shrink-0" />
    <span className="truncate">{value || fallback}</span>
  </p>
);

// How customers will meet the store, drawn only from what the merchant entered
const StorePreview = ({ data, className }) => {
  const { t } = useLanguage();
  const details = data.businessDetails || {};
  const name = details.name?.trim();
  const color = brandColorOf(data);

  return (
    <aside
      aria-label={t('onboarding.ui.previewLabel')}
      className={cn(
        'overflow-hidden rounded-[22px] bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.3)] ring-1 ring-black/[0.06]',
        className
      )}
    >
      <div
        className="relative h-[120px] overflow-hidden transition-[background] duration-500"
        style={{ background: `linear-gradient(135deg, #0b0f17 0%, ${color} 72%, ${color}99 100%)` }}
      >
        {details.cover ? (
          <img src={details.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : details.logo && (
          <img
            src={details.logo}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl"
          />
        )}
        <span className="absolute bottom-3 right-3 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/80 backdrop-blur">
          {t('onboarding.ui.previewLabel')}
        </span>
      </div>

      <div className="relative px-5 pb-6 pt-11">
        <div className="absolute -top-8 left-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-[#f5f5f7] text-[20px] font-semibold shadow-md" style={{ color }}>
          {details.logo ? (
            <img src={details.logo} alt="" className="h-full w-full object-cover" />
          ) : (
            initialsOf(name)
          )}
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
          {details.primaryCategory || t('onboarding.ui.previewCategory')}
        </p>
        <motion.h3
          key={name || 'placeholder'}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className={cn(
            'mt-1.5 truncate text-[22px] font-semibold tracking-[-0.02em]',
            name ? 'text-[#1d1d1f]' : 'text-[#c7c7cc]'
          )}
        >
          {name || t('onboarding.ui.previewName')}
        </motion.h3>
        <div className="mt-4 space-y-2 border-t border-black/[0.06] pt-4">
          <Row
            icon={MapPin}
            value={details.location && t(`business.location.${details.location}`)}
            fallback={t('business.location.placeholder')}
          />
          <Row icon={Phone} value={details.contact} fallback={t('business.contact.placeholder')} />
          <Row icon={Mail} value={details.email} fallback={t('business.email.placeholder')} />
          <Row icon={LayoutTemplate} value={data.template?.name} fallback={t('onboarding.brand.noTemplate')} />
        </div>
        <span
          className="mt-5 flex h-10 items-center justify-center rounded-full text-[13px] font-medium text-white transition-colors duration-500"
          style={{ backgroundColor: color }}
        >
          {t('onboarding.brand.previewButton')}
        </span>
      </div>
    </aside>
  );
};

export default StorePreview;
