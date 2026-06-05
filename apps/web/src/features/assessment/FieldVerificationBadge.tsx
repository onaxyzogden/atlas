/**
 * FieldVerificationBadge — the second uncertainty pill, shown NEXT TO (never
 * merged into) ConfidenceIndicator. Source confidence says how authoritative
 * the dataset is; this says whether a steward has actually ground-truthed the
 * layer, recently and repeatedly. Distinct palette (earth-green, not the
 * green/amber/red of confidence) so the two axes never read as the same thing.
 */

import type { LayerFieldVerification, VerificationLevel } from '@ogden/shared';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

const CONFIG: Record<
  VerificationLevel,
  { label: string; color: string; bg: string; description: string }
> = {
  verified: {
    label: 'Field-verified',
    color: '#2a6a3a',
    bg: 'rgba(42, 106, 58, 0.12)',
    description:
      'Recent and/or repeated on-the-ground observations corroborate this layer near where they were taken. Maintained by continued observation.',
  },
  corroborated: {
    label: 'Field-corroborated',
    color: '#7a7a2a',
    bg: 'rgba(122, 122, 42, 0.12)',
    description:
      'At least one recent field observation supports this layer. Keep observing in this area to strengthen it to verified.',
  },
  unverified: {
    label: 'Not field-verified',
    color: '#8a7a68',
    bg: 'rgba(138, 122, 104, 0.10)',
    description:
      'No recent field observation is tied to this layer yet. This is a separate axis from source confidence — an authoritative dataset can still be unverified on the ground.',
  },
};

function formatLastObs(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

interface FieldVerificationBadgeProps {
  /** The layer's verification standing. `null`/absent renders the
   *  `unverified` resting state. */
  verification?: LayerFieldVerification | null;
  compact?: boolean;
}

export default function FieldVerificationBadge({
  verification,
  compact = false,
}: FieldVerificationBadgeProps) {
  const level: VerificationLevel = verification?.level ?? 'unverified';
  const cfg = CONFIG[level];
  const lastObs = formatLastObs(verification?.lastObservedAt ?? null);
  const count = verification?.observationCount ?? 0;

  const tooltip = `${cfg.description}${
    count > 0
      ? ` (${count} observation${count === 1 ? '' : 's'}${lastObs ? `, latest ${lastObs}` : ''})`
      : ''
  }`;

  if (compact) {
    return (
      <DelayedTooltip label={tooltip}>
        <span
          tabIndex={0}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: cfg.color,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: 2,
              background: cfg.color,
              display: 'inline-block',
            }}
          />
          {cfg.label}
        </span>
      </DelayedTooltip>
    );
  }

  return (
    <DelayedTooltip label={tooltip}>
      <span
        tabIndex={0}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 11,
          fontWeight: 600,
          color: cfg.color,
          background: cfg.bg,
          border: `1px solid ${cfg.color}33`,
          borderRadius: 999,
          padding: '2px 8px',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 2,
            background: cfg.color,
            display: 'inline-block',
          }}
        />
        {cfg.label}
        {lastObs && (
          <span style={{ fontWeight: 400, opacity: 0.8 }}>· {lastObs}</span>
        )}
      </span>
    </DelayedTooltip>
  );
}
