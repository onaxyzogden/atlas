import { CheckCircle2, ChevronRight } from "lucide-react";

export function NextStepsPanel({ steps }) {
  return (
    <section className="next-steps-panel">
      <h3>Next Steps</h3>
      {steps.map((step, index) => (
        <button className="next-step" type="button" key={step}>
          <CheckCircle2 aria-hidden="true" />
          <span>{step}</span>
          <ChevronRight aria-hidden="true" />
        </button>
      ))}
    </section>
  );
}
