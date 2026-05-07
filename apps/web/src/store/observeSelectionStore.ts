/**
 * observeSelectionStore — ephemeral, NOT persisted. Tracks which annotation
 * features the steward has selected on the OBSERVE map. Used by the halo
 * layers in `ObserveAnnotationLayers`, the `SelectionFloater` action bar,
 * and `AnnotationDragHandler` (single-select drag-reposition).
 *
 * Selection clears automatically on route change (component unmount) by
 * being a fresh in-memory store; we don't persist anything.
 */

import { create } from 'zustand';
import type { AnnotationKind } from '../v3/observe/components/draw/annotationFieldSchemas.js';

export interface SelectionItem {
  kind: AnnotationKind;
  id: string;
}

interface SelectionState {
  selected: SelectionItem[];
  /** Replace the selection with `items`. */
  set: (items: SelectionItem[]) => void;
  /** Add an item if not already present (by `${kind}:${id}` key). */
  add: (item: SelectionItem) => void;
  /** Remove an item by `${kind}:${id}` key. */
  remove: (item: SelectionItem) => void;
  /** Toggle membership. */
  toggle: (item: SelectionItem) => void;
  /** Clear all selection. */
  clear: () => void;
}

const keyOf = (it: SelectionItem) => `${it.kind}:${it.id}`;

export const useObserveSelectionStore = create<SelectionState>((set) => ({
  selected: [],
  set: (items) => set({ selected: dedupe(items) }),
  add: (item) =>
    set((s) => {
      const k = keyOf(item);
      if (s.selected.some((x) => keyOf(x) === k)) return s;
      return { selected: [...s.selected, item] };
    }),
  remove: (item) =>
    set((s) => {
      const k = keyOf(item);
      return { selected: s.selected.filter((x) => keyOf(x) !== k) };
    }),
  toggle: (item) =>
    set((s) => {
      const k = keyOf(item);
      const hit = s.selected.some((x) => keyOf(x) === k);
      return {
        selected: hit
          ? s.selected.filter((x) => keyOf(x) !== k)
          : [...s.selected, item],
      };
    }),
  clear: () => set({ selected: [] }),
}));

function dedupe(items: SelectionItem[]): SelectionItem[] {
  const seen = new Set<string>();
  const out: SelectionItem[] = [];
  for (const it of items) {
    const k = keyOf(it);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/** Build the `${kind}:${id}` key (exported for use in MapLibre filter
 *  expressions and component-level memo deps). */
export const selectionKey = keyOf;
