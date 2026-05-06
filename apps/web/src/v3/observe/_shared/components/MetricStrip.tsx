import type { LucideIcon } from 'lucide-react';
import { ProgressRing } from './ProgressRing.js';

export type MetricStripItem =
  | {
      type: 'progress';
      label: string;
      value: string;
      note: string;
      progress: number;
      progressLabel?: string;
    }
  | {
      type?: 'icon';
      label: string;
      value: string;
      note: string;
      icon: LucideIcon;
    };

interface MetricStripProps {
  metrics: MetricStripItem[];
  ariaLabel?: string;
}

export function MetricStrip({
  metrics,
  ariaLabel = 'Summary metrics',
}: MetricStripProps) {
  return (
    <section className="metric-band" aria-label={ariaLabel}>
      {metrics.map((metric) =>
        metric.type === 'progress' ? (
          <div className="metric-cell progress-cell" key={metric.label}>
            <ProgressRing value={metric.progress} label={metric.progressLabel} />
            <MetricCopy label={metric.label} value={metric.value} note={metric.note} />
          </div>
        ) : (
          <div className="metric-cell" key={metric.label}>
            <metric.icon className="metric-icon" aria-hidden="true" />
            <MetricCopy label={metric.label} value={metric.value} note={metric.note} />
          </div>
        ),
      )}
    </section>
  );
}

interface MetricCopyProps {
  label: string;
  value: string;
  note: string;
}

function MetricCopy({ label, value, note }: MetricCopyProps) {
  return (
    <div>
      <h3>{label}</h3>
      <strong>{value}</strong>
      <p>
        {note.split('\n').map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
    </div>
  );
}
