import mongoose, { Document, Model, Schema } from 'mongoose';

export const REVIEW_MODERATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ReviewModerationStatus = (typeof REVIEW_MODERATION_STATUSES)[number];

export interface IReview extends Document {
  buyerId: mongoose.Types.ObjectId;
  buyerName: string;
  sellerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string;
  /**
   * The order and specific line item this review is attached to. Both are
   * required — a review with no order behind it cannot be a Verified
   * Purchase, and this marketplace does not have any other kind.
   */
  orderId: mongoose.Types.ObjectId;
  orderItemProductId: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  images?: string[];
  /**
   * Always computed server-side in `reviews.service.ts` from the order's own
   * status at review time — never accepted from the client. Every review
   * created through the API today is one, because eligibility already
   * requires a DELIVERED order; the field still exists so the response shape
   * doesn't have to change if a non-purchase review path is ever added.
   */
  verifiedPurchase: boolean;
  moderationStatus: ReviewModerationStatus;
  sellerResponse?: string;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyerName: { type: String, required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderItemProductId: { type: Schema.Types.ObjectId, required: true },
    rating: { type: Number, required: true, min: 1, max: 5, index: true },
    comment: { type: String, required: true, maxlength: 2000 },
    images: { type: [String], default: [] },
    verifiedPurchase: { type: Boolean, required: true, default: false },
    moderationStatus: {
      type: String,
      enum: REVIEW_MODERATION_STATUSES,
      // No moderation queue is worked yet, so a review is visible immediately
      // rather than stuck pending forever. See AGENTS notes / migration doc.
      default: 'APPROVED',
      required: true,
      index: true,
    },
    sellerResponse: { type: String, maxlength: 2000 },
    isFlagged: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// The seller's review desk: every review against one of my stores, newest first.
ReviewSchema.index({ sellerId: 1, createdAt: -1 });
// A product's own review list, and its rating aggregate recompute.
ReviewSchema.index({ productId: 1, moderationStatus: 1, createdAt: -1 });
// One review per buyer per product per order — the eligibility check in
// reviews.service.ts enforces this too, but the index is the backstop against
// a race between two identical requests.
ReviewSchema.index(
  { buyerId: 1, orderId: 1, productId: 1 },
  { unique: true },
);

const Review: Model<IReview> =
  (mongoose.models.Review as Model<IReview>) ||
  mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
