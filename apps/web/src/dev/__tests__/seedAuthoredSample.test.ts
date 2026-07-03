// @vitest-environment happy-dom
/**
 * capture ↔ seed round-trip + Amanah gates.
 *
 * `captureSampleSeed` (snapshot one authored project) and
 * `seedAuthoredSampleProject` (replay that snapshot into the live stores) are a
 * symmetric pair: both ride the SAME build-guaranteed manifest `select`↔`apply`
 * invariant that `syncManifestRoundTrip.test.ts` already proves per-descriptor.
 * This test proves the ORCHESTRATION on top of it — that walking the manifest,
 * dispatching by `kind` (blob / typed), inserting the project row, and the
 * determinism rewrite compose into a stable capture∘seed∘capture round-trip —
 * plus the two covenant gates (Coherence seal + no advance-sale framing).
 *
 * Fixture exercises both live capture paths at once:
 *   • a `byProject` versioned-blob   → `ogden-coherence-check` (also the seal)
 *   • a typed-design store           → `ogden-zones`
 * The two active-singleton `whole` stores (financial, siting-weights) are
 * captured unconditionally regardless of project, so they ride along and their
 * round-trip stability is asserted implicitly by the whole-`stores` compare.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SAMPLE_SEED_PROJECT_ID } from '@ogden/shared';
import { captureSampleSeed } from '../captureSampleSeed.js';
import { seedAuthoredSampleProject } from '../seedAuthoredSample.js';
import { useProjectStore, type LocalProject } from '../../store/projectStore.js';
import { useCoherenceCheckStore } from '../../store/coherenceCheckStore.js';
import { useZoneStore } from '../../store/zoneStore.js';

/** The fixed epoch every timestamp collapses to (mirrors captureSampleSeed). */
const FIXED_EPOCH = '2026-06-20T00:00:00.000Z';
/** A source runtime projectId distinct from the sentinel it gets rewritten to. */
const FIXTURE_PID = '11111111-1111-4111-8111-111111111111';

// Derive the store element types from the getters rather than importing them —
// the fixtures are opaque to capture (only `projectId` / `sealedAt` are read),
// so this keeps the test decoupled from those modules' internal type surface.
type CoherenceRecord = ReturnType<typeof useCoherenceCheckStore.getState>['byProject'][string];
type ZoneRow = ReturnType<typeof useZoneStore.getState>['zones'][number];

/** A complete, valid LocalProject with all 23 required fields (see interface). */
function makeProject(id: string, overrides: Partial<LocalProject> = {}): LocalProject {
  return {
    id,
    name: 'Round-Trip Test Farm',
    description: null,
    status: 'active',
    projectType: 'homestead',
    country: 'US',
    provinceState: null,
    conservationAuthId: null,
    address: null,
    parcelId: null,
    acreage: null,
    dataCompletenessScore: null,
    hasParcelBoundary: false,
    createdAt: FIXED_EPOCH,
    updatedAt: FIXED_EPOCH,
    parcelBoundaryGeojson: null,
    ownerNotes: null,
    zoningNotes: null,
    accessNotes: null,
    waterRightsNotes: null,
    visionStatement: null,
    units: 'imperial',
    attachments: [],
    ...overrides,
  };
}

/** Seal the project's Coherence Check so it clears the capture precondition. The
 *  `sealedAt` is deliberately NOT the fixed epoch so we can prove normalization. */
function sealCoherence(pid: string, sealedAt = '2025-03-14T12:00:00.000Z'): void {
  useCoherenceCheckStore.setState((s) => ({
    byProject: {
      ...s.byProject,
      [pid]: { sealedAt, itemResolutions: {}, amendments: [] } as unknown as CoherenceRecord,
    },
  }));
}

/** Add one zone owned by `pid` (id kept pid-free so nothing but `projectId` is
 *  rewritten by the determinism pass). */
function addZone(pid: string): void {
  const row = {
    id: 'zone-fixture-1',
    projectId: pid,
    name: 'Test Zone',
    category: 'other',
  } as unknown as ZoneRow;
  useZoneStore.setState((s) => ({
    zones: [...s.zones.filter((z) => z.projectId !== pid), row],
  }));
}

const BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

beforeEach(() => {
  // Isolate: FIXTURE_PID / SAMPLE_SEED_PROJECT_ID are the only pids any test
  // touches, so resetting these three stores is enough (every other store is
  // empty for these pids). financial / siting-weights keep their import-time
  // defaults and are captured identically in both directions.
  useProjectStore.setState({ projects: [], activeProjectId: null });
  useCoherenceCheckStore.setState({ byProject: {} });
  useZoneStore.setState({ zones: [] });
  try {
    localStorage.clear();
  } catch {
    /* localStorage unavailable — sentinel is best-effort anyway */
  }
});

describe('captureSampleSeed ↔ seedAuthoredSampleProject', () => {
  it('captures → seeds → re-captures with a byte-stable snapshot', () => {
    useProjectStore.setState({
      projects: [
        makeProject(FIXTURE_PID, { parcelBoundaryGeojson: BOUNDARY, hasParcelBoundary: true }),
      ],
      activeProjectId: FIXTURE_PID,
    });
    sealCoherence(FIXTURE_PID);
    addZone(FIXTURE_PID);

    const A = captureSampleSeed(FIXTURE_PID);

    // Determinism: the source pid is rewritten to the sentinel everywhere.
    expect(A.projectRow.id).toBe(SAMPLE_SEED_PROJECT_ID);
    expect(A.capturedFrom).toBe(FIXTURE_PID);

    // Both live capture paths are represented.
    const covA = A.stores['ogden-coherence-check'];
    if (!covA || covA.kind !== 'blob') throw new Error('expected a blob coherence capture');
    // The seal timestamp collapsed to the fixed epoch (proves normalization).
    expect((covA.slice as { sealedAt: string }).sealedAt).toBe(FIXED_EPOCH);

    const zA = A.stores['ogden-zones'];
    if (!zA || zA.kind !== 'typed') throw new Error('expected a typed zone capture');
    expect(zA.field).toBe('zones');
    expect((zA.records[0] as { projectId: string }).projectId).toBe(SAMPLE_SEED_PROJECT_ID);

    // Seed the captured snapshot as the authored sample, then re-capture it.
    const res = seedAuthoredSampleProject({ seed: A, force: true });
    expect(res.ok).toBe(true);
    expect(res.pid).toBe(SAMPLE_SEED_PROJECT_ID);
    expect(res.storesApplied).toBe(Object.keys(A.stores).length);

    useProjectStore.setState({ activeProjectId: SAMPLE_SEED_PROJECT_ID });
    const B = captureSampleSeed(SAMPLE_SEED_PROJECT_ID);

    // capture ∘ seed ∘ capture is a fixed point: the whole payload round-trips.
    expect(B.stores).toEqual(A.stores);
    expect(B.projectRow).toEqual(A.projectRow);
    expect(B.boundary).toEqual(A.boundary);
    expect(B.boundary).toEqual(BOUNDARY);
  });

  it('refuses to capture a project whose Coherence Check is not sealed', () => {
    useProjectStore.setState({
      projects: [makeProject(FIXTURE_PID)],
      activeProjectId: FIXTURE_PID,
    });
    // No sealCoherence() → the seal precondition must fail loud.
    expect(() => captureSampleSeed(FIXTURE_PID)).toThrow(/Coherence Check is not sealed/i);
    // …but the explicit override lets it through.
    expect(() => captureSampleSeed(FIXTURE_PID, { allowUnsealed: true })).not.toThrow();
  });

  it('refuses to promote a sample carrying advance-sale / CSA framing', () => {
    useProjectStore.setState({
      projects: [
        makeProject(FIXTURE_PID, {
          // "subscription" trips detectCsaLikeText (bay' ma laysa 'indak).
          visionStatement: 'Fund the farm through a weekly harvest subscription box.',
        }),
      ],
      activeProjectId: FIXTURE_PID,
    });
    sealCoherence(FIXTURE_PID); // clear the seal gate so we reach the covenant gate
    expect(() => captureSampleSeed(FIXTURE_PID)).toThrow(/Amanah gate/i);
  });
});
