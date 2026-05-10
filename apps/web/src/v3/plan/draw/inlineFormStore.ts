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
  /**
   * Optional reactive hook fired after a single field changes. Returns a
   * patch (partial values map) that will be merged into the form state, or
   * void / null for no patch. Used by tools whose fields cross-fill — e.g.
   * GuildTool's preset selector autofilling `name` + `anchorSpeciesId`.
   *
   * The hook receives the *next* values (post-change) and the *prev* values
   * (pre-change), and the key + new value of the field that changed. Patch
   * keys must be present in the form's `fields` spec.
   */
  onValuesChange?: (
    next: Record<string, string | number>,
    prev: Record<string, string | number>,
    changed: { key: string; value: string | number },
  ) => Partial<Record<string, string | number>> | void | null;
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
