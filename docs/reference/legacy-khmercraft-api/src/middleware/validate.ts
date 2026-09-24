import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../errors/app-error';

export const validate =
  (schema: ZodType) =>
  (request: Request, _response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      return next(
        new AppError(
          422,
          'Please check the submitted information',
          'VALIDATION_ERROR',
          result.error.flatten().fieldErrors,
        ),
      );
    }

    request.body = result.data;
    return next();
  };
