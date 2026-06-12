/**
 * placementConflictStore — singleton state for the Plan-stage placement
 * warning acknowledgment dialog (PlacementConflictDialog). Mirrors
 * `utilityConflictStore` exactly; the two dialogs coexist because the
 * buried-utility veto stays on its own ADR-specified path in v1.
 *
 * Opened by `gatePlacement()` when a draw or drag trips warn-severity
 * catalog rules (block-severity rules reject before this dialog is ever
 * reached). Per the 2026-06-11 placement plan, Phase 3.3.
 */

import { create } from 'zustand';
import type { PlacementViolation } from '../validation/evaluatePlacement.js';

interface PlacementConflictState {
  active: boolean;
  violations: PlacementViolation[];
  anchor: [number, number] | null;
  onConfirm: ((acknowledgment: string) => void) | null;
  onCancel: (() => void) | null;
  open: (args: {
    violations: PlacementViolation[];
    anchor: [number, number];
    onConfirm: (acknowledgment: string) => void;
    onCancel: () => void;
  }) => void;
  close: () => void;
}

export const usePlacementConflictStore = create<PlacementConflictState>((set) => ({
  active: false,
  violations: [],
  anchor: null,
  onConfirm: null,
  onCancel: null,
  open: ({ violations, anchor, onConfirm, onCancel }) =>
    set({ active: true, violations, anchor, onConfirm, onCancel }),
  close: () =>
    set({
      active: false,
      violations: [],
      anchor: null,
      onConfirm: null,
      onCancel: null,
    }),
}));
