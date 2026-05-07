import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ProgressRing } from "./ProgressRing.jsx";
import { SurfaceCard } from "./SurfaceCard.jsx";

function SynthesisSection({ title, items, numbered = false }) {
  return (
    <section className="synthesis-section">
      <h3>{title}</h3>
      {items.map((item, i) => (
        <p key={item}>
          {numbered ? <b>{i + 1}</b> : <CheckCircle2 aria-hidden="true" />}
          {item}
        </p>
      ))}
    </section>
  );
}

export function ModuleSynthesisPanel({
  title,
  synthesis,
  alignmentLabel = "Alignment",
  onAction,
  actionLabel = "View full design implications",
}) {
  const s = synthesis;
  return (
    <SurfaceCard className="module-synthesis-panel">
      <h2>{title}</h2>
      <div className="synthesis-score">
        <ProgressRing value={s.alignmentPct} label={`${s.alignmentPct}%`} />
        <p>
          <b>{alignmentLabel}</b>
          {s.alignmentNote}
        </p>
      </div>
      <SynthesisSection title="Key insights" items={s.keyInsights} />
      <SynthesisSection title="Design implications" items={s.designImplications} />
      <SynthesisSection title="Next steps" numbered items={s.nextSteps} />
      {onAction && (
        <button className="green-button" type="button" onClick={onAction}>
          {actionLabel} <ArrowRight aria-hidden="true" />
        </button>
      )}
    </SurfaceCard>
  );
}
