const nodemailer = require("nodemailer");
require("dotenv").config();

const RESEND_EMAILS_URL = "https://api.resend.com/emails";
const RESEND_FALLBACK_FROM = "Rentify <onboarding@resend.dev>";
const RESEND_DEFAULT_FROM = "Rentify <auth@send.mekhla.digital>";
const NOTIFICATION_TIMEOUT_MS = 8000;

/**
 * Sends email via Resend API (same provider as Arunreah clinic)
 */
async function postResend(from, recipient, apiKey, subject, html) {
  const to = Array.isArray(recipient) ? recipient : [recipient];
  const response = await fetch(RESEND_EMAILS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
    signal: AbortSignal.timeout(NOTIFICATION_TIMEOUT_MS),
  });

  if (response.ok) {
    const data = await response.json().catch(() => ({}));
    return { ok: true, data };
  }

  const errorBody = await response.text().catch(() => "");
  return { ok: false, status: response.status, statusText: response.statusText, errorBody };
}

/**
 * Delivers email using Resend with automatic sandbox fallback
 */
async function deliverViaResend(to, subject, html, apiKey) {
  const primaryFrom =
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.RESEND_FROM ||
    RESEND_DEFAULT_FROM;

  let result = await postResend(primaryFrom, to, apiKey, subject, html);

  if (!result.ok) {
    console.error("Resend email delivery failed:", {
      status: result.status,
      statusText: result.statusText,
      from: primaryFrom,
      recipient: to,
      error: result.errorBody,
    });

    // If custom domain is not verified yet in Resend (HTTP 403), fallback to onboarding@resend.dev
    const isDomainError =
      result.status === 403 || result.errorBody?.toLowerCase().includes("domain");

    if (isDomainError && primaryFrom !== RESEND_FALLBACK_FROM) {
      console.warn("Attempting Resend fallback with onboarding@resend.dev");
      result = await postResend(RESEND_FALLBACK_FROM, to, apiKey, subject, html);
      if (result.ok) {
        return { success: true };
      }
    }

    throw new Error(`Resend email delivery failed: ${result.errorBody || result.statusText}`);
  }

  return { success: true };
}

/**
 * Fallback to standard SMTP if RESEND_API_KEY is not configured
 */
function createSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;

  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  if (host) {
    const secure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === "true"
        : port === 465;
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  if (user && !user.toLowerCase().endsWith("@gmail.com")) {
    return nodemailer.createTransport({
      host: "mail.privateemail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

let smtpTransporter = null;

async function sendEmail(to, subject, html) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (resendApiKey) {
    return await deliverViaResend(to, subject, html, resendApiKey);
  }

  // Fallback to SMTP
  try {
    if (!smtpTransporter) {
      smtpTransporter = createSmtpTransporter();
    }
    const fromAddress =
      process.env.EMAIL_FROM_ADDRESS ||
      process.env.SMTP_FROM ||
      `"Rentify" <${process.env.SMTP_USER}>`;

    return await smtpTransporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Error sending email via SMTP: ", error);
    throw error;
  }
}

module.exports = { sendEmail };
