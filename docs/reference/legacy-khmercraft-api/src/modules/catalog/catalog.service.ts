import mongoose, { QueryFilter } from 'mongoose';
import Product, { IProduct, slugify } from '../../../models/Product';
import Store from '../../../models/Store';
import { IUser } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { compressImageWithThumbnail, compressImages } from '../../utils/image';
import {
  COLLECTION_CATEGORIES,
  CreateProductInput,
  ListProductsQuery,
  ProductSort,
  UpdateProductInput,
} from './catalog.validation';

/** Public shape of a product. Never return raw Mongoose documents. */
export const toProductResponse = (product: IProduct) => ({
  id: String(product._id),
  name: product.name,
  slug: product.slug,
  description: product.description,
  price: product.price,
  compareAtPrice: product.compareAtPrice ?? null,
  category: product.category,
  subcategory: product.subcategory ?? null,
  sellerId: product.sellerId ? String(product.sellerId) : null,
  sellerName: product.sellerName,
  storeName: product.storeName ?? null,
  location: product.location,
  // `?.` because a list query's .select('-image -images') means both are
  // genuinely absent on the document, not just empty — see toProductListItem.
  image: product.image ?? product.images?.[0] ?? null,
  images: product.images ?? [],
  variants: product.variants ?? [],
  rating: product.rating,
  reviewCount: product.reviewCount,
  stock: product.stock,
  soldCount: product.soldCount,
  status: product.status,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

export type ProductResponse = ReturnType<typeof toProductResponse>;

/**
 * Same shape as toProductResponse, but `image` is the small thumbnail
 * instead of the full-size copy — for any response that renders many
 * products as cards at once (the product list, related products, a
 * seller's own product table), where the full-size image buys nothing a
 * shopper can see at card scale but multiplies the response size by how
 * many cards are on the page. See utils/image.ts.
 */
export const toProductListItem = (product: IProduct) => ({
  ...toProductResponse(product),
  image: product.thumbnail ?? product.image ?? product.images?.[0] ?? null,
});

const SORT_ORDERS: Record<ProductSort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  'price-low': { price: 1 },
  'price-high': { price: -1 },
  rating: { rating: -1, reviewCount: -1 },
  popular: { soldCount: -1, rating: -1 },
};

/**
 * Match a stored display name against either itself or its slug.
 *
 * "bowls-plates" has to find "Bowls & Plates", so each hyphen stands in for
 * any run of non-alphanumeric characters rather than a literal space —
 * ampersands, slashes and double spaces all appear in category names.
 * Everything else is escaped, so a name can never act as a pattern.
 */
const nameOrSlug = (value: string): RegExp => {
  const pattern = value
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^a-zA-Z0-9]+');
  return new RegExp(`^${pattern}$`, 'i');
};

const buildFilter = (query: ListProductsQuery): QueryFilter<IProduct> => {
  const filter: QueryFilter<IProduct> = {};

  // Only ADMIN-ish callers have a reason to see drafts; the public list is
  // active products unless a status is explicitly requested.
  filter.status = query.status ?? 'ACTIVE';

  if (query.search) {
    // Escaped so a search for "c++" or "(" cannot blow up the regex engine.
    const safe = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(safe, 'i');
    filter.$or = [
      { name: pattern },
      { description: pattern },
      { category: pattern },
      { sellerName: pattern },
    ];
  }

  if (query.category) {
    filter.category = nameOrSlug(query.category);
  }

  if (query.subcategory) {
    filter.subcategory = nameOrSlug(query.subcategory);
  }

  if (query.storeId) {
    filter.sellerId = new mongoose.Types.ObjectId(query.storeId);
  }

  if (query.location) {
    filter.location = nameOrSlug(query.location);
  }

  // Built as one local object so the under-5 collection can tighten the same
  // bound without clobbering an explicit priceMin/priceMax.
  const price: { $gte?: number; $lte?: number } = {};
  if (query.priceMin !== undefined) {
    price.$gte = query.priceMin;
  }
  if (query.priceMax !== undefined) {
    price.$lte = query.priceMax;
  }

  if (query.collection) {
    const categories = COLLECTION_CATEGORIES[query.collection];
    if (categories) {
      filter.category = mongoose.trusted({ $in: categories });
    } else if (query.collection === 'under-5') {
      // Take the stricter of the two if a priceMax was also supplied.
      price.$lte = price.$lte === undefined ? 5 : Math.min(price.$lte, 5);
    }
    // top-picks / best-sellers / new-arrivals are orderings rather than
    // filters; they are applied as a sort override below.
  }

  if (price.$gte !== undefined || price.$lte !== undefined) {
    filter.price = mongoose.trusted(price);
  }

  return filter;
};

