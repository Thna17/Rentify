import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { ClassicHeader } from './ClassicHeader';
import { SceneHeader } from './SceneHeader';

/**
 * Picks the header the merchant chose with the `Header Style` content entry:
 * `heritage` (default, temple skyline), `riverside`, or `classic`.
 */
export function Header() {
  const { identity } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const { totals } = useStorefrontCart();

  if (identity.headerStyle === 'classic') return <ClassicHeader />;
  return <SceneHeader identity={identity} categories={categories} cartCount={totals.itemCount} scene={identity.headerStyle} />;
}
