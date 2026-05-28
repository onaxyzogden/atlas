/**
 * DomainEvidenceLibrary — paginated grid of every proof item attached to
 * an observation in this domain (OLOS Observe Dashboard Spec §4.4). Built
 * over the union view from `useDomainPoints` so verified data points and
 * the Phase 3 feed-entry projections both contribute their proofs.
 *
 * Filter by proof type narrows the grid; page size caps the rendered grid
 * at PAGE_SIZE. The cap is deliberate — the dashboard surface is a
 * scanning view, not a full media-library workbench. The Capture
 * Workspace owns deep file inspection.
 *
 * Photo proofs render as a small thumbnail when `fileUri` resolves to a
 * URL the browser can load directly (CDN, blob:, idb://...). The IDB
 * synthetic URI rendered via createObjectURL is plumbed by
 * `proofPhotoStore` and is opaque at this layer — we render the literal
 * URI string when it does not parse as a regular URL.
 */

import { useMemo, useState } from 'react';
import { Camera, MapPin, Ruler, FileText, ClipboardList } from 'lucide-react';
import type {
  ObserveDataPoint,
  FieldActionProofItem,
  FieldActionProofType,
} from '@ogden/shared';
import type { DomainPointsView } from './useDomainPoints.js';
import css from './DomainEvidenceLibrary.module.css';

interface Props {
  view: DomainPointsView;
}

const PAGE_SIZE = 12;

const PROOF_TYPE_LABEL: Record<FieldActionProofType, string> = {
  photo: 'Photo',
  gps_point: 'GPS point',
  gps_trace: 'GPS trace',
  measurement: 'Measurement',
  logged_result: 'Logged result',
  note: 'Note',
  document: 'Document',
};

const FILTER_OPTIONS: readonly (FieldActionProofType | 'all')[] = [
  'all',
  'photo',
  'gps_point',
  'gps_trace',
  'measurement',
  'logged_result',
  'note',
  'document',
];

interface EvidenceRow {
  proof: FieldActionProofItem;
  point: ObserveDataPoint;
}

function flattenProofs(view: DomainPointsView): EvidenceRow[] {
  const rows: EvidenceRow[] = [];
  for (const point of view.all) {
    for (const proof of point.proofItems) {
      rows.push({ proof, point });
    }
  }
  rows.sort((a, b) => {
    const ams = Date.parse(a.proof.capturedAt);
    const bms = Date.parse(b.proof.capturedAt);
    if (!Number.isFinite(ams)) return 1;
    if (!Number.isFinite(bms)) return -1;
    return bms - ams;
  });
  return rows;
}

function iconFor(type: FieldActionProofType) {
  const size = 16;
  switch (type) {
    case 'photo':
    case 'document':
      return <Camera size={size} aria-hidden="true" />;
    case 'gps_point':
    case 'gps_trace':
      return <MapPin size={size} aria-hidden="true" />;
    case 'measurement':
      return <Ruler size={size} aria-hidden="true" />;
    case 'logged_result':
      return <ClipboardList size={size} aria-hidden="true" />;
    case 'note':
    default:
      return <FileText size={size} aria-hidden="true" />;
  }
}

function isThumbnailable(proof: FieldActionProofItem): boolean {
  if (proof.proofType !== 'photo') return false;
  if (!proof.fileUri) return false;
  return (
    proof.fileUri.startsWith('http') ||
    proof.fileUri.startsWith('blob:') ||
    proof.fileUri.startsWith('data:')
  );
}

export default function DomainEvidenceLibrary({ view }: Props) {
  const [filter, setFilter] = useState<FieldActionProofType | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const rows = useMemo(() => flattenProofs(view), [view]);
  const filtered = useMemo(
    () =>
      filter === 'all' ? rows : rows.filter((r) => r.proof.proofType === filter),
    [rows, filter],
  );
  const visible = filtered.slice(0, visibleCount);

  return (
    <div className={css.library}>
      <div className={css.controls}>
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt;
          const count =
            opt === 'all'
              ? rows.length
              : rows.filter((r) => r.proof.proofType === opt).length;
          return (
            <button
              key={opt}
              type="button"
              className={active ? css.chipActive : css.chip}
              aria-pressed={active}
              onClick={() => {
                setFilter(opt);
                setVisibleCount(PAGE_SIZE);
              }}
              disabled={count === 0 && opt !== 'all'}
            >
              {opt === 'all' ? 'All' : PROOF_TYPE_LABEL[opt]} ({count})
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <div className={css.empty}>
          No evidence captured for this filter yet.
        </div>
      ) : (
        <ul
          className={css.grid}
          role="list"
          aria-label="Domain evidence library"
        >
          {visible.map(({ proof, point }) => (
            <li key={proof.id} className={css.tile}>
              {isThumbnailable(proof) ? (
                <img
                  className={css.thumb}
                  src={proof.fileUri as string}
                  alt={proof.noteText ?? `${PROOF_TYPE_LABEL[proof.proofType]}`}
                  loading="lazy"
                />
              ) : (
                <div className={css.iconBox} aria-hidden="true">
                  {iconFor(proof.proofType)}
                </div>
              )}
              <div className={css.tileMeta}>
                <span className={css.tileType}>
                  {PROOF_TYPE_LABEL[proof.proofType]}
                </span>
                <span className={css.tileDate}>
                  {new Date(proof.capturedAt).toLocaleDateString()}
                </span>
                <span
                  className={css.tileStatus}
                  data-status={point.statusOutput}
                  title={`Captured under ${point.statusOutput.replace(/_/g, ' ')}`}
                >
                  {point.statusOutput.replace(/_/g, ' ')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > visibleCount && (
        <button
          type="button"
          className={css.loadMore}
          onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
        >
          Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
        </button>
      )}
    </div>
  );
}
