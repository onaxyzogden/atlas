/**
 * @vitest-environment happy-dom
 *
 * ActProtocolDetailPane — the Act right-rail single-protocol detail. Proves:
 *   1. It renders the FULL shared card (IF/THEN body, not collapsed) for the
 *      given templateId, plus the verbatim Amanah caution for a scoped protocol.
 *   2. Activate wires to protocolStore.activateProtocol — the control then flips
 *      to Deactivate (status === 'active').
 *   3. Deactivate wires to protocolStore.deactivateProtocol — back to Activate.
 *   4. An unknown templateId renders the empty "select a protocol" state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { resolveProjectProtocols } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ActProtocolDetailPane from '../ActProtocolDetailPane.js';

const PROJECT_ID = 'proj-detail';
// A resolved market_garden protocol carrying a verbatim Amanah scopeNote.
const SCOPED = resolveProjectProtocols({ primaryTypeId: 'market_garden' }).protocols.find(
  (t) => t.id === 'mg-market-channel-advance-sale',
)!;

function renderPane(templateId: string) {
  return render(
    <ActProtocolDetailPane
      projectId={PROJECT_ID}
      primaryTypeId="market_garden"
      secondaryTypeIds={[]}
      templateId={templateId}
    />,
  );
}

beforeEach(() => {
  useProtocolStore.setState({ records: [] });
});
afterEach(() => cleanup());

describe('ActProtocolDetailPane', () => {
  it('renders the full card + verbatim Amanah caution for the selected protocol', () => {
    renderPane(SCOPED.id);

    const pane = screen.getByTestId('act-protocol-detail');
    expect(pane.getAttribute('data-template-id')).toBe(SCOPED.id);

    const card = within(pane).getByTestId('protocol-template-card');
    // Full card — body present (not collapsed).
    expect(within(card).getByText('IF')).toBeTruthy();
    // Verbatim Amanah caution (bayʿ mā laysa ʿindak class of warning).
    const caution = within(pane).getByTestId('protocol-amanah-caution');
    expect(caution.textContent).toContain(SCOPED.scopeNotes!);
  });

  it('Activate calls protocolStore and flips the control to Deactivate', () => {
    renderPane(SCOPED.id);
    fireEvent.click(screen.getByTestId('act-protocol-activate'));

    // Store mutated to active for this (project, template).
    const rec = useProtocolStore
      .getState()
      .records.find((r) => r.projectId === PROJECT_ID && r.templateId === SCOPED.id);
    expect(rec?.status).toBe('active');

    // Control row now offers Deactivate (+ Suspend).
    expect(screen.getByTestId('act-protocol-deactivate')).toBeTruthy();
    expect(screen.getByTestId('act-protocol-suspend')).toBeTruthy();
    expect(screen.queryByTestId('act-protocol-activate')).toBeNull();
  });

  it('Deactivate removes the record and restores the Activate control', () => {
    renderPane(SCOPED.id);
    fireEvent.click(screen.getByTestId('act-protocol-activate'));
    fireEvent.click(screen.getByTestId('act-protocol-deactivate'));

    const rec = useProtocolStore
      .getState()
      .records.find((r) => r.projectId === PROJECT_ID && r.templateId === SCOPED.id);
    expect(rec).toBeUndefined();
    expect(screen.getByTestId('act-protocol-activate')).toBeTruthy();
  });

  it('renders the empty state for an unknown templateId', () => {
    renderPane('does-not-exist');
    expect(screen.getByTestId('act-protocol-detail-empty')).toBeTruthy();
    expect(screen.queryByTestId('protocol-template-card')).toBeNull();
  });
});
