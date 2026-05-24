/**
 * FitGateSeverity — the verdict banner + per-dimension severity rows for the
 * Fit Gate. Green→Black severity chips with the engine's rationale. The banner
 * states the verdict but is purely advisory: the steward always keeps a path
 * forward (the page owns the "proceed anyway" action).
 */

import {
  severityLabel,
  verdictLabel,
  type FitGateResult,
  type Severity,
  type Verdict,
} from './engine/fitGate.js';
import css from './FitGateSeverity.module.css';

const VERDICT_BLURB: Record<Verdict, string> = {
  proceed: 'Nothing disqualifying surfaced — this property fits your True North.',
  caution: 'Workable, but serious constraints deserve attention before you commit.',
  pause: 'A potential disqualifier is present — verify it before investing further.',
  reject: 'A hard-stop condition is declared. Resolve it, or choose another property.',
};

export default function FitGateSeverity({ result }: { result: FitGateResult }) {
  const { verdict, worstSeverity, findings, unknowns } = result;

  return (
    <div className={css.root}>
      <section
        className={css.banner}
        data-verdict={verdict}
        aria-label="Fit Gate verdict"
      >
        <span className={css.verdictTag} data-severity={worstSeverity}>
          {severityLabel(worstSeverity)}
        </span>
        <h2 className={css.verdictTitle}>{verdictLabel(verdict)}</h2>
        <p className={css.verdictBlurb}>{VERDICT_BLURB[verdict]}</p>
      </section>

      <ul className={css.findingList}>
        {findings.map((f) => (
          <li key={f.dimension} className={css.finding}>
            <span
              className={css.chip}
              data-severity={f.severity}
              title={severityLabel(f.severity)}
            >
              {severityLabel(f.severity)}
            </span>
            <div className={css.findingBody}>
              <span className={css.findingLabel}>{f.label}</span>
              <span className={css.findingRationale}>{f.rationale}</span>
            </div>
          </li>
        ))}
      </ul>

      {unknowns.length > 0 && (
        <section className={css.unknowns} aria-label="Items to confirm">
          <p className="eyebrow">Confirm before you rely on this verdict</p>
          <ul className={css.unknownList}>
            {unknowns.map((u) => (
              <li key={u} className={css.unknownItem}>
                {u}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Exposed for legend rendering. */
export const SEVERITY_ORDER: Severity[] = [
  'green',
  'yellow',
  'orange',
  'red',
  'black',
];
