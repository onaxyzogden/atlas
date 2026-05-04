/**
 * HomeHero — Project Command Home top card.
 * Photo backdrop on the left with the verdict ring overlay; verdict +
 * project identity + CTAs on the right. Matches Project Command Home
 * reference design.
 */

import type { Verdict, VerdictStatus } from "../types.js";
import css from "./HomeHero.module.css";

const STATUS_TONE: Record<VerdictStatus, "good" | "watch" | "warning" | "blocked"> = {
  strong: "good",
  supported: "good",
  "supported-with-fixes": "watch",
  conditional: "watch",
  "at-risk": "warning",
  blocked: "blocked",
};

export interface HomeHeroAction {
  label: string;
  variant?: "primary" | "secondary";
  onClick: () => void;
}

export interface HomeHeroProps {
  projectName: string;
  meta: string;
  verdict: Verdict;
  actions?: HomeHeroAction[];
}

export default function HomeHero({ projectName, meta, verdict, actions }: HomeHeroProps) {
  const score = Math.max(0, Math.min(100, verdict.score));
  const tone = STATUS_TONE[verdict.status];
  const ringStyle = {
    background: `conic-gradient(var(--color-gold-brand) ${score * 3.6}deg, rgba(212,175,95,0.18) 0deg)`,
  };

  return (
    <div className={css.card} data-tone={tone}>
      <div className={css.photoWrap}>
        <div className={css.photoPattern} aria-hidden="true" />
        <div className={css.photoMask} aria-hidden="true" />
        <div className={css.ringWrap}>
          <div className={css.ring} style={ringStyle} aria-label={`${verdict.scoreLabel ?? "Score"} ${score} of 100`}>
            <div className={css.ringInner}>
              <span className={css.ringValue}>{score}</span>
              <span className={css.ringDenom}>/ 100</span>
              {verdict.scoreLabel && <span className={css.ringLabel}>{verdict.scoreLabel}</span>}
            </div>
          </div>
        </div>
      </div>
      <div className={css.body}>
        <span className={css.eyebrow}>Verdict</span>
        <h1 className={css.verdictHeadline}>{verdict.label}</h1>
        <div className={css.divider} />
        <span className={css.eyebrow}>Active Project</span>
        <h2 className={css.title}>{projectName}</h2>
        <span className={css.meta}>{meta}</span>
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
    </div>
  );
}
