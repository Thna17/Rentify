import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

import Store from '../models/Store';
import { slugify } from '../src/utils/slugify';

/**
 * `Store.slug` is required + unique as of this migration. Every store created
 * before this change has no slug, and a unique index cannot build over
 * several documents that all lack the indexed field — so this must run once
 * against existing data before anything else touches the `sellers`
 * collection with the new schema.
 *
 * Safe to re-run: skips any store that already has a slug.
 */
async function backfill() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  // Read raw so a missing `slug` doesn't get coerced by the schema before we
  // can see it — Mongoose's own `find()` would apply schema defaults here.
  const raw = mongoose.connection.collection('sellers');
  const stores = await raw.find({ slug: { $exists: false } }).toArray();
  console.log(`Found ${stores.length} store(s) without a slug`);

  let updated = 0;
  for (const store of stores) {
    const base = slugify(store.storeName || 'store');
    let slug = base;
    for (let attempt = 2; await raw.findOne({ slug }); attempt += 1) {
      slug = `${base}-${attempt}`;
    }
    await raw.updateOne({ _id: store._id }, { $set: { slug } });
    console.log(`  ${store.storeName} -> ${slug}`);
    updated++;
  }

  console.log(`Done. ${updated} store(s) given a slug.`);
  await mongoose.disconnect();
  process.exit(0);
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
