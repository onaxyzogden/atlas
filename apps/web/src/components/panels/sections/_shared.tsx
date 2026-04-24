/**
 * Sprint BK — shared memoized leaf components for SiteIntelligencePanel sections.
 *
 * Extracted from `SiteIntelligencePanel.tsx` (Sprint BJ introduced the memo
 * wrappers inline; Sprint BK relocates them here so extracted section files
 * can import them without re-declaring).
 */

import { memo } from 'react';
import { Clock, Crosshair, ShieldCheck } from 'lucide-react';
import { confidence, semantic } from '../../../lib/tokens.js';
import { Tooltip } from '../../ui/Tooltip.js';
import s from '../SiteIntelligencePanel.module.css';
import p from '../../../styles/panel.module.css';

export const AILabel = memo(function AILabel({ confidence }: { confidence?: string }) {
  return (
    <span className={s.aiLabel}>
      <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M8 1l1.5 4.5H14l-3.5 2.5L12 13 8 10l-4 3 1.5-5L2 5.5h4.5z" strokeLinejoin="round" />
      </svg>
      AI-generated{confidence && confidence !== 'high' ? ` (${confidence} confidence)` : ''} &middot; verify on-site
    </span>
  );
});

export const RefreshIcon = memo(function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke={spinning ? semantic.sidebarActive : semantic.sidebarIcon}
      strokeWidth={1.5}
      strokeLinecap="round"
      className={spinning ? s.refreshIconSpin : undefined}
    >
      <path d="M1 1v5h5M15 15v-5h-5" />
      <path d="M2.5 10A6 6 0 0113.5 6M13.5 6A6 6 0 012.5 10" />
    </svg>
  );
});

export type ConfReason = 'freshness' | 'resolution' | 'authority';

/** Provenance surfaced through a delayed tooltip.
 *
 *  Scholar #UX (Phase 3): the confidence rating in isolation leaves
 *  the user asking "confidence in *what*?" — freshness? source
 *  authority? spatial resolution? This attaches the reason as a glyph
 *  next to the pill and exposes the full provenance on hover (~800ms
 *  delay so it doesn't fire while the user is just passing through). */
export interface ConfMeta {
  source?: string;
  dataDate?: string;
  reason?: ConfReason;
}

const REASON_GLYPH: Record<ConfReason, { Icon: typeof Clock; label: string }> = {
  freshness: { Icon: Clock, label: 'Freshness' },
  resolution: { Icon: Crosshair, label: 'Spatial resolution' },
  authority: { Icon: ShieldCheck, label: 'Source authority' },
};

export const ConfBadge = memo(function ConfBadge({
  level,
  meta,
  variant = 'neutral',
}: {
  level: 'High' | 'Medium' | 'Low';
  meta?: ConfMeta;
  /** `'neutral'` (default) = monochrome grey — confidence is meta-data,
   *  not a site verdict. `'semantic'` = green/gold/red, reserved for
   *  truly interpretive signals (e.g. a quality tier). Scholar #UX
   *  Phase 2 refit. */
  variant?: 'neutral' | 'semantic';
}) {
  const semanticMap = { High: p.badgeHigh, Medium: p.badgeMedium, Low: p.badgeLow };
  const neutralMap = { High: p.badgeNeutralHigh, Medium: p.badgeNeutralMedium, Low: p.badgeNeutralLow };
  const classFor = variant === 'semantic' ? semanticMap[level] : neutralMap[level];
  const pill = (
    <span className={`${p.badgeConfidence} ${classFor}`}>
      {level}
    </span>
  );

  if (!meta || (!meta.source && !meta.dataDate && !meta.reason)) {
    return pill;
  }

  const glyph = meta.reason ? REASON_GLYPH[meta.reason] : null;
  const tooltipContent = (
    <span className={s.confTooltipBody}>
      {meta.reason && (
        <span className={s.confTooltipRow}>
          <strong>Rated on:</strong> {REASON_GLYPH[meta.reason].label.toLowerCase()}
        </span>
      )}
      {meta.source && (
        <span className={s.confTooltipRow}>
          <strong>Source:</strong> {meta.source}
        </span>
      )}
      {meta.dataDate && (
        <span className={s.confTooltipRow}>
          <strong>Data date:</strong> {meta.dataDate}
        </span>
      )}
    </span>
  );

  return (
    <Tooltip content={tooltipContent} position="left" delay={800}>
      <span className={s.confBadgeWithReason}>
        {glyph && (
          <span
            className={s.confReasonGlyph}
            aria-label={`Rated on ${glyph.label.toLowerCase()}`}
          >
            <glyph.Icon size={10} strokeWidth={2} />
          </span>
        )}
        {pill}
      </span>
    </Tooltip>
  );
});

export const ScoreCircle = memo(function ScoreCircle({ score, size }: { score: number; size: number }) {
  const sw = size > 50 ? 4 : 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? confidence.high : score >= 60 ? semantic.sidebarActive : confidence.low;
  const isHero = size > 50;
  return (
    <div
      className={`${s.scoreCircle} ${isHero ? s.scoreCirclePulse : ''}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-panel-card-border)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className={s.scoreCircleInner}>
        <span className={s.scoreCircleNum} style={{ fontSize: size > 50 ? 20 : 12 }}>{score}</span>
        {size > 50 && <span className={s.scoreCircleDenom}>/100</span>}
      </div>
    </div>
  );
});
