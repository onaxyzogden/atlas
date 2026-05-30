// @vitest-environment happy-dom
//
// Reopen round-trip for the mid-project secondary-type addition flow (OLOS
// Plan Navigation Spec v1.1 section 9, Phase B4). This is the load-bearing
// guarantee of the whole flow: adding a *modifying* secondary to an active
// project must reopen exactly the complete objectives it injects required
// items into - and NOTHING else. No completed work is cleared; unrelated
// objectives stay complete; the addition is recorded append-only in
// versionHistory; and a duplicate add is a silent no-op.
//
// The proven data pair (see computeObjectivesDelta.test.ts) is
// primary `regenerative_farm` + secondary `residential`: an M-class pairing
// that injects 2 required items into the complete `s3-hydrology` objective
// and amends its completion gate. We seed s3-hydrology complete, add
// residential through the live projectStore action, then re-resolve the
// objective set and recompute statuses against the SAME progress map - the
// exact mechanism the production spine + useSecondaryAddPreview use.

import { describe, expect, it, beforeEach } from 'vitest';
import {
  computeAllObjectiveStatuses,
  resolveProjectObjectives,
  type ProjectTypeRecord,
} from '@ogden/shared';
import { useProjectStore } from '../projectStore.js';

const PRIMARY = 'regenerative_farm' as const;
const SECONDARY = 'residential' as const;

/** Build a progress map marking every required item of `objectives` checked. */
function completeAll(
  objectives: ReturnType<typeof resolveProjectObjectives>['objectives'],
): Record<string, boolean> {
  const progress: Record<string, boolean> = {};
  for (const o of objectives) {
    for (const item of o.checklist) {
      if (!item.optional) progress[item.id] = true;
    }
  }
  return progress;
}

function seedProject(): string {
  // Full literal: the inferred ProjectTypeRecord OUTPUT type marks the three
  // arrays required even though Zod `.default([])` makes them optional on parse
  // (the default applies only when parsing, not to a hand-built literal).
  const record: ProjectTypeRecord = {
    primaryTypeId: PRIMARY,
    secondaryTypeIds: [],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  };
  const project = useProjectStore.getState().createProject({
    name: 'Reopen round-trip fixture',
    projectType: 'regenerative_farm',
    country: 'US',
    units: 'metric',
    metadata: { projectTypeRecord: record },
  });
  return project.id;
}

function getRecord(projectId: string): ProjectTypeRecord {
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  const record = project?.metadata?.projectTypeRecord;
  if (!record) throw new Error('expected a projectTypeRecord on the fixture');
  return record;
}

