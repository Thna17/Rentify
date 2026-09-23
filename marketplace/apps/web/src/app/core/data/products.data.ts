import { Product, StockStatus } from '../catalog/catalog.models';
import { CATEGORIES, classifyCategory } from './categories.data';

const stockStatus = (stock: number): StockStatus =>
  stock === 0 ? 'out-of-stock' : stock <= 5 ? 'low-stock' : 'in-stock';

interface Seed {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  categorySlug: string;
  categoryName: string;
  storeId: string;
  sellerName: string;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  createdAt: string;
  collections: string[];
  description: string;
  image?: string;
}

/**
 * Mock catalog. Replace with `GET /api/products` when the endpoint exists —
 * every consumer goes through CatalogService, so no component needs changing.
 *
 * Deliberately includes one out-of-stock and two low-stock items so the stock
 * badges and the disabled Add-to-Cart path are exercised in the UI.
 */
const SEED: Seed[] = [
  {
    id: 'p101', name: 'Indigo Krama Panel Shirt', price: 34, compareAtPrice: 42,
    categorySlug: 'fashion-shirts', categoryName: 'Shirts', storeId: 's006', sellerName: 'Sovann Style Studio',
    rating: 4.9, reviewCount: 48, stock: 18, soldCount: 122, createdAt: '2026-08-01', collections: ['new-arrivals', 'best-sellers'],
    description: 'A relaxed navy shirt finished with handwoven krama panels and natural shell buttons.', image: '/assets/stores/khmer-style-hero.png',
  },
  {
    id: 'p102', name: 'Rose Silk Wrap Skirt', price: 48, categorySlug: 'fashion-women', categoryName: 'Women', storeId: 's006', sellerName: 'Sovann Style Studio',
    rating: 4.8, reviewCount: 37, stock: 12, soldCount: 94, createdAt: '2026-07-28', collections: ['new-arrivals'],
    description: 'A contemporary wrap skirt in luminous rose Khmer silk with a comfortable adjustable waist.', image: '/assets/stores/khmer-style-hero.png',
  },
  {
    id: 'p103', name: 'Natural Silk Day Blouse', price: 29, categorySlug: 'fashion-women', categoryName: 'Women', storeId: 's006', sellerName: 'Sovann Style Studio',
    rating: 4.7, reviewCount: 29, stock: 21, soldCount: 76, createdAt: '2026-07-21', collections: ['new-arrivals'],
    description: 'A soft natural-silk blouse cut for warm days, with a clean neckline and easy drape.', image: '/assets/stores/khmer-style-hero.png',
  },
  {
    id: 'p104', name: 'Midnight Tailored Trousers', price: 38, categorySlug: 'fashion-men', categoryName: 'Men', storeId: 's006', sellerName: 'Sovann Style Studio',
    rating: 4.8, reviewCount: 33, stock: 16, soldCount: 81, createdAt: '2026-07-16', collections: ['best-sellers'],
    description: 'Lightweight tailored trousers designed to pair with the studio’s krama-panel shirts.', image: '/assets/stores/khmer-style-hero.png',
  },
  {
    id: 'p105', name: 'Everyday Woven Overshirt', price: 41, categorySlug: 'fashion-shirts', categoryName: 'Shirts', storeId: 's006', sellerName: 'Sovann Style Studio',
    rating: 4.9, reviewCount: 51, stock: 9, soldCount: 140, createdAt: '2026-06-30', collections: ['best-sellers'],
    description: 'A breathable indigo overshirt combining modern proportion with traditional woven detailing.', image: '/assets/stores/khmer-style-hero.png',
  },
  {
    id: 'p106', name: 'Keo Romeat Mango Box', price: 12, categorySlug: 'fresh-fruit', categoryName: 'Mangoes', storeId: 's007', sellerName: 'Mekong Fresh Market',
    rating: 4.9, reviewCount: 86, stock: 30, soldCount: 260, createdAt: '2026-08-05', collections: ['new-arrivals', 'best-sellers', 'agro-products'],
    description: 'Fragrant Cambodian Keo Romeat mangoes selected ripe-firm and packed in a reusable box.', image: '/assets/stores/cambodia-fruits-hero.png',
  },
  {
    id: 'p107', name: 'Sweet Pineapple Pair', price: 7.5, categorySlug: 'fresh-fruit', categoryName: 'Pineapple', storeId: 's007', sellerName: 'Mekong Fresh Market',
    rating: 4.8, reviewCount: 61, stock: 42, soldCount: 188, createdAt: '2026-08-02', collections: ['new-arrivals', 'agro-products'],
    description: 'Two farm-ripe pineapples with golden flesh, selected for sweetness and delivered with crown intact.', image: '/assets/stores/cambodia-fruits-hero.png',
  },
  {
    id: 'p108', name: 'Dragon Fruit Basket', price: 9.25, categorySlug: 'fresh-fruit', categoryName: 'Dragon Fruit', storeId: 's007', sellerName: 'Mekong Fresh Market',
    rating: 4.7, reviewCount: 44, stock: 28, soldCount: 151, createdAt: '2026-07-29', collections: ['agro-products'],
    description: 'A basket of bright red dragon fruit with crisp white flesh from farms near the Mekong.', image: '/assets/stores/cambodia-fruits-hero.png',
  },
  {
    id: 'p109', name: 'Rambutan Family Pack', price: 6.75, categorySlug: 'fresh-fruit', categoryName: 'Rambutan', storeId: 's007', sellerName: 'Mekong Fresh Market',
    rating: 4.8, reviewCount: 73, stock: 35, soldCount: 224, createdAt: '2026-07-25', collections: ['best-sellers', 'agro-products'],
    description: 'Juicy red rambutan harvested in the morning and packed as a generous family-size bundle.', image: '/assets/stores/cambodia-fruits-hero.png',
  },
  {
    id: 'p110', name: 'Tropical Discovery Box', price: 18.5, categorySlug: 'fresh-fruit', categoryName: 'Fruit Boxes', storeId: 's007', sellerName: 'Mekong Fresh Market',
    rating: 4.9, reviewCount: 102, stock: 20, soldCount: 318, createdAt: '2026-07-20', collections: ['best-sellers', 'agro-products'],
    description: 'A changing seasonal selection of mango, mangosteen, rambutan, dragon fruit and citrus.', image: '/assets/stores/cambodia-fruits-hero.png',
  },
  {
    id: 'p001', name: 'Handmade Khmer Silk Scarf', price: 12.5, compareAtPrice: 16,
    categorySlug: 'weaving', categoryName: 'Weaving',
    storeId: 's001', sellerName: 'Srey Khmer Handmade Store',
    rating: 4.8, reviewCount: 124, stock: 20, soldCount: 480,
    createdAt: '2026-05-02', collections: ['top-picks', 'best-sellers', 'handmade-crafts'],
    description:
      'A hand-woven silk krama from Takeo province, dyed with natural indigo. Light enough for the dry season and soft enough to wear every day.',
  },
  {
    id: 'p002', name: 'Kampong Speu Palm Sugar 500g', price: 3.5,
    categorySlug: 'palm-sugar', categoryName: 'Palm Sugar',
    storeId: 's002', sellerName: 'Kampong Speu Palm Sugar',
    rating: 4.9, reviewCount: 208, stock: 60, soldCount: 940,
    createdAt: '2026-04-18', collections: ['top-picks', 'best-sellers', 'agro-products'],
    description:
      'GI-certified palm sugar with a caramel, slightly smoky finish. Harvested at dawn and boiled the same morning in open pans.',
  },
  {
    id: 'p003', name: 'Organic Jasmine Rice 5kg', price: 14,
    categorySlug: 'rice-products', categoryName: 'Rice Products',
    storeId: 's003', sellerName: 'Battambang Rice Farm',
    rating: 4.7, reviewCount: 176, stock: 35, soldCount: 620,
    createdAt: '2026-03-27', collections: ['top-picks', 'best-sellers', 'agro-products'],
    description:
      'Long-grain jasmine rice grown on the Sangke river plain without synthetic fertiliser. Milled to order and packed in breathable cotton.',
  },
  {
    id: 'p004', name: 'Woven Bamboo Basket', price: 9.75,
    categorySlug: 'bamboo-products', categoryName: 'Bamboo Products',
    storeId: 's005', sellerName: 'Takeo Bamboo Craft',
    rating: 4.6, reviewCount: 87, stock: 4, soldCount: 210,
    createdAt: '2026-06-11', collections: ['top-picks', 'new-arrivals', 'handmade-crafts'],
    description:
      'A round market basket woven from locally cut bamboo, tight enough to hold rice and light enough to carry all morning.',
  },
  {
    id: 'p005', name: 'Clay Pottery Cup Set of 4', price: 18,
    categorySlug: 'pottery', categoryName: 'Pottery',
    storeId: 's004', sellerName: 'Phnom Penh Pottery House',
    rating: 4.5, reviewCount: 64, stock: 12, soldCount: 150,
    createdAt: '2026-06-02', collections: ['top-picks', 'handmade-crafts'],
    description:
      'Four wheel-thrown cups in a matte celadon glaze drawn from Angkorian ceramics. Each one varies slightly — they are thrown by hand.',
  },
  {
    id: 'p006', name: 'Dried Mango Slices 250g', price: 4.25,
    categorySlug: 'dried-fruits', categoryName: 'Dried Fruits',
    storeId: 's002', sellerName: 'Kampong Speu Palm Sugar',
    rating: 4.7, reviewCount: 132, stock: 48, soldCount: 510,
    createdAt: '2026-05-20', collections: ['top-picks', 'agro-products'],
    description:
      'Keo Romeat mango dried slowly in the sun with no added sugar or sulphites. Chewy, tart and intensely fragrant.',
  },
  {
    id: 'p007', name: 'Khmer Ceramic Serving Bowl', price: 22,
    categorySlug: 'pottery', categoryName: 'Pottery',
    storeId: 's004', sellerName: 'Phnom Penh Pottery House',
    rating: 4.8, reviewCount: 41, stock: 9, soldCount: 96,
    createdAt: '2026-06-24', collections: ['new-arrivals', 'handmade-crafts', 'recommended'],
    description:
      'A wide stoneware bowl for samlor or salad, glazed in ash green with an unglazed foot that shows the raw clay.',
  },
  {
    id: 'p008', name: 'Handmade Wooden Spoon Pair', price: 6.5,
    categorySlug: 'handmade-crafts', categoryName: 'Handmade Crafts',
    storeId: 's001', sellerName: 'Srey Khmer Handmade Store',
    rating: 4.4, reviewCount: 58, stock: 26, soldCount: 187,
    createdAt: '2026-04-05', collections: ['handmade-crafts', 'recommended'],
    description:
      'Two cooking spoons carved from offcut jackfruit wood and finished with food-safe oil. Light, warm and kind to a clay pot.',
  },
  {
    id: 'p009', name: 'Cotton Krama Scarf — Classic Check', price: 8.9,
    categorySlug: 'weaving', categoryName: 'Weaving',
    storeId: 's001', sellerName: 'Srey Khmer Handmade Store',
    rating: 4.6, reviewCount: 149, stock: 40, soldCount: 733,
    createdAt: '2026-02-14', collections: ['best-sellers', 'handmade-crafts'],
    description:
      'The everyday Cambodian krama in red and white cotton — a scarf, a towel, a sunshade and a shopping bag, depending on the hour.',
  },
  {
    id: 'p010', name: 'Organic Red Rice 2kg', price: 7.4,
    categorySlug: 'rice-products', categoryName: 'Rice Products',
    storeId: 's003', sellerName: 'Battambang Rice Farm',
    rating: 4.5, reviewCount: 71, stock: 30, soldCount: 264,
    createdAt: '2026-05-09', collections: ['agro-products', 'recommended'],
    description:
      'Unpolished red rice with a nutty bite and a long chew. Needs a little more water and about ten more minutes than white rice.',
  },
  {
    id: 'p011', name: 'Palm Sugar Candy Box', price: 5.2,
    categorySlug: 'local-food', categoryName: 'Local Food',
    storeId: 's002', sellerName: 'Kampong Speu Palm Sugar',
    rating: 4.8, reviewCount: 95, stock: 0, soldCount: 402,
    createdAt: '2026-03-30', collections: ['agro-products', 'best-sellers'],
    description:
      'Soft palm sugar discs pressed into a gift box. Traditionally eaten with green tea — currently between harvests.',
  },
  {
    id: 'p012', name: 'Bamboo Steamer Tray', price: 11.25,
    categorySlug: 'bamboo-products', categoryName: 'Bamboo Products',
    storeId: 's005', sellerName: 'Takeo Bamboo Craft',
    rating: 4.5, reviewCount: 46, stock: 15, soldCount: 128,
    createdAt: '2026-06-30', collections: ['new-arrivals', 'handmade-crafts'],
    description:
      'A two-tier steamer woven and pinned without glue, sized for a standard wok. Season it once and it will outlast the wok.',
  },
  {
    id: 'p013', name: 'Dried Banana Chips 200g', price: 3.1,
    categorySlug: 'dried-fruits', categoryName: 'Dried Fruits',
    storeId: 's002', sellerName: 'Kampong Speu Palm Sugar',
    rating: 4.3, reviewCount: 63, stock: 52, soldCount: 298,
    createdAt: '2026-05-28', collections: ['agro-products'],
    description:
      'Thin-sliced chek namvar banana, sun-dried until crisp. Nothing added but a little palm sugar at the end.',
  },
  {
    id: 'p014', name: 'Silk Table Runner', price: 26,
    categorySlug: 'weaving', categoryName: 'Weaving',
    storeId: 's001', sellerName: 'Srey Khmer Handmade Store',
    rating: 4.9, reviewCount: 32, stock: 5, soldCount: 61,
    createdAt: '2026-07-08', collections: ['new-arrivals', 'handmade-crafts', 'recommended'],
    description:
      'A hol-technique silk runner in gold and deep plum. Roughly forty hours on the loom, and it shows in the weight of the cloth.',
  },
  {
    id: 'p015', name: 'Prahok Ceramic Storage Jar', price: 16.5,
    categorySlug: 'pottery', categoryName: 'Pottery',
    storeId: 's004', sellerName: 'Phnom Penh Pottery House',
    rating: 4.4, reviewCount: 28, stock: 11, soldCount: 74,
    createdAt: '2026-04-22', collections: ['handmade-crafts'],
    description:
      'A lidded stoneware jar in the old kitchen shape, glazed inside and left raw outside so it stays cool on a shelf.',
  },
  {
    id: 'p016', name: 'Kampot Pepper 100g', price: 8.75,
    categorySlug: 'local-food', categoryName: 'Local Food',
    storeId: 's002', sellerName: 'Kampong Speu Palm Sugar',
    rating: 4.9, reviewCount: 241, stock: 44, soldCount: 856,
    createdAt: '2026-03-12', collections: ['best-sellers', 'agro-products', 'recommended'],
    description:
      'Whole black Kampot peppercorns, sun-dried and hand-sorted. Floral and hot at once — the reason the region has a GI mark.',
  },
  {
    id: 'p017', name: 'Rattan Fruit Bowl', price: 13.9,
    categorySlug: 'bamboo-products', categoryName: 'Bamboo Products',
    storeId: 's005', sellerName: 'Takeo Bamboo Craft',
    rating: 4.6, reviewCount: 39, stock: 18, soldCount: 112,
    createdAt: '2026-06-17', collections: ['new-arrivals', 'handmade-crafts'],
    description:
      'An open rattan bowl with a rolled rim, wide enough for a hand of bananas and light enough to hang on a hook.',
  },
  {
    id: 'p018', name: 'Coconut Shell Candle', price: 7.8,
    categorySlug: 'handmade-crafts', categoryName: 'Handmade Crafts',
    storeId: 's001', sellerName: 'Srey Khmer Handmade Store',
    rating: 4.5, reviewCount: 54, stock: 22, soldCount: 203,
    createdAt: '2026-05-15', collections: ['handmade-crafts', 'recommended'],
    description:
      'Soy wax poured into a polished half coconut shell, scented lightly with lemongrass. The shell makes a good tealight holder after.',
  },
];

