/**
 * Answer one question: can this machine actually deliver email right now?
 *
 * Registration and password reset both degrade *silently* when SMTP is not
 * configured — accounts are auto-verified and reset links go to the server
 * log — which is correct behaviour but indistinguishable, from the outside,
 * from "the code never arrived". This script makes the difference explicit
 * and surfaces the provider's real rejection text (wrong app password,
 * blocked sign-in, bad host) instead of the deliberately vague 503 the API
 * returns to end users.
 *
 *   npm run check:email                 # verify the connection only
 *   npm run check:email you@example.com # ...and send a real test message
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

const findEnvFile = () => {
  let directory = __dirname;
  for (;;) {
    const candidate = path.join(directory, '.env.local');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
};

const envFile = findEnvFile();
if (!envFile) {
  console.error('No .env.local found. Copy apps/api/.env.example to apps/api/.env.local.');
  process.exit(1);
}
dotenv.config({ path: envFile });

const REQUIRED = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'] as const;

async function main() {
  console.log(`Reading ${envFile}\n`);

  // Report presence only. Printing a password here would put it in the
  // terminal scrollback and shell history of whoever ran this.
  const missing: string[] = [];
  for (const key of REQUIRED) {
    const value = process.env[key];
    const set = Boolean(value && value.length > 0);
    if (!set) missing.push(key);
    console.log(`  ${set ? 'OK     ' : 'MISSING'}  ${key}`);
  }
  console.log(`  set       SMTP_PORT=${process.env.SMTP_PORT ?? '587 (default)'}\n`);

  if (missing.length) {
    console.error(`Email is DISABLED: ${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} empty.`);
    console.error('While it is disabled, no verification code and no password-reset email can be sent.');
    console.error('New accounts are created already-verified instead, so registration still works.');
    if (missing.includes('SMTP_PASSWORD') && process.env.SMTP_HOST?.includes('gmail')) {
      console.error('\nFor Gmail this must be a 16-character App Password, not the account password:');
      console.error('  https://myaccount.google.com/apppasswords  (requires 2-Step Verification)');
    }
    process.exit(1);
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  try {
    await transport.verify();
    console.log(`Connected and authenticated to ${process.env.SMTP_HOST}:${port}.`);
  } catch (error) {
    console.error(`\nCould not authenticate to ${process.env.SMTP_HOST}:${port}`);
    console.error(`  ${(error as Error).message}`);
    console.error('\nA "535 Username and Password not accepted" here means the app password is wrong or revoked.');
    process.exit(1);
  }

  const recipient = process.argv[2];
  if (!recipient) {
    console.log('\nConnection is fine. To send a real test message:');
    console.log('  npm run check:email you@example.com');
    transport.close();
    return;
  }

  try {
    const result = await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: recipient,
      subject: 'KhmerCraft SMTP test',
      text: 'If you are reading this, KhmerCraft can send verification codes and password-reset links.',
    });
    console.log(`\nAccepted for delivery to: ${result.accepted.join(', ') || '(none)'}`);
    if (result.rejected.length) console.log(`Rejected: ${result.rejected.join(', ')}`);
    console.log('Check the inbox — and the spam folder, which is where a first message from a new sender usually lands.');
  } catch (error) {
    console.error(`\nSend failed: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    transport.close();
  }
}

void main();
