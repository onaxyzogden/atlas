/**
 * CompareModal — Phase 6.1 Compare Selected modal.
 *
 * Surfaces a side-by-side comparison of every selected Discover
 * candidate. Rows are organized so the eye can scan price/acreage,
 * verdict + fit score, sub-scores, fit tags, and the top blocker
 * across columns. Reuses LogObservationDialog's CSS module for
 * backdrop/dialog chrome so the modal vocabulary stays consistent.
 */

import type { Candidate } from "../types.js";
import dialogCss from "./LogObservationDialog.module.css";
import css from "./CompareModal.module.css";

export interface CompareModalProps {
  candidates: Candidate[];
  onClose: () => void;
}

const CAD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatPrice(n: number): string {
  return CAD.format(n);
}

function formatAcreage(c: Candidate): string {
  const ha = c.acreageUnit === "ha" ? c.acreage : c.acreage * 0.404686;
  const ac = c.acreageUnit === "ac" ? c.acreage : c.acreage / 0.404686;
  return `${Math.round(ac)} ac · ${Math.round(ha)} ha`;
}

function ScorePill({ value, label }: { value: number | undefined; label: string }) {
  if (value === undefined) return <span className={css.scoreEmpty} aria-label={`${label} unknown`}>—</span>;
  const tone = value >= 70 ? "good" : value >= 50 ? "watch" : "warn";
  return (
    <span className={`${css.scorePill} ${css[`tone-${tone}`]}`} title={`${label}: ${value}`}>
      {value}
    </span>
  );
}

export default function CompareModal({ candidates, onClose }: CompareModalProps) {
  return (
    <div
      className={dialogCss.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      onClick={onClose}
    >
      <div
        className={`${dialogCss.dialog} ${css.dialog}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={css.header}>
          <h2 className={dialogCss.title} id="compare-modal-title">
            Compare Properties
          </h2>
          <p className={dialogCss.sub}>
            {candidates.length} selected — scan side-by-side before drilling in.
          </p>
        </header>

        <div className={css.tableWrap}>
          <table className={css.table}>
            <thead>
              <tr>
                <th scope="row" className={css.rowHead} aria-hidden="true" />
                {candidates.map((c) => (
                  <th key={c.id} scope="col" className={css.colHead}>
                    <div className={css.colName}>{c.name}</div>
                    <div className={css.colSub}>{c.region}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={css.rowHead}>Acreage</th>
                {candidates.map((c) => (
                  <td key={c.id}>{formatAcreage(c)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Price</th>
                {candidates.map((c) => (
                  <td key={c.id}>
                    <div>{formatPrice(c.priceUsd)}</div>
                    {c.pricePerAcre !== undefined && (
                      <div className={css.subline}>{formatPrice(c.pricePerAcre)}/ac</div>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Verdict</th>
                {candidates.map((c) => (
                  <td key={c.id}>
                    <span className={`${css.verdict} ${css[`verdict-${c.verdict}`]}`}>
                      {c.verdictLabel}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Fit Score</th>
                {candidates.map((c) => (
                  <td key={c.id}><ScorePill value={c.fitScore} label="Fit Score" /></td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Water</th>
                {candidates.map((c) => (
                  <td key={c.id}><ScorePill value={c.subScores.water} label="Water" /></td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Access</th>
                {candidates.map((c) => (
                  <td key={c.id}><ScorePill value={c.subScores.access} label="Access" /></td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Infrastructure</th>
                {candidates.map((c) => (
                  <td key={c.id}><ScorePill value={c.subScores.infrastructure} label="Infrastructure" /></td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Fit Tags</th>
                {candidates.map((c) => (
                  <td key={c.id}>
                    <div className={css.tags}>
                      {c.fitTags.map((t) => (
                        <span key={t} className={css.tag}>{t}</span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className={css.rowHead}>Top Blocker</th>
                {candidates.map((c) => (
                  <td key={c.id}>
                    <div className={`${css.blocker} ${css[`blocker-${c.topBlocker.severity}`]}`}>
                      <div>{c.topBlocker.title}</div>
                      {c.topBlocker.impact && (
                        <div className={css.subline}>{c.topBlocker.impact} impact</div>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className={dialogCss.row}>
          <button
            type="button"
            className={`${dialogCss.btn} ${dialogCss.btnPrimary}`}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
