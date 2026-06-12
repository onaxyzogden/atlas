/**
 * Placement guard (Phase 4) — mock-DB tests for the design-features route
 * wiring of apps/api/src/lib/placementGuard.ts.
 *
 * What the FIFO mock CAN prove: mode gating (off/log/enforce), candidate
 * mapping (which rules fire per featureType/subtype, via exact queue
 * alignment — a skipped guard consuming zero row-sets), the 409
 * PLACEMENT_VIOLATION envelope shape, and PATCH-only-on-geometry gating.
 * What it cannot prove — real ST_Covers/ST_DWithin/ST_Intersects geometry —
 * lives in placementGuard.integration.test.ts against live PostGIS.
 *
 * Queue contract per guarded rule (catalog order, ALL matching rules are
 * evaluated — no short-circuit):
 *   within-boundary   → 1 row-set: [{ violated: boolean }]
 *   min-distance-from → 1 row-set: [{ hit: 1 }] = violation, [] = clean
 *   zone-exclusion    → 1 row-set: [{ hit: 1 }] = violation, [] = clean
 * A structure/'well' candidate matches boundary-containment +
 * well-septic-separation + buffer-zone-exclusion → exactly 3 guard queries.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { mockDb, enqueue, clearQueue } from './helpers/testApp.js';
import {
  TEST_USER_ID, TEST_EMAIL, TEST_PROJ_ID, NOW, projectRow,
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
import { config } from '../lib/config.js';
import { candidateForFeature } from '../lib/placementGuard.js';

type GuardMode = 'off' | 'log' | 'enforce';
const setMode = (mode: GuardMode) => {
  (config as { PLACEMENT_GUARD_MODE: GuardMode }).PLACEMENT_GUARD_MODE = mode;
};
const ORIGINAL_MODE = config.PLACEMENT_GUARD_MODE;

let app: FastifyInstance;
let authToken: string;

const FEATURE_ID = 'f0000000-0000-0000-0000-000000000010';
const POINT_GEOM = { type: 'Point', coordinates: [-80.0, 40.0] };

/** Snake_case design_features row for INSERT/UPDATE RETURNING + merge SELECT. */
function featureRow(overrides?: Record<string, unknown>) {
  return {
    id: FEATURE_ID,
    project_id: TEST_PROJ_ID,
    feature_type: 'structure',
    subtype: 'well',
    geometry: POINT_GEOM,
    label: 'Well A',
    properties: {},
    phase_tag: null,
    style: null,
    sort_order: 0,
    created_by: TEST_USER_ID,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function postFeature(payload: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: `/api/v1/design-features/project/${TEST_PROJ_ID}`,
    headers: { authorization: `Bearer ${authToken}` },
    payload,
  });
}

const WELL_PAYLOAD = {
  featureType: 'structure',
  subtype: 'well',
  geometry: POINT_GEOM,
  label: 'Well A',
};

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  authToken = app.jwt.sign({ sub: TEST_USER_ID, email: TEST_EMAIL }, { expiresIn: '1h' });
});

afterAll(async () => { await app.close(); });
beforeEach(() => { clearQueue(); });
afterEach(() => { setMode(ORIGINAL_MODE); });

describe('candidateForFeature mapping', () => {
  it('mirrors featureMapping.ts: subtype is the kind for structure/point, fixed for zone/path', () => {
    expect(candidateForFeature('zone', 'buffer')).toEqual({ kind: 'zone', category: 'zone' });
    expect(candidateForFeature('structure', 'well')).toEqual({ kind: 'well', category: 'structure' });
    expect(candidateForFeature('structure', null)).toEqual({ kind: 'structure', category: 'structure' });
    expect(candidateForFeature('path', 'trail')).toEqual({ kind: 'path', category: 'access' });
    expect(candidateForFeature('point', 'septic')).toEqual({ kind: 'septic', category: 'utility' });
  });

  it('never gates annotations', () => {
    expect(candidateForFeature('annotation', 'buffer-ring')).toBeNull();
  });
});

