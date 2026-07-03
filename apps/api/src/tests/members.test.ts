/**
 * Members routes — tests for project member management and RBAC.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_USER_ID_2, TEST_EMAIL, TEST_EMAIL_2,
  TEST_PROJ_ID, NOW_DATE, projectRow, memberRow, userRow,
} from './helpers/fixtures.js';

vi.mock('../plugins/database.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock
      fastify.decorate('db', mockDb);
      fastify.addHook('onClose', async () => {});
    }),
  };
});

vi.mock('../plugins/redis.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      // @ts-expect-error — mock
      fastify.decorate('redis', { quit: vi.fn().mockResolvedValue('OK') });
      fastify.addHook('onClose', async () => {});
    }),
  };
});

import { buildApp } from '../app.js';

let app: FastifyInstance;
let ownerToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  ownerToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('GET /api/v1/projects/:id/members', () => {
  it('returns 200 with member list', async () => {
    // resolveProjectRole (owner shortcut — 1 query)
    enqueue(projectRow());
    // Owner query: SELECT p.owner_id AS user_id, u.email, u.display_name, p.created_at AS joined_at
    enqueue({ user_id: TEST_USER_ID, email: TEST_EMAIL, display_name: 'Test User', joined_at: NOW_DATE });
    // Members query: SELECT pm.user_id, u.email, u.display_name, pm.role, pm.joined_at
    enqueue(memberRow());

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/v1/projects/:id/members', () => {
  it('returns 201 for valid invite', async () => {
    // resolveProjectRole (owner shortcut)
    enqueue(projectRow());
    // Find user by email
    enqueue(userRow({ id: TEST_USER_ID_2, email: TEST_EMAIL_2 }));
    // Check project owner: SELECT owner_id FROM projects
    enqueue({ owner_id: TEST_USER_ID });
    // Upsert member: INSERT ... ON CONFLICT DO UPDATE
    enqueue();
    // Select member for response
    enqueue(memberRow({ user_id: TEST_USER_ID_2, role: 'designer' }));
    // logActivity INSERT
    enqueue();

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/members`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { email: TEST_EMAIL_2, role: 'designer' },
    });

    expect(res.statusCode).toBe(201);
  });
});

describe('PATCH /api/v1/projects/:id/members/:userId/operational-roles', () => {
  it('returns 403 when a non-manager member targets ANOTHER member', async () => {
    // resolveProjectRole: owner shortcut misses (foreign owner_id), falls
    // through to the project_members lookup — caller is a designer, which
    // has edit but NOT manage_members (projectRoleCapabilities.ts), and the
    // target is another user, so the self-service branch does not apply.
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'designer' });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/members/${TEST_USER_ID_2}/operational-roles`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { operationalRoles: ['food_production'] },
    });

    expect(res.statusCode).toBe(403);
  });

  it('lets a member set their OWN operational roles (self-service path)', async () => {
    // resolveProjectRole: foreign owner, then the caller's member row.
    enqueue(projectRow({ owner_id: TEST_USER_ID_2 }));
    enqueue({ role: 'team_member' });
    // Handler: SELECT owner_id, metadata FROM projects (target ≠ owner ⇒ member path)
    enqueue({ owner_id: TEST_USER_ID_2, metadata: {} });
    // Member path: SELECT role FROM project_members (operationalRolesApplyTo gate)
    enqueue({ role: 'team_member' });
    // UPDATE project_members SET operational_roles
    enqueue();
    // Re-select member for the response envelope
    enqueue(memberRow({
      user_id: TEST_USER_ID,
      role: 'team_member',
      operational_roles: ['food_production'],
    }));
    // logActivity INSERT
    enqueue();

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${TEST_PROJ_ID}/members/${TEST_USER_ID}/operational-roles`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { operationalRoles: ['food_production'] },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.operationalRoles).toEqual(['food_production']);
  });
});

describe('DELETE /api/v1/projects/:id/members/:userId', () => {
  it('removes a member', async () => {
    // resolveProjectRole (owner shortcut)
    enqueue(projectRow());
    // Check existing member
    enqueue({ user_id: TEST_USER_ID_2 });
    // DELETE member
    enqueue();
    // logActivity INSERT
    enqueue();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${TEST_PROJ_ID}/members/${TEST_USER_ID_2}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBeLessThan(300);
  });
});
