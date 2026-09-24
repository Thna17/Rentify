import mongoose, { QueryFilter } from 'mongoose';
import Order, { IOrder } from '../../../models/Order';
import Review, { IReview } from '../../../models/Review';
import Product from '../../../models/Product';
import Store, { IStore } from '../../../models/Store';
import SellerApplication, {
  ISellerApplication,
} from '../../../models/SellerApplication';
import User from '../../../models/User';
import { AppError } from '../../errors/app-error';
import { assertEmailConfigured } from '../../utils/email';
import { compressImage } from '../../utils/image';
import { slugify } from '../../utils/slugify';
import {
  CreateSellerApplicationInput,
  CreateStoreInput,
  ListStoresQuery,
  ListStoreOrdersQuery,
  ListStoreReviewsQuery,
  ReplyToReviewInput,
  ReviewSellerApplicationInput,
  UpdateStoreProfileInput,
} from './sellers.validation';

/**
 * Calls through the (mockable) `assertEmailConfigured` rather than reading
 * env vars directly, matching auth.service.ts#isEmailAvailable — so a test
 * that mocks it also changes what this reports, not just the real env.
 */
const isEmailAvailable = (): boolean => {
  try {
    assertEmailConfigured();
    return true;
  } catch {
    return false;
  }
};

/**
 * Public shape of a store — what any shopper browsing the marketplace sees.
 *
 * `isVerified` means exactly one thing: KhmerCraft has reviewed and approved
 * this seller's profile, contact information and store information. It is
 * not a claim of government verification, and nothing here exposes the
 * application's admin notes or documents.
 */
export const toPublicStore = (seller: IStore) => ({
  id: String(seller._id),
  slug: seller.slug,
  name: seller.storeName,
  location: seller.location ?? null,
  rating: seller.rating,
  reviewCount: seller.reviewCount,
  categoryName: seller.category ?? null,
  description: seller.storeDescription ?? null,
  tagline: seller.storeTagline ?? null,
  announcement: seller.announcement ?? null,
  theme: seller.theme ?? 'FOREST',
  phoneNumber: seller.showContact ? seller.phoneNumber ?? null : null,
  showContact: seller.showContact ?? false,
  featuredProductIds: (seller.featuredProductIds ?? []).map(String),
  logoUrl: seller.storeAvatarUrl ?? null,
  bannerUrl: seller.storeCoverImages?.[0] ?? null,
  isVerified: seller.verificationStatus === 'VERIFIED',
  verifiedAt: seller.verifiedAt ?? null,
  verificationExplanation:
    seller.verificationStatus === 'VERIFIED'
      ? "KhmerCraft has reviewed and approved this seller's profile, contact information and store information."
      : null,
});

/** Private shape — includes the seller's own operational fields. */
const toOwnerStore = (seller: IStore) => ({
  id: String(seller._id),
  slug: seller.slug,
  storeName: seller.storeName,
  storeDescription: seller.storeDescription ?? null,
  storeTagline: seller.storeTagline ?? null,
  announcement: seller.announcement ?? null,
  theme: seller.theme ?? 'FOREST',
  showContact: seller.showContact ?? false,
  featuredProductIds: (seller.featuredProductIds ?? []).map(String),
  location: seller.location ?? null,
  phoneNumber: seller.phoneNumber ?? null,
  logoUrl: seller.storeAvatarUrl ?? null,
  bannerUrl: seller.storeCoverImages?.[0] ?? null,
  subscriptionPlan: seller.subscriptionPlan,
  onboardingStatus: seller.onboardingStatus,
  verificationStatus: seller.verificationStatus,
  verifiedAt: seller.verifiedAt ?? null,
  category: seller.category ?? null,
  rating: seller.rating,
  reviewCount: seller.reviewCount,
});

/** Unique slug; suffix on collision so a second "Silk Heritage" is not blocked. */
const uniqueStoreSlug = async (name: string): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  for (let attempt = 2; await Store.exists({ slug }); attempt += 1) {
    slug = `${base}-${attempt}`;
  }
  return slug;
};

export type PublicStore = ReturnType<typeof toPublicStore>;
export type OwnerStore = ReturnType<typeof toOwnerStore>;

