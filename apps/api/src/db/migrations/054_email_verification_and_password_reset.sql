-- Migration 054: email verification + forgot/reset password
--
-- Adds an email_verified flag to users (soft gate — login still allowed when
-- false; the flag is surfaced, not a wall) plus two single-use, hashed-token
-- tables backing the verification and password-reset flows.
--
-- Existing accounts are grandfathered to verified so nobody is locked out of a
-- live site after this ships; only NEW signups start unverified.

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false;

UPDATE users SET email_verified = true WHERE created_at < now();

-- Tokens are stored as a sha256 hex hash of a 32-byte random value. The raw
-- token only ever travels in the emailed link — a DB leak yields no usable
-- links. Lookup on confirm is by token_hash (indexed). used_at enforces
-- single use; expires_at enforces the TTL (24h verify / 1h reset, set in code).

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON email_verification_tokens (user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  token_hash  text NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens (user_id);
