import * as dotenv from 'dotenv';
import type { Collection, Document, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

type RawDocument = Document & { _id: ObjectId };

const argument = (name: string): string | undefined => {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'store';

const uniqueSlug = async (
  collection: Collection<Document>,
  requested: string,
  currentId?: ObjectId,
): Promise<string> => {
  const base = slugify(requested);
  let slug = base;
  for (let suffix = 2; ; suffix += 1) {
    const collision = await collection.findOne({
      slug,
      ...(currentId ? { _id: { $ne: currentId } } : {}),
    });
    if (!collision) return slug;
    slug = `${base}-${suffix}`;
  }
};

const insertPreservingIdWhenAvailable = async (
  collection: Collection<Document>,
  document: RawDocument,
): Promise<ObjectId> => {
  if (!(await collection.findOne({ _id: document._id }))) {
    await collection.insertOne(document);
    return document._id;
  }

  const copy: Document = { ...document };
  delete copy._id;
  const result = await collection.insertOne(copy);
  return result.insertedId;
};

async function migrate() {
  const mongoUri = process.env.MONGODB_URI;
  const email = argument('email');
  const sourceDatabaseName = argument('source-db') ?? 'test';

  if (!mongoUri) throw new Error('MONGODB_URI is not configured');
  if (!email) {
    throw new Error(
      'Provide the seller account explicitly, for example: --email=seller@example.com',
    );
  }

  await mongoose.connect(mongoUri);
  const client = mongoose.connection.getClient();
  const targetDatabase = mongoose.connection.db!;
  const targetDatabaseName = targetDatabase.databaseName;

  if (sourceDatabaseName === targetDatabaseName) {
    throw new Error('Source and target databases are the same');
  }

  const sourceDatabase = client.db(sourceDatabaseName);
  const sourceUsers = sourceDatabase.collection('users');
  const sourceStores = sourceDatabase.collection('sellers');
  const sourceProducts = sourceDatabase.collection('products');
  const targetUsers = targetDatabase.collection('users');
  const targetStores = targetDatabase.collection('sellers');
  const targetProducts = targetDatabase.collection('products');

  const sourceUser = (await sourceUsers.findOne({
    email: email.trim().toLowerCase(),
  })) as RawDocument | null;
  if (!sourceUser) throw new Error(`Seller account not found in ${sourceDatabaseName}`);

  const sourceStore = (await sourceStores.findOne({ userId: sourceUser._id })) as
    | RawDocument
    | null;
  if (!sourceStore) throw new Error('Seller has no store in the source database');

  const sourceListings = (await sourceProducts
    .find({
      $or: [{ sellerId: sourceStore._id }, { sellerUserId: sourceUser._id }],
    })
    .toArray()) as unknown as RawDocument[];

  let targetUser = (await targetUsers.findOne({ email: sourceUser.email })) as
    | RawDocument
    | null;
  let userCreated = false;
  if (!targetUser) {
    const userId = await insertPreservingIdWhenAvailable(targetUsers, {
      ...sourceUser,
      role: 'SELLER',
    });
    targetUser = (await targetUsers.findOne({ _id: userId })) as unknown as RawDocument;
    userCreated = true;
  } else if (targetUser.role !== 'SELLER') {
    await targetUsers.updateOne({ _id: targetUser._id }, { $set: { role: 'SELLER' } });
  }

  let targetStore = (await targetStores.findOne({ userId: targetUser._id })) as
    | RawDocument
    | null;
  let storeCreated = false;
  if (!targetStore) {
    const storeId = await insertPreservingIdWhenAvailable(targetStores, {
      ...sourceStore,
      userId: targetUser._id,
      slug: await uniqueSlug(targetStores, sourceStore.slug ?? sourceStore.storeName),
      onboardingStatus: 'COMPLETED',
      verificationStatus: sourceStore.verificationStatus ?? 'UNVERIFIED',
    });
    targetStore = (await targetStores.findOne({ _id: storeId })) as unknown as RawDocument;
    storeCreated = true;
  } else {
    await targetStores.updateOne(
      { _id: targetStore._id },
      {
        $set: {
          onboardingStatus: 'COMPLETED',
          slug:
            targetStore.slug ??
            (await uniqueSlug(targetStores, targetStore.storeName, targetStore._id)),
        },
      },
    );
  }

  let productsCreated = 0;
  let productsRepaired = 0;
  for (const sourceProduct of sourceListings) {
    const existing = (await targetProducts.findOne({
      $or: [
        { _id: sourceProduct._id },
        {
          slug: sourceProduct.slug,
          sellerUserId: targetUser._id,
        },
      ],
    })) as RawDocument | null;

    const ownership = {
      sellerId: targetStore._id,
      sellerUserId: targetUser._id,
      sellerName: targetUser.name ?? sourceProduct.sellerName,
      storeName: targetStore.storeName,
      status: sourceProduct.status ?? 'ACTIVE',
    };

    if (existing) {
      await targetProducts.updateOne({ _id: existing._id }, { $set: ownership });
      productsRepaired += 1;
      continue;
    }

    await insertPreservingIdWhenAvailable(targetProducts, {
      ...sourceProduct,
      ...ownership,
    });
    productsCreated += 1;
  }

  console.log(
    JSON.stringify(
      {
        sourceDatabase: sourceDatabaseName,
        targetDatabase: targetDatabaseName,
        seller: targetUser.name,
        store: targetStore.storeName,
        userCreated,
        storeCreated,
        productsFound: sourceListings.length,
        productsCreated,
        productsRepaired,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

migrate().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
