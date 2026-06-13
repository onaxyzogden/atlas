// ObserveUpdatesSection — the OBSERVE UPDATES detail-panel section (ADR 11
// §2b), rendered between MAP ACTIVATION and YOUR DECISIONS in
// ObjectiveDetailPanel. Lists the diverged Observe data points that put this
// objective into cyclical review, one human-readable change line each.
//
// Display-only: it reports the changes that DROVE the advisory review flag; it
// never mutates a decision and is not a gate. Renders nothing when there is no
// active divergence in the relevant domains (so non-flagged objectives are
// untouched).

import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import type { UniversalDomain } from '@ogden/shared';
import {
  useObserveDataPointStore,
  selectObserveDataPointsForProject,
} from '../../../store/observeDataPointStore.js';
import { describeObserveChange } from '../../observe/dashboard/revision/describeObserveChange.js';
import { C } from '../spine/tokens.js';

const DIVERGENT_STATUSES = new Set([
  'needs_investigation',
  'major_constraint',
  'potential_disqualifier',
]);

interface Props {
  projectId: string;
  /** Domains responsible for this objective's review flag (triggerContext). */
  domains: readonly UniversalDomain[];
}

function formatCapturedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ObserveUpdatesSection({ projectId, domains }: Props) {
  const allPoints = useObserveDataPointStore((s) =>
    selectObserveDataPointsForProject(s, projectId),
  );

  const domainSet = useMemo(() => new Set(domains), [domains]);

  const changes = useMemo(
    () =>
      allPoints.filter(
        (p) =>
          !p.isSuperseded &&
          DIVERGENT_STATUSES.has(p.statusOutput) &&
          domainSet.has(p.domainId),
      ),
    [allPoints, domainSet],
  );

  if (changes.length === 0) return null;

  return (
    <section
      aria-label="Observe updates affecting this objective"
      data-testid="objective-observe-updates"
      style={{
        margin: '8px 12px',
        padding: '10px 12px',
        borderRadius: 8,
        border: '1px solid rgba(232, 169, 88, 0.45)',
        background: 'rgba(232, 169, 88, 0.10)',
      }}
    >
      <h3
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '0 0 6px',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: '#e8a958',
        }}
      >
        <Activity size={13} aria-hidden />
        Observe updates
      </h3>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {changes.map((point) => (
          <li
            key={point.id}
            data-testid={`observe-update-${point.id}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1.4, color: C.textPrimary }}>
              {describeObserveChange(point)}
            </span>
            <span style={{ fontSize: 11, color: C.textTertiary }}>
              {formatCapturedAt(point.capturedAt)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
