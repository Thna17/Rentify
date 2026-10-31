import React from 'react';
import { cn } from '@rentify/utils';
import { useAuthLanguage, type Language } from '../context/AuthLanguageContext';

// English / ភាសាខ្មែរ switch shared by every auth screen. Each option is named
// in its own language so it can be found whichever language is showing.
const OPTIONS: { code: Language; label: string; lang: 'en' | 'km' }[] = [
  { code: 'EN', label: 'English', lang: 'en' },
  { code: 'KH', label: 'ភាសាខ្មែរ', lang: 'km' },
];

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useAuthLanguage();
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={cn('flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm', className)}
    >
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.lang}
          onClick={() => setLanguage(option.code)}
          aria-pressed={language === option.code}
          className={cn(
            'flex min-h-11 items-center rounded-full px-3 text-xs font-semibold transition-all',
            option.code === 'KH' && 'font-khmer',
            language === option.code
              ? 'bg-blue-50 text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default LanguageToggle;
