/**
 * CandidateCard — single property tile on the Discover board.
 *
 * Renders verdict pill, NEW badge, fit tags, top blocker line, and a
 * 4-sub-score row (Land Fit / Water / Regulation / Access). Includes a
 * checkbox to add the candidate to the compare tray.
 */

import type { Candidate, VerdictStatus } from "../types.js";
import css from "./CandidateCard.module.css";

const STATUS_TONE: Record<VerdictStatus, string> = {
  strong: "tone-good",
  supported: "tone-good",
  "supported-with-fixes": "tone-watch",
  conditional: "tone-watch",
  "at-risk": "tone-warning",
  blocked: "tone-blocked",
};

export interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen?: (id: string) => void;
}

export default function CandidateCard({
  candidate,
  selected,
  onToggleSelect,
  onOpen,
}: CandidateCardProps) {
  const tone = STATUS_TONE[candidate.verdict];
  return (
    <article className={`${css.card} ${selected ? css.selected : ""}`}>
      <header className={css.header}>
        <div className={css.headerLeft}>
          <label className={css.checkboxLabel}>
            <input
              type="checkbox"
              className={css.checkbox}
              checked={selected}
              onChange={() => onToggleSelect(candidate.id)}
              aria-label={`Add ${candidate.name} to comparison`}
            />
          </label>
          <div className={css.titleBlock}>
            <h3 className={css.name}>{candidate.name}</h3>
            <span className={css.region}>{candidate.region}</span>
          </div>
        </div>
        <div className={css.badges}>
          {candidate.isNew && <span className={css.newBadge}>NEW</span>}
          <span className={`${css.verdictPill} ${css[tone]}`}>{candidate.verdictLabel}</span>
        </div>
      </header>

      <div className={css.facts}>
        <span className={css.fact}>
          <span className={css.factLabel}>Acreage</span>
          <span className={css.factValue}>{candidate.acreage} {candidate.acreageUnit}</span>
        </span>
        <span className={css.fact}>
          <span className={css.factLabel}>Price</span>
          <span className={css.factValue}>{formatPrice(candidate.priceUsd)}</span>
        </span>
      </div>

      <div className={css.tags}>
        {candidate.fitTags.map((t) => (
          <span key={t} className={css.tag}>{t}</span>
        ))}
      </div>

      <div className={`${css.blocker} ${css[`blocker-${candidate.topBlocker.severity}`]}`}>
        <span className={css.blockerLabel}>Top Blocker</span>
        <span className={css.blockerText}>{candidate.topBlocker.title}</span>
      </div>

      <div className={css.scoreRow}>
        <Score label="Land Fit" value={candidate.subScores.landFit} />
        <Score label="Water" value={candidate.subScores.water} />
        <Score label="Reg." value={candidate.subScores.regulation} />
        <Score label="Access" value={candidate.subScores.access} />
      </div>

      {onOpen && (
        <footer className={css.footer}>
          <button type="button" className={css.openBtn} onClick={() => onOpen(candidate.id)}>
            View Details →
          </button>
        </footer>
      )}
    </article>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className={css.score}>
      <span className={css.scoreLabel}>{label}</span>
      <span className={css.scoreValue}>{value}</span>
      <div className={css.scoreBar} aria-hidden="true">
        <div className={`${css.scoreFill} ${css[scoreTone(value)]}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function scoreTone(v: number): string {
  if (v >= 80) return "fill-good";
  if (v >= 60) return "fill-watch";
  if (v >= 40) return "fill-warning";
  return "fill-blocked";
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}
