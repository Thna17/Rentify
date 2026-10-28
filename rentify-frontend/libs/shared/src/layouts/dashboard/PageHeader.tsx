import { ChevronRight, type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  breadcrumbAriaLabel?: string;
}

/** Merchant page heading shared by operational screens. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title, description, icon: Icon, actions, breadcrumb, breadcrumbAriaLabel = 'Breadcrumb',
}) => (
  <header className="w-full border-b border-border/70 bg-background px-4 py-5 sm:px-6 md:px-8 md:py-7">
    <div className="mx-auto max-w-[1400px]">
      {breadcrumb?.length ? (
        <nav aria-label={breadcrumbAriaLabel} className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {breadcrumb.map((item, index) => {
              const current = index === breadcrumb.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {item.href && !current ? (
                    <a href={item.href} className="rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {item.label}
                    </a>
                  ) : (
                    <span aria-current={current ? 'page' : undefined} className={current ? 'font-medium text-foreground' : undefined}>
                      {item.label}
                    </span>
                  )}
                  {!current && <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
            {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
      </div>
    </div>
  </header>
);
