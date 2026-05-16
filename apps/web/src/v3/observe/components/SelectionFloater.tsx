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
import { createPortal } from 'react-dom';
import { Move, Pencil, Trash2, X } from 'lucide-react';
import { getFloaterStackRoot } from './floaterStackRoot.js';
import { DelayedTooltip } from '../../../components/ui/DelayedTooltip.js';
import { useObserveSelectionStore } from '../../../store/observeSelectionStore.js';
import { useAnnotationDetailStore } from '../../../store/annotationDetailStore.js';
import { useAnnotationFormStore } from '../../../store/annotationFormStore.js';
import { useExternalForcesStore } from '../../../store/externalForcesStore.js';
import {
  KIND_LABELS,
  SECTOR_TYPE_LABELS,
  removeAnnotation,
} from './AnnotationRegistry.js';
import {
  POINT_KINDS,
  LINESTRING_KINDS,
  POLYGON_KINDS,
} from './draw/annotationGeometryRegistry.js';
import { openBeInlineEditByObserveKind } from '../../builtEnvironment/inline/openBeInlineEdit.js';
import css from './SelectionFloater.module.css';

interface Props {
  /** Project context handed through to the form when entering edit mode. */
  projectId: string | null;
}

export default function SelectionFloater({ projectId }: Props) {
  const selected = useObserveSelectionStore((s) => s.selected);
  const clear = useObserveSelectionStore((s) => s.clear);
  const moveMode = useObserveSelectionStore((s) => s.moveMode);
  const toggleMoveMode = useObserveSelectionStore((s) => s.toggleMoveMode);
  const openForm = useAnnotationFormStore((s) => s.open);
  // Hide while the read-only `<AnnotationDetailPanel>` is open: it shows
  // its own Edit / Delete buttons for the same record, so the floater
  // would be redundant clutter on top of the panel.
  const detailActive = useAnnotationDetailStore((s) => s.active);
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

  const stackRoot = getFloaterStackRoot();

  if (selected.length === 0) return null;
  if (detailActive) return null;
  if (!stackRoot) return null;

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
  // Move (geometry reposition / vertex edit) is single-selection only and
  // only for kinds with editable geometry.
  const moveEnabled =
    !!single &&
    (POINT_KINDS.has(single.kind) ||
      LINESTRING_KINDS.has(single.kind) ||
      POLYGON_KINDS.has(single.kind));

  const onEdit = () => {
    if (!projectId) return;
    if (single) {
      // Phase 4.4: Built-Environment kinds open the floating inline-edit
      // popover (parity with Plan). All other Observe kinds keep using
      // the slide-up sheet. The helper returns false for non-BE kinds so
      // we fall through.
      if (openBeInlineEditByObserveKind(single.kind, single.id)) {
        return;
      }
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

  return createPortal(
    <div
      className={css.floater}
      role="toolbar"
      aria-label="Selection actions"
      style={{ order: 1 }}
    >
      <span className={css.count}>{countLabel}</span>
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip
        label={
          !projectId
            ? 'Select a project to edit'
            : single
              ? 'Edit selected'
              : sameKindBatch
                ? `Edit ${selected.length} items together`
                : 'Select items of one kind to edit together'
        }
        position="top"
      >
        <button
          type="button"
          className={css.btn}
          onClick={onEdit}
          disabled={!editEnabled}
        >
          <Pencil aria-hidden="true" />
          <span>Edit</span>
        </button>
      </DelayedTooltip>
      <DelayedTooltip
        label={
          !moveEnabled
            ? 'Select one feature with editable geometry'
            : moveMode
              ? 'Drag to reposition — click to finish'
              : 'Move selected'
        }
        position="top"
      >
        <button
          type="button"
          className={`${css.btn} ${moveMode ? css.btnActive : ''}`}
          onClick={toggleMoveMode}
          disabled={!moveEnabled}
          aria-pressed={moveMode}
        >
          <Move aria-hidden="true" />
          <span>Move</span>
        </button>
      </DelayedTooltip>
      <DelayedTooltip label="Delete selected" position="top">
        <button
          type="button"
          className={`${css.btn} ${css.btnDanger}`}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
          <span>Delete</span>
        </button>
      </DelayedTooltip>
      <div className={css.divider} aria-hidden="true" />
      <DelayedTooltip label="Clear selection (Esc)" position="top">
        <button type="button" className={css.btn} onClick={onClear}>
          <X aria-hidden="true" />
          <span>Clear</span>
        </button>
      </DelayedTooltip>
    </div>,
    stackRoot,
  );
}
