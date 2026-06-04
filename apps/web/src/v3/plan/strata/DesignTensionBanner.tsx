// DesignTensionBanner — collapsible banner at the top of the Plan objective
// column listing the active design tensions for this project's type pairing
// (Plan Navigation Spec v1.1 §8). Collapsed by default to a one-line count;
// expanded, each tension shows its description and the stratum where it is
// reconciled. Tensions whose resolution stratum is the one currently open get
// a static amber ring so the steward sees "this is where you reconcile it".
//
// Pure presentational: the collapse PREFERENCE (persisted) and the transient
// auto-expand both live in ObjectiveColumn, mirroring how CyclicalReviewBanner
// keeps its store wiring in ObjectiveDetailPanel. The amber treatment matches
// the source-tag / divergence palette — tensions are advisory friction, not
// failure.

import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Crosshair,
} from 'lucide-react';
import type { DesignTension } from '@ogden/shared';
import css from './DesignTensionBanner.module.css';

interface Props {
  tensions: readonly DesignTension[];
  expanded: boolean;
  /** Tensions resolved at the currently-open stratum — get a static ring. */
  highlightTensionIds?: readonly string[];
  onToggle: () => void;
  /**
   * When provided, each row becomes an accessible button that, on activation,
   * asks the parent to navigate to the tension's resolution stratum and flash
   * the objective cards it concerns. Omitted → rows render as static text
   * (back-compat for non-interactive consumers / tests).
   */
  onSelectTension?: (tensionId: string) => void;
}

export default function DesignTensionBanner({
  tensions,
  expanded,
  highlightTensionIds,
  onToggle,
  onSelectTension,
}: Props) {
  if (tensions.length === 0) return null;
  const count = tensions.length;
  const highlightSet = new Set(highlightTensionIds ?? []);

  return (
    <aside
      className={css.banner}
      aria-label="Design tensions"
      data-testid="plan-design-tension-banner"
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
          {count} design tension{count === 1 ? '' : 's'} to reconcile
        </span>
        <span className={css.chevron} aria-hidden>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {expanded && (
        <ul className={css.list}>
          {tensions.map((t) => {
            const body = (
              <>
                <p className={css.rowBody}>{t.description}</p>
                <span className={css.rowFooter}>
                  <span className={css.resolvePill}>
                    Resolved at {t.resolutionStratumLabel}
                  </span>
                  {onSelectTension && (
                    <span className={css.affordance} aria-hidden>
                      <Crosshair size={12} />
                      Show in plan
                    </span>
                  )}
                </span>
              </>
            );
            return (
              <li
                key={t.id}
                className={css.row}
                data-highlight={highlightSet.has(t.id) ? 'true' : undefined}
              >
                {onSelectTension ? (
                  <button
                    type="button"
                    className={css.rowButton}
                    onClick={() => onSelectTension(t.id)}
                    aria-label={`Show objectives for: ${t.description}`}
                  >
                    {body}
                  </button>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
