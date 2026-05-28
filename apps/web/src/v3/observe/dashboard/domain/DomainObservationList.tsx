/**
 * DomainObservationList — chronological list of observations for one
 * universal domain (OLOS Observe Dashboard Spec §4.3). Reads the union
 * view from `useDomainPoints`, renders each row with status pill, capture
 * date, capturer, proof thumbnails, and a supersession indicator when the
 * row is part of a supersession pair.
 *
 * Supersession semantics ride alongside each row:
 *   - active row that has BEEN superseded → "Supersedes [link]" + inline
 *     `SupersessionControl` ("Not a replacement") that restores both.
 *   - superseded row → "Superseded by [link]" + same restore control.
 * The Slice 4.3 `useDomainPoints` view exposes both groups, so the list
 * can render the relationship even though the superseded-by chain is
 * one-directional on the store (data point only carries `supersededBy`).
 *
 * Virtual projections of Phase 3 ObserveFeedEntry rows carry ids prefixed
 * `feed:` and cannot participate in supersession (no proximity geometry
 * from the feed). The control is suppressed for them — they render as
 * read-only chronological context with a small "from field log" hint.
 */

import { useMemo } from 'react';
import { Camera, MapPin, Ruler, FileText, ClipboardList } from 'lucide-react';
import type { ObserveDataPoint, ObserveStatusOutput } from '@ogden/shared';
import type { DomainPointsView } from './useDomainPoints.js';
import SupersessionControl from './SupersessionControl.js';
import css from './DomainObservationList.module.css';

interface Props {
  projectId: string;
  view: DomainPointsView;
}

const STATUS_LABEL: Record<ObserveStatusOutput, string> = {
  clear: 'Clear',
  unknown: 'Unknown',
  needs_investigation: 'Needs investigation',
  major_constraint: 'Major constraint',
  potential_disqualifier: 'Potential disqualifier',
};

const PROOF_ICON_SIZE = 13;

function isVirtual(point: ObserveDataPoint): boolean {
  return point.id.startsWith('feed:');
}

function formatTimestamp(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function proofTypeIcon(type: string) {
  switch (type) {
    case 'photo':
    case 'document':
      return <Camera size={PROOF_ICON_SIZE} aria-hidden="true" />;
    case 'gps_point':
    case 'gps_trace':
      return <MapPin size={PROOF_ICON_SIZE} aria-hidden="true" />;
    case 'measurement':
      return <Ruler size={PROOF_ICON_SIZE} aria-hidden="true" />;
    case 'logged_result':
      return <ClipboardList size={PROOF_ICON_SIZE} aria-hidden="true" />;
    case 'note':
    default:
      return <FileText size={PROOF_ICON_SIZE} aria-hidden="true" />;
  }
}

export default function DomainObservationList({ projectId, view }: Props) {
  // Build a reverse-lookup so an active row that superseded an older row
  // can render "Supersedes [link]" symmetric to the older row's
  // "Superseded by [link]" — store carries only the forward pointer.
  const reverseSupersededBy = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of view.all) {
      if (p.supersededBy) m.set(p.supersededBy, p.id);
    }
    return m;
  }, [view.all]);

  if (view.all.length === 0) {
    return (
      <div className={css.empty}>
        No observations captured for this domain yet.
      </div>
    );
  }

  return (
    <ol className={css.list} aria-label="Domain observations">
      {view.all.map((point) => {
        const virtual = isVirtual(point);
        const supersedingId = reverseSupersededBy.get(point.id) ?? null;
        const renderRestore =
          !virtual &&
          ((point.isSuperseded && point.supersededBy) || supersedingId);

        return (
          <li
            key={point.id}
            className={css.row}
            data-superseded={point.isSuperseded ? 'true' : 'false'}
          >
            <div className={css.rowHead}>
              <span
                className={css.statusPill}
                data-status={point.statusOutput}
              >
                {STATUS_LABEL[point.statusOutput]}
              </span>
              <span className={css.timestamp}>
                {formatTimestamp(point.capturedAt)}
              </span>
              <span className={css.capturer}>by {point.capturedBy}</span>
              {virtual && (
                <span className={css.virtualTag} title="Projected from field action feed">
                  from field log
                </span>
              )}
            </div>

            {point.proofItems.length > 0 && (
              <div className={css.proofRow} aria-label="Attached proof items">
                {point.proofItems.slice(0, 6).map((proof) => (
                  <span
                    key={proof.id}
                    className={css.proofChip}
                    title={proof.proofType.replace(/_/g, ' ')}
                  >
                    {proofTypeIcon(proof.proofType)}
                    <span className={css.proofType}>
                      {proof.proofType.replace(/_/g, ' ')}
                    </span>
                  </span>
                ))}
                {point.proofItems.length > 6 && (
                  <span className={css.proofMore}>
                    +{point.proofItems.length - 6} more
                  </span>
                )}
              </div>
            )}

            {(point.isSuperseded || supersedingId) && !virtual && (
              <div className={css.supersession}>
                {point.isSuperseded && point.supersededBy ? (
                  <span className={css.supersessionText}>
                    Superseded by a later observation
                  </span>
                ) : supersedingId ? (
                  <span className={css.supersessionText}>
                    Supersedes an earlier observation
                  </span>
                ) : null}
                {renderRestore && (
                  <SupersessionControl
                    projectId={projectId}
                    supersededId={
                      point.isSuperseded ? point.id : (supersedingId as string)
                    }
                    supersedingId={
                      point.isSuperseded
                        ? (point.supersededBy as string)
                        : point.id
                    }
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
