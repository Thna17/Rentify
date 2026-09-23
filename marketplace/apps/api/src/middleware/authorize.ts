import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../../models/User';
import { AppError } from '../errors/app-error';

export const authorize =
  (...allowedRoles: UserRole[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    if (!request.auth) {
      return next(
        new AppError(401, 'Authentication is required', 'UNAUTHENTICATED'),
      );
    }

    if (!allowedRoles.includes(request.auth.role)) {
      return next(
        new AppError(403, 'You do not have permission to do this', 'FORBIDDEN'),
      );
    }

    return next();
  };
