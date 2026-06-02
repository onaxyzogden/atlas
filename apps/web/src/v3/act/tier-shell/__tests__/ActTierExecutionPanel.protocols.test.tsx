/**
 * @vitest-environment happy-dom
 *
 * ActTierExecutionPanel - Trigger Recognition integration (Plan Phase C3).
 *
 * Proves the single end-to-end path: once an objective's evidence is satisfied
 * and the steward records the observation, the panel surfaces the Trigger
 * Recognition sheet for a relevant ACTIVE RESPOND protocol, and confirming it
 * writes exactly one immutable ProtocolActivation (confirmed) plus lights the
 * legacy triggered lifecycle.
 *
 * Fixture: a silvopasture project (-> sheep_beef enterprise) with the
 * `water-trough-inspection` template active. Objective `s5-water-strategy`
 * resolves to primary Observe domain `hydrology`; the template feeds
 * "Water & Hydrology" (FEEDS_TO_MODULE -> hydrology), so it is the relevant
 * trigger for that objective.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React 18 + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern, StageSpine.test).
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import {
  findPlanStratumObjective,
  getObjectiveEvidence,
  type ProjectTypeRecord,
} from '@ogden/shared';
import {
  useProjectStore,
  type LocalProject,
} from '../../../../store/projectStore.js';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import { usePlanStratumProgressStore } from '../../../../store/planStratumStore.js';
import { useActEvidenceStore } from '../../../../store/actEvidenceStore.js';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { useObserveCycleStore } from '../../../../store/observeCycleStore.js';
import ActTierExecutionPanel from '../ActTierExecutionPanel.js';

const PROJECT_ID = 'test-proj-c3';
const OBJ = findPlanStratumObjective('s5-water-strategy')!;
const TRIGGER_TEMPLATE_ID = 'water-trough-inspection';

function seedProject() {
  const stub: LocalProject = {
    id: PROJECT_ID,
    name: 'Test Project',
    description: null,
    status: 'active',
    projectType: 'silvopasture',
    country: 'NZ',
    provinceState: null,
    conservationAuthId: null,
    address: null,
    parcelId: null,
    acreage: null,
    dataCompletenessScore: null,
    hasParcelBoundary: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    parcelBoundaryGeojson: null,
    ownerNotes: null,
    zoningNotes: null,
    accessNotes: null,
    waterRightsNotes: null,
    visionStatement: null,
    units: 'metric',
    attachments: [],
    metadata: {
      projectTypeRecord: {
        primaryTypeId: 'silvopasture',
        secondaryTypeIds: [],
        tensionAcknowledgements: [],
        versionHistory: [],
        reopeningAcknowledgements: [],
      } satisfies ProjectTypeRecord,
    },
  };
  useProjectStore.setState((s) => ({
    projects: [...s.projects.filter((p) => p.id !== PROJECT_ID), stub],
  }));
}

/** Drive the panel's "ready" gate: complete the checklist + satisfy required evidence. */
function satisfyReadiness() {
  const plan = usePlanStratumProgressStore.getState();
  for (const item of OBJ.checklist) {
    plan.toggleItem(PROJECT_ID, OBJ.id, item.id);
  }
  const ev = useActEvidenceStore.getState();
  for (const d of getObjectiveEvidence(OBJ).filter((x) => x.required)) {
    if (d.kind === 'note') {
      ev.updateNote(PROJECT_ID, OBJ.id, d.id, 'Field summary.');
      ev.saveNote(PROJECT_ID, OBJ.id, d.id);
    } else if (d.kind === 'confirm') {
      ev.setConfirm(PROJECT_ID, OBJ.id, d.id, true);
    } else {
      const target = d.target ?? 1;
      for (let i = 0; i < target; i += 1) {
        ev.addPhoto(PROJECT_ID, OBJ.id, d.id, target);
      }
    }
  }
}

function resetAll() {
  useProtocolStore.setState({ records: [], activations: [] });
  usePlanStratumProgressStore.setState({ byProject: {} });
  useActEvidenceStore.setState({ byProject: {} });
  useObserveDataPointStore.setState({ byProject: {} });
  useObserveCycleStore.setState({ byProject: {} });
  window.localStorage.clear();
}

beforeEach(() => {
  resetAll();
  seedProject();
  // The relevant RESPOND protocol must be active for it to surface.
  useProtocolStore.getState().activateProtocol(PROJECT_ID, TRIGGER_TEMPLATE_ID);
});

function renderPanel() {
  return render(
    <ActTierExecutionPanel
      projectId={PROJECT_ID}
      tier={undefined}
      objective={OBJ}
      status="active"
    />,
  );
}

afterEach(() => cleanup());

