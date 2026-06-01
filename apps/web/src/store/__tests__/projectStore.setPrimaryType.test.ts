// @vitest-environment happy-dom
//
// setPrimaryType - the additive, NON-DESTRUCTIVE primary-type write that backs
// the Plan header "Set project type" control (used when a project was created
// without a type, e.g. the builtin MTC). The load-bearing guarantees:
//   - sets a fresh ProjectTypeRecord ONLY when none exists (never replaces an
//     already-set primary - the wizard owns that);
//   - mirrors the wizard's primary-select write exactly: empty secondary / ack
//     / version arrays, NO versionHistory entry;
//   - rejects ids that cannot be a primary (residential is secondary-only);
//   - works on builtin projects (the MTC case) - the record lands via the
//     updateProject metadata allowlist even though the bare projectType string
//     is filtered there (record-level resolution is authoritative regardless);
//   - the written record resolves to the chosen type's objective set, so the
//     objective list re-derives off it.

import { describe, expect, it, beforeEach } from 'vitest';
import {
  resolveProjectObjectives,
  type ProjectTypeRecord,
} from '@ogden/shared';
import { useProjectStore } from '../projectStore.js';

/** Create a project with NO type (projectType omitted -> normalized to null). */
function seedNullTypeProject(): string {
  const project = useProjectStore.getState().createProject({
    name: 'No-type fixture',
    country: 'US',
    units: 'metric',
  });
  return project.id;
}

/** Create a project that already carries a homestead primary record. */
function seedRecordProject(): string {
  const record: ProjectTypeRecord = {
    primaryTypeId: 'homestead',
    secondaryTypeIds: [],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  };
  const project = useProjectStore.getState().createProject({
    name: 'Has-record fixture',
    projectType: 'homestead',
    country: 'US',
    units: 'metric',
    metadata: { projectTypeRecord: record },
  });
  return project.id;
}

function getProject(projectId: string) {
  const project = useProjectStore
    .getState()
    .projects.find((p) => p.id === projectId);
  if (!project) throw new Error('expected the fixture project to exist');
  return project;
}

describe('setPrimaryType - additive primary-type write', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null });
  });

  it('sets a fresh record on a null-type project and mirrors the wizard write', () => {
    const projectId = seedNullTypeProject();

    const ok = useProjectStore.getState().setPrimaryType(projectId, 'homestead');
    expect(ok).toBe(true);

    const project = getProject(projectId);
    const record = project.metadata?.projectTypeRecord;
    expect(record).toBeDefined();
    expect(record?.primaryTypeId).toBe('homestead');
    expect(record?.secondaryTypeIds).toEqual([]);
    expect(record?.tensionAcknowledgements).toEqual([]);
    // No 'primary-set' version action exists in the taxonomy - mirror the
    // wizard and record no history entry.
    expect(record?.versionHistory).toEqual([]);
    expect(record?.reopeningAcknowledgements).toEqual([]);
    // Non-builtin project: the legacy bare string is aligned in the same write.
    expect(project.projectType).toBe('homestead');
  });

  it('writes a record that resolves to the chosen type objective set', () => {
    const projectId = seedNullTypeProject();
    useProjectStore.getState().setPrimaryType(projectId, 'homestead');

    const record = getProject(projectId).metadata?.projectTypeRecord;
    if (!record) throw new Error('expected a record after setPrimaryType');

    const fromRecord = resolveProjectObjectives({
      primaryTypeId: record.primaryTypeId,
      secondaryTypeIds: record.secondaryTypeIds ?? [],
    }).objectives.map((o) => o.id);
    const expected = resolveProjectObjectives({
      primaryTypeId: 'homestead',
      secondaryTypeIds: [],
    }).objectives.map((o) => o.id);

    expect(fromRecord).toEqual(expected);
    expect(fromRecord.length).toBeGreaterThan(0);
  });

  it('is a no-op when a record already exists (never replaces a primary)', () => {
    const projectId = seedRecordProject();

    const ok = useProjectStore
      .getState()
      .setPrimaryType(projectId, 'silvopasture');
    expect(ok).toBe(false);

    const record = getProject(projectId).metadata?.projectTypeRecord;
    expect(record?.primaryTypeId).toBe('homestead');
    expect(record?.secondaryTypeIds).toEqual([]);
  });

  it('rejects an id that cannot be a primary (residential is secondary-only)', () => {
    const projectId = seedNullTypeProject();

    const ok = useProjectStore
      .getState()
      .setPrimaryType(projectId, 'residential');
    expect(ok).toBe(false);
    expect(getProject(projectId).metadata?.projectTypeRecord).toBeUndefined();
  });

  it('returns false for a project that does not exist', () => {
    expect(
      useProjectStore.getState().setPrimaryType('no-such-id', 'homestead'),
    ).toBe(false);
  });

  it('lands the record on a builtin project (the MTC case)', () => {
    const projectId = seedNullTypeProject();
    // Mark the fixture builtin to exercise the updateProject allowlist path the
    // real MTC project takes (metadata is allowed; bare projectType is filtered).
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, isBuiltin: true } : p,
      ),
    }));

    const ok = useProjectStore.getState().setPrimaryType(projectId, 'homestead');
    expect(ok).toBe(true);

    const record = getProject(projectId).metadata?.projectTypeRecord;
    expect(record?.primaryTypeId).toBe('homestead');
    // Record resolution is authoritative; that is what drives the objective list.
    const resolved = resolveProjectObjectives({
      primaryTypeId: record!.primaryTypeId,
      secondaryTypeIds: record!.secondaryTypeIds ?? [],
    }).objectives;
    expect(resolved.length).toBeGreaterThan(0);
  });
});
