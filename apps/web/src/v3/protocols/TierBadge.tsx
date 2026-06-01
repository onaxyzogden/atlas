// TierBadge - severity-tier chip for the OLOS Protocol System.
//
// Renders one SeverityTier as its spec glyph (22px bold) on the tier's literal
// fill, with a 1px border and the tier label, all in the tier foreground
// colour (Trigger Recognition UX Spec v1.1, 3.1). Colours come from the shared
// TIER_VISUAL table - LITERAL hexes, not spine CSS-vars, so the tiers stay
// theme-independent and maximally distinct. Only the surrounding font family
// is a spine token (F.sans).

import { type SeverityTier, TIER_VISUAL } from '@ogden/shared';
import { F } from '../plan/spine/tokens.js';

export interface TierBadgeProps {
  tier: SeverityTier;
}

export default function TierBadge({ tier }: TierBadgeProps) {
  const v = TIER_VISUAL[tier];
  return (
    <span
      data-testid="tier-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 6,
        background: v.bg,
        border: `1px solid ${v.fg}`,
        color: v.fg,
        fontFamily: F.sans,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: v.fg }}
      >
        {v.icon}
      </span>
      <span>{v.label}</span>
    </span>
  );
}
