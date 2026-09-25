import { Link } from 'react-router-dom';
import { catalogPath } from '../paths';
import { highlightIcon } from './Highlights';

/** The merchant's shopping needs as chips; each one searches the catalog. */
export function NeedChips({ items }) {
  return (
    <ul className="flex flex-wrap gap-2.5 sm:gap-3">
      {items.map((word) => {
        const Icon = highlightIcon(word);
        return (
          <li key={word}>
            <Link
              to={catalogPath({ search: word })}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} aria-hidden="true" />
              {word}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
