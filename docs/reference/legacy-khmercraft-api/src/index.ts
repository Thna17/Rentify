import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import dbConnect from '../lib/mongodb';
import { createApp } from './app';
import { assertEnv, env } from './config/env';

/**
 * Locate .env.local by walking up from this file rather than resolving it
 * against the current working directory. Starting the server from the repo
 * root would otherwise load nothing at all and fail on the JWT_SECRET
 * assertion with no hint that the environment file was simply never found.
 *
 * Walking up also covers both layouts this file runs in: src/ under ts-node,
 * and dist/src/ after a build.
 */
const findEnvFile = () => {
  let directory = __dirname;

  while (true) {
    const candidate = path.join(directory, '.env.local');
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(directory);
    if (parent === directory) {
      return undefined;
    }
    directory = parent;
  }
};

const envFile = findEnvFile();
if (!envFile) {
  console.error(
    'Configuration error: no .env.local found. Copy apps/api/.env.example to apps/api/.env.local.',
  );
  process.exit(1);
}

dotenv.config({ path: envFile });

// Fail fast: a missing JWT_SECRET must stop the process here, not surface as a
// confusing 500 on the first login attempt.
try {
  assertEnv();
} catch (error) {
  console.error(`Configuration error: ${(error as Error).message}`);
  process.exit(1);
}

/**
 * Email degrades quietly by design (see auth.service.ts#register): with no
 * provider configured, accounts are auto-verified rather than waiting on a
 * code nothing can deliver. Quietly is the problem — from the outside it is
 * indistinguishable from "the code never arrived", so say it once at boot.
 */
if (!env.isEmailConfigured) {
  const missing = (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM'] as const).filter(
    (key) => !process.env[key],
  );
  console.warn(
    `[email] DISABLED — ${missing.join(', ')} not set in .env.local. ` +
      'No verification codes or password-reset emails will be sent; new accounts ' +
      'are created already-verified instead. Diagnose with: npm run check:email',
  );
}

const port = process.env.PORT || 3001;
const app = createApp();

dbConnect()
  .then(() => {
    app.listen(port, () => {
      console.log(`KhmerCraft API running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exitCode = 1;
  });
