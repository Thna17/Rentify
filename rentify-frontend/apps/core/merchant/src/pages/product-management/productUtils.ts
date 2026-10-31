export type ProductFilterChip = 'all' | 'on_sale' | 'out_of_stock' | 'hidden' | 'drafts';

export interface ProductItem {
  id: string;
  name: string;
  price: number;
  salePrice?: number;
  stockQuantity: number;
  status: string;
  marketplaceVisibility?: boolean;
}

export function filterProductsByChip(products: ProductItem[], chip: ProductFilterChip): ProductItem[] {
  switch (chip) {
    case 'on_sale':
      return products.filter((p) => typeof p.salePrice === 'number' && p.salePrice < p.price);
    case 'out_of_stock':
      return products.filter((p) => p.stockQuantity <= 0);
    case 'hidden':
      return products.filter((p) => p.marketplaceVisibility === false);
    case 'drafts':
      return products.filter((p) => p.status === 'draft' || p.status === 'inactive');
    case 'all':
    default:
      return products;
  }
}

export function computeChannelBadges(product: ProductItem, hasWebsite: boolean): {
  onMarketplace: boolean;
  onStorefront: boolean;
  isOutOfStock: boolean;
  isHidden: boolean;
} {
  const isOutOfStock = product.stockQuantity <= 0;
  const onMarketplace = product.marketplaceVisibility !== false && product.status === 'active';
  const onStorefront = hasWebsite && product.status === 'active';
  const isHidden = product.marketplaceVisibility === false;

  return {
    onMarketplace,
    onStorefront,
    isOutOfStock,
    isHidden,
  };
}
