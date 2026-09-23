import mongoose from 'mongoose';
import Product from '../../../models/Product';
import User from '../../../models/User';
import { CATEGORY_TREE, slugForName } from './taxonomy.data';

/**
 * The category tree with live product counts.
 *
 * Counts come from one aggregation rather than a query per node — eight
 * categories times three or four sub-categories would otherwise be thirty-odd
 * round-trips to render a single menu.
 */
export const listCategories = async () => {
  const rows = await Product.aggregate<{
    _id: { category: string; subcategory: string | null };
    count: number;
  }>([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: { category: '$category', subcategory: '$subcategory' },
        count: { $sum: 1 },
      },
    },
  ]);

  // Index by slug so display-name drift between the tree and stored products
  // does not silently zero a count.
  const byCategory = new Map<string, number>();
  const bySub = new Map<string, number>();

  for (const row of rows) {
    const categorySlug = slugForName(row._id.category ?? '');
    byCategory.set(categorySlug, (byCategory.get(categorySlug) ?? 0) + row.count);

    if (row._id.subcategory) {
      const key = `${categorySlug}/${slugForName(row._id.subcategory)}`;
      bySub.set(key, (bySub.get(key) ?? 0) + row.count);
    }
  }

  const categories = CATEGORY_TREE.map((category) => ({
    ...category,
    productCount: byCategory.get(category.slug) ?? 0,
    subcategories: category.subcategories.map((sub) => ({
      ...sub,
      productCount: bySub.get(`${category.slug}/${sub.slug}`) ?? 0,
    })),
  }));

  return {
    categories,
    total: categories.length,
  };
};

/**
 * Sellers with a public storefront.
 *
 * Derived from products rather than the user list, so an account that has
 * never listed anything does not appear as an empty shop. Ratings are the
 * average across their catalogue until there is a real seller-review model.
 *
 * TODO(seller-branch): read from the Seller collection on origin/prototype
 * once that merges, and drop the derivation.
 */
export const listSellers = async () => {
  const rows = await Product.aggregate<{
    _id: string | null;
    sellerName: string;
    storeName: string | null;
    location: string | null;
    productCount: number;
    rating: number;
    reviewCount: number;
    soldCount: number;
  }>([
    { $match: { status: 'ACTIVE' } },
    {
      $group: {
        _id: '$sellerUserId',
        sellerName: { $first: '$sellerName' },
        storeName: { $first: '$storeName' },
        location: { $first: '$location' },
        productCount: { $sum: 1 },
        rating: { $avg: '$rating' },
        reviewCount: { $sum: '$reviewCount' },
        soldCount: { $sum: '$soldCount' },
      },
    },
    { $sort: { soldCount: -1 } },
  ]);

  // Confirm the accounts still exist and are active; a suspended seller
  // should not keep a storefront listing.
  const ids = rows.map((row) => row._id).filter(Boolean) as string[];
  const active = new Set(
    (
      await User.find({
        // trusted() because sanitizeFilter (set globally in app.ts) otherwise
        // wraps this in $eq and Mongoose tries to cast the operator object
        // itself to an ObjectId.
        _id: mongoose.trusted({ $in: ids }),
        status: 'ACTIVE',
      }).select('_id')
    ).map((user) => String(user._id)),
  );

  const sellers = rows
    .filter((row) => !row._id || active.has(String(row._id)))
    .map((row) => ({
      id: row._id ? String(row._id) : slugForName(row.sellerName),
      slug: slugForName(row.sellerName),
      name: row.sellerName,
      storeName: row.storeName ?? row.sellerName,
      location: row.location ?? '',
      productCount: row.productCount,
      rating: Math.round((row.rating ?? 0) * 10) / 10,
      reviewCount: row.reviewCount ?? 0,
      soldCount: row.soldCount ?? 0,
      /** False when the products predate a real seller account. */
      hasAccount: Boolean(row._id),
    }));

  return { sellers, total: sellers.length };
};
