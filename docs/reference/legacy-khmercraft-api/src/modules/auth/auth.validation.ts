import { z } from 'zod';
import { USER_ROLES } from '../../../models/User';

const email = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(254)
  .transform((value) => value.toLowerCase());

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/\d/, 'Password must include a number');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
    confirmPassword: z.string(),
    phone: z.string().trim().min(8).max(30).optional(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Register-as-seller, in one step: an account plus a store, rather than the
 * two-step buyer-signs-up-then-creates-a-store flow under /api/sellers. Kept
 * in step with the stronger password/email rules `register` already uses,
 * even though the version this was ported from predates them.
 */
export const registerSellerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password,
    confirmPassword: z.string(),
    phone: z.string().trim().min(8).max(30).optional(),
    storeName: z.string().trim().min(2).max(120),
    category: z.string().trim().min(2).max(80),
    description: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verifyEmailSchema = z
  .object({
    email,
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  })
  .strict();

export const resendCodeSchema = z.object({ email }).strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1).max(72),
    // SELLER was missing, so a seller account could never sign in — the
    // storefront login sends expectedRole and the request was rejected before
    // credentials were even checked. Kept in step with USER_ROLES.
    expectedRole: z.enum(USER_ROLES).optional(),
  })
  .strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(32).max(256),
    password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendCodeInput = z.infer<typeof resendCodeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
