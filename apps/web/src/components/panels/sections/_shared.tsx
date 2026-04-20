/**
 * Sprint BK — shared memoized leaf components for SiteIntelligencePanel sections.
 *
 * Extracted from `SiteIntelligencePanel.tsx` (Sprint BJ introduced the memo
 * wrappers inline; Sprint BK relocates them here so extracted section files
 * can import them without re-declaring).
 */

import { memo } from 'react';
import { confidence, semantic } from '../../../lib/tokens.js';
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

export const ConfBadge = memo(function ConfBadge({ level }: { level: 'High' | 'Medium' | 'Low' }) {
  const colorMap = { High: p.badgeHigh, Medium: p.badgeMedium, Low: p.badgeLow };
  return (
    <span className={`${p.badgeConfidence} ${colorMap[level]}`}>
      {level}
    </span>
  );
});

export const ScoreCircle = memo(function ScoreCircle({ score, size }: { score: number; size: number }) {
  const sw = size > 50 ? 4 : 3;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? confidence.high : score >= 60 ? semantic.sidebarActive : confidence.low;
  return (
    <div className={s.scoreCircle} style={{ width: size, height: size }}>
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