const CORE_PRODUCTS: Product[] = SEED.map((seed) => {
  const classification = classifyCategory(seed.categorySlug);
  return {
    ...seed,
    ...classification,
    slug: seed.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    image: seed.image ?? null,
    status: stockStatus(seed.stock),
  };
});

/**
 * Visual catalogue coverage for departments that do not have seller inventory
 * yet. Every prepared subcategory gets one orderable-looking showcase card so
 * navigation, counts and filters can be evaluated before the real catalogue is
 * complete. API products replace these cards subcategory-by-subcategory in
 * CatalogService, so this layer does not duplicate real stock.
 */
const SHOWCASE_PROFILE: Record<
  string,
  { storeId: string; sellerName: string; basePrice: number; image: string }
> = {
  fashion: {
    storeId: 's006', sellerName: 'Sovann Style Studio', basePrice: 24,
    image: '/assets/ads/multi-category-store-landscape.png',
  },
  'food-groceries': {
    storeId: 's007', sellerName: 'Mekong Fresh Market', basePrice: 4.5,
    image: '/assets/ads/premium-supermarket-landscape.png',
  },
  'home-living': {
    storeId: 's005', sellerName: 'Takeo Bamboo Craft', basePrice: 12,
    image: '/assets/ads/multi-category-store-landscape.png',
  },
  'beauty-wellness': {
    storeId: 's006', sellerName: 'Sovann Style Studio', basePrice: 8,
    image: '/assets/ads/multi-category-store-landscape.png',
  },
  electronics: {
    storeId: 's006', sellerName: 'Sovann Style Studio', basePrice: 18,
    image: '/assets/ads/electronics-campaign-landscape.png',
  },
  'kids-family': {
    storeId: 's006', sellerName: 'Sovann Style Studio', basePrice: 9,
    image: '/assets/ads/multi-category-store-landscape.png',
  },
  'arts-culture': {
    storeId: 's001', sellerName: 'Srey Khmer Handmade Store', basePrice: 10,
    image: '/assets/ads/multi-category-store-landscape.png',
  },
};

