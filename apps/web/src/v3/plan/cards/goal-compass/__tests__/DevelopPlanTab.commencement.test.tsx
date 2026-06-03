/**
 * @vitest-environment happy-dom
 *
 * T1.9 -- DevelopPlanTab commencementDate input tests.
 *
 * Verified behaviours:
 *   1. Renders an "Establishment start (land)" label and a date input with
 *      id="gc-project-commencement-date".
 *   2. Changing the date input stores commencementDate in projectStore.
 *   3. Clearing the date input stores commencementDate: null in projectStore.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useProjectStore } from '../../../../../store/projectStore.js';
import DevelopPlanTab from '../DevelopPlanTab.js';

// ---- module stubs -----------------------------------------------------------

vi.mock('../../../../../lib/geodataCache.js', () => ({
  geodataCache: {
    remove: async () => {},
    removeByPrefix: async () => {},
  },
}));

vi.mock('../../../../../store/persistRehydrate.js', () => ({
  rehydrateWithLogging: () => {},
}));

vi.mock('../../../../../store/phaseStore.js', () => ({
  usePhaseStore: (
    sel: (s: { phases: unknown[]; replaceGoalCompassRows: () => void }) => unknown,
  ) => sel({ phases: [], replaceGoalCompassRows: () => {} }),
}));

vi.mock('../../../engine/goalCompass/goalCompassSpineSync.js', () => ({
  pushGoalCompassToSpine: () => {},
}));

// ---- helpers ----------------------------------------------------------------

const PROJECT_ID = 'proj-commencement-ui-test';

// A minimal LocalProject shape (just enough for DevelopPlanTab)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProject = any;

const BASE_PROJECT: AnyProject = {
  id: PROJECT_ID,
  name: 'Commencement Test Farm',
  isBuiltin: false,
  projectType: 'regenerative_farm',
  country: 'AU',
  units: 'metric',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  metadata: { projectTypeRecord: null },
};

function resetStore(): void {
  useProjectStore.setState({ projects: [BASE_PROJECT], activeProjectId: null });
  window.localStorage.clear();
}

// ---- tests ------------------------------------------------------------------

describe('DevelopPlanTab -- commencementDate input (T1.9)', () => {
  beforeEach(() => resetStore());

  it('renders label "Establishment start (land)" and date input #gc-project-commencement-date', () => {
    render(
      <DevelopPlanTab
        project={BASE_PROJECT}
        onSwitchModule={() => {}}
      />,
    );

    expect(screen.queryByText('Establishment start (land)')).not.toBeNull();

    const input = document.getElementById('gc-project-commencement-date') as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.type).toBe('date');
  });

  it('changing the date input calls updateProject with { commencementDate: value }', () => {
    render(
      <DevelopPlanTab
        project={BASE_PROJECT}
        onSwitchModule={() => {}}
      />,
    );

    const input = document.getElementById('gc-project-commencement-date') as HTMLInputElement;
    expect(input).not.toBeNull();

    fireEvent.change(input, { target: { value: '2023-03-15' } });

    const project = useProjectStore
      .getState()
      .projects.find((p) => p.id === PROJECT_ID);
    expect(project?.commencementDate).toBe('2023-03-15');
  });

  it('clearing the date input calls updateProject with { commencementDate: null }', () => {
    // Pre-seed a commencementDate so clearing it has something to change.
    useProjectStore.setState({
      projects: [{ ...BASE_PROJECT, commencementDate: '2023-03-15' }],
      activeProjectId: null,
    });

    render(
      <DevelopPlanTab
        project={BASE_PROJECT}
        onSwitchModule={() => {}}
      />,
    );

    const input = document.getElementById('gc-project-commencement-date') as HTMLInputElement;
    expect(input).not.toBeNull();

    fireEvent.change(input, { target: { value: '' } });

    const project = useProjectStore
      .getState()
      .projects.find((p) => p.id === PROJECT_ID);
    expect(project?.commencementDate).toBeNull();
  });
});
