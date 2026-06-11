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

// In-memory redis stand-in — get/setex/del back the portal public-payload
// cache (services/portal/portalCache.ts); exposed so tests can pre-seed
// keys and assert invalidation.
const redisStore = new Map<string, string>();
vi.mock('../plugins/redis.js', async () => {
  const { default: fp } = await import('fastify-plugin');
  return {
    default: fp(async (fastify: FastifyInstance) => {
      const redisMock = {
        get: async (key: string) => redisStore.get(key) ?? null,
        setex: async (key: string, _ttl: number, value: string) => {
          redisStore.set(key, value);
          return 'OK';
        },
        del: async (key: string) => (redisStore.delete(key) ? 1 : 0),
        quit: vi.fn().mockResolvedValue('OK'),
      };
      // @ts-expect-error — partial mock of the Redis client surface
      fastify.decorate('redis', redisMock);
      fastify.addHook('onClose', async () => {});
    }),
  };
});

const downloadMock = vi.fn();
vi.mock('../services/storage/StorageProvider.js', () => ({
  getStorageProvider: () => ({ download: downloadMock }),
}));

// Stub the PDF generator — the report-publish route constructs it inline;
// the real one launches puppeteer.
const generateMock = vi.fn();
vi.mock('../services/pdf/PdfExportService.js', () => ({
  PdfExportService: class {
    generate = generateMock;
  },
}));

import { buildApp } from '../app.js';
import { portalCacheKey } from '../services/portal/portalCache.js';

const CACHE_KEY = portalCacheKey('share-token-abc123');

/** Flush the fire-and-forget `void setCachedPortal(...)` microtask. */
const flushCacheWrite = () => new Promise((r) => setTimeout(r, 0));

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
beforeEach(() => { clearQueue(); redisStore.clear(); });

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

// Launch-readiness D2/D4 — best-effort Redis cache on the public JSON
// route + explicit invalidation from every authenticated mutation.
describe('GET /api/v1/portal/:shareToken (public, cached)', () => {
  it('returns 200 with meta.cached=false on a cold cache and writes the cache', async () => {
    enqueue(portalRow({ config: validPortalPayload, project_name: 'Test Farm' }));

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.shareToken).toBe('share-token-abc123');
    expect(body.data.projectName).toBe('Test Farm');
    expect(body.meta).toEqual({ cached: false });

    await flushCacheWrite();
    expect(redisStore.has(CACHE_KEY)).toBe(true);
  });

  it('serves the second request from cache without touching the DB', async () => {
    enqueue(portalRow({ config: validPortalPayload, project_name: 'Test Farm' }));

    const first = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123',
    });
    expect(first.statusCode).toBe(200);
    await flushCacheWrite();

    // DB queue is now empty — a cache miss here would dequeue nothing and 404.
    const second = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123',
    });

    expect(second.statusCode).toBe(200);
    const body = JSON.parse(second.body);
    expect(body.meta).toEqual({ cached: true });
    expect(body.data).toEqual(JSON.parse(first.body).data);
  });

  it('does not negative-cache a 404 (unknown token stays a DB lookup)', async () => {
    enqueue(); // no row

    const miss = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123',
    });
    expect(miss.statusCode).toBe(404);
    await flushCacheWrite();
    expect(redisStore.size).toBe(0);

    // Next request must reach the DB again and succeed.
    enqueue(portalRow({ config: validPortalPayload, project_name: 'Test Farm' }));
    const hit = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123',
    });
    expect(hit.statusCode).toBe(200);
    expect(JSON.parse(hit.body).meta).toEqual({ cached: false });
  });
});

describe('portal cache invalidation on mutations', () => {
  const STALE = JSON.stringify({ stale: true });

  it('POST /projects/:id/portal evicts the cached public payload', async () => {
    redisStore.set(CACHE_KEY, STALE);
    enqueue(projectRow()); // resolveProjectRole
    enqueue(portalRow({ config: validPortalPayload }));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: validPortalPayload,
    });

    expect(res.statusCode).toBe(201);
    expect(redisStore.has(CACHE_KEY)).toBe(false);
  });

  it('POST /projects/:id/portal/report evicts the cached public payload', async () => {
    redisStore.set(CACHE_KEY, STALE);
    generateMock.mockResolvedValue({
      id: 'export-1',
      storageKey: 'exports/test-proj/capital_partner_summary.pdf',
      generatedAt: '2026-06-11T00:00:00.000Z',
    });
    enqueue(projectRow()); // resolveProjectRole
    enqueue(portalRow({ config: validPortalPayload }));

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal/report`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(201);
    expect(redisStore.has(CACHE_KEY)).toBe(false);
  });

  it('DELETE /projects/:id/portal/report evicts the cached public payload', async () => {
    redisStore.set(CACHE_KEY, STALE);
    enqueue(projectRow()); // resolveProjectRole
    enqueue({ id: 'portal-1', share_token: 'share-token-abc123' });

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${TEST_PROJ_ID}/portal/report`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.unpublished).toBe(true);
    expect(redisStore.has(CACHE_KEY)).toBe(false);
  });
});

// Per-route @fastify/rate-limit overrides (launch-readiness D4). Each test
// uses a dedicated remoteAddress so its bucket is isolated from the
// functional tests above (default 127.0.0.1) and from the other limit test.
describe('public portal rate limits', () => {
  it('429s the 61st request to GET /portal/:shareToken within a minute', async () => {
    // First request populates the cache; the rest are cache hits, so a
    // single DB row covers all 60 allowed requests.
    enqueue(portalRow({ config: validPortalPayload, project_name: 'Test Farm' }));

    for (let i = 0; i < 60; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/portal/share-token-abc123',
        remoteAddress: '10.99.0.1',
      });
      expect(res.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123',
      remoteAddress: '10.99.0.1',
    });

    expect(blocked.statusCode).toBe(429);
    const body = JSON.parse(blocked.body);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('429s the 11th request to GET /portal/:shareToken/report.pdf within a minute', async () => {
    downloadMock.mockResolvedValue(Buffer.from('%PDF-1.4 frozen snapshot'));

    for (let i = 0; i < 10; i++) {
      enqueue({
        report_share: JSON.stringify({
          published: true,
          storageKey: 'exports/test-proj/capital_partner_summary.pdf',
        }),
      });
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/portal/share-token-abc123/report.pdf',
        remoteAddress: '10.99.0.2',
      });
      expect(res.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'GET',
      url: '/api/v1/portal/share-token-abc123/report.pdf',
      remoteAddress: '10.99.0.2',
    });

    expect(blocked.statusCode).toBe(429);
    expect(JSON.parse(blocked.body).error.code).toBe('RATE_LIMITED');
  });
});
