import { CheckCircle2, ChevronRight } from 'lucide-react';

interface NextStepsPanelProps {
  steps: string[];
}

export function NextStepsPanel({ steps }: NextStepsPanelProps) {
  return (
    <section className="next-steps-panel">
      <h3>Next Steps</h3>
      {steps.map((step) => (
        <button className="next-step" type="button" key={step}>
          <CheckCircle2 aria-hidden="true" />
          <span>{step}</span>
          <ChevronRight aria-hidden="true" />
        </button>
      ))}
    </section>
  );
}
