/**
 * @vitest-environment happy-dom
 *
 * ProtocolApprovalOverlay — Expected firing rate authoring (T1.8).
 *
 * Covers:
 *   1. Renders a rate control per template (count input + per select).
 *   2. Entering a rate and activating persists it to protocolStore.
 *   3. per: 'cycle' is captured correctly.
 *   4. Empty count does NOT persist an expectation.
 *   5. Re-opening pre-fills the stored value.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

/** Minimal project with silvopasture type (livestock -> sheep_beef enterprise). */
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

beforeEach(() => {
  seedProject();
  useProtocolStore.setState({ records: [], activations: [], expectationsByProject: {} });
  usePlanStratumProgressStore.setState({ valuesByProject: {} });
  window.localStorage.clear();
});

describe('ProtocolApprovalOverlay — Expected firing rate', () => {
  it('renders a rate control per template', () => {
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={() => {}}
      />,
    );

    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    expect(
      screen.getByTestId(`expected-rate-count-${firstTemplate.id}`),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`expected-rate-per-${firstTemplate.id}`),
    ).toBeTruthy();
  });

  it('entering a rate and activating persists it (per: season)', () => {
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={() => {}}
      />,
    );

    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    const countInput = screen.getByTestId(
      `expected-rate-count-${firstTemplate.id}`,
    );
    const perSelect = screen.getByTestId(
      `expected-rate-per-${firstTemplate.id}`,
    );

    fireEvent.change(countInput, { target: { value: '3' } });
    fireEvent.change(perSelect, { target: { value: 'season' } });

    // Click the first Activate button (same order as templates)
    const activateButtons = screen.getAllByText('Activate');
    fireEvent.click(activateButtons[0]!);

    expect(
      useProtocolStore.getState().expectationsByProject[PROJECT_ID]?.[firstTemplate.id],
    ).toEqual({ count: 3, per: 'season' });
  });

  it('per: cycle is captured correctly', () => {
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={() => {}}
      />,
    );

    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    const countInput = screen.getByTestId(
      `expected-rate-count-${firstTemplate.id}`,
    );
    const perSelect = screen.getByTestId(
      `expected-rate-per-${firstTemplate.id}`,
    );

    fireEvent.change(countInput, { target: { value: '2' } });
    fireEvent.change(perSelect, { target: { value: 'cycle' } });

    const activateButtons = screen.getAllByText('Activate');
    fireEvent.click(activateButtons[0]!);

    expect(
      useProtocolStore.getState().expectationsByProject[PROJECT_ID]?.[firstTemplate.id],
    ).toEqual({ count: 2, per: 'cycle' });
  });

  it('empty count does NOT persist an expectation', () => {
    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={() => {}}
      />,
    );

    // Click activate without entering a count
    const activateButtons = screen.getAllByText('Activate');
    fireEvent.click(activateButtons[0]!);

    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    expect(
      useProtocolStore.getState().expectationsByProject[PROJECT_ID]?.[firstTemplate.id],
    ).toBeUndefined();
  });

  it('re-opening pre-fills the stored value', () => {
    // Set a stored expectation BEFORE rendering
    useProtocolStore
      .getState()
      .setExpectation(PROJECT_ID, SHEEP_BEEF_TEMPLATES[0]!.id, {
        count: 5,
        per: 'cycle',
      });

    render(
      <ProtocolApprovalOverlay
        projectId={PROJECT_ID}
        objective={S6}
        onClose={() => {}}
      />,
    );

    const firstTemplate = SHEEP_BEEF_TEMPLATES[0]!;
    const countInput = screen.getByTestId(
      `expected-rate-count-${firstTemplate.id}`,
    ) as HTMLInputElement;
    const perSelect = screen.getByTestId(
      `expected-rate-per-${firstTemplate.id}`,
    ) as HTMLSelectElement;

    expect(countInput.value).toBe('5');
    expect(perSelect.value).toBe('cycle');
  });
});