export const listPublicStores = async (query: ListStoresQuery) => {
  const skip = (query.page - 1) * query.limit;
  const [sellers, total] = await Promise.all([
    Store.find({ onboardingStatus: 'COMPLETED' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Store.countDocuments({ onboardingStatus: 'COMPLETED' }),
  ]);

  return {
    stores: sellers.map(toPublicStore),
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
};

/** Looks up by Mongo id or by slug, so `/stores/:storeId` works for both. */
export const getPublicStore = async (idOrSlug: string) => {
  const seller = mongoose.isValidObjectId(idOrSlug)
    ? await Store.findById(idOrSlug)
    : await Store.findOne({ slug: idOrSlug });

  if (!seller || seller.onboardingStatus !== 'COMPLETED') {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  return toPublicStore(seller);
};

/** Every store owned by the signed-in user. Read-only — creating one is a separate action. */
export const listMyStores = async (userId: string) => {
  const sellers = await Store.find({ userId });
  return sellers.map(toOwnerStore);
};

/**
 * A user becomes a seller by creating their first store — there is no
 * separate "upgrade my account" step, this call is the whole onboarding
 * flow. It both finishes the store (subscriptionPlan/paymentMethod are the
 * plan-selection step of the same form) and promotes the account to SELLER.
 *
 * Promoting the role changes what the user's *next* access token must say,
 * but the token already presented for *this* request was signed with the
 * old role — the caller (controller) is responsible for reissuing the
 * session cookies with `roleChanged` in the response, exactly like login
 * does, or the very next request fails `authenticate`'s role check.
 */
export const createStore = async (userId: string, input: CreateStoreInput) => {
  const owner = await User.findById(userId);
  if (!owner || owner.status !== 'ACTIVE') {
    throw new AppError(403, 'This account is not active.', 'ACCOUNT_INACTIVE');
  }
  // Only enforced once a real email provider exists to have verified them
  // with in the first place — see isEmailAvailable above and the same
  // reasoning in auth.service.ts#register.
  if (isEmailAvailable() && !owner.email_verified) {
    throw new AppError(403, 'Verify your email before creating a store.', 'EMAIL_NOT_VERIFIED');
  }
  // If KhmerCraft already approved this seller's application before they
  // finished setting up a store, the store opens already verified — the
  // approval, not the order the two steps happened in, is what matters.
  const approvedApplication = await SellerApplication.findOne({
    userId,
    status: 'APPROVED',
  }).sort({ reviewedAt: -1 });

  const seller = await Store.create({
    userId,
    storeName: input.storeName,
    slug: await uniqueStoreSlug(input.storeName),
    storeDescription: input.storeDescription,
    location: input.location,
    phoneNumber: input.phoneNumber,
    category: input.category,
    subscriptionPlan: input.subscriptionPlan ?? 'STARTER',
    paymentMethod: input.paymentMethod,
    onboardingStatus: 'COMPLETED',
    verificationStatus: approvedApplication ? 'VERIFIED' : 'UNVERIFIED',
    verifiedAt: approvedApplication ? new Date() : null,
  });

  let roleChanged = false;
  if (input.subscriptionPlan || input.paymentMethod) {
    // Only the "finish onboarding" call (the one that actually picks a plan)
    // promotes the account — creating a second store from an existing
    // seller's dashboard must not touch their role at all.
    const user = await User.findById(userId);
    if (user && user.role === 'BUYER') {
      user.role = 'SELLER';
      await user.save();
      roleChanged = true;
    }
  }

  return { store: toOwnerStore(seller), roleChanged };
};

/**
 * Load a store and confirm the caller owns it — every new owner-gated
 * resource (store categories, collections, storefront config) reuses this
 * exact check rather than duplicating it. Deliberately 404, not 403: a
 * non-owner should not be able to tell a store id exists at all.
 */
export const findOwnedStore = async (storeId: string, userId: string): Promise<IStore> => {
  const seller = await Store.findById(storeId);
  if (!seller || String(seller.userId) !== userId) {
    throw new AppError(404, 'Store not found', 'STORE_NOT_FOUND');
  }
  return seller;
};

export const getStoreProfile = async (storeId: string, userId: string) => {
  const seller = await findOwnedStore(storeId, userId);
  return toOwnerStore(seller);
};

export const updateStoreProfile = async (
  storeId: string,
  userId: string,
  input: UpdateStoreProfileInput,
) => {
  const seller = await findOwnedStore(storeId, userId);

  if (input.storeName !== undefined) seller.storeName = input.storeName;
  if (input.storeDescription !== undefined) seller.storeDescription = input.storeDescription;
  if (input.storeTagline !== undefined) seller.storeTagline = input.storeTagline;
  if (input.announcement !== undefined) seller.announcement = input.announcement;
  if (input.theme !== undefined) seller.theme = input.theme;
  if (input.showContact !== undefined) seller.showContact = input.showContact;
  if (input.location !== undefined) seller.location = input.location;
  if (input.phoneNumber !== undefined) seller.phoneNumber = input.phoneNumber;
  // See utils/image.ts — a logo/banner otherwise rides along on every
  // public store listing forever, not just this store's own page.
  if (input.logoUrl !== undefined)
    seller.storeAvatarUrl = await compressImage(input.logoUrl, 320);
  if (input.bannerUrl !== undefined) {
    const banner = await compressImage(input.bannerUrl, 1280);
    seller.storeCoverImages = banner ? [banner] : [];
  }
  if (input.featuredProductIds !== undefined) {
    const uniqueIds = [...new Set(input.featuredProductIds)];
    const ownedCount = await Product.countDocuments({
      _id: { $in: uniqueIds },
      sellerId: seller._id,
      sellerUserId: seller.userId,
    });
    if (ownedCount !== uniqueIds.length) {
      throw new AppError(422, 'Featured products must belong to this store', 'INVALID_FEATURED_PRODUCTS');
    }
    seller.featuredProductIds = uniqueIds.map((id) => new mongoose.Types.ObjectId(id));
  }

  await seller.save();

  const productPatch: Record<string, string> = {};
  if (input.storeName !== undefined) productPatch.storeName = input.storeName;
  if (input.location !== undefined) productPatch.location = input.location;
  if (Object.keys(productPatch).length) {
    await Product.updateMany({ sellerId: seller._id }, { $set: productPatch });
  }
  return toOwnerStore(seller);
};

// ------------------------------------------------------------------ orders

const DATE_RANGE_TO_SINCE: Record<string, () => Date> = {
  '7d': () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  '30d': () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  month: () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  },
};

export const getStoreOrders = async (
  storeId: string,
  userId: string,
  query: ListStoreOrdersQuery,
) => {
  const store = await findOwnedStore(storeId, userId);
  const storeObjectId = store._id;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [pendingCount, inTransitCount, completed30dCount, revenueResult] = await Promise.all([
    Order.countDocuments({ 'items.sellerId': storeObjectId, orderStatus: 'PENDING' }),
    Order.countDocuments({ 'items.sellerId': storeObjectId, orderStatus: 'SHIPPED' }),
    Order.countDocuments({
      'items.sellerId': storeObjectId,
      orderStatus: 'DELIVERED',
      createdAt: { $gte: thirtyDaysAgo },
    }),
    Order.aggregate([
      { $match: { 'items.sellerId': storeObjectId, paymentStatus: 'PAID', createdAt: { $gte: firstDayOfMonth } } },
      { $unwind: '$items' },
      { $match: { 'items.sellerId': storeObjectId } },
      { $group: { _id: null, totalRevenue: { $sum: '$items.subtotal' } } },
    ]),
  ]);

  const filter: QueryFilter<IOrder> = { 'items.sellerId': storeObjectId };
  if (query.status) {
    filter.orderStatus = query.status;
  }
  if (query.search) {
    const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ orderNumber: searchRegex }, { buyerName: searchRegex }];
  }
  if (query.dateRange) {
    filter.createdAt = mongoose.trusted({ $gte: DATE_RANGE_TO_SINCE[query.dateRange]() });
  }

  const skip = (query.page - 1) * query.limit;
  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Order.countDocuments(filter),
  ]);

  const formattedOrders = orders.map((order) => {
    const myItems = order.items.filter((item) => String(item.sellerId) === String(storeObjectId));
    const myTotal = myItems.reduce((sum, item) => sum + item.subtotal, 0);
    return {
      id: String(order._id),
      orderNumber: order.orderNumber,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      deliveryInfo: order.deliveryInfo,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      createdAt: order.createdAt,
      myItems,
      myTotal,
    };
  });

  return {
    metrics: {
      pendingOrders: pendingCount,
      inTransit: inTransitCount,
      completed30d: completed30dCount,
      revenueMtd: revenueResult[0]?.totalRevenue ?? 0,
    },
    orders: formattedOrders,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
};

