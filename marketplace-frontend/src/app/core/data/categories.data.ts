import { Category } from '../catalog/catalog.models';

/**
 * The category tree.
 *
 * Two levels: a main category people browse into, and sub-categories that
 * narrow it down. Sub-category names must match the `subcategory` values the
 * API stores on products — the slug is derived, so "Bowls & Plates" is
 * reachable as `bowls-plates`.
 *
 * Some sub-categories have no products yet. That is deliberate: the tree
 * describes where stock will live, and an empty one shows its empty state
 * rather than being hidden, so a seller can see the gap.
 *
 * TODO(api): there is no categories endpoint; this is the source of truth for
 * the tree while the API only stores category/subcategory as free text.
 */
export const CATEGORIES: Category[] = [
  {
    slug: 'fashion',
    name: 'Fashion & Accessories',
    shortName: 'Fashion',
    description: 'Clothing, footwear, bags, jewelry and traditional style',
    tagline: 'Everyday fashion and Cambodian design, from independent labels to heritage textiles.',
    icon: 'tag',
    banner: 'Cambodian fashion and textiles',
    subcategories: [
      { slug: 'womens-clothing', name: "Women's Clothing" },
      { slug: 'mens-clothing', name: "Men's Clothing" },
      { slug: 'unisex-clothing', name: 'Unisex Clothing' },
      { slug: 'traditional-wear', name: 'Traditional Wear' },
      { slug: 'modest-religious-wear', name: 'Modest & Religious Wear' },
      { slug: 'sportswear', name: 'Sportswear' },
      { slug: 'underwear-sleepwear', name: 'Underwear & Sleepwear' },
      { slug: 'shoes', name: 'Shoes' },
      { slug: 'bags-luggage', name: 'Bags & Luggage' },
      { slug: 'jewelry-watches', name: 'Jewelry & Watches' },
      { slug: 'eyewear', name: 'Eyewear' },
      { slug: 'hats-hair-accessories', name: 'Hats & Hair Accessories' },
      { slug: 'belts-wallets', name: 'Belts & Wallets' },
      { slug: 'scarves-shawls', name: 'Scarves & Shawls' },
      { slug: 'fabric-sewing', name: 'Fabric & Sewing Supplies' },
    ],
  },
  {
    slug: 'food-groceries',
    name: 'Food & Groceries',
    shortName: 'Food',
    description: 'Fresh food, pantry staples, drinks and Cambodian specialties',
    tagline: 'Farm-fresh produce and the ingredients that make Cambodian kitchens work.',
    icon: 'store',
    banner: 'Cambodian market produce',
    subcategories: [
      { slug: 'fresh-produce', name: 'Fresh Produce' },
      { slug: 'rice-grains', name: 'Rice & Grains' },
      { slug: 'meat-seafood', name: 'Meat & Seafood' },
      { slug: 'eggs-dairy', name: 'Eggs & Dairy' },
      { slug: 'bakery-bread', name: 'Bakery & Bread' },
      { slug: 'pantry-spices', name: 'Pantry & Spices' },
      { slug: 'cooking-oil-sauces', name: 'Cooking Oil & Sauces' },
      { slug: 'noodles-instant-food', name: 'Noodles & Instant Food' },
      { slug: 'canned-preserved-food', name: 'Canned & Preserved Food' },
      { slug: 'snacks-dried-fruit', name: 'Snacks & Dried Fruit' },
      { slug: 'palm-sugar-sweeteners', name: 'Palm Sugar & Sweeteners' },
      { slug: 'drinks-beverages', name: 'Drinks & Beverages' },
      { slug: 'coffee-tea', name: 'Coffee & Tea' },
      { slug: 'frozen-food', name: 'Frozen Food' },
      { slug: 'organic-local-specialties', name: 'Organic & Local Specialties' },
      { slug: 'household-groceries', name: 'Household Groceries' },
    ],
  },
  {
    slug: 'home-living',
    name: 'Home & Living',
    shortName: 'Home',
    description: 'Furniture, kitchenware, décor and household essentials',
    tagline: 'Useful and beautiful things for every Cambodian home.',
    icon: 'home',
    banner: 'Homeware and local design',
    subcategories: [
      { slug: 'furniture', name: 'Furniture' },
      { slug: 'kitchen-dining', name: 'Kitchen & Dining' },
      { slug: 'cookware', name: 'Cookware' },
      { slug: 'storage-organization', name: 'Storage & Organization' },
      { slug: 'pottery-ceramics', name: 'Pottery & Ceramics' },
      { slug: 'bamboo-rattan', name: 'Bamboo & Rattan' },
      { slug: 'home-decor', name: 'Home Décor' },
      { slug: 'lighting', name: 'Lighting' },
      { slug: 'bedding-bath', name: 'Bedding & Bath' },
      { slug: 'cleaning-supplies', name: 'Cleaning Supplies' },
      { slug: 'laundry-care', name: 'Laundry Care' },
      { slug: 'garden-outdoor', name: 'Garden & Outdoor' },
      { slug: 'tools-home-improvement', name: 'Tools & Home Improvement' },
      { slug: 'office-supplies', name: 'Office Supplies' },
      { slug: 'pet-supplies', name: 'Pet Supplies' },
      { slug: 'automotive-motorbike', name: 'Automotive & Motorbike' },
    ],
  },
  {
    slug: 'beauty-wellness',
    name: 'Beauty & Wellness',
    shortName: 'Beauty',
    description: 'Skincare, personal care, wellness and natural products',
    tagline: 'Daily care and wellbeing from trusted Cambodian sellers.',
    icon: 'heart',
    banner: 'Natural care and wellness',
    subcategories: [
      { slug: 'skincare', name: 'Skincare' },
      { slug: 'makeup-cosmetics', name: 'Makeup & Cosmetics' },
      { slug: 'haircare', name: 'Haircare' },
      { slug: 'bath-body', name: 'Bath & Body' },
      { slug: 'personal-care', name: 'Personal Care' },
      { slug: 'oral-care', name: 'Oral Care' },
      { slug: 'fragrance', name: 'Fragrance' },
      { slug: 'mens-grooming', name: "Men's Grooming" },
      { slug: 'feminine-care', name: 'Feminine Care' },
      { slug: 'natural-remedies', name: 'Natural Remedies' },
      { slug: 'vitamins-supplements', name: 'Vitamins & Supplements' },
      { slug: 'fitness-wellness', name: 'Fitness & Wellness' },
      { slug: 'medical-supplies', name: 'Medical Supplies' },
      { slug: 'massage-spa', name: 'Massage & Spa' },
    ],
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    description: 'Phones, computers, appliances and accessories',
    tagline: 'Technology and appliances for work, home and everyday life.',
    icon: 'smartphone',
    banner: 'Technology for everyday life',
    subcategories: [
      { slug: 'phones-tablets', name: 'Phones & Tablets' },
      { slug: 'computers', name: 'Computers' },
      { slug: 'computer-components', name: 'Computer Components' },
      { slug: 'printers-office-electronics', name: 'Printers & Office Electronics' },
      { slug: 'tv-audio', name: 'TV & Audio' },
      { slug: 'cameras-drones', name: 'Cameras & Drones' },
      { slug: 'gaming', name: 'Gaming' },
      { slug: 'wearable-technology', name: 'Wearable Technology' },
      { slug: 'home-appliances', name: 'Home Appliances' },
      { slug: 'kitchen-appliances', name: 'Kitchen Appliances' },
      { slug: 'air-conditioning-fans', name: 'Air Conditioning & Fans' },
      { slug: 'electronic-accessories', name: 'Electronic Accessories' },
      { slug: 'chargers-cables', name: 'Chargers & Cables' },
      { slug: 'networking-security', name: 'Networking & Security' },
      { slug: 'batteries-power', name: 'Batteries & Power' },
      { slug: 'smart-home', name: 'Smart Home' },
    ],
  },
  {
    slug: 'kids-family',
    name: 'Kids & Family',
    shortName: 'Kids',
    description: 'Baby essentials, children’s clothing, toys and school supplies',
    tagline: 'Practical, playful and family-ready products for every stage.',
    icon: 'users',
    banner: 'Products for Cambodian families',
    subcategories: [
      { slug: 'baby-care', name: 'Baby Care' },
      { slug: 'diapers-wipes', name: 'Diapers & Wipes' },
      { slug: 'feeding-nursing', name: 'Feeding & Nursing' },
      { slug: 'strollers-car-seats', name: 'Strollers & Car Seats' },
      { slug: 'nursery', name: 'Nursery' },
      { slug: 'kids-clothing', name: "Kids' Clothing" },
      { slug: 'kids-shoes', name: "Kids' Shoes" },
      { slug: 'toys-games', name: 'Toys & Games' },
      { slug: 'learning-educational', name: 'Learning & Educational' },
      { slug: 'sports-outdoor-play', name: 'Sports & Outdoor Play' },
      { slug: 'school-supplies', name: 'School Supplies' },
      { slug: 'maternity', name: 'Maternity' },
      { slug: 'child-safety', name: 'Child Safety' },
      { slug: 'party-supplies', name: 'Party Supplies' },
    ],
  },
  {
    slug: 'arts-culture',
    name: 'Arts & Culture',
    shortName: 'Arts',
    description: 'Crafts, art, books, music, textiles and Cambodian heritage',
    tagline: 'Creative work that carries Cambodian skill, identity and stories forward.',
    icon: 'sparkles',
    banner: 'Cambodian creativity and heritage',
    subcategories: [
      { slug: 'handmade-crafts', name: 'Handmade Crafts' },
      { slug: 'textiles-weaving', name: 'Textiles & Weaving' },
      { slug: 'art-collectibles', name: 'Art & Collectibles' },
      { slug: 'painting-drawing', name: 'Painting & Drawing' },
      { slug: 'sculpture-carving', name: 'Sculpture & Carving' },
      { slug: 'books-stationery', name: 'Books & Stationery' },
      { slug: 'khmer-books', name: 'Khmer Books' },
      { slug: 'music-instruments', name: 'Music & Instruments' },
      { slug: 'souvenirs-gifts', name: 'Souvenirs & Gifts' },
      { slug: 'religious-cultural-items', name: 'Religious & Cultural Items' },
      { slug: 'photography-prints', name: 'Photography & Prints' },
      { slug: 'craft-supplies', name: 'Craft Supplies' },
      { slug: 'gift-wrapping', name: 'Gift Wrapping' },
    ],
  },
];

