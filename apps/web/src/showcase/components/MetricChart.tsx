import type { ShowcaseRegenerationEvent } from '../data/snapshot';

export type MetricChartProps = {
  events: ShowcaseRegenerationEvent[];
  metric: string;
  unit?: string;
  title?: string;
  width?: number;
  height?: number;
};

export function MetricChart({ events, metric, unit, title, width = 480, height = 200 }: MetricChartProps) {
  const points = events
    .filter((e) => (e.observations as any)?.metric === metric)
    .map((e) => ({
      t: new Date(e.event_date).getTime(),
      v: Number((e.observations as any)?.mean_om_pct_cropped ?? (e.observations as any)?.value ?? (e.observations as any)?.mean ?? (e.observations as any)?.count ?? NaN),
      phase: e.phase,
    }))
    .filter((p) => Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
  if (points.length === 0) {
    return (
      <figure>
        <figcaption>{title ?? metric} ({unit ?? ''})</figcaption>
        <svg data-testid="metric-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title ?? metric} chart (no data)`} />
      </figure>
    );
  }
  const xs = points.map((p) => p.t); const ys = points.map((p) => p.v);
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys), ymax = Math.max(...ys);
  const pad = 32;
  const sx = (t: number) => pad + ((t - xmin) / Math.max(1, xmax - xmin)) * (width - 2 * pad);
  const sy = (v: number) => height - pad - ((v - ymin) / Math.max(0.0001, ymax - ymin)) * (height - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.t)} ${sy(p.v)}`).join(' ');
  return (
    <figure>
      <figcaption>{title ?? metric} ({unit ?? ''})</figcaption>
      <svg data-testid="metric-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title ?? metric} chart, ${points.length} points`}>
        <path d={d} fill="none" stroke="#0a7d2c" strokeWidth={2.5} />
        {points.map((p, i) => (
          <circle key={i} cx={sx(p.t)} cy={sy(p.v)} r={3} fill="#0a7d2c">
            <title>{`${new Date(p.t).getFullYear()} (${p.phase ?? '?'}): ${p.v}${unit ?? ''}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
