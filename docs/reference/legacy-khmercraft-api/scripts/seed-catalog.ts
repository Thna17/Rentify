import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product, { slugify } from '../models/Product';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

/**
 * Seeds the product catalog.
 *
 * Mirrors the mock data the web app ships in core/data/products.data.ts, so
 * the storefront looks the same whether it is reading the API or its fallback
 * fixtures. Safe to re-run: products are upserted by slug.
 *
 * Run with:  npm run seed:catalog
 */
interface Seed {
  name: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  subcategory: string;
  sellerName: string;
  storeName: string;
  location: string;
  rating: number;
  reviewCount: number;
  stock: number;
  soldCount: number;
  description: string;
}

const SEEDS: Seed[] = [
  {
    name: 'Handmade Khmer Silk Scarf', price: 12.5, compareAtPrice: 16,
    category: 'Weaving', subcategory: 'Scarves', sellerName: 'Srey Khmer Handmade Store',
    storeName: 'Srey Khmer Handmade', location: 'Siem Reap',
    rating: 4.8, reviewCount: 124, stock: 20, soldCount: 480,
    description:
      'A hand-woven silk krama from Takeo province, dyed with natural indigo. Light enough for the dry season and soft enough to wear every day.',
  },
  {
    name: 'Kampong Speu Palm Sugar 500g', price: 3.5,
    category: 'Palm Sugar', subcategory: 'Blocks & Paste', sellerName: 'Kampong Speu Palm Sugar',
    storeName: 'Kampong Speu Palm Sugar', location: 'Kampong Speu',
    rating: 4.9, reviewCount: 208, stock: 60, soldCount: 940,
    description:
      'GI-certified palm sugar with a caramel, slightly smoky finish. Harvested at dawn and boiled the same morning in open pans.',
  },
  {
    name: 'Organic Jasmine Rice 5kg', price: 14,
    category: 'Rice Products', subcategory: 'White Rice', sellerName: 'Battambang Rice Farm',
    storeName: 'Battambang Rice Farm', location: 'Battambang',
    rating: 4.7, reviewCount: 176, stock: 35, soldCount: 620,
    description:
      'Long-grain jasmine rice grown on the Sangke river plain without synthetic fertiliser. Milled to order and packed in breathable cotton.',
  },
  {
    name: 'Woven Bamboo Basket', price: 9.75,
    category: 'Bamboo Products', subcategory: 'Baskets', sellerName: 'Takeo Bamboo Craft',
    storeName: 'Takeo Bamboo Craft', location: 'Takeo',
    rating: 4.6, reviewCount: 87, stock: 4, soldCount: 210,
    description:
      'A round market basket woven from locally cut bamboo, tight enough to hold rice and light enough to carry all morning.',
  },
  {
    name: 'Clay Pottery Cup Set of 4', price: 18,
    category: 'Pottery', subcategory: 'Cups & Mugs', sellerName: 'Phnom Penh Pottery House',
    storeName: 'Phnom Penh Pottery House', location: 'Phnom Penh',
    rating: 4.5, reviewCount: 64, stock: 12, soldCount: 150,
    description:
      'Four wheel-thrown cups in a matte celadon glaze drawn from Angkorian ceramics. Each one varies slightly — they are thrown by hand.',
  },
  {
    name: 'Dried Mango Slices 250g', price: 4.25,
    category: 'Dried Fruits', subcategory: 'Dried Mango', sellerName: 'Kampong Speu Palm Sugar',
    storeName: 'Kampong Speu Palm Sugar', location: 'Kampong Speu',
    rating: 4.7, reviewCount: 132, stock: 48, soldCount: 510,
    description:
      'Keo Romeat mango dried slowly in the sun with no added sugar or sulphites. Chewy, tart and intensely fragrant.',
  },
  {
    name: 'Khmer Ceramic Serving Bowl', price: 22,
    category: 'Pottery', subcategory: 'Bowls & Plates', sellerName: 'Phnom Penh Pottery House',
    storeName: 'Phnom Penh Pottery House', location: 'Phnom Penh',
    rating: 4.8, reviewCount: 41, stock: 9, soldCount: 96,
    description:
      'A wide stoneware bowl for samlor or salad, glazed in ash green with an unglazed foot that shows the raw clay.',
  },
  {
    name: 'Handmade Wooden Spoon Pair', price: 6.5,
    category: 'Handmade Crafts', subcategory: 'Kitchen & Utensils', sellerName: 'Srey Khmer Handmade Store',
    storeName: 'Srey Khmer Handmade', location: 'Siem Reap',
    rating: 4.4, reviewCount: 58, stock: 26, soldCount: 187,
    description:
      'Two cooking spoons carved from offcut jackfruit wood and finished with food-safe oil. Light, warm and kind to a clay pot.',
  },
  {
    name: 'Cotton Krama Scarf — Classic Check', price: 8.9,
    category: 'Weaving', subcategory: 'Scarves', sellerName: 'Srey Khmer Handmade Store',
    storeName: 'Srey Khmer Handmade', location: 'Siem Reap',
    rating: 4.6, reviewCount: 149, stock: 40, soldCount: 733,
    description:
      'The everyday Cambodian krama in red and white cotton — a scarf, a towel, a sunshade and a shopping bag, depending on the hour.',
  },
  {
    name: 'Organic Red Rice 2kg', price: 7.4,
    category: 'Rice Products', subcategory: 'Brown & Red Rice', sellerName: 'Battambang Rice Farm',
    storeName: 'Battambang Rice Farm', location: 'Battambang',
    rating: 4.5, reviewCount: 71, stock: 30, soldCount: 264,
    description:
      'Unpolished red rice with a nutty bite and a long chew. Needs a little more water and about ten more minutes than white rice.',
  },
  {
    name: 'Palm Sugar Candy Box', price: 5.2,
    category: 'Local Food', subcategory: 'Sweets & Snacks', sellerName: 'Kampong Speu Palm Sugar',
    storeName: 'Kampong Speu Palm Sugar', location: 'Kampong Speu',
    rating: 4.8, reviewCount: 95, stock: 0, soldCount: 402,
    description:
      'Soft palm sugar discs pressed into a gift box. Traditionally eaten with green tea — currently between harvests.',
  },
  {
    name: 'Bamboo Steamer Tray', price: 11.25,
    category: 'Bamboo Products', subcategory: 'Kitchen & Steamers', sellerName: 'Takeo Bamboo Craft',
    storeName: 'Takeo Bamboo Craft', location: 'Takeo',
    rating: 4.5, reviewCount: 46, stock: 15, soldCount: 128,
    description:
      'A two-tier steamer woven and pinned without glue, sized for a standard wok. Season it once and it will outlast the wok.',
  },
  {
    name: 'Dried Banana Chips 200g', price: 3.1,
    category: 'Dried Fruits', subcategory: 'Chips & Crisps', sellerName: 'Kampong Speu Palm Sugar',
    storeName: 'Kampong Speu Palm Sugar', location: 'Kampong Speu',
    rating: 4.3, reviewCount: 63, stock: 52, soldCount: 298,
    description:
      'Thin-sliced chek namvar banana, sun-dried until crisp. Nothing added but a little palm sugar at the end.',
  },
  {
    name: 'Silk Table Runner', price: 26,
    category: 'Weaving', subcategory: 'Table Linen', sellerName: 'Srey Khmer Handmade Store',
    storeName: 'Srey Khmer Handmade', location: 'Siem Reap',
    rating: 4.9, reviewCount: 32, stock: 5, soldCount: 61,
    description:
      'A hol-technique silk runner in gold and deep plum. Roughly forty hours on the loom, and it shows in the weight of the cloth.',
  },
  {
    name: 'Prahok Ceramic Storage Jar', price: 16.5,
    category: 'Pottery', subcategory: 'Storage Jars', sellerName: 'Phnom Penh Pottery House',
    storeName: 'Phnom Penh Pottery House', location: 'Phnom Penh',
    rating: 4.4, reviewCount: 28, stock: 11, soldCount: 74,
    description:
      'A lidded stoneware jar in the old kitchen shape, glazed inside and left raw outside so it stays cool on a shelf.',
  },
  {
    name: 'Kampot Pepper 100g', price: 8.75,
    category: 'Local Food', subcategory: 'Spices & Pepper', sellerName: 'Kampong Speu Palm Sugar',
    storeName: 'Kampong Speu Palm Sugar', location: 'Kampot',
    rating: 4.9, reviewCount: 241, stock: 44, soldCount: 856,
    description:
      'Whole black Kampot peppercorns, sun-dried and hand-sorted. Floral and hot at once — the reason the region has a GI mark.',
  },
  {
    name: 'Rattan Fruit Bowl', price: 13.9,
    category: 'Bamboo Products', subcategory: 'Bowls & Trays', sellerName: 'Takeo Bamboo Craft',
    storeName: 'Takeo Bamboo Craft', location: 'Takeo',
    rating: 4.6, reviewCount: 39, stock: 18, soldCount: 112,
    description:
      'An open rattan bowl with a rolled rim, wide enough for a hand of bananas and light enough to hang on a hook.',
  },
  {
    name: 'Coconut Shell Candle', price: 7.8,
    category: 'Handmade Crafts', subcategory: 'Candles & Decor', sellerName: 'Srey Khmer Handmade Store',
    storeName: 'Srey Khmer Handmade', location: 'Siem Reap',
    rating: 4.5, reviewCount: 54, stock: 22, soldCount: 203,
    description:
      'Soy wax poured into a polished half coconut shell, scented lightly with lemongrass. The shell makes a good tealight holder after.',
  },
];

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env.local.');
    process.exit(1);
  }

  await mongoose.connect(uri, { family: 4 });

  let created = 0;
  let updated = 0;

  for (const seed of SEEDS) {
    const slug = slugify(seed.name);
    const result = await Product.updateOne(
      { slug },
      {
        $set: {
          ...seed,
          slug,
          images: [],
          status: 'ACTIVE',
          // TODO(seller-branch): set sellerId once Seller documents exist.
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount) {
      created += 1;
    } else if (result.modifiedCount) {
      updated += 1;
    }
  }

  const total = await Product.countDocuments();
  console.log(
    `Catalog seeded — ${created} created, ${updated} updated, ${total} products total.`,
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Seeding failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
