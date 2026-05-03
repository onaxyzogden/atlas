export function ProgressRing({ value, label, className = "progress-ring" }) {
  return (
    <div className={className} style={{ "--progress": `${value}%` }}>
      <span>{label ?? `${value}%`}</span>
    </div>
  );
}
