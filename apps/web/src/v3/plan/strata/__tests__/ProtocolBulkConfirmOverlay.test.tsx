/**
 * @vitest-environment happy-dom
 *
 * ProtocolBulkConfirmOverlay — the bulk-activation confirmation modal. Proves:
 *   1. Flagged (Amanah scopeNotes-bearing) protocols are listed with their
 *      scopeNotes rendered VERBATIM before activation.
 *   2. Confirm / Cancel fire their callbacks.
 *   3. With no flagged protocols, the Amanah section is absent.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react';
import { resolveProjectProtocols } from '@ogden/shared';
import ProtocolBulkConfirmOverlay from '../ProtocolBulkConfirmOverlay.js';

const PROTOS = resolveProjectProtocols({ primaryTypeId: 'market_garden' }).protocols;
// A resolved market_garden protocol carrying a verbatim Amanah scopeNote.
const FLAGGED = PROTOS.find((t) => t.id === 'mg-market-channel-advance-sale')!;
// Any protocol with no scopeNotes (a clean one) for the no-flag case.
const CLEAN = PROTOS.find((t) => !t.scopeNotes)!;

afterEach(() => cleanup());

describe('ProtocolBulkConfirmOverlay', () => {
  it('lists flagged protocols with verbatim scopeNotes', () => {
    render(
      <ProtocolBulkConfirmOverlay
        eligible={[FLAGGED, CLEAN]}
        flagged={[FLAGGED]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const section = screen.getByTestId('protocol-bulk-amanah');
    const row = within(section).getByTestId('protocol-bulk-amanah-row');
    expect(row.getAttribute('data-template-id')).toBe(FLAGGED.id);
    // Verbatim — the exact authored scopeNotes string.
    expect(row.textContent).toContain(FLAGGED.scopeNotes!);
  });

  it('fires onConfirm and onCancel', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ProtocolBulkConfirmOverlay
        eligible={[FLAGGED]}
        flagged={[FLAGGED]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByTestId('protocol-bulk-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('protocol-bulk-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('omits the Amanah section when nothing is flagged', () => {
    render(
      <ProtocolBulkConfirmOverlay
        eligible={[CLEAN]}
        flagged={[]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('protocol-bulk-amanah')).toBeNull();
    expect(screen.getByTestId('protocol-bulk-confirm')).toBeTruthy();
  });

  // Suspend / deactivate disengage a protocol (the safe direction) and carry no
  // fiqh risk, so the Amanah review block is omitted even when flagged protocols
  // are in the set. Activate (default) surfaces it — covered above.
  it('omits the Amanah section for suspend even when flagged is non-empty', () => {
    render(
      <ProtocolBulkConfirmOverlay
        eligible={[FLAGGED, CLEAN]}
        flagged={[FLAGGED]}
        action="suspend"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('protocol-bulk-amanah')).toBeNull();
    // Verb-specific copy on the confirm button.
    expect(screen.getByTestId('protocol-bulk-confirm').textContent).toContain(
      'Suspend',
    );
  });

  it('omits the Amanah section for deactivate even when flagged is non-empty', () => {
    render(
      <ProtocolBulkConfirmOverlay
        eligible={[FLAGGED, CLEAN]}
        flagged={[FLAGGED]}
        action="deactivate"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('protocol-bulk-amanah')).toBeNull();
    expect(screen.getByTestId('protocol-bulk-confirm').textContent).toContain(
      'Deactivate',
    );
  });

  it('renders the Amanah section for explicit activate action', () => {
    render(
      <ProtocolBulkConfirmOverlay
        eligible={[FLAGGED, CLEAN]}
        flagged={[FLAGGED]}
        action="activate"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('protocol-bulk-amanah')).toBeTruthy();
    expect(screen.getByTestId('protocol-bulk-confirm').textContent).toContain(
      'Activate',
    );
  });
});
