/**
 * @vitest-environment happy-dom
 *
 * ProtocolLayerPanel — ACT bulk toolbar (`bulkActivation` opt-in), now a verb
 * selector [Activate · Suspend · Deactivate] + "Apply to all (N)" / "Apply to
 * selected (M)". The default Act rail (no `bulkActivation`) is covered by the
 * sibling ProtocolLayerPanel.act.test.tsx and must stay green — proof the toolbar
 * is strictly additive. This suite proves:
 *   1. Without `bulkActivation`, no toolbar renders (additive guard).
 *   2. The "Select" toggle reveals the verb group + "Apply to all/selected".
 *   3. In select-mode a card click toggles selection (data-selected) and does
 *      NOT fire onSelectProtocol (single-select is suppressed).
 *   4. "Apply to selected" reflects the chosen subset and is disabled at 0.
 *   5. Activate verb: "Apply to all" → confirm → eligible set becomes active.
 *   6. Suspend verb: eligibility recomputes (active/triggered only); Apply →
 *      confirm (no Amanah) → records become 'suspended'.
 *   7. Deactivate verb: Apply selected → confirm → matching records removed.
 *   8. Verb selector is a keyboard radiogroup: Arrow/Home/End move + check.
 *   9. Applying a bulk action raises an Undo toast that reverses it.
 *  10. Rapid successive applies STACK their own point-in-time Undo toasts
 *      (last-write-wins on the final fired undo).
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
import { useToastStore } from '../../../../components/Toast.js';
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
  useToastStore.setState({ toasts: [] });
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

function activeRecords() {
  return useProtocolStore
    .getState()
    .records.filter((r) => r.projectId === PROJECT_ID && r.status === 'active');
}

describe('ProtocolLayerPanel (Act bulk toolbar)', () => {
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

  it('Select toggle reveals the verb group + "Apply to all/selected"', () => {
    renderBulk();
    // Toolbar present but the verb group + apply buttons hidden until select-mode.
    expect(screen.getByTestId('protocol-bulk-toolbar')).toBeTruthy();
    expect(screen.queryByTestId('protocol-bulk-apply-all')).toBeNull();

    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));

    // Verb group is a radiogroup defaulting to Activate (aria-checked).
    expect(screen.getByTestId('protocol-bulk-verb-activate')).toBeTruthy();
    expect(
      screen
        .getByTestId('protocol-bulk-verb-group')
        .getAttribute('role'),
    ).toBe('radiogroup');
    expect(
      screen
        .getByTestId('protocol-bulk-verb-activate')
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(
      screen.getByTestId('protocol-bulk-apply-all').textContent,
    ).toContain(`Apply to all (${S6_COUNT})`);
    // Nothing selected yet → "Apply to selected (0)", disabled.
    const sel = screen.getByTestId(
      'protocol-bulk-apply-selected',
    ) as HTMLButtonElement;
    expect(sel.textContent).toContain('Apply to selected (0)');
    expect(sel.disabled).toBe(true);
  });

  it('select-mode card click toggles selection and suppresses onSelectProtocol', () => {
    const onSelect = vi.fn();
    renderBulk({ onSelectProtocol: onSelect });
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));

    fireEvent.click(cardById(ID_A));
    expect(cardById(ID_A).getAttribute('data-selected')).toBe('true');
    expect(onSelect).not.toHaveBeenCalled();

    // "Apply to selected" now reflects the one chosen card.
    const sel = screen.getByTestId(
      'protocol-bulk-apply-selected',
    ) as HTMLButtonElement;
    expect(sel.textContent).toContain('Apply to selected (1)');
    expect(sel.disabled).toBe(false);

    // Toggling off clears it.
    fireEvent.click(cardById(ID_A));
    expect(cardById(ID_A).getAttribute('data-selected')).toBe('false');
  });

  it('Activate verb: "Apply to selected" → confirm → only the chosen subset active', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(cardById(ID_A));
    fireEvent.click(cardById(ID_B));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-selected'));

    // Overlay appears; activate surfaces no Amanah for these (clean) protocols.
    expect(screen.getByTestId('protocol-bulk-confirm-overlay')).toBeTruthy();
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));

    expect(activeRecords().map((r) => r.templateId).sort()).toEqual(
      [ID_A, ID_B].sort(),
    );
  });

  it('Activate verb: "Apply to all" activates the whole eligible stratum set', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));
    expect(activeRecords()).toHaveLength(S6_COUNT);
  });

  it('Cancel on the overlay mutates nothing', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-cancel'));
    expect(useProtocolStore.getState().records).toHaveLength(0);
  });

  it('Suspend verb: eligibility = active records only; Apply → suspended (no Amanah)', () => {
    // Seed two active records so suspend has eligible targets.
    useProtocolStore.getState().activateProtocols(PROJECT_ID, [ID_A, ID_B]);
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-verb-suspend'));

    // Only the 2 active records are eligible for suspension (not the full S6 set).
    expect(
      screen.getByTestId('protocol-bulk-apply-all').textContent,
    ).toContain('Apply to all (2)');

    fireEvent.click(screen.getByTestId('protocol-bulk-apply-all'));
    // Suspend carries no fiqh risk → no Amanah block.
    expect(screen.getByTestId('protocol-bulk-confirm-overlay')).toBeTruthy();
    expect(screen.queryByTestId('protocol-bulk-amanah')).toBeNull();
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));

    const recs = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID);
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => r.status === 'suspended')).toBe(true);
  });

  it('Deactivate verb: Apply selected → confirm (no Amanah) → records removed', () => {
    useProtocolStore.getState().activateProtocols(PROJECT_ID, [ID_A, ID_B]);
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-verb-deactivate'));

    // Both existing records are eligible for deactivation.
    expect(
      screen.getByTestId('protocol-bulk-apply-all').textContent,
    ).toContain('Apply to all (2)');

    fireEvent.click(cardById(ID_A));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-selected'));
    expect(screen.queryByTestId('protocol-bulk-amanah')).toBeNull();
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));

    const recs = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID);
    expect(recs.map((r) => r.templateId)).toEqual([ID_B]);
  });

  // ── Keyboard: verb selector is a roving-tabIndex radiogroup ───────────────
  it('verb radios use roving tabIndex (checked=0, others=-1) and radio role', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    const activate = screen.getByTestId('protocol-bulk-verb-activate');
    const suspend = screen.getByTestId('protocol-bulk-verb-suspend');
    expect(activate.getAttribute('role')).toBe('radio');
    expect(activate.getAttribute('tabindex')).toBe('0');
    expect(suspend.getAttribute('tabindex')).toBe('-1');
  });

  it('ArrowRight moves focus to the next verb and checks it (recomputes counts)', () => {
    // Seed actives so the Suspend eligibility (2) differs from Activate (S6_COUNT).
    useProtocolStore.getState().activateProtocols(PROJECT_ID, [ID_A, ID_B]);
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    const activate = screen.getByTestId('protocol-bulk-verb-activate');
    activate.focus();
    fireEvent.keyDown(screen.getByTestId('protocol-bulk-verb-group'), {
      key: 'ArrowRight',
    });
    const suspend = screen.getByTestId('protocol-bulk-verb-suspend');
    expect(suspend.getAttribute('aria-checked')).toBe('true');
    expect(activate.getAttribute('aria-checked')).toBe('false');
    // Eligibility recomputed for the Suspend verb (2 active records).
    expect(
      screen.getByTestId('protocol-bulk-apply-all').textContent,
    ).toContain('Apply to all (2)');
  });

  it('ArrowLeft wraps from the first verb to the last (Deactivate)', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    screen.getByTestId('protocol-bulk-verb-activate').focus();
    fireEvent.keyDown(screen.getByTestId('protocol-bulk-verb-group'), {
      key: 'ArrowLeft',
    });
    expect(
      screen.getByTestId('protocol-bulk-verb-deactivate').getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('Home/End jump to the first/last verb', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    const group = screen.getByTestId('protocol-bulk-verb-group');
    screen.getByTestId('protocol-bulk-verb-activate').focus();
    fireEvent.keyDown(group, { key: 'End' });
    expect(
      screen.getByTestId('protocol-bulk-verb-deactivate').getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.keyDown(group, { key: 'Home' });
    expect(
      screen.getByTestId('protocol-bulk-verb-activate').getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('Escape inside the verb group exits select-mode', () => {
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    screen.getByTestId('protocol-bulk-verb-activate').focus();
    fireEvent.keyDown(screen.getByTestId('protocol-bulk-verb-group'), {
      key: 'Escape',
    });
    // Select-mode collapsed → verb group + apply buttons gone.
    expect(screen.queryByTestId('protocol-bulk-verb-group')).toBeNull();
    expect(screen.queryByTestId('protocol-bulk-apply-all')).toBeNull();
  });

  // ── Undo toast ────────────────────────────────────────────────────────────
  it('Deactivate → Undo toast re-inserts removed records with prior shape', () => {
    useProtocolStore.getState().activateProtocols(PROJECT_ID, [ID_A, ID_B]);
    const before = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID)
      .map((r) => ({ ...r }));
    renderBulk();
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-verb-deactivate'));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));
    // Records gone; an Undo toast is queued.
    expect(
      useProtocolStore.getState().records.filter((r) => r.projectId === PROJECT_ID),
    ).toHaveLength(0);
    const t = useToastStore.getState().toasts.at(-1)!;
    expect(t.message).toContain('Deactivated 2 protocols');
    expect(t.action?.label).toBe('Undo');
    // Fire the undo → records restored exactly.
    t.action!.onClick();
    const after = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID);
    expect(after.map((r) => r.templateId).sort()).toEqual(
      before.map((r) => r.templateId).sort(),
    );
    expect(after.every((r) => r.status === 'active')).toBe(true);
  });

  it('rapid successive applies stack their own Undo toasts (point-in-time, last-write-wins)', () => {
    // Each bulk apply captures its OWN pre-mutation snapshot at confirm time and
    // queues its OWN Undo toast — the toasts STACK, they do not replace. Because
    // every snapshot is a point-in-time closure, firing the undos reverses each
    // to the state THAT apply saw; the LAST undo fired wins (last-write-wins).
    useProtocolStore.getState().activateProtocols(PROJECT_ID, [ID_A, ID_B]);
    renderBulk();

    // ── Apply 1: Suspend all (snapshot sees A,B ACTIVE) ──────────────────────
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-verb-suspend'));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));
    expect(
      useProtocolStore
        .getState()
        .records.filter((r) => r.projectId === PROJECT_ID)
        .every((r) => r.status === 'suspended'),
    ).toBe(true);

    // ── Apply 2: Deactivate all (snapshot sees A,B SUSPENDED) ────────────────
    // Re-enter select-mode (exitSelectMode does not reset the verb) and switch
    // to Deactivate; both suspended records are eligible.
    fireEvent.click(screen.getByTestId('protocol-bulk-select-toggle'));
    fireEvent.click(screen.getByTestId('protocol-bulk-verb-deactivate'));
    fireEvent.click(screen.getByTestId('protocol-bulk-apply-all'));
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));
    expect(
      useProtocolStore.getState().records.filter((r) => r.projectId === PROJECT_ID),
    ).toHaveLength(0);

    // ── Both Undo toasts are queued (stack, not replace) ─────────────────────
    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(2);
    const suspendToast = toasts.find((t) =>
      t.message.includes('Suspended 2 protocols'),
    )!;
    const deactivateToast = toasts.find((t) =>
      t.message.includes('Deactivated 2 protocols'),
    )!;
    expect(suspendToast.action?.label).toBe('Undo');
    expect(deactivateToast.action?.label).toBe('Undo');

    // ── Fire the undos in apply-order; the LAST one fired wins ───────────────
    // Undo #2 (deactivate) first → re-inserts A,B at their SUSPENDED snapshot.
    deactivateToast.action!.onClick();
    let recs = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID);
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => r.status === 'suspended')).toBe(true);

    // Undo #1 (suspend) last → removes A,B then re-appends its ACTIVE snapshot.
    // Last-write-wins: the final state is the suspend-undo's point-in-time view.
    suspendToast.action!.onClick();
    recs = useProtocolStore
      .getState()
      .records.filter((r) => r.projectId === PROJECT_ID);
    expect(recs.map((r) => r.templateId).sort()).toEqual([ID_A, ID_B].sort());
    expect(recs.every((r) => r.status === 'active')).toBe(true);
  });
});
