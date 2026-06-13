/**
 * @vitest-environment happy-dom
 *
 * PlanProtocolDetailPane — the Plan tier-shell right-rail single-protocol detail.
 * Unlike the Act pane (thresholds read-only), this pane is the FULL-EDIT surface:
 * the shared card + an editable ProtocolThresholdEditor + the same activation
 * controls. Proves:
 *   1. It renders the full shared card for the given templateId.
 *   2. It renders the threshold editor with one input per condition `[token]`.
 *   3. It renders the activation controls (Activate when no record).
 *   4. Typing a threshold writes setProtocolTokenOverride for the (project,
 *      template, token), and the card condition substitutes the value live.
 *   5. Activate wires to protocolStore.
 *   6. An unknown templateId renders the empty state.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import {
  usePlanStratumProgressStore,
  selectProjectProtocolOverrides,
} from '../../../../store/planStratumStore.js';
import PlanProtocolDetailPane from '../PlanProtocolDetailPane.js';

const PROJECT_ID = 'proj-plan-detail';
const PRIMARY = 'market_garden' as const;
// Universal protocol — resolves for any project type — carrying one token.
const SINGLE_ID = 'u-s5-water-store-low'; // condition: ...[reserve threshold]
const TOKEN = 'reserve threshold';

function renderPane(templateId: string) {
  return render(
    <PlanProtocolDetailPane
      projectId={PROJECT_ID}
      primaryTypeId={PRIMARY}
      secondaryTypeIds={[]}
      templateId={templateId}
    />,
  );
}

function resetStores(): void {
  useProtocolStore.setState({ records: [] });
  usePlanStratumProgressStore.setState({ protocolTokenOverridesByProject: {} });
}

beforeEach(() => resetStores());
afterEach(() => cleanup());

describe('PlanProtocolDetailPane', () => {
  it('renders the full card, the threshold editor, and the activation controls', () => {
    renderPane(SINGLE_ID);

    const pane = screen.getByTestId('plan-protocol-detail');
    expect(pane.getAttribute('data-template-id')).toBe(SINGLE_ID);

    // Full shared card.
    expect(within(pane).getByTestId('protocol-template-card')).toBeTruthy();
    // Editable threshold editor with one input per condition token.
    const editor = within(pane).getByTestId('protocol-threshold-editor');
    expect(within(editor).getByTestId(`protocol-threshold-input-${TOKEN}`)).toBeTruthy();
    // Activation controls — no record yet, so Activate is offered.
    expect(within(pane).getByTestId('act-protocol-activation-controls')).toBeTruthy();
    expect(within(pane).getByTestId('act-protocol-activate')).toBeTruthy();
  });

  it('typing a threshold writes the override and substitutes into the card live', () => {
    renderPane(SINGLE_ID);

    const card = () => screen.getByTestId('protocol-template-card');
    expect(card().textContent).toContain(`[${TOKEN}]`);

    fireEvent.change(screen.getByTestId(`protocol-threshold-input-${TOKEN}`), {
      target: { value: '20% of capacity' },
    });

    expect(
      selectProjectProtocolOverrides(
        usePlanStratumProgressStore.getState(),
        PROJECT_ID,
      )[SINGLE_ID],
    ).toEqual({ [TOKEN]: '20% of capacity' });

    expect(card().textContent).toContain('20% of capacity');
    expect(card().textContent).not.toContain(`[${TOKEN}]`);
  });

  it('Activate wires to protocolStore and flips the control to Deactivate', () => {
    renderPane(SINGLE_ID);
    fireEvent.click(screen.getByTestId('act-protocol-activate'));

    const rec = useProtocolStore
      .getState()
      .records.find((r) => r.projectId === PROJECT_ID && r.templateId === SINGLE_ID);
    expect(rec?.status).toBe('active');

    expect(screen.getByTestId('act-protocol-deactivate')).toBeTruthy();
    expect(screen.queryByTestId('act-protocol-activate')).toBeNull();
  });

  it('renders the empty state for an unknown templateId', () => {
    renderPane('does-not-exist');
    expect(screen.getByTestId('plan-protocol-detail-empty')).toBeTruthy();
    expect(screen.queryByTestId('protocol-template-card')).toBeNull();
  });
});