export const findCategory = (slug: string): Category | undefined =>
  CATEGORIES.find((category) => category.slug === slug);

/** Slug for a stored subcategory name, e.g. "Bowls & Plates" -> bowls-plates, "Women's Clothing" -> womens-clothing. */
export const subcategorySlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const LEGACY_CATEGORY_MAP: Record<string, { slug: string; name: string; subcategory: string }> = {
  'fashion-shirts': { slug: 'fashion', name: 'Fashion & Accessories', subcategory: "Men's Clothing" },
  'fashion-men': { slug: 'fashion', name: 'Fashion & Accessories', subcategory: "Men's Clothing" },
  'fashion-women': { slug: 'fashion', name: 'Fashion & Accessories', subcategory: "Women's Clothing" },
  'fresh-fruit': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Fresh Produce' },
  'palm-sugar': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Palm Sugar & Sweeteners' },
  'rice-products': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Rice & Grains' },
  'local-food': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Pantry & Spices' },
  'dried-fruits': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Snacks & Dried Fruit' },
  pottery: { slug: 'home-living', name: 'Home & Living', subcategory: 'Pottery & Ceramics' },
  'bamboo-products': { slug: 'home-living', name: 'Home & Living', subcategory: 'Bamboo & Rattan' },
  weaving: { slug: 'arts-culture', name: 'Arts & Culture', subcategory: 'Textiles & Weaving' },
  'handmade-crafts': { slug: 'arts-culture', name: 'Arts & Culture', subcategory: 'Handmade Crafts' },
};