/** Collections that mean "order this way", not "filter to these". */
const collectionSort = (
  collection: ListProductsQuery['collection'],
): Record<string, 1 | -1> | null => {
  switch (collection) {
    case 'best-sellers':
      return { soldCount: -1, rating: -1 };
    case 'new-arrivals':
      return { createdAt: -1 };
    case 'top-picks':
      return { rating: -1, soldCount: -1 };
    default:
      return null;
  }
};

export const listProducts = async (query: ListProductsQuery) => {
  const filter = buildFilter(query);
  const sort = collectionSort(query.collection) ?? SORT_ORDERS[query.sort];
  const skip = (query.page - 1) * query.limit;

  // countDocuments runs alongside the page fetch rather than after it.
  // Excludes `image`/`images` at the query itself, not just the response
  // mapper — Mongo still has to read and transfer whatever a query selects
  // over the network before Node ever gets a chance to drop a field, and a
  // page of 60 products each carrying a 60-150KB embedded photo turned a
  // ~200ms query into a 10+ second one purely on that transfer. The list
  // response only ever uses `thumbnail` (see toProductListItem).
  const [documents, total] = await Promise.all([
    Product.find(filter).select('-image -images').sort(sort).skip(skip).limit(query.limit),
    Product.countDocuments(filter),
  ]);

  return {
    products: documents.map(toProductListItem),
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
    appliedFilters: {
      search: query.search ?? null,
      category: query.category ?? null,
      subcategory: query.subcategory ?? null,
      storeId: query.storeId ?? null,
      location: query.location ?? null,
      collection: query.collection ?? null,
      priceMin: query.priceMin ?? null,
      priceMax: query.priceMax ?? null,
      sort: query.sort,
      status: filter.status as string,
    },
  };
};

/** Look up by Mongo id or by slug, so both URL styles work. */
export const findProduct = async (idOrSlug: string): Promise<IProduct> => {
  const product = mongoose.isValidObjectId(idOrSlug)
    ? await Product.findById(idOrSlug)
    : await Product.findOne({ slug: idOrSlug });

  if (!product) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }
  return product;
};

export const getProductDetail = async (idOrSlug: string) => {
  const product = await findProduct(idOrSlug);

  const related = await Product.find({
    _id: mongoose.trusted({ $ne: product._id }),
    category: product.category,
    status: 'ACTIVE',
  })
    .select('-image -images')
    .sort({ rating: -1, soldCount: -1 })
    .limit(8);

  return {
    ...toProductResponse(product),
    relatedProducts: related.map(toProductListItem),
  };
};

