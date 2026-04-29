/**
 * StageHero — page-top verdict block used by Home, Diagnose, Prove.
 *
 * Layout (left-to-right):
 *   [gold ring with score]  [verdict label, summary, action buttons]  [optional metadata column]
 */

import type { ReactNode } from "react";
import type { Verdict, VerdictStatus } from "../types.js";
import css from "./StageHero.module.css";

export interface StageHeroAction {
  label: string;
  variant?: "primary" | "secondary";
  onClick: () => void;
}

export interface StageHeroProps {
  eyebrow?: string;
  title: string;
  verdict: Verdict;
  /** Optional contextual sub-line (location, parcel ID, etc.). */
  meta?: string;
  actions?: StageHeroAction[];
  /** Right-side metadata slot (parcel image, key facts). */
  aside?: ReactNode;
}

const STATUS_TONE: Record<VerdictStatus, "good" | "watch" | "warning" | "blocked"> = {
  strong: "good",
  supported: "good",
  "supported-with-fixes": "watch",
  conditional: "watch",
  "at-risk": "warning",
  blocked: "blocked",
};

export default function StageHero({
  eyebrow,
  title,
  verdict,
  meta,
  actions,
  aside,
}: StageHeroProps) {
  const tone = STATUS_TONE[verdict.status];
  const score = Math.max(0, Math.min(100, verdict.score));
  const ringStyle = {
    background: `conic-gradient(var(--color-gold-brand) ${score * 3.6}deg, var(--color-border-subtle) 0deg)`,
  };

  return (
    <section className={`${css.hero} ${css[`tone-${tone}`]}`}>
      <div className={css.ring} style={ringStyle} aria-label={`${verdict.scoreLabel ?? "Score"} ${score} of 100`}>
        <div className={css.ringInner}>
          <span className={css.ringValue}>{score}</span>
          <span className={css.ringDenom}>/ 100</span>
          {verdict.scoreLabel && <span className={css.ringLabel}>{verdict.scoreLabel}</span>}
        </div>
      </div>

      <div className={css.body}>
        {eyebrow && <span className={css.eyebrow}>{eyebrow}</span>}
        <h1 className={css.title}>{title}</h1>
        <div className={css.verdictRow}>
          <span className={`${css.verdictPill} ${css[`pill-${tone}`]}`}>{verdict.label}</span>
          {meta && <span className={css.meta}>{meta}</span>}
        </div>
        <p className={css.summary}>{verdict.summary}</p>
        {actions && actions.length > 0 && (
          <div className={css.actions}>
            {actions.map((a, i) => (
              <button
                key={i}
                type="button"
                className={`${css.btn} ${a.variant === "secondary" ? css.btnSecondary : css.btnPrimary}`}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {aside && <aside className={css.aside}>{aside}</aside>}
    </section>
  );
}
