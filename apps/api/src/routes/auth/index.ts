/**
 * Auth routes — issue and verify JWT tokens.
 *
 * POST /api/v1/auth/register  — create account, return token
 * POST /api/v1/auth/login     — verify credentials, return token
 * GET  /api/v1/auth/me        — verify existing token, return user info
 */

import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AppError, UnauthorizedError } from '../../lib/errors.js';

const RegisterInput = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  displayName: z.string().max(100).optional(),
});

const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  defaultOrgId: string;
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

    // Wrap user + personal-org + owner-membership in one tx so a register either
    // produces a fully-attached user or rolls back cleanly. Phase 4.5 invariant:
    // every user owns at least one org from the moment of register.
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

      return { user: newUser!, defaultOrgId: newOrg!.id as string };
    });

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
        },
      } satisfies AuthResponse,
      error: null,
    };
  });

  // ── POST /login ────────────────────────────────────────────────────────────

  fastify.post('/login', async (req) => {
    const body = LoginInput.parse(req.body);

    const [user] = await db`
      SELECT id, email, display_name, password_hash
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
        },
      } satisfies AuthResponse,
      error: null,
    };
  });

  // ── GET /me ────────────────────────────────────────────────────────────────

  fastify.get('/me', { preHandler: [authenticate] }, async (req) => {
    const [user] = await db`
      SELECT id, email, display_name FROM users WHERE id = ${req.userId} LIMIT 1
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
      },
      error: null,
    };
  });
}