const showcaseProductName = (subcategory: string): string => {
  const exactNames: Record<string, string> = {
    'Fresh Produce': 'Seasonal Cambodian Produce Box',
    'Rice & Grains': 'Premium Jasmine Rice Selection',
    'Meat & Seafood': 'Fresh Family Protein Pack',
    'Eggs & Dairy': 'Farm Fresh Breakfast Bundle',
    'Bakery & Bread': 'Morning Bakery Basket',
    'Pantry & Spices': 'Cambodian Pantry Starter Set',
    'Phones & Tablets': 'Everyday 5G Smartphone',
    Computers: 'Slim Everyday Laptop',
    'TV & Audio': 'Wireless Home Speaker',
    Gaming: 'Wireless Game Controller',
    'Home Appliances': 'Compact Home Air Purifier',
    'Kitchen Appliances': 'Compact Digital Rice Cooker',
    Skincare: 'Hydrating Botanical Face Serum',
    'Makeup & Cosmetics': 'Everyday Beauty Colour Set',
    Haircare: 'Nourishing Haircare Duo',
    'Bath & Body': 'Lemongrass Bath Collection',
    Furniture: 'Compact Teak Side Table',
    'Kitchen & Dining': 'Everyday Dining Collection',
    'Pottery & Ceramics': 'Handmade Ceramic Table Set',
    'Bamboo & Rattan': 'Woven Rattan Home Basket',
    'Home Décor': 'Cambodian Home Accent Set',
    'Toys & Games': 'Wooden Creative Play Set',
    'Learning & Educational': 'Early Learning Activity Kit',
    'Handmade Crafts': 'Cambodian Artisan Gift Box',
    'Textiles & Weaving': 'Handwoven Textile Collection',
    'Art & Collectibles': 'Cambodian Art Print Set',
    'Souvenirs & Gifts': 'Cambodian Keepsake Gift Set',
  };
  return exactNames[subcategory] ?? `${subcategory} Everyday Essential`;
};

