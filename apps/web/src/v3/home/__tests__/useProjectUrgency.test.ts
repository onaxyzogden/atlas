/**
 * @vitest-environment happy-dom
 *
 * useProjectUrgency — Slice 5.3 composing hook. Pins the contract that the
 * hook assembles ProjectUrgencyInputs from the five backing stores and
 * forwards them to `computeProjectUrgency`, returning a stable Map keyed
 * by projectId. Live store wiring is the integration surface — these tests
 * touch real stores (not mocks) so the test traps a regression in the
 * selector-shape contract between the hook and any of the five stores.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { URGENCY_WEIGHTS, type FieldAction } from '@ogden/shared';
import { useProjectUrgency } from '../useProjectUrgency.js';
import { useFieldActionStore } from '../../../store/fieldActionStore.js';
import { useObserveDataPointStore } from '../../../store/observeDataPointStore.js';
import { useObserveFeedStore } from '../../../store/observeFeedStore.js';
import { usePlanTierProgressStore } from '../../../store/planTierStore.js';
import { useCyclicalReviewStore } from '../../../store/cyclicalReviewStore.js';
import type { LocalProject } from '../../../store/projectStore.js';

const T0 = new Date('2026-05-28T12:00:00.000Z').getTime();

function makeProject(overrides: Partial<LocalProject> = {}): LocalProject {
  return {
    id: 'proj-test',
    name: 'Test Land',
    description: null,
    status: 'active',
    projectType: null,
    country: 'US',
    provinceState: null,
    conservationAuthId: null,
    address: null,
    parcelId: null,
    acreage: null,
    dataCompletenessScore: null,
    hasParcelBoundary: false,
    createdAt: new Date(T0).toISOString(),
    updatedAt: new Date(T0).toISOString(),
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

function resetStores() {
  useFieldActionStore.setState({ byProject: {} });
  useObserveDataPointStore.setState({ byProject: {} });
  useObserveFeedStore.setState({ byProject: {} });
  usePlanTierProgressStore.setState({ byProject: {} });
  useCyclicalReviewStore.setState({ byProject: {} });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(T0));
  resetStores();
});

afterEach(() => {
  vi.useRealTimers();
  resetStores();
});

describe('useProjectUrgency', () => {
  it('returns a stable empty Map when no projects are passed', () => {
    const { result, rerender } = renderHook(
      ({ projects }: { projects: LocalProject[] }) =>
        useProjectUrgency(projects),
      { initialProps: { projects: [] } },
    );
    expect(result.current.size).toBe(0);
    const firstRef = result.current;
    rerender({ projects: [] });
    expect(result.current).toBe(firstRef);
  });

  it('keys the result Map by projectId for every input project', () => {
    const projects = [
      makeProject({ id: 'p1', name: 'One' }),
      makeProject({ id: 'p2', name: 'Two' }),
    ];
    const { result } = renderHook(() => useProjectUrgency(projects));
    expect(result.current.size).toBe(2);
    expect(result.current.get('p1')).toBeDefined();
    expect(result.current.get('p2')).toBeDefined();
  });

  it('surfaces wizardStatus="in_progress" as a draftWizard contribution', () => {
    const project = makeProject({
      id: 'draft-1',
      metadata: { wizardStatus: 'in_progress' },
    });
    const { result } = renderHook(() => useProjectUrgency([project]));
    const urgency = result.current.get('draft-1');
    expect(urgency).toBeDefined();
    expect(urgency!.breakdown.draftWizard).toBe(true);
    // Score floor: at minimum the draftWizard weight (other signals are 0).
    expect(urgency!.score).toBeGreaterThanOrEqual(
      URGENCY_WEIGHTS.draftWizard,
    );
  });

  it('returns score 0 for a fresh project with no signals and no inactivity', () => {
    const project = makeProject({
      id: 'fresh-1',
      updatedAt: new Date(T0).toISOString(),
    });
    const { result } = renderHook(() => useProjectUrgency([project]));
    const urgency = result.current.get('fresh-1');
    expect(urgency).toBeDefined();
    expect(urgency!.score).toBe(0);
    expect(urgency!.breakdown.draftWizard).toBe(false);
    expect(urgency!.breakdown.inactivityDays).toBe(0);
  });

  it('counts a blocked field action via the field-action store', () => {
    const project = makeProject({ id: 'blocked-1' });
    useFieldActionStore.setState({
      byProject: {
        'blocked-1': [
          {
            id: 'fa1',
            projectId: 'blocked-1',
            planObjectiveId: 's1-vision',
            stratumId: 's1',
            title: 'Blocked task',
            description: null,
            taskType: 'field_survey',
            status: 'blocked',
            proofSchemaId: 'note-only',
            proofItems: [],
            verificationMode: 'self',
            assignedTo: [],
            divergenceFlag: null,
            observeFeedIds: [],
            locationGeometry: null,
            mapOverlayIds: [],
            blockedReason: 'access denied',
            createdAt: new Date(T0).toISOString(),
            updatedAt: new Date(T0).toISOString(),
            doneAt: null,
          } as unknown as FieldAction,
        ],
      },
    });
    const { result } = renderHook(() => useProjectUrgency([project]));
    const urgency = result.current.get('blocked-1');
    expect(urgency).toBeDefined();
    expect(urgency!.breakdown.blockedFieldActions).toBe(1);
    expect(urgency!.score).toBeGreaterThanOrEqual(
      URGENCY_WEIGHTS.blockedFieldAction,
    );
  });
});
