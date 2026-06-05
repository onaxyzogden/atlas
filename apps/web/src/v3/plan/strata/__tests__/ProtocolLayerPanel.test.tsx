/**
 * @vitest-environment happy-dom
 *
 * ProtocolLayerPanel — the live, store-backed Protocol Layer right pane (Plan
 * Spine re-skin Phase 2; resolver wiring 2026-06-04). These tests assert the
 * load-bearing wiring decisions of the panel:
 *   1. It sources the full RESOLVED standing-protocol set via
 *      `resolveProjectProtocols` keyed off the project's primary/secondary types
 *      (universal 22 + per-type deltas), NOT the legacy livestock-only
 *      enterprise filter.
 *   2. It groups by each protocol's `stratumId`, headed with the PLAN_STRATA
 *      label (`S{ordinal} · {title}`), in resolver S1→S7 order.
 *   3. It overlays lifecycle status from `protocolStore.records` for the project
 *      (an activated template reads "Active"); a project with no primary type
 *      shows the empty state.
 *   4. The verbatim Amanah scopeNotes caution surfaces on sales-channel
 *      protocols (e.g. market_garden's `mg-market-channel-advance-sale`).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { resolveProjectProtocols } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ProtocolLayerPanel from '../ProtocolLayerPanel.js';

const PROJECT_ID = 'proj-1';
const SILVOPASTURE_COUNT = resolveProjectProtocols({
  primaryTypeId: 'silvopasture',
}).protocols.length;

beforeEach(() => {
  // Reset the persisted protocol store between tests so status overlays don't
  // bleed across cases.
  useProtocolStore.setState({ records: [] });
});

describe('ProtocolLayerPanel', () => {
  it('renders the full resolved standing-protocol set for a typed project', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
      />,
    );

    const cards = screen.getAllByTestId('protocol-template-card');
    expect(cards).toHaveLength(SILVOPASTURE_COUNT);
    // universal baseline always present, plus the primary-type deltas.
    expect(SILVOPASTURE_COUNT).toBeGreaterThan(22);

    // A universal protocol AND a silvopasture-primary protocol both surface.
    expect(screen.getByText('Vision Drift Check')).toBeTruthy();
    expect(screen.getByText('Tree Browse Damage')).toBeTruthy();
  });

  it('groups protocols by stratum, S1→S7, with PLAN_STRATA labels', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
      />,
    );

    const headings = screen
      .getAllByTestId('protocol-tier-heading')
      .map((el) => el.textContent);
    // Universal protocols span all 7 strata, so multiple stratum groups appear,
    // the first being S1 (resolver sorts by stratum ordinal).
    expect(headings.length).toBeGreaterThan(1);
    expect(headings[0]).toBe('S1 · Project Foundation');
    expect(headings).toContain('S6 · Integration Design');
  });

  it('reflects protocolStore activation state on the matching template card', () => {
    useProtocolStore
      .getState()
      .activateProtocol(PROJECT_ID, 'silv-tree-browse-damage');

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
          el.getAttribute('data-template-id') === 'silv-tree-browse-damage',
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
          el.getAttribute('data-template-id') === 'u-s1-vision-drift-check',
      );
    expect(other!.getAttribute('data-protocol-status')).toBe('none');
    expect(within(other!).queryByText('Standard template')).toBeNull();
  });

  it('ignores activation records belonging to a different project', () => {
    useProtocolStore
      .getState()
      .activateProtocol('some-other-project', 'silv-tree-browse-damage');

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
          el.getAttribute('data-template-id') === 'silv-tree-browse-damage',
      );
    expect(card!.getAttribute('data-protocol-status')).toBe('none');
  });

  it('shows the empty state when no primary type is set', () => {
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
        'No project type set — choose a primary type to see its standing protocols.',
      ),
    ).toBeTruthy();
  });

  it('surfaces the verbatim Amanah caution on a sales-channel protocol', () => {
    // market_garden's advance-sale review carries the bayʿ mā laysa ʿindak
    // scopeNote; it must render verbatim, never stripped or reworded.
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="market_garden"
        secondaryTypeIds={[]}
      />,
    );

    const card = screen
      .getAllByTestId('protocol-template-card')
      .find(
        (el) =>
          el.getAttribute('data-template-id') ===
          'mg-market-channel-advance-sale',
      );
    expect(card).toBeTruthy();
    expect(card!.getAttribute('data-has-scope-notes')).toBe('true');
    const caution = within(card!).getByTestId('protocol-amanah-caution');
    expect(caution.textContent).toMatch(/bay.* m.* laysa .*indak/i);
  });
});
