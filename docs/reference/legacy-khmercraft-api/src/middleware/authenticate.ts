import { NextFunction, Request, Response } from 'express';
import User, { IUser, UserRole } from '../../models/User';
import { AppError } from '../errors/app-error';
import {
  AUTH_COOKIE_NAME,
  verifyAccessToken,
} from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        role: UserRole;
        user: IUser;
      };
    }
  }
}

export const authenticate = async (
  request: Request,
  _response: Response,
  next: NextFunction,
) => {
  try {
    const bearer = request.headers.authorization;
    const token =
      request.cookies?.[AUTH_COOKIE_NAME] ??
      (bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined);

    if (!token) {
      throw new AppError(401, 'Authentication is required', 'UNAUTHENTICATED');
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    // The token's own claims are never trusted on their own: the user is
    // re-read on every request so a demotion, suspension, or password change
    // takes effect immediately rather than when the token happens to expire.
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      user.role !== payload.role ||
      user.token_version !== payload.ver
    ) {
      throw new AppError(401, 'Authentication is required', 'UNAUTHENTICATED');
    }

    request.auth = {
      userId: user.id,
      role: user.role,
      user,
    };
    next();
  } catch (error) {
    next(error);
  }
};
