/**
 * CandidateCard — single property tile on the Discover board.
 * Pixel-aligned with the Property Candidates reference design.
 *
 * Layout:
 *   [photo banner 180px]    NEW badge + select checkbox
 *   [body]
 *     name + region    | score ring (54px)
 *     acres · price · $/ac    [verdict pill]
 *     [use tags]
 *     ─── divider ───
 *     TOP BLOCKER  · title    [impact pill]
 *     FIT SCORE  86/100
 *     [3 sub-bars: WATER · ACCESS · INFRASTRUCTURE]
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

const RING_TONE: Record<VerdictStatus, string> = {
  strong: "#8fc89a",
  supported: "#8fc89a",
  "supported-with-fixes": "#d4af5f",
  conditional: "#d4af5f",
  "at-risk": "#e0a368",
  blocked: "#e27272",
};

export interface CandidateCardProps {
  candidate: Candidate;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen?: (id: string) => void;
}

function scoreTone(v: number): string {
  if (v >= 70) return "fill-good";
  if (v >= 55) return "fill-watch";
  if (v >= 40) return "fill-warning";
  return "fill-blocked";
}

function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
}

export default function CandidateCard({
  candidate,
  selected,
  onToggleSelect,
  onOpen,
}: CandidateCardProps) {
  const tone = STATUS_TONE[candidate.verdict];
  const ringColor = RING_TONE[candidate.verdict];
  const fit = candidate.fitScore ?? 0;
  const r = 22;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - Math.max(0, Math.min(100, fit)) / 100);
  const impact = candidate.topBlocker.impact ?? "medium";

  const subRows: { label: string; value: number | undefined }[] = [
    { label: "Water", value: candidate.subScores.water },
    { label: "Access", value: candidate.subScores.access },
    { label: "Infrastructure", value: candidate.subScores.infrastructure },
  ];

  return (
    <article
      className={`${css.card} ${selected ? css.selected : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("input,button,label")) return;
        onOpen?.(candidate.id);
      }}
    >
      <div className={css.photo} aria-hidden="true">
        <div className={css.photoPattern} />
        <div className={css.photoMask} />
        {candidate.isNew && <span className={css.newBadge}>NEW</span>}
        <label className={css.checkboxWrap} onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className={css.checkbox}
            checked={selected}
            onChange={() => onToggleSelect(candidate.id)}
            aria-label={`Add ${candidate.name} to comparison`}
          />
        </label>
      </div>

      <div className={css.body}>
        <div className={css.titleRow}>
          <div className={css.titleBlock}>
            <h3 className={css.name}>{candidate.name}</h3>
            <span className={css.region}>{candidate.region}</span>
          </div>
          <div className={css.ring} aria-label={`Fit score ${fit} of 100`}>
            <svg width="54" height="54" viewBox="0 0 54 54">
              <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(212,175,95,0.12)" strokeWidth="2" />
              <circle
                cx="27" cy="27" r={r}
                fill="none"
                stroke={ringColor}
                strokeWidth="2.5"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                transform="rotate(-90 27 27)"
              />
            </svg>
            <span className={css.ringValue} style={{ color: ringColor }}>{fit}</span>
          </div>
        </div>

        <div className={css.factsRow}>
          <span className={css.fact}>{candidate.acreage.toLocaleString()} {candidate.acreageUnit}</span>
          <span className={css.fact}>{formatPrice(candidate.priceUsd)}</span>
          {candidate.pricePerAcre && (
            <span className={css.factPerAcre}>${candidate.pricePerAcre.toLocaleString()}/ac</span>
          )}
          <span className={`${css.verdictPill} ${css[tone]}`}>{candidate.verdictLabel}</span>
        </div>

        <div className={css.tags}>
          {candidate.fitTags.map((t) => (
            <span key={t} className={css.tag}>{t}</span>
          ))}
        </div>

        <div className={css.divider} />

        <div className={css.blocker}>
          <div className={css.blockerLeft}>
            <span className={css.blockerLabel}>Top Blocker</span>
            <span className={css.blockerText}>{candidate.topBlocker.title}</span>
          </div>
          <span className={`${css.impactPill} ${css[`impact-${impact}`]}`}>{impact}</span>
        </div>

        <div className={css.fitHeader}>
          <span className={css.fitLabel}>Fit Score</span>
          <span className={css.fitScore}>
            {fit}<span className={css.fitDenom}>/100</span>
          </span>
        </div>

        <div className={css.scoreList}>
          {subRows.map((row) => {
            const v = row.value ?? 0;
            return (
              <div key={row.label} className={css.scoreRow}>
                <span className={css.scoreLabel}>{row.label}</span>
                <div className={css.scoreBar}>
                  <div className={`${css.scoreFill} ${css[scoreTone(v)]}`} style={{ width: `${v}%` }} />
                </div>
                <span className={css.scoreValue}>{v}</span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}
