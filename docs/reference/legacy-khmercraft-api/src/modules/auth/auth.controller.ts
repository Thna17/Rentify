import { Request, Response } from 'express';
import { env } from '../../config/env';
import {
  AUTH_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  authCookieOptions,
  refreshCookieOptions,
} from '../../utils/jwt';
import { authService } from './auth.service';

const setSessionCookies = (
  response: Response,
  accessToken: string,
  refreshToken: string,
) => {
  response.cookie(AUTH_COOKIE_NAME, accessToken, authCookieOptions);
  response.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
};

export const register = async (request: Request, response: Response) => {
  const result = await authService.register(request.body);

  if (!result.requiresVerification) {
    setSessionCookies(response, result.accessToken, result.refreshToken);
    response.status(201).json({
      message: 'Account created successfully',
      user: result.user,
    });
    return;
  }

  response.status(201).json({
    message: 'Check your email for your verification code',
    email: result.email,
  });
};

export const registerSeller = async (request: Request, response: Response) => {
  const result = await authService.registerSeller(request.body);
  setSessionCookies(response, result.accessToken, result.refreshToken);
  response.status(201).json({
    message: 'Store created successfully',
    user: result.user,
    store: {
      id: String(result.store._id),
      slug: result.store.slug,
      storeName: result.store.storeName,
    },
  });
};

export const verifyEmail = async (request: Request, response: Response) => {
  const result = await authService.verifyEmail(request.body);
  setSessionCookies(response, result.accessToken, result.refreshToken);
  response.json({
    message: 'Email verified successfully',
    user: result.user,
  });
};

export const resendCode = async (request: Request, response: Response) => {
  await authService.resendCode(request.body);
  response.json({
    message: 'If that email needs verifying, a new code has been sent',
  });
};

export const login = async (request: Request, response: Response) => {
  const result = await authService.login(request.body);
  setSessionCookies(response, result.accessToken, result.refreshToken);
  response.json({
    message: 'Signed in successfully',
    user: result.user,
  });
};

export const refresh = async (request: Request, response: Response) => {
  const result = await authService.refresh(request.cookies?.[REFRESH_COOKIE_NAME]);
  setSessionCookies(response, result.accessToken, result.refreshToken);
  response.json({
    message: 'Session refreshed successfully',
    user: result.user,
  });
};

export const logout = async (request: Request, response: Response) => {
  await authService.logout(request.cookies?.[REFRESH_COOKIE_NAME]);
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  response.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    path: '/auth',
  });
  response.json({ message: 'Signed out successfully' });
};

export const forgotPassword = async (
  request: Request,
  response: Response,
) => {
  const result = await authService.forgotPassword(request.body);
  response.json({
    message:
      'If a buyer account exists for that email, a password reset link has been created',
    ...result,
  });
};

export const resetPassword = async (
  request: Request,
  response: Response,
) => {
  await authService.resetPassword(request.body);
  response.json({ message: 'Password reset successfully' });
};

export const changePassword = async (
  request: Request,
  response: Response,
) => {
  await authService.changePassword(request.auth!.userId, request.body);
  response.json({ message: 'Password changed successfully' });
};

export const currentUser = async (request: Request, response: Response) => {
  response.json({ user: request.auth!.user });
};
