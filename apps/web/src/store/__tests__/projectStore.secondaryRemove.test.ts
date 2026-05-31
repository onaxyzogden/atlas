// @vitest-environment happy-dom
//
// Removal round-trip for the mid-project secondary-type REMOVAL flow (OLOS
// Plan Navigation Spec v1.1 section 8.3, Part C of the deferred-seams build).
// The load-bearing guarantee: a steward may remove a secondary ONLY when none
// of its delta objectives (its additive objectives + the host objectives it
// injected items into) are active, complete, or deferred. A clean removal is
// recorded append-only as a `secondary-removed` version entry and prunes the
// orphaned additive-objective progress; a blocked removal names the blocking
// objectives and mutates NOTHING.
//
// The proven data pair (see projectStore.secondaryReopen.test.ts +
// computeObjectivesDelta.test.ts) is primary `regenerative_farm` + secondary
// `residential`. Removing `residential` deletes 6 additive objectives
// (`res-s*-*`, all roots) and pulls injected items back out of 5 host
// objectives (`s3-hydrology`, ...). We drive the live `removeSecondaryType`
// action and assert against the SAME status engine + progress map the spine
// and the preview hook use.

import { describe, expect, it, beforeEach } from 'vitest';
import {
  computeObjectivesDelta,
  resolveProjectObjectives,
  type ProjectTypeRecord,
} from '@ogden/shared';
import { useProjectStore } from '../projectStore.js';
import { usePlanStratumProgressStore } from '../planStratumStore.js';

const PRIMARY = 'regenerative_farm' as const;
const SECONDARY = 'residential' as const;

/** The objective ids removing `residential` would touch (delete + un-inject). */
function removalDelta(): {
  removed: string[];
  hostsLosingItems: string[];
  all: string[];
} {
  const current = { primaryTypeId: PRIMARY, secondaryTypeIds: [SECONDARY] };
  const after = { primaryTypeId: PRIMARY, secondaryTypeIds: [] as string[] };
  // Inverse delta: post-removal AGAINST current surfaces removed objectives as
  // `newObjectiveIds` and host objectives losing items as `objectivesWithNewItems`.
  const inverse = computeObjectivesDelta(
    after as never,
    current as never,
  );
  return {
    removed: inverse.newObjectiveIds,
    hostsLosingItems: inverse.objectivesWithNewItems,
    all: Array.from(
      new Set([...inverse.newObjectiveIds, ...inverse.objectivesWithNewItems]),
    ),
  };
}

function seedProjectWithSecondary(): string {
  const record: ProjectTypeRecord = {
    primaryTypeId: PRIMARY,
    secondaryTypeIds: [SECONDARY],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  };
  const project = useProjectStore.getState().createProject({
    name: 'Remove round-trip fixture',
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

/** Tick every required item across the WITH-residential objective set. */
function completeAll(projectId: string): void {
  const objectives = resolveProjectObjectives({
    primaryTypeId: PRIMARY,
    secondaryTypeIds: [SECONDARY],
  }).objectives;
  const toggle = usePlanStratumProgressStore.getState().toggleItem;
  for (const o of objectives) {
    for (const item of o.checklist) {
      if (!item.optional) toggle(projectId, o.id, item.id);
    }
  }
}

describe('removeSecondaryType - removal round-trip (regenerative_farm + residential)', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null });
    usePlanStratumProgressStore.setState({
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},
    });
  });

  it('clean-remove (no started delta objectives) succeeds and records one secondary-removed entry', () => {
    const projectId = seedProjectWithSecondary();
    const historyBefore = getRecord(projectId).versionHistory?.length ?? 0;

    const result = useProjectStore
      .getState()
      .removeSecondaryType(projectId, SECONDARY);
    expect(result.ok).toBe(true);

    const record = getRecord(projectId);
    expect(record.secondaryTypeIds).toEqual([]);
    expect((record.versionHistory ?? []).length).toBe(historyBefore + 1);
    const entry = (record.versionHistory ?? []).at(-1);
    expect(entry?.action).toBe('secondary-removed');
    expect(entry?.actor).toBe('yousef@ogden.ag');
    expect(entry?.secondaryTypeIds).toEqual([]);
  });

  it('leaves no orphaned progress under any removed additive objective', () => {
    const projectId = seedProjectWithSecondary();
    const { removed } = removalDelta();
    expect(removed.length).toBeGreaterThan(0);

    useProjectStore.getState().removeSecondaryType(projectId, SECONDARY);

    const byProject =
      usePlanStratumProgressStore.getState().byProject[projectId] ?? {};
    for (const objId of removed) {
      expect(byProject[objId]).toBeUndefined();
    }
  });

  it('blocks removal when a delta objective is complete, and mutates nothing', () => {
    const projectId = seedProjectWithSecondary();
    completeAll(projectId);
    const historyBefore = getRecord(projectId).versionHistory?.length ?? 0;

    const result = useProjectStore
      .getState()
      .removeSecondaryType(projectId, SECONDARY);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: expected a blocked removal');
    expect(result.blockingObjectiveIds.length).toBeGreaterThan(0);

    // No mutation: the secondary is still present and history is untouched.
    const record = getRecord(projectId);
    expect(record.secondaryTypeIds).toEqual([SECONDARY]);
    expect((record.versionHistory ?? []).length).toBe(historyBefore);
  });

  it('blocks removal when a delta objective has any started progress (no silent work loss)', () => {
    const projectId = seedProjectWithSecondary();
    const { removed } = removalDelta();
    // Tick a single required item on one removed additive objective -> 'active'.
    const target = removed[0]!;
    const objective = resolveProjectObjectives({
      primaryTypeId: PRIMARY,
      secondaryTypeIds: [SECONDARY],
    }).objectives.find((o) => o.id === target);
    const firstRequired = objective?.checklist.find((i) => !i.optional);
    expect(firstRequired).toBeDefined();
    usePlanStratumProgressStore
      .getState()
      .toggleItem(projectId, target, firstRequired!.id);

    const result = useProjectStore
      .getState()
      .removeSecondaryType(projectId, SECONDARY);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: expected a blocked removal');
    expect(result.blockingObjectiveIds).toContain(target);
    expect(getRecord(projectId).secondaryTypeIds).toEqual([SECONDARY]);
  });

  it('keeps removal blocked when a delta objective is Deferred (Mark-as-Deferred is the alternative, not a path to removal)', () => {
    const projectId = seedProjectWithSecondary();
    const { removed } = removalDelta();
    const target = removed[0]!;
    // Park the objective via the live planStratumStore action - no progress.
    usePlanStratumProgressStore.getState().deferObjective(projectId, target);

    const result = useProjectStore
      .getState()
      .removeSecondaryType(projectId, SECONDARY);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: expected a blocked removal');
    expect(result.blockingObjectiveIds).toContain(target);
    expect(getRecord(projectId).secondaryTypeIds).toEqual([SECONDARY]);
    expect((getRecord(projectId).versionHistory ?? []).length).toBe(0);
  });

  it('is a blocked no-op when the secondary is not present on the project', () => {
    const projectId = seedProjectWithSecondary();
    // `commercial` was never added.
    const result = useProjectStore
      .getState()
      .removeSecondaryType(projectId, 'commercial' as never);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable: expected a blocked removal');
    expect(result.blockingObjectiveIds).toEqual([]);
    expect(getRecord(projectId).secondaryTypeIds).toEqual([SECONDARY]);
  });
});
