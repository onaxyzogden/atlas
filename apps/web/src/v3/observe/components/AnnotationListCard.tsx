/**
 * AnnotationListCard — shared SurfaceCard that renders a live, sortable
 * list of annotations across one or more `AnnotationKind`s for the active
 * project. Drops into any module dashboard.
 *
 * Rows expose:
 *   - tap (anywhere left of the buttons) → open `<AnnotationDetailPanel>`
 *   - Edit button                       → open `<AnnotationFormSlideUp>` in edit mode
 *   - Delete button                     → confirm prompt + `removeAnnotation`
 *
 * Empty-state copy nudges the user toward the relevant tools without
 * naming them (each module's tools panel already does that work).
 */

import { Pencil, Trash2 } from 'lucide-react';
import { SurfaceCard } from '../_shared/components/index.js';
import { useAnnotationFormStore } from '../../../store/annotationFormStore.js';
import { useAnnotationDetailStore } from '../../../store/annotationDetailStore.js';
import {
  KIND_LABELS,
  removeAnnotation,
  useAnnotationsForKinds,
  type AnnotationRow,
} from './AnnotationRegistry.js';
import type { AnnotationKind } from './draw/annotationFieldSchemas.js';

interface Props {
  title: string;
  /** Project id; null short-circuits to empty state. */
  projectId: string | null;
  /** Annotation kinds this card aggregates. */
  kinds: AnnotationKind[];
  /** Optional empty-state hint. */
  emptyHint?: string;
}

export default function AnnotationListCard({ title, projectId, kinds, emptyHint }: Props) {
  const rows = useAnnotationsForKinds(kinds, projectId);
  const openDetail = useAnnotationDetailStore((s) => s.open);
  const openForm = useAnnotationFormStore((s) => s.open);

  const onRowOpen = (row: AnnotationRow) => {
    openDetail({ kind: row.kind, id: row.id });
  };

  const onRowEdit = (row: AnnotationRow) => {
    if (!projectId) return;
    openForm({
      kind: row.kind,
      geometry: null,
      mode: 'edit',
      existingId: row.id,
      projectId,
    });
  };

  const onRowDelete = (row: AnnotationRow) => {
    if (!confirm(`Delete this ${KIND_LABELS[row.kind].toLowerCase()}?`)) return;
    removeAnnotation(row.kind, row.id);
  };

  return (
    <SurfaceCard className="diagnostic-panel annotation-list-panel">
      <header className="panel-header">
        <h2>{title}</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted, #888)' }}>
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
        </span>
      </header>
      {rows.length === 0 ? (
        <p style={{ margin: '12px 0', fontSize: 13, color: 'var(--text-muted, #888)' }}>
          {emptyHint ?? 'No field annotations yet — use the tools panel to drop one on the map.'}
        </p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {rows.map((row) => (
            <li
              key={`${row.kind}:${row.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 8,
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.04)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
              onClick={() => onRowOpen(row)}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '1px 6px',
                      marginRight: 6,
                      borderRadius: 999,
                      background: 'rgba(196, 162, 101, 0.15)',
                      color: '#8a6f3a',
                      fontSize: 10,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                    }}
                  >
                    {KIND_LABELS[row.kind]}
                  </span>
                  {row.title}
                </div>
                {row.subtitle ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted, #888)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: 2,
                    }}
                  >
                    {row.subtitle}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Edit annotation"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowEdit(row);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  color: 'var(--text-muted, #888)',
                }}
              >
                <Pencil size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Delete annotation"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowDelete(row);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  color: '#a14747',
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </SurfaceCard>
  );
}
