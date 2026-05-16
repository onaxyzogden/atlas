/**
 * Portal routes — tests for portal config CRUD.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, projectRow, portalRow,
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

const downloadMock = vi.fn();
vi.mock('../services/storage/StorageProvider.js', () => ({
  getStorageProvider: () => ({ download: downloadMock }),
}));

import { buildApp } from '../app.js';

let app: FastifyInstance;
let authToken: string;

const validPortalPayload = {
  slug: 'test-farm-portal',
  isPublished: true,
  heroTitle: 'Welcome to Test Farm',
  heroSubtitle: 'Regenerative agriculture in action',
  missionStatement: 'Our mission is regenerative farming.',
  sections: ['hero', 'mission', 'map'],
  donationUrl: null,
  inquiryEmail: null,
  dataMaskingLevel: 'full',
  curatedHotspots: [],
  brandColor: '#2D5016',
  beforeAfterPairs: [],
  storyScenes: [],
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('POST /api/v1/projects/:id/portal', () => {
  it('creates portal config and returns 201', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // INSERT ... ON CONFLICT ... RETURNING *
    enqueue(portalRow({ config: validPortalPayload }));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validPortalPayload,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.isPublished).toBe(true);
    expect(body.data.shareToken).toBeTruthy();
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      payload: validPortalPayload,
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/projects/:id/portal', () => {
  it('returns 200 with portal config', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(portalRow()); // portal query

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.shareToken).toBeTruthy();
  });

  it('returns 404 when no portal exists', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no portal found

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

// WS5 P2 (spec §5.1.2) — tokenized, unauthenticated, view-only report
// share. The route streams the frozen PDF bytes through the API; the
// raw storage URL is never exposed. Gate is `reportShare.published`,
// independent of the storytelling `is_published` flag.
describe('GET /api/v1/portal/:shareToken/report.pdf (public)', () => {
  const SHARE_TOKEN = '11111111-2222-3333-4444-555555555555';

  beforeEach(() => {
    downloadMock.mockReset();
  });

  it('streams the PDF (200) when reportShare.published is true', async () => {
    downloadMock.mockResolvedValue(Buffer.from('%PDF-1.4 frozen snapshot'));
    enqueue({
      report_share: JSON.stringify({
        published: true,
        storageKey: 'exports/test-proj/capital_partner_summary.pdf',
      }),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/portal/${SHARE_TOKEN}/report.pdf`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    // Unpublish must be immediate — no caching of the resolved snapshot.
    expect(res.headers['cache-control']).toContain('no-store');
    expect(downloadMock).toHaveBeenCalledWith(
      'exports/test-proj/capital_partner_summary.pdf',
    );
  });

  it('returns 404 when reportShare.published is false (unpublished)', async () => {
    enqueue({
      report_share: JSON.stringify({
        published: false,
        storageKey: 'exports/test-proj/capital_partner_summary.pdf',
      }),
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/portal/${SHARE_TOKEN}/report.pdf`,
    });

    expect(res.statusCode).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('returns 404 for an absent / tampered token', async () => {
    enqueue(); // no row for this token

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/portal/00000000-0000-0000-0000-000000000000/report.pdf`,
    });

    expect(res.statusCode).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('returns 404 when no reportShare block exists (storytelling-only portal)', async () => {
    enqueue({ report_share: null });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/portal/${SHARE_TOKEN}/report.pdf`,
    });

    expect(res.statusCode).toBe(404);
    expect(downloadMock).not.toHaveBeenCalled();
  });
});
