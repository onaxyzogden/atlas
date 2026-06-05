// CoOccurrenceVerdictBanner -- collapsible banner at the top of the Plan
// objective column surfacing cross-protocol co-occurrence verdicts: structural
// clusters where multiple protocols/templates converge on the same theme.
// Collapsed by default to a one-line count; expanded, each cluster shows its
// theme heading, a summary sentence, and deep-link buttons to the affected
// objectives. Existential-bearing clusters (destocking / animal welfare) get a
// heavier amber accent so the steward sees the higher-stakes verdict.
//
// Pure presentational: clusters are INJECTED, and the collapse state lives in
// the parent shell (mirrors DesignTensionBanner). The amber treatment matches
// the design-tension / divergence palette -- verdicts are advisory friction.

import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { CoOccurrenceCluster } from '@ogden/shared';
import css from './CoOccurrenceVerdictBanner.module.css';

interface Props {
  clusters: CoOccurrenceCluster[];
  expanded: boolean;
  onToggle: () => void;
  onSelectObjective: (objectiveId: string) => void;
}

export default function CoOccurrenceVerdictBanner({
  clusters,
  expanded,
  onToggle,
  onSelectObjective,
}: Props) {
  if (clusters.length === 0) return null;
  const count = clusters.length;

  return (
    <aside
      className={css.banner}
      aria-label="Cross-protocol verdicts"
      data-testid="cooccurrence-banner"
    >
      <button
        type="button"
        className={css.header}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className={css.iconWrap} aria-hidden>
          <AlertTriangle size={14} />
        </span>
        <span className={css.headerText}>
          {count} structural verdict{count === 1 ? '' : 's'}
        </span>
        <span className={css.chevron} aria-hidden>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {expanded && (
        <ul className={css.list}>
          {clusters.map((cluster) => (
            <li
              key={cluster.bucketKey}
              className={css.row}
              data-existential={cluster.containsExistential ? 'true' : undefined}
            >
              <p className={css.themeHeading}>{cluster.theme}</p>
              <p className={css.rowBody}>{cluster.summary}</p>
              <div className={css.linkRow}>
                {cluster.objectiveIds.map((objectiveId) => (
                  <button
                    key={objectiveId}
                    type="button"
                    className={css.objectiveLink}
                    data-testid={`cooccurrence-objective-link-${objectiveId}`}
                    onClick={() => onSelectObjective(objectiveId)}
                  >
                    Review {objectiveId}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
