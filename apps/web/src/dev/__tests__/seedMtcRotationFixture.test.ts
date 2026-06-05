// @vitest-environment happy-dom
/**
 * seedMtcRotationFixture — proves the fixture data actually triggers the two
 * B3-fidelity surfaces in RotationSequenceCard, so the live screenshot is a
 * confirmation rather than a hope:
 *
 *   - S3 follower sub-rows: the projection yields > 0 follower moves (each
 *     fixture paddock lists cattle + sheep + poultry = 3 niche tiers).
 *   - S2 "summer rest +Nd" note: at least one move-calendar entry has
 *     `seasonAdjustedRestDays > restDaysUntilNextGraze` for a northern-
 *     hemisphere project anchored to July (the protein slump).
 *
 * Plus the fixture's shape (3 paddocks, 3-cell plan, start/horizon) and its
 * idempotency guard. The seeder is imported directly (it writes straight to
 * the `'mtc'` slug, no project-row resolution needed).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { projectRotationSequence } from '../../features/livestock/rotationSequenceMath.js';
import { seedMtcRotationFixture } from '../seedMtcRotationFixture.js';

const MTC = 'mtc';
const SENTINEL_KEY = 'mtc-rotation-fixture-seeded@v1';

describe('seedMtcRotationFixture', () => {
  beforeEach(() => {
    useWorkItemStore.setState({ items: [], migratedSources: [] });
    useLivestockStore.setState({ paddocks: [], fenceLines: [] });
    useRotationPlanStore.setState({ byProject: {} });
    try {
      localStorage.removeItem(SENTINEL_KEY);
    } catch {
      /* ignore */
    }
  });

  it('seeds 3 multi-species paddocks + a 3-cell July rotation plan', () => {
    const result = seedMtcRotationFixture({ force: true });
    expect(result.ok).toBe(true);
    expect(result.inserted?.paddocks).toBe(3);
    expect(result.inserted?.rotationCells).toBe(3);

    const paddocks = useLivestockStore
      .getState()
      .paddocks.filter((p) => p.projectId === MTC);
    expect(paddocks).toHaveLength(3);
    for (const p of paddocks) {
      expect(p.species).toEqual(['cattle', 'sheep', 'poultry']);
    }

    const plan = useRotationPlanStore.getState().byProject[MTC];
    expect(plan).toBeDefined();
    expect(plan!.cells).toHaveLength(3);
    expect(plan!.startDateISO).toBe('2026-07-01');
    expect(plan!.horizonCycles).toBe(2);
  });

  it('produces data that triggers BOTH RotationSequenceCard surfaces (NH)', () => {
    seedMtcRotationFixture({ force: true });

    const paddocks = useLivestockStore
      .getState()
      .paddocks.filter((p) => p.projectId === MTC);
    const plan = useRotationPlanStore.getState().byProject[MTC]!;

    // Northern hemisphere (mtc centroid ~44.5°N) — July move-outs hit the slump.
    const projection = projectRotationSequence(paddocks, plan, '2026-07-01', 2, {
      isSouthern: false,
    });

    // S3: follower sub-rows will render.
    expect(projection.followerMoves.length).toBeGreaterThan(0);

    // S2: at least one move shows the "summer rest +Nd" note.
    const hasSummerStretch = projection.calendar.some(
      (e) => e.seasonAdjustedRestDays > e.restDaysUntilNextGraze,
    );
    expect(hasSummerStretch).toBe(true);
  });

  it('is idempotent — a second call without force is a no-op', () => {
    const first = seedMtcRotationFixture({ force: true });
    expect(first.ok).toBe(true);

    const second = seedMtcRotationFixture();
    expect(second.ok).toBe(false);
    expect(second.reason).toMatch(/sentinel|already/i);

    // Still exactly 3 paddocks — no duplication.
    const paddocks = useLivestockStore
      .getState()
      .paddocks.filter((p) => p.projectId === MTC);
    expect(paddocks).toHaveLength(3);
  });
});
