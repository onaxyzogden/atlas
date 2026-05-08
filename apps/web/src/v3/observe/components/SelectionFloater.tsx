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
import { useExternalForcesStore } from '../../../store/externalForcesStore.js';
import {
  KIND_LABELS,
  SECTOR_TYPE_LABELS,
  removeAnnotation,
} from './AnnotationRegistry.js';
import css from './SelectionFloater.module.css';

interface Props {
  /** Project context handed through to the form when entering edit mode. */
  projectId: string | null;
}

export default function SelectionFloater({ projectId }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);
  const clear = useObserveSelectionStore((s) => s.clear);
  const openForm = useAnnotationFormStore((s) => s.open);
  // Subscribed so the floater's sector-type label re-renders if the
  // underlying record's `type` is edited while selected (rare, but cheap).
  const sectors = useExternalForcesStore((s) => s.sectors);

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
  const first = selected[0];
  // Same-kind batch enabled when every selected item shares the first item's
  // kind. Mixed-kind selections cannot share one form (different schemas), so
  // Edit stays disabled until the steward narrows the selection.
  const sameKindBatch =
    selected.length > 1 &&
    first !== undefined &&
    selected.every((s) => s.kind === first.kind);
  const editEnabled = Boolean(projectId) && (single !== null || sameKindBatch);

  const onEdit = () => {
    if (!projectId) return;
    if (single) {
      openForm({
        kind: single.kind,
        geometry: null,
        mode: 'edit',
        existingId: single.id,
        projectId,
      });
      return;
    }
    if (sameKindBatch && first) {
      openForm({
        kind: first.kind,
        geometry: null,
        mode: 'edit-batch',
        existingIds: selected.map((s) => s.id),
        projectId,
      });
    }
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

  // For a single sector selection, append the sector's type
  // (e.g. "Sector · Summer sun") so the steward sees which kind of wedge
  // they've grabbed without opening the form. Other kinds keep their
  // generic registry label.
  let countLabel: string;
  if (selected.length === 1 && single) {
    if (single.kind === 'sector') {
      const rec = sectors.find((x) => x.id === single.id);
      const typeLabel = rec ? SECTOR_TYPE_LABELS[rec.type] : null;
      countLabel = typeLabel
        ? `${KIND_LABELS.sector} · ${typeLabel}`
        : KIND_LABELS.sector;
    } else {
      countLabel = KIND_LABELS[single.kind];
    }
  } else {
    countLabel = `${selected.length} selected`;
  }

  return (
    <div className={css.floater} role="toolbar" aria-label="Selection actions">
      <span className={css.count}>{countLabel}</span>
      <div className={css.divider} aria-hidden="true" />
      <button
        type="button"
        className={css.btn}
        onClick={onEdit}
        disabled={!editEnabled}
        title={
          !projectId
            ? 'Select a project to edit'
            : single
              ? 'Edit selected'
              : sameKindBatch
                ? `Edit ${selected.length} items together`
                : 'Select items of one kind to edit together'
        }
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
