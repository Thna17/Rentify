import { useEffect, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useI18n } from '../i18n';
import { catalogPath } from '../paths';

/** Store-wide product search. Submits to the catalog, keeping only the chosen sort order. */
export function SearchForm({ autoFocus = false, onSubmitted, className = '', size = 'md' }) {
  const { t } = useI18n();
  const id = useId();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const current = params.get('search') || '';
  const [query, setQuery] = useState(current);

  useEffect(() => setQuery(current), [current]);

  const submit = (event) => {
    event.preventDefault();
    const search = query.trim().slice(0, 100);
    navigate(catalogPath({ search, sort: params.get('sort') }));
    onSubmitted?.();
  };

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <label htmlFor={`${id}-search`} className="sr-only">
        {t('search.label')}
      </label>
      <Search className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${size === 'lg' ? 'h-5 w-5 sm:left-4' : 'h-4 w-4'}`} aria-hidden="true" />
      <input
        id={`${id}-search`}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        value={query}
        maxLength={100}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t('search.placeholder')}
        className={`w-full rounded-full border border-input bg-muted/50 pl-9 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/25 sm:text-sm ${size === 'lg' ? 'h-12 sm:h-14 sm:pl-11 sm:text-base' : 'h-10'}`}
      />
      <button type="submit" className="sr-only">
        {t('search.submit')}
      </button>
    </form>
  );
}
