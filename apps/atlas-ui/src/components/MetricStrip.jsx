import { ProgressRing } from "./ProgressRing.jsx";

export function MetricStrip({ metrics, ariaLabel = "Summary metrics" }) {
  return (
    <section className="metric-band" aria-label={ariaLabel}>
      {metrics.map((metric) =>
        metric.type === "progress" ? (
          <div className="metric-cell progress-cell" key={metric.label}>
            <ProgressRing value={metric.progress} label={metric.progressLabel} />
            <MetricCopy {...metric} />
          </div>
        ) : (
          <div className="metric-cell" key={metric.label}>
            <metric.icon className="metric-icon" aria-hidden="true" />
            <MetricCopy {...metric} />
          </div>
        )
      )}
    </section>
  );
}

function MetricCopy({ label, value, note }) {
  return (
    <div>
      <h3>{label}</h3>
      <strong>{value}</strong>
      <p>
        {note.split("\n").map((line) => (
          <span key={line}>{line}</span>
        ))}
      </p>
    </div>
  );
}
