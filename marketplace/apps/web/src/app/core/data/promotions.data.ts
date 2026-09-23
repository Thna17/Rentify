export interface Promotion {
  id: string;
  /** Small label above the headline, e.g. "LIMITED TIME". */
  eyebrow: string;
  headline: string;
  subtitle: string;
  /** Large discount flash shown on the visual, e.g. "50% OFF". Optional. */
  flash?: string;
  ctaLabel: string;
  ctaRoute: string;
  ctaParams?: Record<string, string>;
  secondaryLabel?: string;
  secondaryRoute?: string;
  secondaryParams?: Record<string, string>;
  /** Maps to a theme class in the slider's stylesheet. */
  theme: 'brand' | 'sale' | 'delivery' | 'seller';
  /** Placeholder caption for the slide visual. */
  visual: string;
  /** Optional muted campaign video shown in place of the decorative visual. */
  video?: string;
  videoWebm?: string;
  poster?: string;
  image?: string;
  /** Render the banner alone, with no badge, shade or offer overlay. */
  imageOnly?: boolean;
  sponsoredLabel?: string;
  offer?: string;
}

/**
 * Homepage promotion slides.
 *
 * MARKETING PLACEHOLDER COPY — the discounts and campaign names here are not
 * backed by any real pricing rule. When a promotions endpoint exists, replace
 * this array; nothing else needs to change.
 */
export const PROMOTIONS: Promotion[] = [
  {
    id: 'mekong-market',
    eyebrow: 'This week at Mekong Fresh Market',
    headline: 'Fill your basket with everyday essentials',
    subtitle:
      'Fresh groceries, pantry favourites and household essentials from a trusted Cambodian store—all in one order.',
    ctaLabel: 'Browse groceries',
    ctaRoute: '/categories/food-groceries',
    secondaryLabel: 'Explore stores',
    secondaryRoute: '/stores',
    theme: 'brand',
    visual: 'Everything your home needs',
    image: '/assets/ads/premium-supermarket-landscape.png',
    imageOnly: true,
    sponsoredLabel: 'Curated by KhmerCraft · Groceries',
    offer: 'Fresh picks for the whole home',
  },
  {
    id: 'marketplace-week',
    eyebrow: 'KhmerCraft marketplace week',
    headline: 'Selected offers from local stores',
    subtitle:
      'Discover featured products across fashion, beauty, homeware, children’s products and Cambodian-made gifts.',
    ctaLabel: 'Shop featured products',
    ctaRoute: '/products',
    ctaParams: { sort: 'featured' },
    secondaryLabel: 'Browse categories',
    secondaryRoute: '/categories',
    theme: 'sale',
    visual: 'Marketplace offers',
    image: '/assets/ads/multi-category-store-landscape.png',
    imageOnly: true,
    sponsoredLabel: 'Curated by KhmerCraft · Marketplace edit',
    offer: 'Special finds from trusted stores',
  },
  {
    id: 'promo-khmer-products',
    eyebrow: 'Sponsored',
    headline: 'Khmer Products',
    subtitle: 'Cambodian-made rice, water, dairy and household goods',
    ctaLabel: 'Shop now',
    ctaRoute: '/categories/food-groceries',
    theme: 'brand',
    visual: 'Khmer Products',
    image: '/assets/ads/promo-khmer-products.webp',
    imageOnly: true,
    sponsoredLabel: 'Sponsored',
  },
  {
    id: 'promo-organic-foods',
    eyebrow: 'Sponsored',
    headline: 'Organic Foods',
    subtitle: 'Organic rice, oils, juices and pantry staples',
    ctaLabel: 'Shop now',
    ctaRoute: '/categories/food-groceries',
    theme: 'brand',
    visual: 'Organic Foods',
    image: '/assets/ads/promo-organic-foods.webp',
    imageOnly: true,
    sponsoredLabel: 'Sponsored',
  },
  {
    id: 'promo-pre-pack-foods',
    eyebrow: 'Sponsored',
    headline: 'Pre-Pack Foods',
    subtitle: 'Ready-to-cook meal packs, prepared fresh',
    ctaLabel: 'Shop now',
    ctaRoute: '/categories/food-groceries',
    theme: 'brand',
    visual: 'Pre-Pack Foods',
    image: '/assets/ads/promo-pre-pack-foods.webp',
    imageOnly: true,
    sponsoredLabel: 'Sponsored',
  },
  {
    id: 'promo-carton-sale',
    eyebrow: 'Sponsored',
    headline: 'Carton Sale',
    subtitle: 'Drinks and household staples by the carton',
    ctaLabel: 'Shop now',
    ctaRoute: '/categories/food-groceries',
    theme: 'brand',
    visual: 'Carton Sale',
    image: '/assets/ads/promo-carton-sale.webp',
    imageOnly: true,
    sponsoredLabel: 'Sponsored',
  },
  {
    id: 'promo-mid-autumn',
    eyebrow: 'Sponsored',
    headline: 'Mid-Autumn Festival',
    subtitle: 'Mooncakes and festival gift sets',
    ctaLabel: 'Shop now',
    ctaRoute: '/categories/food-groceries',
    theme: 'brand',
    visual: 'Mid-Autumn Festival',
    image: '/assets/ads/promo-mid-autumn.webp',
    imageOnly: true,
    sponsoredLabel: 'Sponsored',
  },
];
