/**
 * CycleAnnotations — Phase 4 Slice 4.5 cycle-boundary overlay on the
 * Temporal chart (Observe Dashboard Spec §5.4). Reads the per-domain
 * advance history from `observeCycleStore` (caller passes it in to
 * keep this component pure) and renders one vertical line per advance
 * event whose timestamp falls inside the chart's time window.
 *
 * Each line is labelled with `C<cycleId>` at the top. Hovering or
 * tabbing surfaces the linked plan objective id + reason via SVG
 * `<title>` (no custom tooltip system to maintain).
 *
 * Annotations outside the chart's [timeMin, timeMax] window are
 * silently dropped so the chart never paints outside its viewBox.
 */

import type { ObserveCycleEntry } from '@ogden/shared';

interface Props {
  cycles: readonly ObserveCycleEntry[];
  timeMin: number;
  timeMax: number;
  chartLeft: number;
  chartRight: number;
  chartTop: number;
  chartBottom: number;
}

const ANNOTATION_STROKE = 'rgba(196, 162, 101, 0.55)';
const ANNOTATION_LABEL_FILL = 'rgba(196, 162, 101, 0.85)';

export default function CycleAnnotations({
  cycles,
  timeMin,
  timeMax,
  chartLeft,
  chartRight,
  chartTop,
  chartBottom,
}: Props) {
  if (cycles.length === 0 || timeMax <= timeMin) return null;
  const innerW = chartRight - chartLeft;
  const range = timeMax - timeMin;

  const lines = cycles
    .map((entry) => {
      const t = Date.parse(entry.advancedAt);
      if (!Number.isFinite(t)) return null;
      if (t < timeMin || t > timeMax) return null;
      const x = chartLeft + ((t - timeMin) / range) * innerW;
      return { entry, x };
    })
    .filter((v): v is { entry: ObserveCycleEntry; x: number } => v !== null);

  if (lines.length === 0) return null;

  return (
    <g aria-label="Cycle annotations">
      {lines.map(({ entry, x }) => (
        <g key={`cycle-${entry.cycleId}-${entry.advancedAt}`}>
          <line
            x1={x}
            x2={x}
            y1={chartTop}
            y2={chartBottom}
            stroke={ANNOTATION_STROKE}
            strokeWidth={1}
            strokeDasharray="4 3"
          >
            <title>
              Cycle {entry.cycleId} — {entry.reason.replace(/_/g, ' ')}
              {entry.planObjectiveId
                ? ` (objective: ${entry.planObjectiveId})`
                : ''}
            </title>
          </line>
          <text
            x={x + 4}
            y={chartTop + 10}
            fontSize="9.5"
            fill={ANNOTATION_LABEL_FILL}
          >
            C{entry.cycleId}
          </text>
        </g>
      ))}
    </g>
  );
}
