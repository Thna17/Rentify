import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { catalogPath } from '../paths';
import { highlightIcon } from './Highlights';

/** Merchant-defined needs link to real catalog search results. */
export function NeedChips({ items }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((word) => {
        const Icon = highlightIcon(word);
        return (
          <li key={word}>
            <Link to={catalogPath({ search: word })} className="group flex min-h-36 items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6 text-foreground transition-colors hover:border-primary">
              <span className="flex min-w-0 flex-col gap-5"><span className="break-words font-display text-lg font-bold">{word}</span><ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary"><Icon className="h-8 w-8" strokeWidth={1.5} aria-hidden="true" /></span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
