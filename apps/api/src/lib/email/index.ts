/**
 * Email module — transport selection + the two app-level messages.
 *
 * Transport is chosen once at import from config:
 *   - EMAIL_TRANSPORT=resend AND RESEND_API_KEY set  → Resend (real mail)
 *   - otherwise (default)                            → console (logs to stdout)
 * If resend is requested but the key is missing we warn and fall back to
 * console — fail-soft, matching the GAEZ/SoilGrids "absent = disabled" pattern
 * in app.ts, so a misconfigured key never takes the API down.
 *
 * All new config is defaulted, so existing .env / CI boot unchanged.
 */

import { config } from '../config.js';
import type { EmailMessage, EmailTransport } from './types.js';
import { consoleTransport } from './consoleTransport.js';
import { createResendTransport } from './resendTransport.js';

function selectTransport(): EmailTransport {
  if (config.EMAIL_TRANSPORT === 'resend') {
    if (config.RESEND_API_KEY) {
      return createResendTransport(config.RESEND_API_KEY, config.EMAIL_FROM);
    }
    // eslint-disable-next-line no-console
    console.warn('[email] EMAIL_TRANSPORT=resend but RESEND_API_KEY is unset — falling back to console transport');
  }
  return consoleTransport;
}

const transport = selectTransport();

/** True when real mail is being sent (i.e. not the console fallback). */
export const emailIsLive = transport.name !== 'console';

/** The active transport's name — handy for a startup log line. */
export const emailTransportName = transport.name;

/** Low-level send. Resolves on success; throws on transport failure. */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  await transport.send(msg);
}

function verifyLink(token: string): string {
  return `${config.APP_PUBLIC_URL}/verify-email?token=${encodeURIComponent(token)}`;
}

function resetLink(token: string): string {
  return `${config.APP_PUBLIC_URL}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendVerificationEmail(to: string, rawToken: string): Promise<void> {
  const link = verifyLink(rawToken);
  await sendEmail({
    to,
    subject: 'Verify your OGDEN Atlas email',
    text: [
      'Welcome to OGDEN Atlas.',
      '',
      'Confirm your email address by opening this link (valid for 24 hours):',
      link,
      '',
      "If you did not create this account, you can ignore this message.",
    ].join('\n'),
    html: [
      '<p>Welcome to OGDEN Atlas.</p>',
      '<p>Confirm your email address (link valid for 24 hours):</p>',
      `<p><a href="${link}">Verify my email</a></p>`,
      "<p>If you did not create this account, you can ignore this message.</p>",
    ].join(''),
  });
}

export async function sendPasswordResetEmail(to: string, rawToken: string): Promise<void> {
  const link = resetLink(rawToken);
  await sendEmail({
    to,
    subject: 'Reset your OGDEN Atlas password',
    text: [
      'We received a request to reset your OGDEN Atlas password.',
      '',
      'Choose a new password using this link (valid for 1 hour):',
      link,
      '',
      "If you did not request this, you can safely ignore this message — your password will not change.",
    ].join('\n'),
    html: [
      '<p>We received a request to reset your OGDEN Atlas password.</p>',
      '<p>Choose a new password (link valid for 1 hour):</p>',
      `<p><a href="${link}">Reset my password</a></p>`,
      "<p>If you did not request this, you can safely ignore this message — your password will not change.</p>",
    ].join(''),
  });
}
