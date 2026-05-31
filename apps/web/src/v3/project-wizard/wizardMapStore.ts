/**
 * wizardMapStore - a tiny, NON-persisted Zustand store that publishes the
 * live MapLibre map handle from inside DiagnoseMap's render-prop (where it is
 * the only place the handle is in scope) out to sibling wizard panels.
 *
 * Why: DiagnoseMap (foreign WIP - never edited) exposes its map ONLY via its
 * render-prop children. The Step 1 form column (WizardStep1Site's <aside>) is
 * a sibling of the map host and has no access to that handle. Rather than
 * thread a callback through DiagnoseMap, WizardMapRegistrar (mounted inside the
 * render-prop) writes the handle here on mount and clears it on unmount; the
 * form's WizardAddressSearch reads it back.
 *
 * Deliberately ephemeral: a map instance must never be persisted.
 */

import { create } from 'zustand';
import type { maplibregl } from '../../lib/maplibre.js';

interface WizardMapState {
  map: maplibregl.Map | null;
  setMap: (map: maplibregl.Map | null) => void;
}

export const useWizardMapStore = create<WizardMapState>((set) => ({
  map: null,
  setMap: (map) => set({ map }),
}));
