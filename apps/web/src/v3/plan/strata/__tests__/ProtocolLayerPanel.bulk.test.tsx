/**
 * @vitest-environment happy-dom
 *
 * ProtocolLayerPanel — ACT bulk-activation toolbar (`bulkActivation` opt-in).
 * The default Act rail (no `bulkActivation`) is covered by the sibling
 * ProtocolLayerPanel.act.test.tsx and must stay green — proof the toolbar is
 * strictly additive. This suite proves:
 *   1. Without `bulkActivation`, no toolbar renders (additive guard).
 *   2. The "Select" toggle reveals "Activate all (N)" + "Activate selected (M)".
 *   3. In select-mode a card click toggles selection (data-selected) and does
 *      NOT fire onSelectProtocol (single-select is suppressed).
 *   4. "Activate selected" reflects the chosen subset and is disabled at 0.
 *   5. "Activate all" → confirm overlay → Confirm bulk-activates the eligible
 *      set into protocolStore (records become active).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
} from '@testing-library/react';
import { resolveProjectProtocols } from '@ogden/shared';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import ProtocolLayerPanel from '../ProtocolLayerPanel.js';

const PROJECT_ID = 'proj-bulk';
const STRATUM = 's6-integration-design';
// Two silvopasture-primary S6 protocols (same stratum group → both eligible).
const ID_A = 'silv-establishment-protection';
const ID_B = 'silv-tree-browse-damage';
// Eligible set = the visible S6 group (none active at start).
const S6_COUNT = resolveProjectProtocols({ primaryTypeId: 'silvopasture' })
  .protocols.filter((t) => t.stratumId === STRATUM).length;

beforeEach(() => {
  useProtocolStore.setState({ records: [] });
  window.localStorage.clear();
});
afterEach(() => cleanup());

function renderBulk(extra?: { onSelectProtocol?: (id: string) => void }) {
  return render(
    <ProtocolLayerPanel
      projectId={PROJECT_ID}
      primaryTypeId="silvopasture"
      secondaryTypeIds={[]}
      variant="act"
      activeStratumId={STRATUM}
      bulkActivation
      onSelectProtocol={extra?.onSelectProtocol ?? vi.fn()}
    />,
  );
}

function cardById(id: string) {
  return screen
    .getAllByTestId('protocol-template-card')
    .find((el) => el.getAttribute('data-template-id') === id)!;
}

describe('ProtocolLayerPanel (Act bulk activation)', () => {
  it('renders no bulk toolbar when bulkActivation is omitted', () => {
    render(
      <ProtocolLayerPanel
        projectId={PROJECT_ID}
        primaryTypeId="silvopasture"
        secondaryTypeIds={[]}
        variant="act"
        activeStratumId={STRATUM}
      />,
    );
    expect(screen.queryByTestId('protocol-bulk-toolbar')).toBeNull();
  });

  it('Select toggle reveals "Activate all (N)" and "Activate selected (M)"', () => {
    renderBulk();
    // Toolbar present but the activate buttons are hidden until select-mode.
    expect(screen.getByTestId('protocol-bulk-toolbar')).toBeTruthy();
    expect(screen.queryByTestId('protocol-bulk-activate-all')).toBeNull();

    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));

    expect(
      screen.getByTestId('protocol-bulk-activate-all').textContent,
    ).toContain(`Activate all (${S6_COUNT})`);
    // Nothing selected yet → "Activate selected (0)", disabled.
    const sel = screen.getByTestId(
      'protocol-bulk-activate-selected',
    ) as HTMLButtonElement;
    expect(sel.textContent).toContain('Activate selected (0)');
    expect(sel.disabled).toBe(true);
  });

  it('select-mode card click toggles selection and suppresses onSelectProtocol', () => {
    const onSelect = vi.fn();
    renderBulk({ onSelectProtocol: onSelect });
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));

    fireEvent.click(cardById(ID_A));
    expect(cardById(ID_A).getAttribute('data-selected')).toBe('true');
    expect(onSelect).not.toHaveBeenCalled();

    // "Activate selected" now reflects the one chosen card.
    const sel = screen.getByTestId(
      'protocol-bulk-activate-selected',
    ) as HTMLButtonElement;
    expect(sel.textContent).toContain('Activate selected (1)');
    expect(sel.disabled).toBe(false);

    // Toggling off clears it.
    fireEvent.click(cardById(ID_A));
    expect(cardById(ID_A).getAttribute('data-selected')).toBe('false');
  });

  it('"Activate selected" → confirm overlay → Confirm activates only the chosen subset', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(cardById(ID_A));
    fireEvent.click(cardById(ID_B));
    fireEvent.click(screen.getByTestId('protocol-bulk-activate-selected'));

    // Overlay appears listing the pending set.
    expect(screen.getByTestId('protocol-bulk-confirm-overlay')).toBeTruthy();
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));

    const recs = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID && r.status === 'active');
    expect(recs.map((r) => r.templateId).sort()).toEqual([ID_A, ID_B].sort());
  });

  it('"Activate all" activates the whole eligible stratum set on Confirm', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-activate-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));

    const active = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID && r.status === 'active');
    expect(active).toHaveLength(S6_COUNT);
  });

  it('Cancel on the overlay activates nothing', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-activate-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-cancel'));
    expect(useProtocolStore.getState().records).toHaveLength(0);
  });
});
