/**
 * inlineFormStore — singleton, in-memory state for the floating
 * `<InlineFeaturePopover>` that appears at a just-drawn Plan-stage feature.
 *
 * Unlike Observe's `annotationFormStore`, this is NOT a slide-up. The popover
 * is anchored at a `[lng, lat]` and re-projects on map move/zoom. Slide-ups
 * are reserved for written reports / detailed cards; this captures only the
 * 2-4 essential fields needed to persist a feature.
 *
 * Single-instance: opening a new form replaces any previous draft (the
 * previous tool's onCancel is invoked first so the in-flight feature is
 * discarded).
 */

import { create } from 'zustand';

export type FieldKind = 'text' | 'number' | 'select';

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  /** For 'select' fields. */
  options?: { value: string; label: string }[];
  /** Optional default value. */
  defaultValue?: string | number;
  /** Optional readonly hint (auto-filled values like areaM2 / lengthM). */
  readonly?: boolean;
  /** Optional unit suffix shown after the input (e.g. 'm²', 'L'). */
  suffix?: string;
  /** Optional placeholder. */
  placeholder?: string;
  /** Whether the field is required. Defaults to false. */
  required?: boolean;
}

export interface InlineFormPayload {
  /** Title shown in the popover header. */
  title: string;
  /** Map anchor in [lng, lat]. Re-projected to screen coords each render. */
  anchor: [number, number];
  /** Fields to render. */
  fields: FieldSpec[];
  /** Initial draft values (keyed by field.key). */
  initial: Record<string, string | number>;
  /** Caller's commit handler. */
  onSave: (values: Record<string, string | number>) => void;
  /** Caller's discard handler. */
  onCancel: () => void;
}

interface InlineFormState {
  active: InlineFormPayload | null;
  open: (payload: InlineFormPayload) => void;
  close: () => void;
}

export const useInlineFormStore = create<InlineFormState>((set, get) => ({
  active: null,
  open: (payload) => {
    const prev = get().active;
    // Replace-mode: cancel the previous in-flight draft so we never leak a
    // ghost feature when the steward switches tools mid-draw.
    if (prev) {
      try {
        prev.onCancel();
      } catch {
        /* ignore — previous tool may have already unmounted */
      }
    }
    set({ active: payload });
  },
  close: () => set({ active: null }),
}));
