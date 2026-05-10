/**
 * utilityConflictStore — singleton state for the Plan-stage utility-
 * conflict acknowledgment dialog. Mirrors `inlineFormStore`.
 *
 * Per ADR 2026-05-10-plan-earthwork-utility-veto.md.
 */

import { create } from 'zustand';
import type { UtilityConflict } from '../utils/utilityConflicts.js';

interface UtilityConflictState {
  active: boolean;
  conflicts: UtilityConflict[];
  anchor: [number, number] | null;
  onConfirm: ((acknowledgment: string) => void) | null;
  onCancel: (() => void) | null;
  open: (args: {
    conflicts: UtilityConflict[];
    anchor: [number, number];
    onConfirm: (acknowledgment: string) => void;
    onCancel: () => void;
  }) => void;
  close: () => void;
}

export const useUtilityConflictStore = create<UtilityConflictState>((set) => ({
  active: false,
  conflicts: [],
  anchor: null,
  onConfirm: null,
  onCancel: null,
  open: ({ conflicts, anchor, onConfirm, onCancel }) =>
    set({ active: true, conflicts, anchor, onConfirm, onCancel }),
  close: () =>
    set({
      active: false,
      conflicts: [],
      anchor: null,
      onConfirm: null,
      onCancel: null,
    }),
}));
