import mongoose from 'mongoose';
import Order from '../../../models/Order';
import Product from '../../../models/Product';
import Review, { IReview } from '../../../models/Review';
import Store from '../../../models/Store';
import { IUser } from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { CreateReviewInput, ListProductReviewsQuery } from './reviews.validation';

export const toReviewResponse = (review: IReview) => ({
  id: String(review._id),
  buyerName: review.buyerName,
  productId: String(review.productId),
  productName: review.productName,
  rating: review.rating,
  comment: review.comment,
  images: review.images ?? [],
  verifiedPurchase: review.verifiedPurchase,
  sellerResponse: review.sellerResponse ?? null,
  createdAt: review.createdAt,
});

/**
 * Recompute a Product's and its Store's rating aggregate from every approved
 * review — never incremented in place, so a flagged/removed review or a
 * correction never leaves the average drifting from the truth.
 */
const recomputeAggregates = async (productId: mongoose.Types.ObjectId, sellerId: mongoose.Types.ObjectId) => {
  const [productStats] = await Review.aggregate([
    { $match: { productId, moderationStatus: 'APPROVED' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        rating: productStats ? Math.round(productStats.average * 10) / 10 : 0,
        reviewCount: productStats?.count ?? 0,
      },
    },
  );

  const [storeStats] = await Review.aggregate([
    { $match: { sellerId, moderationStatus: 'APPROVED' } },
    { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Store.updateOne(
    { _id: sellerId },
    {
      $set: {
        rating: storeStats ? Math.round(storeStats.average * 10) / 10 : 0,
        reviewCount: storeStats?.count ?? 0,
      },
    },
  );
};

/**
 * A review may only be created when:
 *  - the buyer owns the order (a mismatch is a 404, not a 403 — see the same
 *    pattern in orders.service.ts),
 *  - the order actually contains that product,
 *  - the order is DELIVERED,
 *  - this buyer has not already reviewed this product for this order.
 *
 * `verifiedPurchase` is hardcoded true here, never read from the request —
 * every review this function can produce passed a DELIVERED-order check to
 * exist at all.
 */
export const createReview = async (buyer: IUser, input: CreateReviewInput) => {
  if (!mongoose.isValidObjectId(input.orderId) || !mongoose.isValidObjectId(input.productId)) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  const order = await Order.findById(input.orderId);
  if (!order || String(order.buyerId) !== String(buyer._id)) {
    throw new AppError(404, 'Order not found', 'ORDER_NOT_FOUND');
  }

  const item = order.items.find((line) => String(line.productId) === input.productId);
  if (!item) {
    throw new AppError(404, 'This product is not part of that order', 'ORDER_ITEM_NOT_FOUND');
  }

  if (order.orderStatus !== 'DELIVERED') {
    throw new AppError(
      409,
      'You can review a product once your order has been delivered',
      'ORDER_NOT_DELIVERED',
      { orderStatus: order.orderStatus },
    );
  }

  const existing = await Review.findOne({
    buyerId: buyer._id,
    orderId: order._id,
    productId: item.productId,
  });
  if (existing) {
    throw new AppError(409, 'You already reviewed this product for this order', 'ALREADY_REVIEWED');
  }

  // Orders placed before a seller had a Store (or for a product never linked
  // to one) may not carry item.sellerId — fall back to looking the store up
  // from the seller's account rather than failing the whole review.
  const sellerId =
    item.sellerId ??
    (item.sellerUserId
      ? (await Store.findOne({ userId: item.sellerUserId }))?._id
      : undefined);

  if (!sellerId) {
    throw new AppError(500, 'This product has no store to review', 'STORE_NOT_FOUND');
  }

  let review: IReview;
  try {
    review = await Review.create({
      buyerId: buyer._id,
      buyerName: buyer.name,
      sellerId,
      productId: item.productId,
      productName: item.productName,
      orderId: order._id,
      orderItemProductId: item.productId,
      rating: input.rating,
      comment: input.comment,
      images: input.images ?? [],
      verifiedPurchase: true,
      moderationStatus: 'APPROVED',
    });
  } catch (error) {
    // The unique index is the backstop for two identical requests racing
    // each other past the findOne check above.
    if ((error as { code?: number }).code === 11000) {
      throw new AppError(409, 'You already reviewed this product for this order', 'ALREADY_REVIEWED');
    }
    throw error;
  }

  await recomputeAggregates(item.productId, sellerId);

  return toReviewResponse(review);
};

export const listProductReviews = async (productId: string, query: ListProductReviewsQuery) => {
  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  }

  const sort: Record<string, 1 | -1> =
    query.sort === 'oldest'
      ? { createdAt: 1 }
      : query.sort === 'highest'
        ? { rating: -1, createdAt: -1 }
        : query.sort === 'lowest'
          ? { rating: 1, createdAt: -1 }
          : { createdAt: -1 };

  const filter = { productId, moderationStatus: 'APPROVED' as const };
  const skip = (query.page - 1) * query.limit;

  // find()/countDocuments() cast a string productId to ObjectId themselves;
  // an aggregation $match does not, so it needs the real type or it silently
  // matches nothing.
  const aggregateFilter = {
    productId: new mongoose.Types.ObjectId(productId),
    moderationStatus: 'APPROVED' as const,
  };

  const [reviews, total, ratingStats] = await Promise.all([
    Review.find(filter).sort(sort).skip(skip).limit(query.limit),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: aggregateFilter },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const bucket of ratingStats) {
    breakdown[bucket._id as 1 | 2 | 3 | 4 | 5] = bucket.count;
  }

  return {
    reviews: reviews.map(toReviewResponse),
    ratingBreakdown: breakdown,
    total,
    page: query.page,
    limit: query.limit,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
};
