/**
 * Export routes — tests for PDF export listing.
 * POST /exports requires PdfExportService mock (complex service).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, projectRow, exportRow,
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

// Mock PdfExportService to avoid complex internal DB queries
vi.mock('../services/pdf/PdfExportService.js', () => ({
  PdfExportService: vi.fn().mockImplementation(() => ({
    generate: vi.fn().mockResolvedValue({
      id: 'exp-001',
      projectId: 'b0000000-0000-0000-0000-000000000001',
      exportType: 'site_assessment',
      storageUrl: '/exports/test.pdf',
      generatedAt: '2026-01-01T00:00:00.000Z',
    }),
  })),
}));

import { buildApp } from '../app.js';

let app: FastifyInstance;
let authToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('GET /api/v1/projects/:id/exports', () => {
  it('returns 200 with export list', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(exportRow()); // exports query

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/exports`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toHaveLength(1);
  });

  it('returns 200 with empty exports', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no exports

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/exports`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data).toEqual([]);
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/exports`,
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/v1/projects/:id/exports', () => {
  it('creates an export and returns 201', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // PdfExportService.generate is mocked — no DB queries needed
    enqueue(); // logActivity INSERT

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${TEST_PROJ_ID}/exports`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { exportType: 'site_assessment' },
    });

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.exportType).toBe('site_assessment');
  });
});
