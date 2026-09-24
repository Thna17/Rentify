import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  changePassword,
  currentUser,
  forgotPassword,
  login,
  logout,
  refresh,
  register,
  registerSeller,
  resendCode,
  resetPassword,
  verifyEmail,
} from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  registerSellerSchema,
  resendCodeSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation';
import {
  loginRateLimit,
  passwordResetRateLimit,
  registrationRateLimit,
} from '../../middleware/security';

const router = Router();

router.post(
  '/register',
  registrationRateLimit,
  validate(registerSchema),
  register,
);
router.post(
  '/register-seller',
  registrationRateLimit,
  validate(registerSellerSchema),
  registerSeller,
);
router.post(
  '/verify-email',
  loginRateLimit,
  validate(verifyEmailSchema),
  verifyEmail,
);
router.post(
  '/resend-code',
  passwordResetRateLimit,
  validate(resendCodeSchema),
  resendCode,
);
router.post('/login', loginRateLimit, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post(
  '/forgot-password',
  passwordResetRateLimit,
  validate(forgotPasswordSchema),
  forgotPassword,
);
router.post(
  '/reset-password',
  passwordResetRateLimit,
  validate(resetPasswordSchema),
  resetPassword,
);
router.patch(
  '/change-password',
  authenticate,
  authorize('BUYER', 'SELLER'),
  validate(changePasswordSchema),
  changePassword,
);
router.get('/me', authenticate, currentUser);

export default router;
