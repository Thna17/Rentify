import jwt, { JwtPayload } from 'jsonwebtoken';
import { USER_ROLES, UserRole } from '../../models/User';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export const AUTH_COOKIE_NAME = 'khmercraft_access';
export const REFRESH_COOKIE_NAME = 'khmercraft_refresh';

export interface AuthTokenPayload extends JwtPayload {
  sub: string;
  role: UserRole;
  ver: number;
}

export const signAccessToken = (
  userId: string,
  role: UserRole,
  tokenVersion: number,
) =>
  jwt.sign({ role, ver: tokenVersion }, env.jwtSecret, {
    subject: userId,
    expiresIn: env.jwtExpiresInSeconds,
    algorithm: 'HS256',
    issuer: 'khmer-craft-api',
    audience: 'khmer-craft-web',
  });

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  try {
    const payload = jwt.verify(token, env.jwtSecret, {
      // Pinning the algorithm blocks "alg": "none" and algorithm-confusion
      // attacks, where a token asks to be verified a way we never intended.
      algorithms: ['HS256'],
      issuer: 'khmer-craft-api',
      audience: 'khmer-craft-web',
    });

    if (
      typeof payload === 'string' ||
      !payload.sub ||
      !USER_ROLES.includes(payload.role) ||
      typeof payload.ver !== 'number'
    ) {
      throw new Error('Invalid token payload');
    }

    return payload as AuthTokenPayload;
  } catch {
    throw new AppError(401, 'Authentication is required', 'UNAUTHENTICATED');
  }
};

export const authCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict' as const,
  maxAge: env.jwtExpiresInSeconds * 1000,
  path: '/',
};

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'strict' as const,
  maxAge: env.refreshTokenExpiresInDays * 24 * 60 * 60 * 1000,
  path: '/auth',
};
