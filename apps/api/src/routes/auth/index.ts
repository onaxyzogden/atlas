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
}

interface AuthResponse {
  token: string;
  user: AuthUser;
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

    const [user] = await db`
      INSERT INTO users (email, display_name, password_hash, auth_provider)
      VALUES (${body.email}, ${body.displayName ?? null}, ${passwordHash}, 'local')
      RETURNING id, email, display_name
    `;

    const token = fastify.jwt.sign(
      { sub: user!.id, email: user!.email },
      { expiresIn: '7d' },
    );

    reply.code(201);
    return {
      data: {
        token,
        user: {
          id: user!.id as string,
          email: user!.email as string,
          displayName: (user!.display_name ?? null) as string | null,
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

    return {
      data: {
        id: user.id as string,
        email: user.email as string,
        displayName: (user.display_name ?? null) as string | null,
      },
      error: null,
    };
  });
}
