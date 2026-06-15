/**
 * @vitest-environment happy-dom
 *
 * SectorCompassOverlay — edit affordance contract.
 *
 * This is the seam the Plan-stage sectors-editor takeover rides on (mirror of
 * Act): VisionLayoutCanvas forwards its optional `onOpenSectorsEditor` to the
 * compass's `onOpenEditor`, and PlanTierShell only supplies it from the
 * tier-shell render — the legacy PlanLayout render omits it.
 *
 * Asserts the prop is what gates editability:
 *   - WITH onOpenEditor → the compass card is a button ("Edit sectors") and a
 *     click invokes the handler (this is what opens the right-rail editor).
 *   - WITHOUT onOpenEditor → no edit button; the HUD stays a read-only display.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SectorCompassOverlay from '../SectorCompassOverlay.js';
import { useMatrixTogglesStore } from '../../../../../store/matrixTogglesStore.js';
import {
  useExternalForcesStore,
  type SectorArrow,
} from '../../../../../store/externalForcesStore.js';

const P = 'proj-1';

const SECTOR: SectorArrow = {
  id: 's1',
  projectId: P,
  type: 'wind_prevailing',
  bearingDeg: 0,
  arcDeg: 60,
};

afterEach(() => {
  // Restore the two stores the overlay reads so cases don't bleed.
  useMatrixTogglesStore.setState({ sectors: false });
  useExternalForcesStore.setState({ sectors: [] });
});

function seed() {
  // The compass renders only when its toggle is on AND there is content; one
  // manual arrow satisfies the content check without needing a project boundary.
  useMatrixTogglesStore.setState({ sectors: true });
  useExternalForcesStore.setState({ sectors: [SECTOR] });
}

describe('SectorCompassOverlay edit affordance', () => {
  it('exposes an "Edit sectors" button and invokes the handler when onOpenEditor is given', () => {
    seed();
    const onOpenEditor = vi.fn();
    render(<SectorCompassOverlay projectId={P} onOpenEditor={onOpenEditor} />);
    const btn = screen.getByLabelText('Edit sectors');
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onOpenEditor).toHaveBeenCalledTimes(1);
  });

  it('renders read-only (no edit button) when onOpenEditor is omitted', () => {
    seed();
    render(<SectorCompassOverlay projectId={P} />);
    expect(screen.queryByLabelText('Edit sectors')).toBeNull();
  });
});
