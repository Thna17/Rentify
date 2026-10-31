import { Fragment } from 'react';
import { type LucideIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@rentify/shared/ui/breadcrumb';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  breadcrumbAriaLabel?: string;
}

/** Merchant page heading shared by operational screens. Phones show the title and actions only. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title, description, icon: Icon, actions, breadcrumb, breadcrumbAriaLabel = 'Breadcrumb',
}) => (
  <header className="w-full bg-transparent px-4 py-5 sm:px-6 md:px-8 md:py-7">
    <div className="mx-auto max-w-[1400px]">
      {breadcrumb?.length ? (
        <Breadcrumb aria-label={breadcrumbAriaLabel} className="mb-3 hidden md:block">
          <BreadcrumbList>
            {breadcrumb.map((item, index) => {
              const current = index === breadcrumb.length - 1;
              return (
                <Fragment key={`${item.label}-${index}`}>
                  <BreadcrumbItem>
                    {item.href && !current ? (
                      <BreadcrumbLink href={item.href}>
                        {item.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{item.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {!current && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div className="mt-0.5 hidden h-10 w-10 shrink-0 items-center justify-center sm:flex rounded-lg border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
            {description && <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-muted-foreground sm:block md:text-base">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">{actions}</div>}
      </div>
    </div>
  </header>
);
