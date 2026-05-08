/**
 * AnnotationDetailPanel — singleton overlay that renders read-only details
 * for the annotation referenced by `useAnnotationDetailStore.active`. Mounted
 * once from `ObserveLayout` (sibling of `<AnnotationFormSlideUp>`), it shows
 * Edit + Delete + Back buttons.
 *
 * Edit hands off to `useAnnotationFormStore.open({ kind, mode: 'edit',
 * existingId })` and closes itself; Delete dispatches the registry's
 * `removeAnnotation(kind, id)` after a confirm prompt and closes itself.
 *
 * The body of the panel is intentionally generic — the registry's
 * `getAnnotationRow` returns a uniform `{ title, subtitle, createdAt }`
 * triple, so this component does not need per-kind branching.
 */

import { useEffect } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { useAnnotationDetailStore } from '../../../store/annotationDetailStore.js';
import { useAnnotationFormStore } from '../../../store/annotationFormStore.js';
import {
  KIND_LABELS,
  getAnnotationRow,
  removeAnnotation,
} from './AnnotationRegistry.js';
import css from './draw/AnnotationFormSlideUp.module.css';

interface Props {
  /** Project id needed when handing off to the form in edit mode. */
  projectId: string | null;
}

export default function AnnotationDetailPanel({ projectId }: Props) {
  const active = useAnnotationDetailStore((s) => s.active);
  const close = useAnnotationDetailStore((s) => s.close);
  const openForm = useAnnotationFormStore((s) => s.open);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, close]);

  if (!active) return null;
  const row = getAnnotationRow(active.kind, active.id);
  if (!row) {
    // Underlying record was removed; close.
    close();
    return null;
  }

  const onEdit = () => {
    if (!projectId) return;
    close();
    openForm({
      kind: active.kind,
      geometry: null,
      mode: 'edit',
      existingId: active.id,
      projectId,
    });
  };

  const onDelete = () => {
    if (!confirm(`Delete this ${KIND_LABELS[active.kind].toLowerCase()}? This cannot be undone here (Cmd-Z still works).`)) {
      return;
    }
    removeAnnotation(active.kind, active.id);
    close();
  };

  return (
    <div className={css.scrim} onClick={close}>
      <div
        className={css.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={KIND_LABELS[active.kind]}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={css.header}>
          <div>
            <div className={css.eyebrow}>{KIND_LABELS[active.kind]} · detail</div>
            <h2 className={css.title}>{row.title}</h2>
          </div>
          <button type="button" className={css.close} onClick={close} aria-label="Close">
            ×
          </button>
        </div>
        <div className={css.body}>
          {row.subtitle ? (
            <div className={css.field}>
              <span className={css.label}>Notes</span>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{row.subtitle}</p>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #888)' }}>
              No additional notes recorded.
            </p>
          )}
          <div className={css.field}>
            <span className={css.label}>Created</span>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted, #888)' }}>
              {new Date(row.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className={css.footer}>
          <button type="button" className={css.btn} onClick={onDelete}>
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
          <button
            type="button"
            className={`${css.btn} ${css.btnPrimary}`}
            onClick={onEdit}
          >
            <Pencil size={14} aria-hidden="true" /> Edit
          </button>
        </div>
      </div>
    </div>
  );
}
