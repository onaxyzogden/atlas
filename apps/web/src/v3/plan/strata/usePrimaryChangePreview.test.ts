// @vitest-environment happy-dom
//
// usePrimaryChangePreview — the read-only consequences snapshot the
// PrimaryChangeModal renders before a (destructive) primary switch. Verifies it
// reports, against the live taxonomy + resolution engine:
//   - eligibility / no-op gating (candidate differs + can-be-primary),
//   - objectives-added and objectives-set-aside counts (inverse delta),
//   - how many set-aside objectives carry STARTED work (would be discarded),
//   - Amanah scopeNotes cautions taken on when switching INTO Market Garden
//     (the CSA / bay' ma laysa 'indak flag — never surfaced silently,
//     [[feedback-csa-in-catalogues]]).
//
// The homestead -> market_garden pair is the load-bearing fixture: Market Garden
// objectives MGD-S1.4 / MGD-S1.6 carry verbatim "Amanah flag:" scopeNotes.

import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  computeObjectivesDelta,
  resolveProjectObjectives,
  type ProjectTypeId,
  type ProjectTypeRecord,
} from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import { usePlanStratumProgressStore } from '../../../store/planStratumStore.js';
import { usePrimaryChangePreview } from './usePrimaryChangePreview.js';

const FROM: ProjectTypeId = 'homestead';
const TO: ProjectTypeId = 'market_garden';

function seedProject(): string {
  const record: ProjectTypeRecord = {
    primaryTypeId: FROM,
    secondaryTypeIds: [],
    tensionAcknowledgements: [],
    versionHistory: [],
    reopeningAcknowledgements: [],
  };
  const project = useProjectStore.getState().createProject({
    name: 'Preview fixture',
    projectType: FROM,
    country: 'US',
    units: 'metric',
    metadata: { projectTypeRecord: record },
  });
  return project.id;
}

describe('usePrimaryChangePreview', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [], activeProjectId: null });
    usePlanStratumProgressStore.setState({
      byProject: {},
      celebratedByProject: {},
      deferredByProject: {},
      valuesByProject: {},
    });
  });

  it('is a no-op (ineligible) when the candidate equals the current primary', () => {
    const projectId = seedProject();
    const { result } = renderHook(() => usePrimaryChangePreview(projectId, FROM));
    expect(result.current.isNoOp).toBe(true);
    expect(result.current.eligible).toBe(false);
  });

  it('is ineligible when the candidate cannot be a primary (residential)', () => {
    const projectId = seedProject();
    const { result } = renderHook(() =>
      usePrimaryChangePreview(projectId, 'residential' as ProjectTypeId),
    );
    expect(result.current.eligible).toBe(false);
  });

  it('reports added / set-aside counts matching the inverse delta', () => {
    const projectId = seedProject();
    const current = { primaryTypeId: FROM, secondaryTypeIds: [] as ProjectTypeId[] };
    const next = { primaryTypeId: TO, secondaryTypeIds: [] as ProjectTypeId[] };
    const expectedAdded = computeObjectivesDelta(current, next).newObjectiveIds;
    const expectedSetAside = computeObjectivesDelta(next, current).newObjectiveIds;

    const { result } = renderHook(() => usePrimaryChangePreview(projectId, TO));
    expect(result.current.eligible).toBe(true);
    expect(result.current.objectivesAddedCount).toBe(expectedAdded.length);
    expect(result.current.objectivesSetAside.map((o) => o.id).sort()).toEqual(
      [...expectedSetAside].sort(),
    );
  });

  it('counts set-aside objectives carrying started work', () => {
    const projectId = seedProject();
    const setAsideIds = new Set(
      computeObjectivesDelta(
        { primaryTypeId: TO, secondaryTypeIds: [] },
        { primaryTypeId: FROM, secondaryTypeIds: [] },
      ).newObjectiveIds,
    );
    const currentObjectives = resolveProjectObjectives({
      primaryTypeId: FROM,
      secondaryTypeIds: [],
    }).objectives;
    const target = currentObjectives.find(
      (o) => setAsideIds.has(o.id) && o.checklist.length > 0,
    );
    expect(target).toBeDefined();
    usePlanStratumProgressStore
      .getState()
      .toggleItem(projectId, target!.id, target!.checklist[0]!.id);

    const { result } = renderHook(() => usePrimaryChangePreview(projectId, TO));
    expect(result.current.startedSetAsideCount).toBeGreaterThan(0);
  });

  it('surfaces Amanah cautions taken on when switching INTO Market Garden', () => {
    const projectId = seedProject();
    const { result } = renderHook(() => usePrimaryChangePreview(projectId, TO));
    const added = result.current.amanahNotes.filter((n) => n.direction === 'added');
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((n) => /amanah/i.test(n.note))).toBe(true);
  });
});
