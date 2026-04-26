/**
 * §16 CommentsByFeatureCard — comments grouped by feature type / feature.
 *
 * The CollaborationPanel comments tab already lists all open and
 * resolved comments as a flat thread. This card answers a different
 * question: *which parts of the design are getting the most
 * conversation, and which are unresolved?* It groups the project's
 * comments by `featureType` (zone, paddock, structure, utility,
 * crop_area, path, or "map pin" for location-only) and surfaces:
 *
 *   - per-type tally (open / resolved / total)
 *   - per-feature breakdown within each type, listing the specific
 *     featureId with its unresolved count and most-recent activity
 *
 * Reviewers can scan the rollup to see whether feedback is
 * concentrated on one zone, scattered across paddocks, or attached to
 * map pins with no underlying feature.
 *
 * Pure presentation — reads `useCommentStore` and filters by project.
 * No new shared math, no new entity types, no map mutation.
 *
 * Closes manifest item `commenting-on-map-and-features` (P3 partial -> done).
 */

import { memo, useMemo } from 'react';
import { useCommentStore, type Comment } from '../../store/commentStore.js';
import css from './CommentsByFeatureCard.module.css';

interface Props {
  projectId: string;
}

type FeatureBucket =
  | 'zone'
  | 'paddock'
  | 'structure'
  | 'utility'
  | 'crop_area'
  | 'path'
  | 'pin'
  | 'other';

interface FeatureGroup {
  featureId: string;
  featureType: FeatureBucket;
  open: number;
  resolved: number;
  total: number;
  latestAt: string;
}

interface BucketRollup {
  key: FeatureBucket;
  label: string;
  icon: string;
  open: number;
  resolved: number;
  total: number;
  features: FeatureGroup[];
  latestAt: string | null;
}

const BUCKET_LABEL: Record<FeatureBucket, { label: string; icon: string }> = {
  zone:       { label: 'Zones',       icon: '\u{1F5FA}' },
  paddock:    { label: 'Paddocks',    icon: '\u{1F411}' },
  structure:  { label: 'Structures',  icon: '\u{1F3D7}' },
  utility:    { label: 'Utilities',   icon: '\u26A1' },
  crop_area:  { label: 'Crop areas',  icon: '\u{1F33F}' },
  path:       { label: 'Paths',       icon: '\u{1F6E4}' },
  pin:        { label: 'Map pins',    icon: '\u{1F4CD}' },
  other:      { label: 'Other',       icon: '\u2026' },
};

function classifyFeatureType(c: Comment): FeatureBucket {
  if (!c.featureType && !c.featureId) return 'pin';
  const t = (c.featureType ?? '').toLowerCase();
  if (t.includes('zone')) return 'zone';
  if (t.includes('paddock')) return 'paddock';
  if (t.includes('structure') || t.includes('building')) return 'structure';
  if (t.includes('utility') || t.includes('utilities')) return 'utility';
  if (t.includes('crop') || t.includes('planting')) return 'crop_area';
  if (t.includes('path') || t.includes('route') || t.includes('corridor')) return 'path';
  return 'other';
}

