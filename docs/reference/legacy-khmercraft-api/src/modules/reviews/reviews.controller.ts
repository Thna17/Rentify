import { Request, Response } from 'express';
import { AppError } from '../../errors/app-error';
import { param } from '../../utils/request-params';
import { createReview, listProductReviews } from './reviews.service';
import { CreateReviewInput, listProductReviewsQuerySchema } from './reviews.validation';

export const create = async (request: Request, response: Response) => {
  response
    .status(201)
    .json(await createReview(request.auth!.user, request.body as CreateReviewInput));
};

export const listForProduct = async (request: Request, response: Response) => {
  const parsed = listProductReviewsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    throw new AppError(422, 'Invalid review filters', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors);
  }

  response.json(await listProductReviews(param(request, 'id'), parsed.data));
};
