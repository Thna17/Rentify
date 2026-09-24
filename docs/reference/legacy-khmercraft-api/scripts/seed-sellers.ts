import path from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/Product';
import User from '../models/User';
import { hashPassword } from '../src/utils/password';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

/**
 * Creates one seller account per store in the seeded catalog and attaches
 * their products, so the seller order desk has something to receive.
 *
 * TODO(seller-branch): these are Users with role SELLER, not documents in the
 * Seller collection on origin/prototype. Reconcile when those branches merge.
 *
 * Run with:  npm run seed:sellers
 */
const DEMO_PASSWORD = 'SellerPass123';

const run = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env.local.');
    process.exit(1);
  }

  await mongoose.connect(uri, { family: 4 });

  // One seller per distinct sellerName already in the catalog.
  const sellerNames: string[] = await Product.distinct('sellerName');
  if (sellerNames.length === 0) {
    console.error('No products found. Run `npm run seed:catalog` first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const created: { email: string; name: string; products: number }[] = [];

  for (const sellerName of sellerNames) {
    const email = `${sellerName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/(^\.|\.$)/g, '')}@sellers.khmercraft.test`;

    let seller = await User.findOne({ email });
    if (!seller) {
      seller = await User.create({
        name: sellerName,
        email,
        password_hash: passwordHash,
        role: 'SELLER',
        status: 'ACTIVE',
      });
    }

    const result = await Product.updateMany(
      { sellerName },
      { $set: { sellerUserId: seller._id } },
    );

    created.push({
      email,
      name: sellerName,
      products: result.modifiedCount || result.matchedCount,
    });
  }

  console.log(`\nSeeded ${created.length} seller accounts.`);
  console.log(`Password for all of them: ${DEMO_PASSWORD}\n`);
  for (const seller of created) {
    console.log(`  ${seller.email.padEnd(48)} ${seller.products} products`);
  }
  console.log('\nSign in at /admin/login (role SELLER) to see the order desk.');

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error('Seeding failed:', error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
