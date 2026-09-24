import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import {
  archiveProduct,
  createProduct,
  getProductDetail,
  listProducts,
  listSellerProducts,
  updateProduct,
} from './catalog.service';
import {
  CreateProductInput,
  UpdateProductInput,
  listProductsQuerySchema,
} from './catalog.validation';

export const list = async (request: Request, response: Response) => {
  const parsed = listProductsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(
      422,
      'Invalid product filters',
      'VALIDATION_ERROR',
      parsed.error.flatten().fieldErrors,
    );
  }

  response.json(await listProducts(parsed.data));
};

export const detail = async (request: Request, response: Response) => {
  response.json(await getProductDetail(param(request, 'id')));
};

/** A seller's own listings — drafts and archived included. */
export const listMine = async (request: Request, response: Response) => {
  const page = Number(request.query.page ?? 1);
  const limit = Math.min(Number(request.query.limit ?? 20), 100);

  response.json(
    await listSellerProducts(
      request.auth!.userId,
      Number.isFinite(page) && page > 0 ? page : 1,
      Number.isFinite(limit) && limit > 0 ? limit : 20,
      typeof request.query.storeId === 'string' ? request.query.storeId : undefined,
    ),
  );
};

export const create = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(
      await createProduct(request.auth!.user, request.body as CreateProductInput),
    );
};

export const update = async (request: Request, response: Response) => {
  response.json(
    await updateProduct(
      request.auth!.user,
      param(request, 'id'),
      request.body as UpdateProductInput,
    ),
  );
};

/** Delist. The product is archived, not removed — see the service for why. */
export const remove = async (request: Request, response: Response) => {
  response.json(
    await archiveProduct(request.auth!.user, param(request, 'id')),
  );
};