/** Unique slug; suffix on collision so a second "Silk Scarf" is not blocked. */
const uniqueSlug = async (name: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 2; await Product.exists({ slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

export const createProduct = async (seller: IUser, input: CreateProductInput) => {
  // Link the listing to the seller's real store when they have one, rather
  // than trusting a free-text storeName — otherwise nothing stops a seller
  // from publishing under a name that isn't actually theirs. A seller who
  // hasn't created a store yet (an account can exist without one) still
  // falls back to the plain text field so this stays backward compatible.
  const store = input.storeId
    ? await Store.findOne({ _id: input.storeId, userId: seller._id })
    : await Store.findOne({ userId: seller._id });

  if (input.storeId && !store) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }

  // See utils/image.ts — a full-resolution upload here would otherwise ride
  // along on every catalog list response forever, not just this product's
  // own detail page.
  const [{ image, thumbnail }, images, variantImages] = await Promise.all([
    compressImageWithThumbnail(input.image),
    compressImages(input.images),
    // Colour swatches are full product photos too, so they get the same
    // treatment — otherwise six colours means six full-size uploads on one row.
    compressImages(input.variants?.map((variant) => variant.image)),
  ]);
  const variants = (input.variants ?? []).map((variant, index) => ({
    label: variant.label,
    image: variantImages?.[index] ?? variant.image,
  }));

  const product = await Product.create({
    name: input.name,
    slug: await uniqueSlug(input.name),
    description: input.description ?? '',
    price: input.price,
    compareAtPrice: input.compareAtPrice ?? undefined,
    category: input.category,
    subcategory: input.subcategory ?? undefined,
    // Identity comes from the session, never the payload.
    sellerId: store?._id,
    sellerUserId: seller._id,
    sellerName: seller.name,
    storeName: store?.storeName ?? input.storeName,
    location: input.location ?? '',
    image,
    thumbnail,
    images: images ?? [],
    variants,
    stock: input.stock,
    status: input.status,
  });

  return toProductResponse(product);
};

/**
 * Load a product the caller is allowed to modify.
 *
 * A product owned by someone else returns 404 rather than 403, so a seller
 * cannot enumerate the catalogue to discover which ids exist. Admins bypass
 * the ownership check for support work.
 */
const loadOwned = async (actor: IUser, id: string) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  const product = await Product.findById(id);
  if (!product) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  const isOwner =
    product.sellerUserId && String(product.sellerUserId) === String(actor._id);
  if (!isOwner && actor.role !== 'ADMIN') {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  return product;
};

export const updateProduct = async (
  actor: IUser,
  id: string,
  input: UpdateProductInput,
) => {
  const product = await loadOwned(actor, id);

  // Renaming re-slugs, but only if the name actually changed — otherwise a
  // no-op save would push the slug to "silk-scarf-2" on every edit.
  if (input.name !== undefined && input.name !== product.name) {
    product.name = input.name;
    product.slug = await uniqueSlug(input.name);
  }

  // Assigned field by field. Spreading the body would let a future schema
  // field become writable the moment it is added.
  if (input.description !== undefined) product.description = input.description;
  if (input.price !== undefined) product.price = input.price;
  if (input.compareAtPrice !== undefined)
    product.compareAtPrice = input.compareAtPrice ?? undefined;
  if (input.category !== undefined) product.category = input.category;
  if (input.subcategory !== undefined)
    product.subcategory = input.subcategory ?? undefined;
  if (input.storeName !== undefined) product.storeName = input.storeName;
  if (input.location !== undefined) product.location = input.location;
  if (input.image !== undefined) {
    const { image, thumbnail } = await compressImageWithThumbnail(input.image ?? undefined);
    product.image = image ?? undefined;
    product.thumbnail = thumbnail ?? undefined;
  }
  if (input.images !== undefined)
    product.images = (await compressImages(input.images)) ?? [];
  if (input.variants !== undefined) {
    const compressed = await compressImages(
      input.variants.map((variant) => variant.image),
    );
    product.variants = input.variants.map((variant, index) => ({
      label: variant.label,
      image: compressed?.[index] ?? variant.image,
    }));
  }
  if (input.stock !== undefined) product.stock = input.stock;
  if (input.status !== undefined) product.status = input.status;

  await product.save();
  return toProductResponse(product);
};

/**
 * Delist rather than delete.
 *
 * Orders keep a productId, and the cart resolves products by id — hard
 * deleting would leave past orders pointing at nothing. ARCHIVED disappears
 * from the public catalogue while every existing reference still resolves.
 */
export const archiveProduct = async (actor: IUser, id: string) => {
  const product = await loadOwned(actor, id);
  product.status = 'ARCHIVED';
  await product.save();
  return toProductResponse(product);
};

/** A seller's own listings, drafts and archived included. */
export const listSellerProducts = async (
  sellerUserId: string,
  page: number,
  limit: number,
  storeId?: string,
) => {
  const filter = {
    sellerUserId,
    ...(storeId && mongoose.isValidObjectId(storeId)
      ? { sellerId: new mongoose.Types.ObjectId(storeId) }
      : {}),
  };
  const [documents, total] = await Promise.all([
    Product.find(filter)
      .select('-image -images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    products: documents.map(toProductListItem),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};
