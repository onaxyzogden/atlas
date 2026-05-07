/**
 * SelectionFloater — pill bar that hovers above the bottom rail when the
 * steward has at least one annotation selected on the OBSERVE map. Wires
 * the three multi-select operations:
 *
 *   - Edit   (only when exactly one item is selected) → opens the shared
 *            `<AnnotationFormSlideUp>` in `mode: 'edit'`
 *   - Delete (any selection size) → confirms once, then loops through
 *            `removeAnnotation(kind, id)` from the AnnotationRegistry
 *   - Clear  (always) → drops the selection. Esc keydown also clears.
 *
 * Visibility is derived from `useObserveSelectionStore`. The component
 * unmounts itself when nothing is selected, so it doesn't intercept
 * pointer events on an empty map.
 */

import { useEffect } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useObserveSelectionStore } from '../../../store/observeSelectionStore.js';
import { useAnnotationFormStore } from '../../../store/annotationFormStore.js';
import { KIND_LABELS, removeAnnotation } from './AnnotationRegistry.js';
import css from './SelectionFloater.module.css';

interface Props {
  /** Project context handed through to the form when entering edit mode. */
  projectId: string | null;
}

export default function SelectionFloater({ projectId }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);
  const clear = useObserveSelectionStore((s) => s.clear);
  const openForm = useAnnotationFormStore((s) => s.open);

  // Esc → clear selection. Only attach when there's something selected so we
  // don't fight other Esc-bound consumers (form slide-up, detail panel) when
  // the floater is invisible.
  useEffect(() => {
    if (selected.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = document.activeElement;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      clear();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected.length, clear]);

  if (selected.length === 0) return null;

  const single = selected.length === 1 ? selected[0] : null;

  const onEdit = () => {
    if (!single || !projectId) return;
    openForm({
      kind: single.kind,
      geometry: null,
      mode: 'edit',
      existingId: single.id,
      projectId,
    });
  };

  const onDelete = () => {
    const n = selected.length;
    const label =
      n === 1 && single
        ? KIND_LABELS[single.kind].toLowerCase()
        : `${n} annotations`;
    if (!confirm(`Delete ${label}?`)) return;
    for (const item of selected) {
      removeAnnotation(item.kind, item.id);
    }
    clear();
  };

  const onClear = () => clear();

  const countLabel =
    selected.length === 1 && single
      ? KIND_LABELS[single.kind]
      : `${selected.length} selected`;

  return (
    <div className={css.floater} role="toolbar" aria-label="Selection actions">
      <span className={css.count}>{countLabel}</span>
      <div className={css.divider} aria-hidden="true" />
      <button
        type="button"
        className={css.btn}
        onClick={onEdit}
        disabled={!single || !projectId}
        title={single ? 'Edit selected' : 'Select a single item to edit'}
      >
        <Pencil aria-hidden="true" />
        <span>Edit</span>
      </button>
      <button
        type="button"
        className={`${css.btn} ${css.btnDanger}`}
        onClick={onDelete}
        title="Delete selected"
      >
        <Trash2 aria-hidden="true" />
        <span>Delete</span>
      </button>
      <div className={css.divider} aria-hidden="true" />
      <button
        type="button"
        className={css.btn}
        onClick={onClear}
        title="Clear selection (Esc)"
      >
        <X aria-hidden="true" />
        <span>Clear</span>
      </button>
    </div>
  );
}
