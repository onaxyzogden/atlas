/**
 * annotationFormStore — ephemeral zustand atom that brokers the
 * post-draw "save-or-cancel" slide-up form.
 *
 * When a draw tool finishes a geometry, instead of writing defaults
 * straight into the namespace store, it calls `open({ kind, geometry,
 * mode: 'create' })`. The single mounted `<AnnotationFormSlideUp>` reads
 * `active` and renders the per-kind field form. The user fills it in,
 * hits Save → the form's schema dispatches the create/update call into
 * the relevant namespace store, then `close()` is invoked.
 *
 * Edit mode (`mode: 'edit', existingId`) re-uses the same form for
 * dashboard-row "Edit" affordances and for the SelectionFloater's Edit
 * button. The schema's `loadDefaults(existingId)` populates the form
 * with the current record's values.
 *
 * Not persisted — losing form state on reload is the desired behaviour.
 */

import { create } from 'zustand';
import type { AnnotationKind } from '../v3/observe/components/draw/annotationFieldSchemas.js';

export interface AnnotationFormActive {
  kind: AnnotationKind;
  /** Geometry produced by the draw tool. For point kinds this is a Point;
   *  line/polygon kinds carry the matching geometry. Some kinds (sector,
   *  permaculture) carry no geometry from MapboxDraw — they hand-roll
   *  their own anchor and pass `null` here. */
  geometry: GeoJSON.Geometry | null;
  mode: 'create' | 'edit' | 'edit-batch';
  /** Single-item edit target. Required when `mode === 'edit'`. */
  existingId?: string;
  /** Multi-item edit targets — used when `mode === 'edit-batch'` with two or
   *  more annotations of the same `kind`. Form is seeded from the first id;
   *  Save loops the schema's `save()` once per id. */
  existingIds?: string[];
  /** Project context so the schema's save handler can write into the
   *  right namespace partition. */
  projectId: string;
  /** When true, Cancel deletes `existingId` via the kind's namespace-store
   *  remove fn (see FIELD_REMOVERS in annotationFieldSchemas). Set by post-
   *  draw flows where `createWithDefaults` wrote a provisional stub before
   *  the form opened — Cancel should discard it so the steward isn't left
   *  with a default-labeled phantom in the namespace store. Defaults to
   *  false for edit-from-dashboard / SelectionFloater paths so those
   *  Cancels stay no-ops. */
  discardOnCancel?: boolean;
}

interface AnnotationFormState {
  active: AnnotationFormActive | null;
  open: (active: AnnotationFormActive) => void;
  close: () => void;
}

export const useAnnotationFormStore = create<AnnotationFormState>((set) => ({
  active: null,
  open: (active) => set({ active }),
  close: () => set({ active: null }),
}));
