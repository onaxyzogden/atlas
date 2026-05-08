/**
 * annotationDetailStore — ephemeral atom that opens the read-only
 * `<AnnotationDetailPanel>` overlay. Mirrors the shape of
 * `annotationFormStore` but for view-mode rather than create/edit.
 *
 * Row clicks in `<AnnotationListCard>` set `active = { kind, id }`. The
 * singleton overlay component reads this and renders. Esc / click-outside
 * close.
 */

import { create } from 'zustand';
import type { AnnotationKind } from '../v3/observe/components/draw/annotationFieldSchemas.js';

export interface AnnotationDetailActive {
  kind: AnnotationKind;
  id: string;
}

interface AnnotationDetailState {
  active: AnnotationDetailActive | null;
  open: (active: AnnotationDetailActive) => void;
  close: () => void;
}

export const useAnnotationDetailStore = create<AnnotationDetailState>((set) => ({
  active: null,
  open: (active) => set({ active }),
  close: () => set({ active: null }),
}));
