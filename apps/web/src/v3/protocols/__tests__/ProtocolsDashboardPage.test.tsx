/**
 * @vitest-environment happy-dom
 *
 * ProtocolsDashboardPage - Active view (Plan Phase D1).
 *
 * Proves the dashboard end of the slice: the Active view lists every template
 * the project has put into the `active` lifecycle (via useProtocolLibrary),
 * each carrying its severity-tier badge, and a "Recent activations" strip maps
 * the immutable ProtocolActivation records (useProtocolActivations) to rows.
 *
 * Fixture: a silvopasture project with the `silv-tree-browse-damage` standing
 * protocol active. After the per-type catalogue rewrite (commit 29662ef3) the
 * old `water-trough-inspection` id no longer resolves for a silvopasture
 * project, so we activate a real RESPOND-tier template from the silvopasture
 * catalogue (packages/shared/.../catalogues/silvopasture.ts) instead.
 * @tanstack/react-router useParams is mocked to that project; real stores are
 * seeded directly (no store mocks) so the derivation is exercised for real.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React 18 + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern).
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

const h = vi.hoisted(() => ({
  params: { projectId: 'test-proj-d1' } as { projectId: string | undefined },
}));

vi.mock('@tanstack/react-router', () => ({
  useParams: () => h.params,
}));

import {
  type ProjectTypeRecord,
} from '@ogden/shared';
import {
  useProjectStore,
  type LocalProject,
} from '../../../store/projectStore.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import ProtocolsDashboardPage from '../ProtocolsDashboardPage.js';

const PROJECT_ID = 'test-proj-d1';
const TEMPLATE_ID = 'silv-tree-browse-damage';
const TEMPLATE_NAME = 'Tree Browse Damage';

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
  useProtocolStore.setState({ records: [], activations: [] });
  window.localStorage.clear();
}

beforeEach(() => {
  h.params = { projectId: PROJECT_ID };
  resetAll();
  seedProject();
  // Put the RESPOND template into the active lifecycle so it lists in Active.
  useProtocolStore.getState().activateProtocol(PROJECT_ID, TEMPLATE_ID);
});

afterEach(() => cleanup());

describe('ProtocolsDashboardPage - Active view', () => {
  it('lists each active template with its severity-tier badge', () => {
    render(<ProtocolsDashboardPage />);

    const cards = screen.getAllByTestId('protocol-template-card');
    expect(cards.length).toBeGreaterThan(0);

    // The active RESPOND template is present, with a tier badge + RESPOND glyph.
    expect(screen.getByText(TEMPLATE_NAME)).toBeTruthy();
    expect(screen.getAllByTestId('tier-badge').length).toBeGreaterThan(0);
    expect(screen.getAllByText('▲').length).toBeGreaterThan(0); // RESPOND
  });

  it('renders a recent-activation row for each recorded activation', () => {
    useProtocolStore.getState().recordActivation({
      projectId: PROJECT_ID,
      templateId: TEMPLATE_ID,
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: {
        name: TEMPLATE_NAME,
        condition: 'Water trough level below threshold',
        response: 'Inspect and refill the trough',
      },
      triggerContext: 'act_proof_capture',
    });

    render(<ProtocolsDashboardPage />);

    const rows = screen.getAllByTestId('protocol-activation-row');
    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(within(row).getByText(new RegExp(TEMPLATE_NAME))).toBeTruthy();
    expect(within(row).getByText(/confirmed/)).toBeTruthy();
  });

  it('shows no activation rows before any activation is recorded', () => {
    render(<ProtocolsDashboardPage />);
    expect(screen.queryByTestId('protocol-activation-row')).toBeNull();
  });
});
