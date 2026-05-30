// @vitest-environment happy-dom
/**
 * Guard for the curated Moontrance Creek (MTC) Act seed.
 *
 * Promoting the map-first Act shell as the builtin default means MTC lands on
 * View B; this seed is what makes that landing meaningful instead of generic
 * "parcel perimeter" stubs. The invariants below keep the curated set honest:
 *
 *  1. every planObjectiveId / stratumId is a real id from the stratum
 *     catalogue (a typo would orphan the card from its objective);
 *  2. every proofSchemaId resolves in FIELD_ACTION_PROOF_SCHEMAS (else the
 *     Submit gate can never satisfy);
 *  3. every produced action parses against FieldActionSchema;
 *  4. the status spread covers all five View B buckets;
 *  5. the seed is idempotent — a second call (or a parallel call from
 *     seedMtcDemo) never duplicates.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  FIELD_ACTION_PROOF_SCHEMAS,
  FieldActionSchema,
  PLAN_STRATA,
  PLAN_STRATUM_OBJECTIVES,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { seedCuratedMtcActionsIfEmpty } from '../seedCuratedMtcActions.js';

const PROJECT = 'mtc';

const OBJECTIVE_IDS = new Set<string>(PLAN_STRATUM_OBJECTIVES.map((o) => o.id));
const STRATUM_IDS = new Set<string>(PLAN_STRATA.map((s) => s.id));
const PROOF_IDS = new Set<string>(FIELD_ACTION_PROOF_SCHEMAS.map((s) => s.id));

function reset(): void {
  useFieldActionStore.setState({ byProject: {} });
}

describe('seedCuratedMtcActions', () => {
  beforeEach(reset);

  it('seeds a non-trivial curated set for MTC', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    const actions = useFieldActionStore.getState().getByProject(PROJECT);
    expect(actions.length).toBeGreaterThanOrEqual(10);
  });

  it('every action references a real plan objective and stratum', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    for (const a of useFieldActionStore.getState().getByProject(PROJECT)) {
      expect(OBJECTIVE_IDS.has(a.planObjectiveId)).toBe(true);
      expect(STRATUM_IDS.has(a.stratumId)).toBe(true);
    }
  });

  it('every proofSchemaId resolves in the catalogue', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    for (const a of useFieldActionStore.getState().getByProject(PROJECT)) {
      expect(PROOF_IDS.has(a.proofSchemaId)).toBe(true);
    }
  });

  it('every produced action parses against FieldActionSchema', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    for (const a of useFieldActionStore.getState().getByProject(PROJECT)) {
      expect(() => FieldActionSchema.parse(a)).not.toThrow();
    }
  });

  it('covers all five View B status buckets', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    const statuses = new Set(
      useFieldActionStore.getState().getByProject(PROJECT).map((a) => a.status),
    );
    for (const s of [
      'not_started',
      'in_progress',
      'submitted',
      'verified',
      'blocked',
    ]) {
      expect(statuses.has(s as never)).toBe(true);
    }
  });

  it('stamps a completed-today action so the Completed Today section fills', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    const verified = useFieldActionStore
      .getState()
      .getByProject(PROJECT)
      .filter((a) => a.status === 'verified');
    expect(verified.length).toBeGreaterThan(0);
    expect(verified.some((a) => a.doneAt != null)).toBe(true);
  });

  it('is idempotent — a second call does not duplicate', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    const first = useFieldActionStore.getState().getByProject(PROJECT).length;
    seedCuratedMtcActionsIfEmpty(PROJECT);
    const second = useFieldActionStore.getState().getByProject(PROJECT).length;
    expect(second).toBe(first);
  });

  it('uses stable mtc-prefixed ids', () => {
    seedCuratedMtcActionsIfEmpty(PROJECT);
    for (const a of useFieldActionStore.getState().getByProject(PROJECT)) {
      expect(a.id.startsWith(`mtc-${PROJECT}-`)).toBe(true);
    }
  });

  it('no-ops on an empty projectId', () => {
    seedCuratedMtcActionsIfEmpty('');
    expect(useFieldActionStore.getState().getByProject('')).toHaveLength(0);
  });
});