describe('ActTierExecutionPanel - Trigger Recognition', () => {
  it('surfaces the Trigger Recognition sheet after recording an observation', () => {
    satisfyReadiness();
    renderPanel();

    // No sheet before recording.
    expect(screen.queryByTestId('trigger-recognition-sheet')).toBeNull();

    fireEvent.click(screen.getByText('Record observation'));

    // Sheet appears for the relevant active RESPOND protocol.
    expect(screen.getByTestId('trigger-recognition-sheet')).toBeTruthy();
    expect(screen.getByText('Water Trough Inspection')).toBeTruthy();
  });

  it('Confirm writes exactly one confirmed ProtocolActivation and lights the lifecycle', () => {
    satisfyReadiness();
    renderPanel();

    fireEvent.click(screen.getByText('Record observation'));
    fireEvent.click(screen.getByText('Confirm'));

    const activations = useProtocolStore.getState().activations;
    expect(activations).toHaveLength(1);
    expect(activations[0]!.projectId).toBe(PROJECT_ID);
    expect(activations[0]!.templateId).toBe(TRIGGER_TEMPLATE_ID);
    expect(activations[0]!.confirmationStatus).toBe('confirmed');
    expect(activations[0]!.severityTier).toBe('respond');
    expect(activations[0]!.recipeSnapshot.name).toBe('Water Trough Inspection');
    expect(activations[0]!.triggerContext).toBe('act_proof_capture');

    // Confirm also lights the existing triggered lifecycle (bridge to Act badge).
    const record = useProtocolStore
      .getState()
      .records.find(
        (r) => r.projectId === PROJECT_ID && r.templateId === TRIGGER_TEMPLATE_ID,
      );
    expect(record?.status).toBe('triggered');

    // Sheet dismisses after resolution.
    expect(screen.queryByTestId('trigger-recognition-sheet')).toBeNull();
  });

  it('Dismiss writes a false_positive activation without lighting the lifecycle', () => {
    satisfyReadiness();
    renderPanel();

    fireEvent.click(screen.getByText('Record observation'));
    fireEvent.click(screen.getByText('Dismiss'));

    const activations = useProtocolStore.getState().activations;
    expect(activations).toHaveLength(1);
    expect(activations[0]!.confirmationStatus).toBe('false_positive');

    // Dismiss must NOT trigger the lifecycle; the record stays 'active'.
    const record = useProtocolStore
      .getState()
      .records.find(
        (r) => r.projectId === PROJECT_ID && r.templateId === TRIGGER_TEMPLATE_ID,
      );
    expect(record?.status).toBe('active');
  });
});

describe('ActTierExecutionPanel - temporal bucket stamping', () => {
  it('centerLat present -> season + cycleNumber stamped on confirmed activation', () => {
    // Seed the project with a northern-hemisphere centerLat so deriveClimateContext
    // can resolve a season. Patch metadata after seedProject() to add centerLat.
    useProjectStore.setState((s) => ({
      projects: s.projects.map((p) =>
        p.id === PROJECT_ID
          ? { ...p, metadata: { ...p.metadata, centerLat: 45, centerLng: -75 } }
          : p,
      ),
    }));

    // Advance the hydrology cycle once so cycleNumber is 1 (non-default).
    // s5-water-strategy resolves to 'hydrology' domain.
    useObserveCycleStore.getState().advanceCycle(PROJECT_ID, 'hydrology', 'plan_revision_confirmed');
    const expectedCycle = useObserveCycleStore
      .getState()
      .getCurrentCycle(PROJECT_ID, 'hydrology');

    satisfyReadiness();
    renderPanel();

    fireEvent.click(screen.getByText('Record observation'));
    fireEvent.click(screen.getByText('Confirm'));

    const activations = useProtocolStore.getState().activations;
    expect(activations).toHaveLength(1);

    // season must be one of the four valid SeasonName values (not fixed — wall-clock dependent).
    expect(['spring', 'summer', 'autumn', 'winter']).toContain(
      activations[0]!.season,
    );

    // cycleNumber must be the numeric cycle returned by getCurrentCycle.
    expect(typeof activations[0]!.cycleNumber).toBe('number');
    expect(activations[0]!.cycleNumber).toBe(expectedCycle);
  });

  it('centerLat absent -> season is undefined, activation still recorded', () => {
    // Default seedProject() has no centerLat in metadata — season stays undefined.
    satisfyReadiness();
    renderPanel();

    fireEvent.click(screen.getByText('Record observation'));
    fireEvent.click(screen.getByText('Confirm'));

    const activations = useProtocolStore.getState().activations;
    expect(activations).toHaveLength(1);
    expect(activations[0]!.season).toBeUndefined();
    // cycleNumber is still stamped (domainId is non-null from s5-water-strategy
    // -> hydrology); an untouched (project, domain) defaults to cycle 0, and 0
    // is a valid stamped value (guard is on domainId, not the cycle value).
    expect(activations[0]!.cycleNumber).toBe(0);
  });
});
