import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import Product from '../models/Product';
import Store from '../models/Store';
import { slugify } from '../src/utils/slugify';

/**
 * Every seeded product carries `sellerUserId` and a free-text `sellerName`,
 * but historically no product pointed at a real `Store` document. This
 * backfills one Store per distinct sellerUserId found on products, using the
 * values from the old front-end fixture (stores.data.ts) where the store is
 * recognised, and derives sane defaults otherwise. Then it points every
 * matching product's `sellerId` at the new store.
 *
 * Safe to re-run: it skips any sellerUserId that already has a Store doc,
 * and skips products that already have sellerId set.
 */

// Keyed by the sellerName seen on products — this preserves the ratings and
// descriptions that were previously only visible via the hardcoded fixture.
const KNOWN_STORES: Record<
  string,
  { location: string; category: string; description: string; rating: number; reviewCount: number }
> = {
  'Srey Khmer Handmade Store': {
    location: 'Siem Reap',
    category: 'Weaving & Crafts',
    description:
      'A family workshop weaving silk krama and cotton scarves on wooden looms, using patterns passed down four generations.',
    rating: 4.8,
    reviewCount: 312,
  },
  'Kampong Speu Palm Sugar': {
    location: 'Kampong Speu',
    category: 'Palm Sugar & Local Food',
    description:
      'Sugar palm cooperative producing GI-certified palm sugar, harvested at dawn and boiled the same morning.',
    rating: 4.9,
    reviewCount: 208,
  },
  'Battambang Rice Farm': {
    location: 'Battambang',
    category: 'Rice Products',
    description: 'Smallholder collective growing jasmine and organic red rice on the Sangke river plain.',
    rating: 4.7,
    reviewCount: 176,
  },
  'Phnom Penh Pottery House': {
    location: 'Phnom Penh',
    category: 'Pottery',
    description: 'Studio pottery in glazes drawn from Angkorian ceramics, thrown and fired in Tuol Kork.',
    rating: 4.6,
    reviewCount: 143,
  },
  'Takeo Bamboo Craft': {
    location: 'Takeo',
    category: 'Bamboo Products',
    description: 'Bamboo baskets, trays and steamers woven by artisans in Takeo province from locally cut culms.',
    rating: 4.7,
    reviewCount: 98,
  },
};

async function backfill() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  const products = await Product.find({ sellerUserId: { $exists: true, $ne: null } });
  console.log(`Found ${products.length} products with a sellerUserId`);

  const bySellerUserId = new Map<string, typeof products>();
  for (const product of products) {
    const key = String(product.sellerUserId);
    const group = bySellerUserId.get(key) ?? [];
    group.push(product);
    bySellerUserId.set(key, group);
  }

  let storesCreated = 0;
  let productsLinked = 0;

  for (const [sellerUserId, group] of bySellerUserId) {
    const existing = await Store.findOne({ userId: sellerUserId });
    let seller = existing;

    if (!seller) {
      const representative = group[0];
      const known = KNOWN_STORES[representative.sellerName ?? ''];
      const storeName = representative.storeName || representative.sellerName || 'Unnamed Store';

      let slug = slugify(storeName);
      for (let attempt = 2; await Store.exists({ slug }); attempt += 1) {
        slug = `${slugify(storeName)}-${attempt}`;
      }

      seller = await Store.create({
        userId: sellerUserId,
        storeName,
        slug,
        storeDescription: known?.description,
        location: known?.location ?? representative.location,
        category: known?.category,
        rating: known?.rating ?? 0,
        reviewCount: known?.reviewCount ?? 0,
        subscriptionPlan: 'STARTER',
        onboardingStatus: 'COMPLETED',
        verificationStatus: 'VERIFIED',
      });
      storesCreated++;
      console.log(`Created store "${seller.storeName}" for sellerUserId ${sellerUserId}`);
    }

    for (const product of group) {
      if (!product.sellerId) {
        product.sellerId = seller._id;
        await product.save();
        productsLinked++;
      }
    }
  }

  console.log(`Done. Stores created: ${storesCreated}. Products linked: ${productsLinked}.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
