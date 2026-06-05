/**
 * Conformance guard for the Act->Observe objective link.
 *
 * The Act execution panel stamps each recorded ObserveDataPoint with
 * `sourceObjectiveId` (the Plan objective it was recorded against), and the
 * Observe Domain Detail list resolves that id back to an objective title via
 * `findObjectiveAcrossCatalogues` to render a provenance chip. These invariants
 * guard (a) backward-compatible defaulting of the new field, (b) lossless
 * round-trip, and (c) that every universal objective id resolves to a title so
 * the chip never silently drops.
 */

import { describe, expect, it } from 'vitest';
import {
  ObserveDataPointSchema,
  UNIVERSAL_PLAN_OBJECTIVES,
  findObjectiveAcrossCatalogues,
} from '@ogden/shared';

const BASE = {
  id: 'pt-1',
  projectId: 'proj-1',
  domainId: 'soil',
  sourceType: 'manual_observation',
  statusOutput: 'clear',
  capturedAt: '2026-05-31T10:00:00.000Z',
  capturedBy: 'act-tier',
} as const;

describe('ObserveDataPoint sourceObjectiveId link', () => {
  it('defaults sourceObjectiveId to null when omitted (backward-compat)', () => {
    const parsed = ObserveDataPointSchema.parse({ ...BASE });
    expect(parsed.sourceObjectiveId).toBe(null);
  });

  it('round-trips a set sourceObjectiveId', () => {
    const parsed = ObserveDataPointSchema.parse({
      ...BASE,
      sourceObjectiveId: 's2-terrain',
    });
    expect(parsed.sourceObjectiveId).toBe('s2-terrain');
  });

  it('every universal objective id resolves to a title (chip never drops)', () => {
    const unresolved = UNIVERSAL_PLAN_OBJECTIVES.filter(
      (o) => !findObjectiveAcrossCatalogues(o.id)?.title,
    ).map((o) => o.id);
    expect(unresolved).toEqual([]);
  });
});
