import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../errors/app-error';

export function assertEmailConfigured() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPassword || !env.mailFrom) {
    throw new AppError(503, 'Email verification is temporarily unavailable. Please try again later.', 'EMAIL_NOT_CONFIGURED');
  }
}

/**
 * One transport per send, closed straight after. The failure message is
 * deliberately generic: it must never leak SMTP credentials, whether the
 * recipient exists, or the code/token being delivered.
 */
async function sendMail(to: string, subject: string, text: string, failureMessage: string) {
  assertEmailConfigured();
  const transport = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    requireTLS: env.smtpPort !== 465,
    auth: { user: env.smtpUser, pass: env.smtpPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    const result = await transport.sendMail({ from: env.mailFrom, to, subject, text });
    if (!result.accepted.length || result.rejected.length) throw new Error('Recipient rejected');
  } catch {
    throw new AppError(503, failureMessage, 'EMAIL_DELIVERY_FAILED');
  } finally {
    transport.close();
  }
}

export async function sendVerificationEmail(email: string, code: string) {
  await sendMail(
    email,
    'Your KhmerCraft verification code',
    `Your KhmerCraft verification code is ${code}. It expires in 10 minutes. Do not share this code. If you did not request it, ignore this email.`,
    'We could not send your verification email. Please try again shortly.',
  );
}

export async function sendPasswordResetEmail(email: string, resetUrl: string, expiresInMinutes: number) {
  await sendMail(
    email,
    'Reset your KhmerCraft password',
    `Someone asked to reset the password for your KhmerCraft account.\n\n` +
      `Open this link to choose a new one:\n${resetUrl}\n\n` +
      `The link expires in ${expiresInMinutes} minutes and can only be used once. ` +
      `If you did not request this, you can ignore this email — your password stays unchanged.`,
    'We could not send your reset email. Please try again shortly.',
  );
}
