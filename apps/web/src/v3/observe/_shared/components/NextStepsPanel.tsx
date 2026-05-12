import { CheckCircle2, ChevronRight } from 'lucide-react';
import styles from './NextStepsPanel.module.css';

interface NextStepsPanelProps {
  steps: string[];
}

export function NextStepsPanel({ steps }: NextStepsPanelProps) {
  return (
    <section className={styles.panel}>
      <h3>Next Steps</h3>
      {steps.map((step) => (
        <button className={styles.step} type="button" key={step}>
          <CheckCircle2 aria-hidden="true" />
          <span>{step}</span>
          <ChevronRight aria-hidden="true" />
        </button>
      ))}
    </section>
  );
}
