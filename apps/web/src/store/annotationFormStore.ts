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
  mode: 'create' | 'edit';
  existingId?: string;
  /** Project context so the schema's save handler can write into the
   *  right namespace partition. */
  projectId: string;
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