export const SUBCATEGORY_SHOWCASE_PRODUCTS: Product[] = CATEGORIES.flatMap(
  (category, categoryIndex) => {
    const profile = SHOWCASE_PROFILE[category.slug];
    return category.subcategories.map((subcategory, subcategoryIndex) => {
      const price = Number(
        (profile.basePrice + (subcategoryIndex % 6) * (profile.basePrice * 0.22)).toFixed(2),
      );
      return {
        id: `showcase-${category.slug}-${subcategory.slug}`,
        name: showcaseProductName(subcategory.name),
        slug: `showcase-${category.slug}-${subcategory.slug}`,
        image: profile.image,
        price,
        compareAtPrice: subcategoryIndex % 5 === 0 ? Number((price * 1.18).toFixed(2)) : undefined,
        categorySlug: category.slug,
        categoryName: category.name,
        subcategory: subcategory.name,
        subcategorySlug: subcategory.slug,
        sellerName: profile.sellerName,
        storeId: profile.storeId,
        rating: Number((4.5 + (subcategoryIndex % 5) * 0.1).toFixed(1)),
        reviewCount: 12 + categoryIndex * 9 + subcategoryIndex * 3,
        stock: 8 + (subcategoryIndex % 8) * 3,
        status: 'in-stock' as const,
        description: `A curated ${subcategory.name.toLowerCase()} product selected for the KhmerCraft marketplace showcase.`,
        soldCount: 24 + categoryIndex * 15 + subcategoryIndex * 7,
        createdAt: `2026-08-${String(24 - (subcategoryIndex % 18)).padStart(2, '0')}`,
        collections: subcategoryIndex % 3 === 0 ? ['recommended', 'new-arrivals'] : ['recommended'],
      };
    });
  },
);

export const PRODUCTS: Product[] = [...CORE_PRODUCTS, ...SUBCATEGORY_SHOWCASE_PRODUCTS];
