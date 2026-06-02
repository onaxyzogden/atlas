// @vitest-environment happy-dom
//
// Mid-project PRIMARY-type change (OLOS Project-Type + Secondary-Layer Spec —
// the destructive sibling of setPrimaryType / removeSecondaryType). Changing
// the primary re-derives the whole S1-S7 catalogue: incompatible secondaries
// are pruned, objectives unique to the OLD type disappear and their progress is
// discarded, a single append-only `primary-changed` version entry is recorded,
// and prior acknowledgements are retained. Objectives SHARED across old/new
// (the universal-19 + any common ids) keep their progress.
//
// Rather than hard-code which catalogues differ, the suite DISCOVERS a scenario
// from the live taxonomy + resolution engine: a from->to primary pair that both
// (a) prunes at least one secondary and (b) discards at least one objective.
// Assertions are made against the SAME `computeObjectivesDelta` the store uses,
// so the test tracks the catalogues as they evolve.

import { describe, expect, it, beforeEach } from 'vitest';
import {
  computeObjectivesDelta,
  isCompatibleSecondary,
  resolveProjectObjectives,
  PRIMARY_TYPES,
  SECONDARY_TYPES,
  type ProjectTypeId,
  type ProjectTypeRecord,
} from '@ogden/shared';
import { useProjectStore } from '../projectStore.js';
import { usePlanStratumProgressStore } from '../planStratumStore.js';

interface Scenario {
  from: ProjectTypeId;
  to: ProjectTypeId;
  /** A secondary compatible with `from` but NOT `to` (gets pruned). */
  prunedSecondary: ProjectTypeId;
  /** Objective ids present under `from`+[sec] but absent under `to` (discarded). */
  discardedObjectiveIds: string[];
}

/**
 * Find a from->to primary change that both prunes a secondary AND discards
 * objectives, so a single fixture exercises the full destructive path.
 */
function findScenario(): Scenario | null {
  const primaries = PRIMARY_TYPES.map((t) => t.id);
  const secondaries = SECONDARY_TYPES.map((t) => t.id);
  for (const from of primaries) {
    for (const to of primaries) {
      if (from === to) continue;
      const prunedSecondary = secondaries.find(
        (s) =>
          s !== from &&
          s !== to &&
          isCompatibleSecondary(s, from) &&
          !isCompatibleSecondary(s, to),
      );
      if (!prunedSecondary) continue;
      const current = { primaryTypeId: from, secondaryTypeIds: [prunedSecondary] };
      const next = { primaryTypeId: to, secondaryTypeIds: [] as ProjectTypeId[] };
      const discardedObjectiveIds = computeObjectivesDelta(next, current).newObjectiveIds;
      if (discardedObjectiveIds.length > 0) {
        return { from, to, prunedSecondary, discardedObjectiveIds };
      }
    }
  }
  return null;
}

const SCENARIO = findScenario();

function seedProject(record: ProjectTypeRecord): string {
  const project = useProjectStore.getState().createProject({
    name: 'Primary-change fixture',
    projectType: record.primaryTypeId,
    country: 'US',
    units: 'metric',
    metadata: { projectTypeRecord: record },
  });
  return project.id;
}

function getRecord(projectId: string): ProjectTypeRecord {
  const record = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord;
  if (!record) throw new Error('expected a projectTypeRecord on the fixture');
  return record;
}

function freshRecord(
  primaryTypeId: ProjectTypeId,
  secondaryTypeIds: ProjectTypeId[] = [],
): ProjectTypeRecord {
  return {
    primaryTypeId,
    secondaryTypeIds,
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  };
}