const COMMERCE_TAXONOMY_MAP: Record<string, { slug: string; name: string; subcategory: string }> = {
  clothing: { slug: 'fashion', name: 'Fashion & Accessories', subcategory: "Women's Clothing" },
  shoes: { slug: 'fashion', name: 'Fashion & Accessories', subcategory: 'Shoes' },
  accessories: { slug: 'fashion', name: 'Fashion & Accessories', subcategory: 'Jewelry & Watches' },
  jewelry: { slug: 'fashion', name: 'Fashion & Accessories', subcategory: 'Jewelry & Watches' },
  skincare: { slug: 'beauty-wellness', name: 'Beauty & Wellness', subcategory: 'Skincare' },
  beauty: { slug: 'beauty-wellness', name: 'Beauty & Wellness', subcategory: 'Makeup & Cosmetics' },
  'beauty-skincare': { slug: 'beauty-wellness', name: 'Beauty & Wellness', subcategory: 'Skincare' },
  'phones-devices': { slug: 'electronics', name: 'Electronics', subcategory: 'Phones & Tablets' },
  'phones-tablets': { slug: 'electronics', name: 'Electronics', subcategory: 'Phones & Tablets' },
  'electronics-accessories': { slug: 'electronics', name: 'Electronics', subcategory: 'Electronic Accessories' },
  'electronic-accessories': { slug: 'electronics', name: 'Electronics', subcategory: 'Electronic Accessories' },
  computers: { slug: 'electronics', name: 'Electronics', subcategory: 'Computers' },
  'home-goods': { slug: 'home-living', name: 'Home & Living', subcategory: 'Home Décor' },
  pottery: { slug: 'home-living', name: 'Home & Living', subcategory: 'Pottery & Ceramics' },
  'pottery-ceramics': { slug: 'home-living', name: 'Home & Living', subcategory: 'Pottery & Ceramics' },
  'bamboo-rattan': { slug: 'home-living', name: 'Home & Living', subcategory: 'Bamboo & Rattan' },
  'bamboo-products': { slug: 'home-living', name: 'Home & Living', subcategory: 'Bamboo & Rattan' },
  'handmade-crafts': { slug: 'arts-culture', name: 'Arts & Culture', subcategory: 'Handmade Crafts' },
  weaving: { slug: 'arts-culture', name: 'Arts & Culture', subcategory: 'Textiles & Weaving' },
  'textiles-weaving': { slug: 'arts-culture', name: 'Arts & Culture', subcategory: 'Textiles & Weaving' },
  'food-beverage': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Drinks & Beverages' },
  'drinks-beverages': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Drinks & Beverages' },
  groceries: { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Household Groceries' },
  'household-groceries': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Household Groceries' },
  'local-produce': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Fresh Produce' },
  'fresh-produce': { slug: 'food-groceries', name: 'Food & Groceries', subcategory: 'Fresh Produce' },
};

/** Converts narrow category labels or taxonomy entries into scalable departments and subcategories. */
export const classifyCategory = (category: string) => {
  if (!category || !category.trim() || category.toLowerCase() === 'general') {
    return {
      categorySlug: 'general',
      categoryName: 'General',
      subcategory: null,
      subcategorySlug: null,
    };
  }

  const originalSlug = subcategorySlug(category);

  // 1. Check if the label directly identifies a top-level department
  const department = CATEGORIES.find(
    (entry) =>
      entry.slug === originalSlug ||
      subcategorySlug(entry.name) === originalSlug ||
      Boolean(entry.shortName && subcategorySlug(entry.shortName) === originalSlug),
  );
  if (department) {
    return {
      categorySlug: department.slug,
      categoryName: department.name,
      subcategory: null,
      subcategorySlug: null,
    };
  }

  // 2. Check if the label matches an existing subcategory in any department
  for (const dept of CATEGORIES) {
    const sub = dept.subcategories.find(
      (s) =>
        s.slug === originalSlug ||
        subcategorySlug(s.name) === originalSlug,
    );
    if (sub) {
      return {
        categorySlug: dept.slug,
        categoryName: dept.name,
        subcategory: sub.name,
        subcategorySlug: sub.slug,
      };
    }
  }

  // 3. Resolve through commerce taxonomy & legacy aliases
  const mapped = COMMERCE_TAXONOMY_MAP[originalSlug] || LEGACY_CATEGORY_MAP[originalSlug];
  if (mapped) {
    return {
      categorySlug: mapped.slug,
      categoryName: mapped.name,
      subcategory: mapped.subcategory,
      subcategorySlug: subcategorySlug(mapped.subcategory),
    };
  }

  return {
    categorySlug: originalSlug,
    categoryName: category,
    subcategory: null,
    subcategorySlug: null,
  };
};
