import React from 'react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';

const StepHeader = ({ icon: Icon, title, description, className }) => {
  const { language } = useLanguage();
  const isKhmer = language === 'KH';

  return (
    <div className={cn('flex items-start gap-4', className)}>
      {Icon && (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-lg shadow-blue-600/20">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <div className="space-y-1">
        <h1
          className={cn(
            'text-2xl font-bold tracking-tight text-foreground md:text-3xl',
            isKhmer && 'font-khmer'
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              'text-sm text-muted-foreground md:text-base',
              isKhmer && 'font-khmer'
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default StepHeader;