describe('changePrimaryType - mid-project primary switch', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null });
    usePlanStratumProgressStore.setState({
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},
      valuesByProject: {},
    });
  });

  it('discovered a destructive scenario from the live taxonomy', () => {
    expect(SCENARIO).not.toBeNull();
  });

  it('prunes incompatible secondaries and records one primary-changed entry', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from, to, prunedSecondary } = SCENARIO;
    const projectId = seedProject(freshRecord(from, [prunedSecondary]));

    const result = useProjectStore.getState().changePrimaryType(projectId, to);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.droppedSecondaryIds).toContain(prunedSecondary);

    const record = getRecord(projectId);
    expect(record.primaryTypeId).toBe(to);
    expect(record.secondaryTypeIds).not.toContain(prunedSecondary);
    // Legacy bare-string projectType is kept aligned with the record.
    expect(
      useProjectStore.getState().projects.find((p) => p.id === projectId)
        ?.projectType,
    ).toBe(to);

    const entry = (record.versionHistory ?? []).at(-1);
    expect(entry?.action).toBe('primary-changed');
    expect(entry?.primaryTypeId).toBe(to);
    expect(entry?.actor).toBe('yousef@ogden.ag');
    expect(entry?.note).toContain(from);
    expect(entry?.note).toContain(to);
  });

  it('discards progress on disappearing objectives but preserves shared-objective progress', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from, to, prunedSecondary, discardedObjectiveIds } = SCENARIO;
    const projectId = seedProject(freshRecord(from, [prunedSecondary]));

    const currentObjectives = resolveProjectObjectives({
      primaryTypeId: from,
      secondaryTypeIds: [prunedSecondary],
    }).objectives;
    const nextIds = new Set(
      resolveProjectObjectives({ primaryTypeId: to, secondaryTypeIds: [] }).objectives.map(
        (o) => o.id,
      ),
    );
    const toggle = usePlanStratumProgressStore.getState().toggleItem;

    // Tick an item on a DISCARDED objective (unique to the old type)...
    const discardedObj = currentObjectives.find(
      (o) => discardedObjectiveIds.includes(o.id) && o.checklist.length > 0,
    );
    expect(discardedObj).toBeDefined();
    toggle(projectId, discardedObj!.id, discardedObj!.checklist[0]!.id);

    // ...and an item on a SHARED objective (present under both types).
    const sharedObj = currentObjectives.find(
      (o) => nextIds.has(o.id) && o.checklist.length > 0,
    );
    expect(sharedObj).toBeDefined();
    toggle(projectId, sharedObj!.id, sharedObj!.checklist[0]!.id);

    useProjectStore.getState().changePrimaryType(projectId, to);

    const byProject =
      usePlanStratumProgressStore.getState().byProject[projectId] ?? {};
    expect(byProject[discardedObj!.id]).toBeUndefined();
    expect(byProject[sharedObj!.id]).toBeDefined();
  });

  it('retains prior tension acknowledgements across the switch', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from, to } = SCENARIO;
    const record = freshRecord(from);
    record.tensionAcknowledgements = [
      { tensionId: 'synthetic-prior-ack', acknowledgedAt: '2026-01-01T00:00:00.000Z' },
    ];
    const projectId = seedProject(record);

    useProjectStore.getState().changePrimaryType(projectId, to);

    const acks = getRecord(projectId).tensionAcknowledgements ?? [];
    expect(acks.some((a) => a.tensionId === 'synthetic-prior-ack')).toBe(true);
  });

  it('is a no-op when the candidate equals the current primary', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from } = SCENARIO;
    const projectId = seedProject(freshRecord(from));

    const result = useProjectStore.getState().changePrimaryType(projectId, from);
    expect(result.ok).toBe(false);
    expect((getRecord(projectId).versionHistory ?? []).length).toBe(0);
    expect(getRecord(projectId).primaryTypeId).toBe(from);
  });

  it('is a no-op when the candidate cannot be a primary (residential)', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from } = SCENARIO;
    const projectId = seedProject(freshRecord(from));

    const result = useProjectStore
      .getState()
      .changePrimaryType(projectId, 'residential' as ProjectTypeId);
    expect(result.ok).toBe(false);
    expect(getRecord(projectId).primaryTypeId).toBe(from);
  });

  it('is a no-op for an unknown project or an untyped project (no record)', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from, to } = SCENARIO;
    // Unknown project id.
    expect(
      useProjectStore.getState().changePrimaryType('does-not-exist', to).ok,
    ).toBe(false);

    // Typed-but-no-record project: the unset path belongs to setPrimaryType.
    const project = useProjectStore.getState().createProject({
      name: 'Untyped fixture',
      projectType: from,
      country: 'US',
      units: 'metric',
    });
    expect(
      useProjectStore.getState().changePrimaryType(project.id, to).ok,
    ).toBe(false);
  });

  it('honours an explicit actor + note override', () => {
    if (!SCENARIO) throw new Error('no scenario');
    const { from, to } = SCENARIO;
    const projectId = seedProject(freshRecord(from));

    useProjectStore
      .getState()
      .changePrimaryType(projectId, to, { actor: 'tester@ogden.ag', note: 'manual switch' });

    const entry = (getRecord(projectId).versionHistory ?? []).at(-1);
    expect(entry?.actor).toBe('tester@ogden.ag');
    expect(entry?.note).toBe('manual switch');
  });
});
