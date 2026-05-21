/**
 * seedMtcObserveBaseline — restores the canonical MTC Observe-stage
 * land-cover baseline (2 conventional crops + 2 pastures) after a
 * localStorage loss.
 *
 * Background: during the 2026-05-21 F3 field-test resumption a preview
 * screenshot call timed out, the dev server dropped, and on reconnect
 * the `ogden-conventional-crops` and `ogden-pastures` persist keys for
 * project `mtc` rehydrated empty. This seeder re-establishes the
 * pre-test baseline so the sample property is back to its working state.
 *
 * Geometry is hand-authored inside the MTC mock boundary
 * [-78.211, 44.4965] → [-78.189, 44.5035] (mockProject.ts:21-32):
 *   - 2 conventional crops on the north half (Burford sandy-loam band
 *     per diagnose canon)
 *   - 2 pastures on the south half (Guelph loam plateau, supports the
 *     rotational-grazing plan in the canon)
 *
 * Idempotent: refuses to seed if any conventional-crops or pastures
 * already exist for the target project. Exposed as
 * `window.__ogdenSeedMtcObserveBaseline()` for manual replay.
 */

import { useConventionalCropStore } from '../store/conventionalCropStore.js';
import { usePastureStore } from '../store/pastureStore.js';

const MTC_PROJECT_ID = 'mtc';

interface SeedResult {
  ok: boolean;
  reason?: string;
  inserted?: { conventionalCrops: number; pastures: number };
}

export function seedMtcObserveBaseline(
  opts: { force?: boolean } = {},
): SeedResult {
  const cropStore = useConventionalCropStore.getState();
  const pastureStore = usePastureStore.getState();

  const existingCrops = cropStore.conventionalCrops.filter(
    (c) => c.projectId === MTC_PROJECT_ID,
  );
  const existingPastures = pastureStore.pastures.filter(
    (p) => p.projectId === MTC_PROJECT_ID,
  );

  if (!opts.force && (existingCrops.length > 0 || existingPastures.length > 0)) {
    const reason = `mtc already has ${existingCrops.length} crops + ${existingPastures.length} pastures; pass { force: true } to overwrite`;
    console.warn('[seedMtcObserveBaseline]', reason);
    return { ok: false, reason };
  }

  if (opts.force) {
    existingCrops.forEach((c) => cropStore.removeConventionalCrop(c.id));
    existingPastures.forEach((p) => pastureStore.removePasture(p.id));
  }

  const now = new Date('2026-05-20T12:00:00Z').toISOString();

  // ── Conventional crops (north half — Burford sandy-loam band) ──────
  cropStore.addConventionalCrop({
    id: 'mtc-crop-north-west',
    projectId: MTC_PROJECT_ID,
    kind: 'annual-row',
    primaryCrop: 'Soy',
    rotationNotes: 'Soy → corn 2-yr rotation; conventional inputs.',
    compaction: 'moderate',
    inputs: 'synthetic',
    tillage: 'reduced',
    irrigation: 'rainfed',
    label: 'North-west field — soy',
    createdAt: now,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-78.2095, 44.5015],
          [-78.2005, 44.5015],
          [-78.2005, 44.5033],
          [-78.2095, 44.5033],
          [-78.2095, 44.5015],
        ],
      ],
    },
  });

  cropStore.addConventionalCrop({
    id: 'mtc-crop-north-east',
    projectId: MTC_PROJECT_ID,
    kind: 'annual-row',
    primaryCrop: 'Corn',
    rotationNotes: 'Corn → soy 2-yr rotation; conventional inputs.',
    compaction: 'moderate',
    inputs: 'synthetic',
    tillage: 'conventional',
    irrigation: 'rainfed',
    label: 'North-east field — corn',
    createdAt: now,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-78.1995, 44.5015],
          [-78.1905, 44.5015],
          [-78.1905, 44.5033],
          [-78.1995, 44.5033],
          [-78.1995, 44.5015],
        ],
      ],
    },
  });

  // ── Pastures (south half — Guelph loam plateau) ────────────────────
  pastureStore.addPasture({
    id: 'mtc-pasture-south-west',
    projectId: MTC_PROJECT_ID,
    kind: 'open-pasture',
    label: 'South-west open pasture',
    notes: 'Pre-existing open grazing; candidate for paddock subdivision in Plan stage.',
    createdAt: now,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-78.2095, 44.4967],
          [-78.2005, 44.4967],
          [-78.2005, 44.4995],
          [-78.2095, 44.4995],
          [-78.2095, 44.4967],
        ],
      ],
    },
  });

  pastureStore.addPasture({
    id: 'mtc-pasture-south-east',
    projectId: MTC_PROJECT_ID,
    kind: 'paddock',
    label: 'South-east paddock',
    notes: 'Existing fenced paddock; awaiting water-point placement before re-stocking.',
    createdAt: now,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-78.1995, 44.4967],
          [-78.1905, 44.4967],
          [-78.1905, 44.4995],
          [-78.1995, 44.4995],
          [-78.1995, 44.4967],
        ],
      ],
    },
  });

  console.log(
    '[seedMtcObserveBaseline] restored 2 conventional crops + 2 pastures on project "mtc"',
  );
  return { ok: true, inserted: { conventionalCrops: 2, pastures: 2 } };
}

if (typeof window !== 'undefined') {
  (window as unknown as { __ogdenSeedMtcObserveBaseline?: typeof seedMtcObserveBaseline }).__ogdenSeedMtcObserveBaseline =
    seedMtcObserveBaseline;
}