describe('POST /design-features (enforce mode)', () => {
  beforeEach(() => setMode('enforce'));

  it('409 PLACEMENT_VIOLATION when a septic sits within the well separation distance', async () => {
    enqueue(projectRow());            // resolveProjectRole
    enqueue({ violated: false });     // boundary-containment
    enqueue({ hit: 1 });              // well-septic-separation → violation
    enqueue();                        // buffer-zone-exclusion → clean

    const res = await postFeature(WELL_PAYLOAD);

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('PLACEMENT_VIOLATION');
    expect(body.error.details.violations).toEqual([
      expect.objectContaining({ ruleId: 'well-septic-separation', severity: 'block' }),
    ]);
  });

  it('409 with ruleId boundary-containment when outside the parcel boundary', async () => {
    enqueue(projectRow());
    enqueue({ violated: true });      // boundary-containment → violation
    enqueue();                        // well-septic-separation → clean
    enqueue();                        // buffer-zone-exclusion → clean

    const res = await postFeature(WELL_PAYLOAD);

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error.details.violations.map((v: { ruleId: string }) => v.ruleId))
      .toEqual(['boundary-containment']);
  });

  it('201 when every matching rule is clean', async () => {
    enqueue(projectRow());
    enqueue({ violated: false });
    enqueue();
    enqueue();
    enqueue(featureRow());            // INSERT RETURNING
    enqueue();                        // logActivity INSERT

    const res = await postFeature(WELL_PAYLOAD);

    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).data.id).toBe(FEATURE_ID);
  });

  it('annotations bypass the guard entirely (zero guard queries)', async () => {
    enqueue(projectRow());
    // NO guard row-sets — if the guard ran, the INSERT below would shift a
    // wrong row-set and DesignFeatureSummary.parse would fail the test.
    enqueue(featureRow({ feature_type: 'annotation', subtype: 'buffer-ring', label: 'Ring' }));
    enqueue();                        // logActivity

    const res = await postFeature({
      featureType: 'annotation',
      subtype: 'buffer-ring',
      geometry: POINT_GEOM,
      label: 'Ring',
    });

    expect(res.statusCode).toBe(201);
  });
});

describe('POST /design-features (log + off modes)', () => {
  it('log mode evaluates but never rejects — violating well still 201', async () => {
    setMode('log');
    enqueue(projectRow());
    enqueue({ violated: true });      // boundary violation — logged only
    enqueue({ hit: 1 });              // septic violation — logged only
    enqueue();
    enqueue(featureRow());
    enqueue();                        // logActivity

    const res = await postFeature(WELL_PAYLOAD);

    expect(res.statusCode).toBe(201);
  });

  it('off mode skips evaluation (zero guard queries)', async () => {
    setMode('off');
    enqueue(projectRow());
    enqueue(featureRow());            // INSERT immediately follows role check
    enqueue();                        // logActivity

    const res = await postFeature(WELL_PAYLOAD);

    expect(res.statusCode).toBe(201);
  });
});

describe('PATCH /design-features/:id (enforce mode)', () => {
  beforeEach(() => setMode('enforce'));

  it('409 when a geometry move lands within the separation distance', async () => {
    enqueue({ project_id: TEST_PROJ_ID });  // resolveProjectRoleFromFeature
    enqueue(projectRow());                  // resolveProjectRole
    enqueue(featureRow({ geometry_json: JSON.stringify(POINT_GEOM) })); // merge SELECT
    enqueue({ violated: false });           // boundary-containment
    enqueue({ hit: 1 });                    // well-septic-separation → violation
    enqueue();                              // buffer-zone-exclusion

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/design-features/${FEATURE_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { geometry: { type: 'Point', coordinates: [-80.0001, 40.0] } },
    });

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe('PLACEMENT_VIOLATION');
  });

  it('geometry-less PATCH skips the guard (zero guard queries)', async () => {
    enqueue({ project_id: TEST_PROJ_ID });
    enqueue(projectRow());
    enqueue(featureRow({ geometry_json: JSON.stringify(POINT_GEOM) }));
    enqueue(featureRow({ label: 'Renamed' }));  // UPDATE RETURNING — no guard rows before it
    enqueue();                                  // logActivity

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/design-features/${FEATURE_ID}`,
      headers: { authorization: `Bearer ${authToken}` },
      payload: { label: 'Renamed' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).data.label).toBe('Renamed');
  });
});
