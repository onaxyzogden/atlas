/**
 * @vitest-environment happy-dom
 *
 * ProtocolWiringPane — the WIRING & STATE summary for the Plan Protocols-mode
 * right rail (complement of the center MEANING pane). Proves:
 *   1. It renders the stratum label (S{ordinal} · {title}) from PLAN_STRATA.
 *   2. It renders the feeds-into chips.
 *   3. Status reflects the activation record (default "Standard template",
 *      "Active" once activated).
 *   4. Expected rate renders "{count} per {per}" when an expectation is set.
 *   5. An unknown templateId renders the empty cue.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within, act } from '@testing-library/react';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ProtocolWiringPane from '../ProtocolWiringPane.js';

const PROJECT_ID = 'proj-wiring';
const PRIMARY = 'market_garden' as const;
// Universal protocol (resolves for any type): stratum s5-system-design,
// feeds ['Hydrology', 'Built Infrastructure'], no objectiveId.
const TEMPLATE_ID = 'u-s5-water-store-low';

function renderPane(templateId: string) {
  return render(
    <ProtocolWiringPane
      projectId={PROJECT_ID}
      primaryTypeId={PRIMARY}
      secondaryTypeIds={[]}
      templateId={templateId}
    />,
  );
}

beforeEach(() => {
  useProtocolStore.setState({ records: [], expectationsByProject: {} });
});
afterEach(() => cleanup());

describe('ProtocolWiringPane', () => {
  it('renders the stratum label and the feeds-into chips', () => {
    renderPane(TEMPLATE_ID);

    const pane = screen.getByTestId('protocol-wiring-pane');
    expect(pane.getAttribute('data-template-id')).toBe(TEMPLATE_ID);
    expect(within(pane).getByText('S5 · System Design')).toBeTruthy();
    expect(within(pane).getByText('Hydrology')).toBeTruthy();
    expect(within(pane).getByText('Built Infrastructure')).toBeTruthy();
  });

  it('shows the default status, then "Active" once the protocol is activated', () => {
    const { rerender } = renderPane(TEMPLATE_ID);
    expect(screen.getByTestId('protocol-wiring-status').textContent).toContain(
      'Standard template',
    );

    act(() => {
      useProtocolStore.getState().activateProtocol(PROJECT_ID, TEMPLATE_ID);
    });
    rerender(
      <ProtocolWiringPane
        projectId={PROJECT_ID}
        primaryTypeId={PRIMARY}
        secondaryTypeIds={[]}
        templateId={TEMPLATE_ID}
      />,
    );
    expect(screen.getByTestId('protocol-wiring-status').textContent).toContain(
      'Active',
    );
  });

  it('renders the expected rate as "{count} per {per}" when set', () => {
    useProtocolStore
      .getState()
      .setExpectation(PROJECT_ID, TEMPLATE_ID, { count: 2, per: 'season' });
    renderPane(TEMPLATE_ID);
    expect(screen.getByTestId('protocol-wiring-rate').textContent).toBe(
      '2 per season',
    );
  });

  it('omits the expected rate when none is set', () => {
    renderPane(TEMPLATE_ID);
    expect(screen.queryByTestId('protocol-wiring-rate')).toBeNull();
  });

  it('renders the empty cue for an unknown templateId', () => {
    renderPane('does-not-exist');
    expect(screen.getByTestId('protocol-wiring-empty')).toBeTruthy();
    expect(screen.queryByTestId('protocol-wiring-pane')).toBeNull();
  });
});