describe('addSecondaryType - reopen round-trip (regenerative_farm + residential)', () => {
  beforeEach(() => {
    // Fresh store between cases so versionHistory counts are deterministic.
    useProjectStore.setState({ projects: [], activeProjectId: null });
  });

  it('flips s3-hydrology complete -> active without clearing completed work', () => {
    const projectId = seedProject();

    // BEFORE: every required item checked across the regen_farm objective set.
    const before = resolveProjectObjectives({
      primaryTypeId: PRIMARY,
      secondaryTypeIds: [],
    }).objectives;
    const progress = completeAll(before);
    const statusBefore = computeAllObjectiveStatuses(before, progress);
    expect(statusBefore['s3-hydrology']).toBe('complete');

    const hydroBefore = before.find((o) => o.id === 's3-hydrology');
    const originalRequiredIds = (hydroBefore?.checklist ?? [])
      .filter((i) => !i.optional)
      .map((i) => i.id);
    expect(originalRequiredIds.length).toBeGreaterThan(0);

    // ACT: add residential through the live store action.
    const ok = useProjectStore
      .getState()
      .addSecondaryType(projectId, SECONDARY);
    expect(ok).toBe(true);

    const record = getRecord(projectId);
    expect(record.secondaryTypeIds).toEqual([SECONDARY]);

    // AFTER: re-resolve and recompute against the SAME progress map. The 2
    // injected required items are absent from progress, so s3-hydrology can no
    // longer be complete.
    const after = resolveProjectObjectives({
      primaryTypeId: PRIMARY,
      secondaryTypeIds: [SECONDARY],
    }).objectives;
    const statusAfter = computeAllObjectiveStatuses(after, progress);
    expect(statusAfter['s3-hydrology']).toBe('active');

    // Completed work is preserved: every original required item still exists
    // on the after-objective AND is still checked. Only the freshly injected
    // items are unchecked.
    const hydroAfter = after.find((o) => o.id === 's3-hydrology');
    const afterRequiredIds = new Set(
      (hydroAfter?.checklist ?? []).filter((i) => !i.optional).map((i) => i.id),
    );
    for (const id of originalRequiredIds) {
      expect(afterRequiredIds.has(id)).toBe(true);
      expect(progress[id]).toBe(true);
    }
    // The injection added net-new required items (the cause of the reopen).
    expect(afterRequiredIds.size).toBeGreaterThan(originalRequiredIds.length);
  });

  it('does not blanket-clear: root objectives with no new items stay complete', () => {
    const projectId = seedProject();
    const before = resolveProjectObjectives({
      primaryTypeId: PRIMARY,
      secondaryTypeIds: [],
    }).objectives;
    const progress = completeAll(before);
    const statusBefore = computeAllObjectiveStatuses(before, progress);

    useProjectStore.getState().addSecondaryType(projectId, SECONDARY);

    const after = resolveProjectObjectives({
      primaryTypeId: PRIMARY,
      secondaryTypeIds: [SECONDARY],
    }).objectives;
    const statusAfter = computeAllObjectiveStatuses(after, progress);
    const afterById = new Map(after.map((o) => [o.id, o]));

    // Any objective that (a) was complete before, (b) has no prerequisites,
    // and (c) gained no required items must remain complete - it has no path
    // to lose its status. This proves the reopen is a targeted re-resolution,
    // not a blanket clear.
    let checked = 0;
    for (const o of before) {
      if (statusBefore[o.id] !== 'complete') continue;
      if (o.prerequisiteObjectiveIds.length > 0) continue;
      const afterObj = afterById.get(o.id);
      if (!afterObj) continue;
      const beforeReq = o.checklist.filter((i) => !i.optional).length;
      const afterReq = afterObj.checklist.filter((i) => !i.optional).length;
      if (afterReq !== beforeReq) continue; // gained items -> legitimately reopened
      expect(statusAfter[o.id]).toBe('complete');
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('records the addition append-only in versionHistory (grows by exactly one)', () => {
    const projectId = seedProject();
    const historyBefore = getRecord(projectId).versionHistory?.length ?? 0;

    const ok = useProjectStore
      .getState()
      .addSecondaryType(projectId, SECONDARY, { note: 'round-trip test' });
    expect(ok).toBe(true);

    const record = getRecord(projectId);
    expect((record.versionHistory ?? []).length).toBe(historyBefore + 1);
    const entry = (record.versionHistory ?? []).at(-1);
    expect(entry?.action).toBe('secondary-added');
    expect(entry?.secondaryTypeIds).toEqual([SECONDARY]);
    expect(entry?.note).toBe('round-trip test');
    expect(entry?.actor).toBe('yousef@ogden.ag');
  });

  it('is a no-op on duplicate add (returns false, history unchanged)', () => {
    const projectId = seedProject();
    expect(useProjectStore.getState().addSecondaryType(projectId, SECONDARY)).toBe(
      true,
    );
    const historyAfterFirst = getRecord(projectId).versionHistory?.length ?? 0;

    // Second add of the same secondary is rejected.
    expect(useProjectStore.getState().addSecondaryType(projectId, SECONDARY)).toBe(
      false,
    );
    const record = getRecord(projectId);
    expect((record.versionHistory ?? []).length).toBe(historyAfterFirst);
    expect(record.secondaryTypeIds).toEqual([SECONDARY]);
  });

  it('rejects adding the primary type as a secondary', () => {
    const projectId = seedProject();
    expect(useProjectStore.getState().addSecondaryType(projectId, PRIMARY)).toBe(
      false,
    );
    expect(getRecord(projectId).secondaryTypeIds).toEqual([]);
  });
});
