import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import { AUTH_COOKIE_NAME, authCookieOptions, signAccessToken } from '../../utils/jwt';
import {
  applyToBecomeSeller,
  createStore,
  flagReview,
  getPublicStore,
  getStoreOrders,
  getStoreProfile,
  getStoreReviews,
  listMyStores,
  listPublicStores,
  listSellerApplications,
  replyToReview,
  reviewSellerApplication,
  updateStoreProfile,
} from './sellers.service';
import {
  CreateSellerApplicationInput,
  CreateStoreInput,
  ReplyToReviewInput,
  ReviewSellerApplicationInput,
  UpdateStoreProfileInput,
  listStoreOrdersQuerySchema,
  listStoreReviewsQuerySchema,
  listStoresQuerySchema,
} from './sellers.validation';

const parseQuery = <T>(schema: { safeParse: (v: unknown) => { success: boolean; data?: T; error?: any } }, query: unknown): T => {
  const parsed = schema.safeParse(query);
  if (!parsed.success) {
    throw new AppError(422, 'Invalid query parameters', 'VALIDATION_ERROR', parsed.error!.flatten().fieldErrors);
  }
  return parsed.data!;
};

// ------------------------------------------------------------------ public

export const listStores = async (request: Request, response: Response) => {
  response.json(await listPublicStores(parseQuery(listStoresQuerySchema, request.query)));
};

export const getStore = async (request: Request, response: Response) => {
  response.json(await getPublicStore(param(request, 'storeId')));
};

// ------------------------------------------------------------------- owner

export const getMyStores = async (request: Request, response: Response) => {
  response.json(await listMyStores(request.auth!.userId));
};

/**
 * Creating a store is how a signed-in user becomes a seller. When that
 * promotes their role, the access token already on the request was signed
 * with the old one — reissue it here, exactly like login does, or the next
 * request fails `authenticate`'s role check.
 */
export const create = async (request: Request, response: Response) => {
  const { store, roleChanged } = await createStore(
    request.auth!.userId,
    request.body as CreateStoreInput,
  );

  if (roleChanged) {
    const user = request.auth!.user;
    const token = signAccessToken(String(user._id), 'SELLER', user.token_version);
    response.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
  }

  response.status(201).json(store);
};

export const getProfile = async (request: Request, response: Response) => {
  response.json(await getStoreProfile(param(request, 'storeId'), request.auth!.userId));
};

export const updateProfile = async (request: Request, response: Response) => {
  response.json(
    await updateStoreProfile(
      param(request, 'storeId'),
      request.auth!.userId,
      request.body as UpdateStoreProfileInput,
    ),
  );
};

export const getOrders = async (request: Request, response: Response) => {
  const query = parseQuery(listStoreOrdersQuerySchema, request.query);
  response.json(await getStoreOrders(param(request, 'storeId'), request.auth!.userId, query));
};

export const getReviews = async (request: Request, response: Response) => {
  const query = parseQuery(listStoreReviewsQuerySchema, request.query);
  response.json(await getStoreReviews(param(request, 'storeId'), request.auth!.userId, query));
};

export const replyReview = async (request: Request, response: Response) => {
  response.json(
    await replyToReview(
      param(request, 'storeId'),
      request.auth!.userId,
      param(request, 'reviewId'),
      request.body as ReplyToReviewInput,
    ),
  );
};

export const flagReviewHandler = async (request: Request, response: Response) => {
  response.json(
    await flagReview(param(request, 'storeId'), request.auth!.userId, param(request, 'reviewId')),
  );
};

// ------------------------------------------------------------ applications

export const apply = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await applyToBecomeSeller(request.auth!.userId, request.body as CreateSellerApplicationInput));
};

/** ADMIN-only — see the `authorize('ADMIN')` gate in sellers.routes.ts. */
export const listApplications = async (_request: Request, response: Response) => {
  response.json(await listSellerApplications());
};

/** ADMIN-only — approve, reject, start reviewing, or suspend an application. */
export const reviewApplication = async (request: Request, response: Response) => {
  response.json(
    await reviewSellerApplication(
      request.auth!.userId,
      param(request, 'applicationId'),
      request.body as ReviewSellerApplicationInput,
    ),
  );
};