// ----------------------------------------------------------------- reviews

const toReviewResponse = (review: IReview) => ({
  id: String(review._id),
  buyerName: review.buyerName,
  productId: String(review.productId),
  productName: review.productName,
  rating: review.rating,
  comment: review.comment,
  sellerResponse: review.sellerResponse ?? null,
  isFlagged: review.isFlagged,
  createdAt: review.createdAt,
});

export const getStoreReviews = async (
  storeId: string,
  userId: string,
  query: ListStoreReviewsQuery,
) => {
  const store = await findOwnedStore(storeId, userId);

  const [statsResult] = await Review.aggregate([
    { $match: { sellerId: store._id } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        stars5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
        stars4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        stars3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        stars2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        stars1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const filter: QueryFilter<IReview> = { sellerId: store._id };
  if (query.rating) {
    filter.rating = query.rating;
  }

  const reviews = await Review.find(filter)
    .sort({ createdAt: query.sort === 'oldest' ? 1 : -1 })
    .limit(50);

  return {
    stats: statsResult ?? {
      averageRating: 0,
      totalReviews: 0,
      stars5: 0,
      stars4: 0,
      stars3: 0,
      stars2: 0,
      stars1: 0,
    },
    reviews: reviews.map(toReviewResponse),
  };
};

const findOwnedReview = async (storeId: string, userId: string, reviewId: string) => {
  const store = await findOwnedStore(storeId, userId);
  const review = await Review.findOne({ _id: reviewId, sellerId: store._id });
  if (!review) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }
  return review;
};

export const replyToReview = async (
  storeId: string,
  userId: string,
  reviewId: string,
  input: ReplyToReviewInput,
) => {
  const review = await findOwnedReview(storeId, userId, reviewId);
  review.sellerResponse = input.response;
  await review.save();
  return toReviewResponse(review);
};

export const flagReview = async (storeId: string, userId: string, reviewId: string) => {
  const review = await findOwnedReview(storeId, userId, reviewId);
  review.isFlagged = true;
  await review.save();
  return toReviewResponse(review);
};

// ------------------------------------------------------------ applications

/**
 * The application form asks for a name/phone/province/category even though
 * the account already has some of that — sellers commonly apply with
 * different contact details than their buyer profile, so nothing here is
 * pre-filled from the User document.
 */
export const applyToBecomeSeller = async (userId: string, input: CreateSellerApplicationInput) => {
  const application = await SellerApplication.create({ userId, ...input });
  return {
    id: String(application._id),
    status: application.status,
    createdAt: application.createdAt,
  };
};

/**
 * Which decisions make sense from which starting status.
 *
 * SUSPENDED only ever follows APPROVED — you cannot suspend an application
 * that was never approved in the first place. REJECTED and APPROVED are
 * terminal outside of that one path.
 */
const ALLOWED_APPLICATION_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: ['SUSPENDED'],
};

/** ADMIN-only: every application, newest first — see sellers.routes.ts for the role gate. */
export const listSellerApplications = async () => {
  const applications = await SellerApplication.find({}).sort({ createdAt: -1 });
  return applications.map((application) => ({
    id: String(application._id),
    userId: String(application.userId),
    firstName: application.firstName,
    lastName: application.lastName,
    phoneNumber: application.phoneNumber,
    province: application.province,
    primaryCategory: application.primaryCategory,
    status: application.status,
    submittedAt: application.submittedAt,
    reviewedBy: application.reviewedBy ? String(application.reviewedBy) : null,
    reviewedAt: application.reviewedAt ?? null,
    rejectionReason: application.rejectionReason ?? null,
    createdAt: application.createdAt,
  }));
};

/**
 * ADMIN-only: move an application through its review lifecycle.
 *
 * Approving stamps the applicant's Store as verified immediately if one
 * already exists (a seller can apply before or after finishing onboarding);
 * if there is no store yet, `createStore` checks for the approved
 * application itself and verifies the new store right away — see there.
 * Suspending an already-approved seller removes the verified badge but does
 * not (yet) unpublish their products or block sign-in; that enforcement is
 * deferred to the seller-lifecycle phase.
 */
export const reviewSellerApplication = async (
  adminUserId: string,
  applicationId: string,
  input: ReviewSellerApplicationInput,
) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    throw new AppError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const application = await SellerApplication.findById(applicationId);
  if (!application) {
    throw new AppError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  }

  const allowed = ALLOWED_APPLICATION_TRANSITIONS[application.status] ?? [];
  if (!allowed.includes(input.decision)) {
    throw new AppError(
      409,
      `Cannot move an application from ${application.status} to ${input.decision}`,
      'ILLEGAL_TRANSITION',
      { from: application.status, to: input.decision, allowed },
    );
  }

  application.status = input.decision;
  application.reviewedBy = new mongoose.Types.ObjectId(adminUserId);
  application.reviewedAt = new Date();
  if (input.rejectionReason !== undefined) application.rejectionReason = input.rejectionReason;
  if (input.adminNotes !== undefined) application.adminNotes = input.adminNotes;
  await application.save();

  if (input.decision === 'APPROVED') {
    await Store.updateOne(
      { userId: application.userId },
      { $set: { verificationStatus: 'VERIFIED', verifiedAt: new Date() } },
    );
  } else if (input.decision === 'SUSPENDED') {
    await Store.updateOne(
      { userId: application.userId },
      { $set: { verificationStatus: 'UNVERIFIED', verifiedAt: null } },
    );
  }

  return {
    id: String(application._id),
    status: application.status,
    reviewedBy: String(application.reviewedBy),
    reviewedAt: application.reviewedAt,
    rejectionReason: application.rejectionReason ?? null,
  };
};
