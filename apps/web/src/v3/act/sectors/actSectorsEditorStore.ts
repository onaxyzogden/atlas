/**
 * actSectorsEditorStore - singleton, in-memory flag for the Act-stage
 * right-rail sectors editor. When the floating `SectorCompassOverlay` HUD on
 * the Act map is clicked, `open()` arms this flag and `ActTierShell` swaps the
 * Dashboard/Objective right rail for `<SectorsEditorPanel>`; `close()` reverts.
 *
 * Mirrors `actAsBuiltPopoverStore` (an Act-scoped takeover singleton) but holds
 * no payload/capture state: the panel reads sectors straight from the shared
 * `useExternalForcesStore`, so this store only tracks whether the rail is
 * currently taken over. The two takeovers (as-built, sectors) are mutually
 * exclusive - the shell closes one before opening the other.
 */

import { create } from 'zustand';

interface ActSectorsEditorState {
  active: boolean;
  open: () => void;
  close: () => void;
}

export const useActSectorsEditorStore = create<ActSectorsEditorState>((set) => ({
  active: false,
  open: () => set({ active: true }),
  close: () => set({ active: false }),
}));
