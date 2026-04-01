/**
 * ConfidenceIndicator — reads the `confidence` field from any analysis object.
 * Applied universally to LayerResponse, SiteAssessment, and (Phase 3) AIOutput.
 * This makes the "honesty about uncertainty" principle structural.
 */

import type { ConfidenceLevel } from '@ogden/shared';

const CONFIG: Record<ConfidenceLevel, { label: string; color: string; description: string }> = {
  high: {
    label: 'High confidence',
    color: '#2d7a4f',
    description: 'Well-sourced data with good resolution. Results are reliable.',
  },
  medium: {
    label: 'Medium confidence',
    color: '#8a6d1e',
    description: 'Some data gaps. Consider supplementing with site observation.',
  },
  low: {
    label: 'Low confidence',
    color: '#9b3a2a',
    description: 'Inference-heavy. Verify on site before making design decisions.',
  },
};

interface ConfidenceIndicatorProps {
  confidence: ConfidenceLevel;
  dataSources?: string[];
  compact?: boolean;
}

export default function ConfidenceIndicator({
  confidence,
  dataSources,
  compact = false,
}: ConfidenceIndicatorProps) {
  const cfg = CONFIG[confidence];

  if (compact) {
    return (
      <span
        title={`${cfg.label}: ${cfg.description}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
          fontWeight: 600,
          color: cfg.color,
          textTransform: 'capitalize',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: cfg.color,
            display: 'inline-block',
          }}
        />
        {confidence}
      </span>
    );
  }

  return (
    <div
      style={{
        borderInlineStart: `3px solid ${cfg.color}`,
        paddingInlineStart: 10,
        marginBlock: 8,
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 600, color: cfg.color, marginBlockEnd: 2 }}>
        {cfg.label}
      </p>
      <p style={{ fontSize: 11, color: '#9a8a74' }}>{cfg.description}</p>
      {dataSources && dataSources.length > 0 && (
        <p style={{ fontSize: 10, color: '#7a6a5a', marginBlockStart: 4 }}>
          Sources: {dataSources.join(', ')}
        </p>
      )}
    </div>
  );
}
