/**
 * Assessment routes — tests for site assessment and data completeness.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, projectRow, layerRow,
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
let authToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });

describe('GET /api/v1/projects/:id/assessment', () => {
  it('returns 200 with assessment data', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // site_assessments query
    enqueue({
      id: 'sa-001',
      project_id: TEST_PROJ_ID,
      is_current: true,
      soil_score: 72,
      water_score: 85,
      elevation_score: 60,
    });
    // terrain_analysis query
    enqueue({
      curvature_profile_mean: 0.01,
      curvature_plan_mean: -0.005,
      curvature_classification: 'gentle_slope',
      curvature_geojson: null,
      confidence: 'high',
      data_sources: ['USGS 3DEP'],
      computed_at: '2026-01-01T00:00:00.000Z',
      viewshed_visible_pct: 78.5,
      viewshed_observer_point: null,
      viewshed_geojson: null,
      frost_pocket_area_pct: 12.3,
      frost_pocket_severity: 'moderate',
      frost_pocket_geojson: null,
      cold_air_drainage_paths: null,
      cold_air_pooling_zones: null,
      cold_air_risk_rating: 'low',
      tpi_classification: null,
      tpi_dominant_class: 'mid_slope',
      tpi_geojson: null,
      elevation_min_m: 185,
      elevation_max_m: 312,
      elevation_mean_m: 248,
      source_api: 'USGS 3DEP',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/assessment`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeTruthy();
    expect(body.data.terrainAnalysis).toBeTruthy();
  });

  it('returns NOT_READY when no assessment exists', async () => {
    enqueue(projectRow()); // resolveProjectRole
    enqueue(); // no site_assessment found

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/assessment`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe('NOT_READY');
  });

  it('returns 401 without auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/assessment`,
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/projects/:id/completeness', () => {
  it('returns 200 with completeness data', async () => {
    enqueue(projectRow()); // resolveProjectRole
    // layers query
    enqueue(
      layerRow({ layer_type: 'elevation', fetch_status: 'complete', confidence: 'high' }),
      layerRow({ layer_type: 'soil', fetch_status: 'complete', confidence: 'medium' }),
    );
    // score query
    enqueue({ score: 75 });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${TEST_PROJ_ID}/completeness`,
      headers: { authorization: `Bearer ${authToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.score).toBe(75);
    expect(body.data.layers).toHaveLength(2);
  });
});
