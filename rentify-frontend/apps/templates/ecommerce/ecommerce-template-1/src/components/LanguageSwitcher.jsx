import { LANGUAGES, useI18n } from '../i18n';

export function LanguageSwitcher({ className = '' }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div role="group" aria-label={t('language.label')} className={`inline-flex rounded-full border border-border bg-muted/60 p-0.5 ${className}`}>
      {LANGUAGES.map((option) => {
        const active = option.code === language;
        return (
          <button
            key={option.code}
            type="button"
            lang={option.htmlLang}
            aria-pressed={active}
            title={option.name}
            onClick={() => setLanguage(option.code)}
            className={`min-h-8 min-w-10 rounded-full px-2.5 text-xs font-semibold transition-colors ${
              active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
