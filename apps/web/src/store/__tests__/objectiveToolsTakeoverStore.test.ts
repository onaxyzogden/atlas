/**
 * @vitest-environment happy-dom
 *
 * objectiveToolsTakeoverStore — the generic objective-scoped map-tools takeover
 * flag (the shell-agnostic generalization of the slope/vegetation surveys).
 *
 * (The imported survey stores attach persist + idbPersistStorage +
 * rehydrateWithLogging at module load; happy-dom supplies the storage they need.
 * Assertions exercise the actions directly via setState/getState.)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useObjectiveToolsTakeoverStore } from '../objectiveToolsTakeoverStore.js';
import { useSlopeSurveyStore } from '../slopeSurveyStore.js';
import { useVegetationSurveyStore } from '../vegetationSurveyStore.js';

const PID = 'project-1';
const OID = 's3-soil-c1';

const store = () => useObjectiveToolsTakeoverStore.getState();

beforeEach(() => {
  useObjectiveToolsTakeoverStore.setState({
    active: false,
    activeProjectId: null,
    activeObjectiveId: null,
  });
  // Reset the two survey takeovers' ephemeral flags (leave byProject alone).
  useSlopeSurveyStore.setState({ active: false, activeProjectId: null });
  useVegetationSurveyStore.setState({
    active: false,
    activeProjectId: null,
    activeCommunity: null,
  });
});

describe('open / close', () => {
  it('starts inactive', () => {
    expect(store().active).toBe(false);
    expect(store().activeProjectId).toBeNull();
    expect(store().activeObjectiveId).toBeNull();
  });

  it('open(projectId, objectiveId) flips active and records both ids', () => {
    store().open(PID, OID);
    expect(store().active).toBe(true);
    expect(store().activeProjectId).toBe(PID);
    expect(store().activeObjectiveId).toBe(OID);
  });

  it('close() resets active and both ids', () => {
    store().open(PID, OID);
    store().close();
    expect(store().active).toBe(false);
    expect(store().activeProjectId).toBeNull();
    expect(store().activeObjectiveId).toBeNull();
  });
});

describe('cross-store hygiene (mutual exclusion)', () => {
  it('open() closes an active slope-survey takeover', () => {
    useSlopeSurveyStore.getState().open('any-project');
    expect(useSlopeSurveyStore.getState().active).toBe(true);

    store().open(PID, OID);

    expect(useSlopeSurveyStore.getState().active).toBe(false);
    expect(useSlopeSurveyStore.getState().activeProjectId).toBeNull();
    expect(store().active).toBe(true);
  });

  it('open() closes an active vegetation-survey takeover', () => {
    useVegetationSurveyStore.getState().open('any-project');
    expect(useVegetationSurveyStore.getState().active).toBe(true);

    store().open(PID, OID);

    expect(useVegetationSurveyStore.getState().active).toBe(false);
    expect(useVegetationSurveyStore.getState().activeProjectId).toBeNull();
    expect(store().active).toBe(true);
  });
});
