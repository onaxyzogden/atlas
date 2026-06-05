/**
 * Auth routes — issue and verify JWT tokens, plus email verification + reset.
 *
 * POST /api/v1/auth/register              — create account, return token
 * POST /api/v1/auth/login                 — verify credentials, return token
 * GET  /api/v1/auth/me                    — verify existing token, return user info
 * POST /api/v1/auth/verify-email/request  — (re)send a verification email
 * POST /api/v1/auth/verify-email/confirm  — confirm a verification token
 * POST /api/v1/auth/forgot-password       — send a reset link
 * POST /api/v1/auth/reset-password        — set a new password from a reset token
 *
 * Verification is a SOFT GATE: login is allowed while email_verified is false;
 * the flag is surfaced to the client, not enforced as a wall.
 */

import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError, UnauthorizedError } from '../../lib/errors.js';
import {
  generateToken,
  hashToken,
  EMAIL_VERIFY_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from '../../lib/authTokens.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../../lib/email/index.js';

const RegisterInput = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  displayName: z.string().max(100).optional(),
});

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const EmailInput = z.object({
  email: z.string().email(),
});

const TokenInput = z.object({
  token: z.string().min(1),
});

const ResetPasswordInput = z.object({
  token: z.string().min(1),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  defaultOrgId: string;
  emailVerified: boolean;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

/** Personal-workspace name for an auto-created default org at register time. */
function defaultOrgNameFor(displayName: string | null | undefined, email: string): string {
  const handle = (displayName ?? email.split('@')[0] ?? 'My').trim() || 'My';
  return `${handle}'s Workspace`;
}

/** A used-or-expired-or-missing token is always the same 400 — never a 401. */
function assertTokenUsable(
  row: { used_at?: unknown; expires_at?: unknown } | undefined,
): asserts row is { used_at: unknown; expires_at: unknown } {
  // CRITICAL: this MUST be a 400, not a 401. apiClient.ts fires a global
  // session-expiry logout on any 401 with code UNAUTHORIZED/INVALID_TOKEN — a
  // 401 here would log a signed-in user out merely for opening a stale link.
  if (!row || row.used_at != null) {
    throw new AppError('INVALID_TOKEN', 'This link is invalid or has already been used', 400);
  }
  if (new Date(row.expires_at as string | Date).getTime() < Date.now()) {
    throw new AppError('INVALID_TOKEN', 'This link has expired', 400);
  }
}

export default async function authRoutes(fastify: FastifyInstance) {
  const { db, authenticate } = fastify;

  // ── POST /register ─────────────────────────────────────────────────────────

  fastify.post('/register', async (req, reply) => {
    const body = RegisterInput.parse(req.body);

    // Check for existing email
    const [existing] = await db`
      SELECT id FROM users WHERE email = ${body.email} LIMIT 1
    `;
    if (existing) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(body.password, 10);
    const orgName = defaultOrgNameFor(body.displayName, body.email);
    const verifyToken = generateToken(EMAIL_VERIFY_TTL_MS);

    // Wrap user + personal-org + owner-membership + verification token in one tx
    // so a register either produces a fully-attached user or rolls back cleanly.
    // Phase 4.5 invariant: every user owns at least one org from the moment of
    // register.
    const { user, defaultOrgId } = await db.begin(async (sql: any) => {
      const [newUser] = await sql`
        INSERT INTO users (email, display_name, password_hash, auth_provider)
        VALUES (${body.email}, ${body.displayName ?? null}, ${passwordHash}, 'local')
        RETURNING id, email, display_name
      `;

      const [newOrg] = await sql`
        INSERT INTO organizations (name)
        VALUES (${orgName})
        RETURNING id
      `;

      await sql`
        INSERT INTO organization_members (org_id, user_id, role)
        VALUES (${newOrg!.id}, ${newUser!.id}, 'owner')
      `;

      await sql`
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES (${newUser!.id}, ${verifyToken.hash}, ${verifyToken.expiresAt})
      `;

      return { user: newUser!, defaultOrgId: newOrg!.id as string };
    });

    // Send AFTER commit, and never let mail downtime fail a registration —
    // the account exists; the user can re-request verification.
    try {
      await sendVerificationEmail(user.email as string, verifyToken.raw);
    } catch (err) {
      fastify.log.warn(`Verification email failed to send for ${user.email}: ${err}`);
    }

    const token = fastify.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '7d' },
    );

    reply.code(201);
    return {
      data: {
        token,
        user: {
          id: user.id as string,
          email: user.email as string,
          displayName: (user.display_name ?? null) as string | null,
          defaultOrgId,
          emailVerified: false,
        },
      } satisfies AuthResponse,
      error: null,
    };
  });

  // ── POST /login ────────────────────────────────────────────────────────────

  fastify.post('/login', async (req) => {
    const body = LoginInput.parse(req.body);

    const [user] = await db`
      SELECT id, email, display_name, password_hash, email_verified
      FROM users
      WHERE email = ${body.email}
      LIMIT 1
    `;

    // Same message for "not found" and "wrong password" — avoid leaking which case
    const invalid = new UnauthorizedError('Invalid email or password');

    if (!user || !user.password_hash) throw invalid;

    const matches = await bcrypt.compare(body.password, user.password_hash as string);
    if (!matches) throw invalid;

    // Earliest owner-role org is the user's personal default workspace (Phase 4.5).
    // Pre-Phase-4.5 users without an owner-role org are backfilled by migration 036.
    const [defaultOrg] = await db`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${user.id} AND role = 'owner'
      ORDER BY joined_at ASC
      LIMIT 1
    `;

    if (!defaultOrg) {
      // Should never happen post-migration-036; surface loudly if it does.
      throw new UnauthorizedError('Account has no default organization. Please contact support.');
    }

    const token = fastify.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '7d' },
    );

    return {
      data: {
        token,
        user: {
          id: user.id as string,
          email: user.email as string,
          displayName: (user.display_name ?? null) as string | null,
          defaultOrgId: defaultOrg.org_id as string,
          emailVerified: Boolean(user.email_verified),
        },
      } satisfies AuthResponse,
      error: null,
    };
  });

  // ── GET /me ────────────────────────────────────────────────────────────────

  fastify.get('/me', { preHandler: [authenticate] }, async (req) => {
    const [user] = await db`
      SELECT id, email, display_name, email_verified FROM users WHERE id = ${req.userId} LIMIT 1
    `;

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const [defaultOrg] = await db`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${user.id} AND role = 'owner'
      ORDER BY joined_at ASC
      LIMIT 1
    `;

    if (!defaultOrg) {
      throw new UnauthorizedError('Account has no default organization. Please contact support.');
    }

    return {
      data: {
        id: user.id as string,
        email: user.email as string,
        displayName: (user.display_name ?? null) as string | null,
        defaultOrgId: defaultOrg.org_id as string,
        emailVerified: Boolean(user.email_verified),
      },
      error: null,
    };
  });

  // ── POST /verify-email/request ───────────────────────────────────────────────
  // Anti-enumeration: always 200 with the same generic body. We only create +
  // send a token when an unverified account actually matches.

  fastify.post('/verify-email/request', async (req) => {
    const body = EmailInput.parse(req.body);

    const [user] = await db`
      SELECT id, email, email_verified FROM users WHERE email = ${body.email} LIMIT 1
    `;

    if (user && !user.email_verified) {
      const t = generateToken(EMAIL_VERIFY_TTL_MS);
      await db`
        INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${t.hash}, ${t.expiresAt})
      `;
      try {
        await sendVerificationEmail(user.email as string, t.raw);
      } catch (err) {
        fastify.log.warn(`Verification email failed to resend for ${user.email}: ${err}`);
      }
    }

    return { data: { sent: true }, error: null };
  });

  // ── POST /verify-email/confirm ───────────────────────────────────────────────
  // On success we also mint a fresh token + user so the landing page can sign
  // the user straight in (mirrors the login response shape).

  fastify.post('/verify-email/confirm', async (req) => {
    const body = TokenInput.parse(req.body);
    const tokenHash = hashToken(body.token);

    const [row] = await db`
      SELECT t.id AS token_id, t.user_id, t.expires_at, t.used_at,
             u.email, u.display_name
      FROM email_verification_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE t.token_hash = ${tokenHash}
      LIMIT 1
    `;

    assertTokenUsable(row as { used_at: unknown; expires_at: unknown } | undefined);

    await db.begin(async (sql: any) => {
      await sql`UPDATE users SET email_verified = true, updated_at = now() WHERE id = ${(row as any).user_id}`;
      await sql`UPDATE email_verification_tokens SET used_at = now() WHERE id = ${(row as any).token_id}`;
    });

    const [defaultOrg] = await db`
      SELECT org_id
      FROM organization_members
      WHERE user_id = ${(row as any).user_id} AND role = 'owner'
      ORDER BY joined_at ASC
      LIMIT 1
    `;

    if (!defaultOrg) {
      throw new UnauthorizedError('Account has no default organization. Please contact support.');
    }

    const token = fastify.jwt.sign(
      { sub: (row as any).user_id, email: (row as any).email },
      { expiresIn: '7d' },
    );

    return {
      data: {
        verified: true,
        token,
        user: {
          id: (row as any).user_id as string,
          email: (row as any).email as string,
          displayName: ((row as any).display_name ?? null) as string | null,
          defaultOrgId: defaultOrg.org_id as string,
          emailVerified: true,
        },
      } satisfies { verified: true } & AuthResponse,
      error: null,
    };
  });

  // ── POST /forgot-password ─────────────────────────────────────────────────────
  // Anti-enumeration: always the same generic 200.

  fastify.post('/forgot-password', async (req) => {
    const body = EmailInput.parse(req.body);

    const [user] = await db`
      SELECT id, email FROM users WHERE email = ${body.email} LIMIT 1
    `;

    if (user) {
      const t = generateToken(PASSWORD_RESET_TTL_MS);
      await db`
        INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${t.hash}, ${t.expiresAt})
      `;
      try {
        await sendPasswordResetEmail(user.email as string, t.raw);
      } catch (err) {
        fastify.log.warn(`Password-reset email failed to send for ${user.email}: ${err}`);
      }
    }

    return { data: { sent: true }, error: null };
  });

  // ── POST /reset-password ──────────────────────────────────────────────────────
  // Single-use: stamping every outstanding reset token for the user invalidates
  // the one just used AND any other links sitting in inboxes. No auto-login.

  fastify.post('/reset-password', async (req) => {
    const body = ResetPasswordInput.parse(req.body);
    const tokenHash = hashToken(body.token);

    const [row] = await db`
      SELECT id AS token_id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;

    assertTokenUsable(row as { used_at: unknown; expires_at: unknown } | undefined);

    const passwordHash = await bcrypt.hash(body.password, 10);

    await db.begin(async (sql: any) => {
      await sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = now() WHERE id = ${(row as any).user_id}`;
      await sql`UPDATE password_reset_tokens SET used_at = now() WHERE user_id = ${(row as any).user_id} AND used_at IS NULL`;
    });

    return { data: { reset: true }, error: null };
  });
}