function shortId(id: string): string {
  if (id.length <= 8) return id;
  return id.slice(0, 8);
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

export const CommentsByFeatureCard = memo(function CommentsByFeatureCard({ projectId }: Props) {
  const allComments = useCommentStore((s) => s.comments);

  const data = useMemo(() => {
    const projectComments = allComments.filter((c) => c.projectId === projectId);

    const groupKey = (c: Comment): string =>
      c.featureId ?? (c.location ? `pin:${c.location[0].toFixed(5)},${c.location[1].toFixed(5)}` : 'unknown');

    const groupMap = new Map<string, FeatureGroup>();
    for (const c of projectComments) {
      const bucket = classifyFeatureType(c);
      const id = groupKey(c);
      const existing = groupMap.get(id);
      const updatedAt = c.updatedAt ?? c.createdAt;
      if (existing) {
        existing.total += 1;
        if (c.resolved) existing.resolved += 1;
        else existing.open += 1;
        if (updatedAt > existing.latestAt) existing.latestAt = updatedAt;
      } else {
        groupMap.set(id, {
          featureId: id,
          featureType: bucket,
          open: c.resolved ? 0 : 1,
          resolved: c.resolved ? 1 : 0,
          total: 1,
          latestAt: updatedAt,
        });
      }
    }

    const buckets = new Map<FeatureBucket, BucketRollup>();
    for (const g of groupMap.values()) {
      const existing = buckets.get(g.featureType);
      const meta = BUCKET_LABEL[g.featureType];
      if (existing) {
        existing.open += g.open;
        existing.resolved += g.resolved;
        existing.total += g.total;
        existing.features.push(g);
        if (!existing.latestAt || g.latestAt > existing.latestAt) {
          existing.latestAt = g.latestAt;
        }
      } else {
        buckets.set(g.featureType, {
          key: g.featureType,
          label: meta.label,
          icon: meta.icon,
          open: g.open,
          resolved: g.resolved,
          total: g.total,
          features: [g],
          latestAt: g.latestAt,
        });
      }
    }

    const bucketRollups = Array.from(buckets.values()).map((b) => ({
      ...b,
      features: b.features.slice().sort((a, z) => {
        if (a.open !== z.open) return z.open - a.open;
        return z.latestAt.localeCompare(a.latestAt);
      }),
    }));

    bucketRollups.sort((a, z) => {
      if (a.open !== z.open) return z.open - a.open;
      return z.total - a.total;
    });

    const totalOpen = projectComments.filter((c) => !c.resolved).length;
    const totalResolved = projectComments.length - totalOpen;
    const featureCount = groupMap.size;

    return {
      bucketRollups,
      totalOpen,
      totalResolved,
      total: projectComments.length,
      featureCount,
    };
  }, [allComments, projectId]);

  const isEmpty = data.total === 0;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Comments by feature</h3>
          <p className={css.cardHint}>
            Where conversation is concentrated. Map-pin comments without an
            attached feature are grouped together so reviewers can spot
            <strong> unanchored </strong>feedback that may be hard to act on.
          </p>
        </div>
        <span className={css.heuristicBadge}>ROLLUP</span>
      </div>

      <div className={css.stats}>
        <div className={css.stat}>
          <span className={css.statLabel}>Total</span>
          <span className={css.statVal}>{data.total}</span>
        </div>
        <div className={`${css.stat} ${data.totalOpen > 0 ? css.statOpen : ''}`}>
          <span className={css.statLabel}>Open</span>
          <span className={css.statVal}>{data.totalOpen}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Resolved</span>
          <span className={css.statVal}>{data.totalResolved}</span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Features</span>
          <span className={css.statVal}>{data.featureCount}</span>
        </div>
      </div>

      {isEmpty && (
        <div className={css.empty}>
          No comments yet. Use the <strong>Add Comment to Map</strong>{' '}
          control above to drop a pin, or click directly on a feature to
          attach a thread {'\u2014'} this rollup activates once any comment
          exists so reviewers can see where conversation is landing.
        </div>
      )}

      {!isEmpty && (
        <ul className={css.bucketList}>
          {data.bucketRollups.map((b) => (
            <li key={b.key} className={`${css.bucket} ${b.open > 0 ? css.bucketActive : ''}`}>
              <div className={css.bucketHead}>
                <div className={css.bucketIdent}>
                  <span className={css.bucketIcon} aria-hidden>{b.icon}</span>
                  <span className={css.bucketLabel}>{b.label}</span>
                  <span className={css.bucketCount}>
                    {b.features.length} feature{b.features.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className={css.bucketCounts}>
                  {b.open > 0 && <span className={`${css.chip} ${css.chipOpen}`}>{b.open} open</span>}
                  {b.resolved > 0 && (
                    <span className={`${css.chip} ${css.chipResolved}`}>{b.resolved} resolved</span>
                  )}
                </div>
              </div>
              <ul className={css.featureList}>
                {b.features.map((f) => (
                  <li key={f.featureId} className={css.featureRow}>
                    <span className={css.featureId} title={f.featureId}>
                      {f.featureType === 'pin' ? f.featureId.replace(/^pin:/, '\u{1F4CD} ') : shortId(f.featureId)}
                    </span>
                    <span className={css.featureCounts}>
                      {f.open > 0 ? (
                        <span className={css.featureOpen}>{f.open} open</span>
                      ) : (
                        <span className={css.featureDone}>resolved</span>
                      )}
                      <span className={css.featureTotal}>
                        {f.total} total
                      </span>
                    </span>
                    <span className={css.featureTime}>{relativeTime(f.latestAt)}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        <em>Rollup:</em> Comments are grouped by <strong>featureType</strong>{' '}
        (when set) or by approximate map coordinate (when only a pin location
        exists). Within each type, individual features are sorted by{' '}
        <strong>open</strong> count first, then by most recent activity.
        This card is read-only {'\u2014'} use the thread above to resolve,
        delete, or fly to a comment.
      </p>
    </div>
  );
});

export default CommentsByFeatureCard;
