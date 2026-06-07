/**
 * @vitest-environment happy-dom
 *
 * ProtocolApprovalOverlay — §10.1 protocol instantiation confirmation overlay.
 *
 * Covers:
 *   1. Renders eligible templates (sheep_beef for a livestock project).
 *   2. Activate calls protocolStore.activateProtocol and shows "Activated".
 *   3. Undo calls protocolStore.deactivateProtocol and reverts to "Activate" button.
 *   4. Edit-commit writes parameter values back to planStratumStore.
 *   5. Pre-activated templates start as "Activated" (decisions initialized from store).
 *   6. onClose is called when Close button is clicked.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import { usePlanStratumProgressStore } from '../../../../store/planStratumStore.js';
import {
  useProjectStore,
  type LocalProject,
} from '../../../../store/projectStore.js';
import type { ProjectTypeRecord } from '@ogden/shared';
import {
  findPlanStratumObjective,
  templatesForEnterprises,
} from '@ogden/shared';
import ProtocolApprovalOverlay from '../ProtocolApprovalOverlay.js';

const PROJECT_ID = 'test-proj';
const S6 = findPlanStratumObjective('s6-yield-flows')!;
const SHEEP_BEEF_TEMPLATES = templatesForEnterprises(['sheep_beef']);

/** Minimal project with silvopasture type (livestock → sheep_beef enterprise). */
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

function resetAll() {
  useProtocolStore.setState({ records: [] });
  usePlanStratumProgressStore.setState({ valuesByProject: {} });
  window.localStorage.clear();
}

beforeEach(() => {
  seedProject();
  resetAll();
});

describe('ProtocolApprovalOverlay', () => {
  it('renders eligible sheep_beef templates', () => {
    const onClose = vi.fn();
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={onClose}
      />,
    );

    // The overlay should be in the document.
    expect(
      screen.getByTestId('protocol-approval-overlay'),
    ).toBeTruthy();

    // A known sheep_beef template should be present. The name now appears in
    // BOTH the expected-rate panel and the confirmation card below, so match
    // on count (>=1) instead of asserting a single unique node.
    expect(
      screen.getAllByText('Paddock Rotation — Cover Trigger').length,
    ).toBeGreaterThan(0);
  });

  it('Activate button calls activateProtocol', () => {
    const onClose = vi.fn();
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={onClose}
      />,
    );

    // Find the first "Activate" button and click it.
    const activateButtons = screen.getAllByText('Activate');
    expect(activateButtons.length).toBeGreaterThan(0);
    fireEvent.click(activateButtons[0]!);

    // The card should now show "Activated".
    expect(screen.getAllByText(/✓ Activated/).length).toBeGreaterThan(0);

    // protocolStore should now have a record for this project.
    const records = useProtocolStore.getState().records;
    const activated = records.find(
      (r) => r.projectId === PROJECT_ID && r.status === 'active',
    );
    expect(activated).toBeTruthy();
  });

  it('Undo button calls deactivateProtocol and reverts to pending', () => {
    // Pre-activate a template in the store so the overlay starts with it activated.
    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    useProtocolStore
      .getState()
      .activateProtocol(PROJECT_ID, firstTemplate.id);

    const onClose = vi.fn();
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={onClose}
      />,
    );

    // Should start as activated (record exists in store).
    const undoBtn = screen.getAllByText('Undo');
    expect(undoBtn.length).toBeGreaterThan(0);
    fireEvent.click(undoBtn[0]!);

    // Record should be removed from protocolStore.
    const records = useProtocolStore.getState().records;
    expect(
      records.find(
        (r) => r.projectId === PROJECT_ID && r.templateId === firstTemplate.id,
      ),
    ).toBeUndefined();
  });

  it('pre-activated templates initialize as activated', () => {
    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    useProtocolStore
      .getState()
      .activateProtocol(PROJECT_ID, firstTemplate.id);

    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={vi.fn()}
      />,
    );

    // At least one card should show "Activated" on mount.
    expect(screen.getAllByText(/✓ Activated/).length).toBeGreaterThan(0);
    // And its Undo button should be visible.
    expect(screen.getAllByText('Undo').length).toBeGreaterThan(0);
  });

  it('onClose is called when Close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('ProtocolApprovalOverlay — Edit-First write-back', () => {
  it('edit-commit writes token values back to planStratumStore', () => {
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={vi.fn()}
      />,
    );

    // Find a card that has an "Edit First" button (templates with tokens).
    const editFirstBtns = screen.getAllByText('Edit First').filter(
      (btn) => !(btn as HTMLButtonElement).disabled,
    );
    expect(editFirstBtns.length).toBeGreaterThan(0);
    fireEvent.click(editFirstBtns[0]!);

    // Find the first inline input rendered in the edit form.
    const inputs = screen.getAllByRole('textbox');
    // Fill the first input with a test value.
    const firstInput = inputs[inputs.length - 1]!; // last is most recently mounted
    fireEvent.change(firstInput, { target: { value: '1500' } });

    // Click Save & activate.
    fireEvent.click(screen.getByText('Save & activate'));

    // The planStratumStore should have received a write for this project.
    const stored = usePlanStratumProgressStore
      .getState()
      .getParameterValues(PROJECT_ID, 's6-yield-flows');
    // At least one parameter item should have been written.
    expect(Object.keys(stored).length).toBeGreaterThan(0);
  });
});
