import { HeaderProvider, TranslationProvider } from '@rentify/storefront';
import type { PropsWithChildren } from 'react';

/** Provider shell for Template 3 and all subsequent storefront templates. */
export function StorefrontApp({ children }: PropsWithChildren) {
  return (
    <TranslationProvider>
      <HeaderProvider>{children}</HeaderProvider>
    </TranslationProvider>
  );
}
