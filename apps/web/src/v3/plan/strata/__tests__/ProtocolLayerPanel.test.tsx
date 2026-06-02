/**
 * @vitest-environment happy-dom
 *
 * ProtocolLayerPanel — the live, store-backed Protocol Layer right pane (Plan
 * Spine re-skin Phase 2). These tests assert the three load-bearing wiring
 * decisions of the panel:
 *   1. It sources REAL shared templates via
 *      enterprisesForProjectTypes → templatesForEnterprises, enterprise-filtered:
 *      a livestock-implying project type surfaces the 9 sheep_beef standard
 *      templates and HIDES the poultry-only Silvopasture Pest Diversion.
 *   2. It groups by each template's real `tierAuthored` string.
 *   3. It overlays lifecycle status from `protocolStore.records` for the project
 *      (an activated template reads "Active"); a project with no livestock
 *      enterprise shows the empty state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { templatesForEnterprises } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ProtocolLayerPanel from '../ProtocolLayerPanel.js';

const PROJECT_ID = 'proj-1';
const SHEEP_BEEF_COUNT = templatesForEnterprises(['sheep_beef']).length; // 9

beforeEach(() => {
  // Reset the persisted protocol store between tests so status overlays don't
  // bleed across cases.
  useProtocolStore.setState({ records: [] });
});

describe('ProtocolLayerPanel', () => {
  it('renders the real sheep_beef standard templates and hides poultry-only ones', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
      />,
    );

    const cards = screen.getAllByTestId('protocol-template-card');
    expect(cards).toHaveLength(SHEEP_BEEF_COUNT);
    expect(SHEEP_BEEF_COUNT).toBe(9);

    // A known sheep_beef template surfaces; the poultry-only one is hidden.
    expect(screen.getByText('Paddock Rotation — Cover Trigger')).toBeTruthy();
    expect(screen.queryByText('Silvopasture Pest Diversion')).toBeNull();
  });

  it('groups templates by their real tierAuthored string', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
      />,
    );

    // Every standard template is authored at Stratum 6 — Integration today, so
    // there is exactly one tier group bearing that real string.
    const headings = screen.getAllByTestId('protocol-tier-heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]!.textContent).toBe('Stratum 6 — Integration');
  });

  it('reflects protocolStore activation state on the matching template card', () => {
    useProtocolStore
      .getState()
      .activateProtocol(PROJECT_ID, 'paddock-rotation-cover-trigger');

    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
      />,
    );

    const activated = screen
      .getAllByTestId('protocol-template-card')
      .find(
        (el) =>
          el.getAttribute('data-template-id') ===
          'paddock-rotation-cover-trigger',
      );
    expect(activated).toBeTruthy();
    expect(activated!.getAttribute('data-protocol-status')).toBe('active');
    expect(within(activated!).getByText('Active')).toBeTruthy();

    // A different, non-activated template carries no lifecycle status and now
    // omits the default "Standard template" footer label.
    const other = screen
      .getAllByTestId('protocol-template-card')
      .find(
        (el) =>
          el.getAttribute('data-template-id') ===
          'rest-period-re-entry-gate',
      );
    expect(other!.getAttribute('data-protocol-status')).toBe('none');
    expect(within(other!).queryByText('Standard template')).toBeNull();
  });

  it('ignores activation records belonging to a different project', () => {
    useProtocolStore
      .getState()
      .activateProtocol('some-other-project', 'paddock-rotation-cover-trigger');

    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
      />,
    );

    const card = screen
      .getAllByTestId('protocol-template-card')
      .find(
        (el) =>
          el.getAttribute('data-template-id') ===
          'paddock-rotation-cover-trigger',
      );
    expect(card!.getAttribute('data-protocol-status')).toBe('none');
  });

  it('shows the empty state when the project has no livestock enterprise', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId={null}
        secondaryTypeIds={[]}
      />,
    );

    expect(screen.queryAllByTestId('protocol-template-card')).toHaveLength(0);
    expect(
      screen.getByText(
        'No animal protocol templates — this project has no livestock enterprise.',
      ),
    ).toBeTruthy();
  });

  it('derives livestock enterprise from a secondary type layer', () => {
    // Primary is non-livestock, but a livestock secondary still surfaces the
    // sheep_beef templates (enterprisesForProjectTypes ORs primary + secondaries).
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="market_garden"
        secondaryTypeIds={['homestead']}
      />,
    );

    expect(screen.getAllByTestId('protocol-template-card')).toHaveLength(
      SHEEP_BEEF_COUNT,
    );
  });
});
