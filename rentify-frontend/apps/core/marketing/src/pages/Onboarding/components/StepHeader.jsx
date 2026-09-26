import React from 'react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';

// Steps share one heading style; the icon prop is accepted but not shown
const StepHeader = ({ title, description, className }) => {
  const { language } = useLanguage();
  const isKhmer = language === 'KH';

  return (
    <div className={cn('mb-8 max-w-2xl', className)}>
      <h1
        className={cn(
          'text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-[#1d1d1f] md:text-[40px]',
          isKhmer && 'font-khmer leading-[1.35]'
        )}
      >
        {title}
      </h1>
      {description && (
        <p className={cn('mt-3 text-[16px] leading-relaxed text-[#6e6e73] md:text-[17px]', isKhmer && 'font-khmer')}>
          {description}
        </p>
      )}
    </div>
  );
};

export default StepHeader;
