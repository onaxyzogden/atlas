/**
 * authTokens — single-use token helpers for email verification + password reset.
 *
 * A token is a 32-byte random value, base64url-encoded, handed to the user in
 * an emailed link. Only its sha256 hash is stored in the database, so a DB leak
 * exposes no usable links. On confirm we hash the presented raw token and look
 * it up by hash (see routes/auth/index.ts).
 */

import { randomBytes, createHash } from 'node:crypto';

/** Email-verification links stay valid for 24 hours. */
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Password-reset links are higher-value, so they expire faster — 1 hour. */
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

/** sha256 hex of a raw token — used both at creation and at confirm-time lookup. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Generate a fresh token. Returns the raw value (for the email link), its hash
 * (for storage), and the absolute expiry computed from `ttlMs`.
 */
export function generateToken(ttlMs: number): { raw: string; hash: string; expiresAt: Date } {
  const raw = randomBytes(32).toString('base64url');
  return {
    raw,
    hash: hashToken(raw),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}
