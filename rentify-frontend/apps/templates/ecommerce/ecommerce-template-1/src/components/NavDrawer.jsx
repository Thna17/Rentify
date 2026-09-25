import * as Dialog from '@radix-ui/react-dialog';
import { Link, NavLink } from 'react-router-dom';
import { ChevronRight, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { LanguageSwitcher } from './LanguageSwitcher';

/**
 * Mobile navigation drawer. Radix Dialog provides the focus trap, Escape to
 * close, focus return to the trigger and inert background content.
 */
export function NavDrawer({ open, onOpenChange, storeName, categories, returnFocusRef }) {
  const { t } = useI18n();
  const close = () => onOpenChange(false);
  const linkClass = ({ isActive }) =>
    `flex min-h-12 items-center justify-between rounded-lg px-3 text-base font-medium ${
      isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
    }`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            // The menu button lives in the header, outside Dialog.Root, so return focus explicitly.
            if (returnFocusRef?.current) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col bg-card shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <Dialog.Title className="truncate text-base font-semibold">{storeName || t('nav.menu')}</Dialog.Title>
            <Dialog.Close className="-mr-2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t('nav.closeMenu')}>
              <X className="h-5 w-5" aria-hidden="true" />
            </Dialog.Close>
          </div>

          <nav aria-label={t('nav.menu')} className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              <li>
                <NavLink to={PATHS.HOME} end className={linkClass} onClick={close}>
                  {t('nav.home')}
                </NavLink>
              </li>
              <li>
                <NavLink to={PATHS.PRODUCTS} end className={linkClass} onClick={close}>
                  {t('nav.shopAll')}
                </NavLink>
              </li>
              <li>
                <NavLink to={PATHS.CART} className={linkClass} onClick={close}>
                  {t('nav.cart')}
                </NavLink>
              </li>
              <li>
                <NavLink to={PATHS.ACCOUNT} className={linkClass} onClick={close}>
                  {t('nav.account')}
                </NavLink>
              </li>
            </ul>

            {categories?.length > 0 && (
              <>
                <h2 className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('nav.categories')}
                </h2>
                <ul className="space-y-1">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link to={catalogPath({ category: category.id })} className={linkClass({ isActive: false })} onClick={close}>
                        <span className="truncate">{category.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 pb-safe">
            <span className="text-sm text-muted-foreground">{t('language.label')}</span>
            <LanguageSwitcher />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
