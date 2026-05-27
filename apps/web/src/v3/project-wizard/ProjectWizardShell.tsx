/**
 * ProjectWizardShell — Phase 2 / Slice 2.1.d.
 *
 * Outer chrome for the 3-step Project Creation Wizard. Renders the
 * step indicator (1 Site / 2 Vision & Capacity / 3 Team) and the
 * shared footer (Back / Skip / Next + status hint). Step bodies are
 * passed in via `children` so each step owns its own form layout.
 *
 * Lives INSIDE AppShell — the spec's "Spatial first" principle wants
 * the global header visible, so this is page content, not a full-
 * screen takeover.
 */

import { type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ProjectWizardShell.module.css';

export type WizardStepId = 'site' | 'vision' | 'team';

interface WizardStepMeta {
  id: WizardStepId;
  label: string;
  /** Index in display order (0-based). */
  index: number;
}

export const WIZARD_STEPS: readonly WizardStepMeta[] = Object.freeze([
  { id: 'site', label: 'Site', index: 0 },
  { id: 'vision', label: 'Vision & Capacity', index: 1 },
  { id: 'team', label: 'Team', index: 2 },
]);

interface ProjectWizardShellProps {
  step: WizardStepId;
  /** Back handler — undefined hides the Back button. */
  onBack?: () => void;
  /** Next handler — disabled state communicates "fill required fields". */
  onNext?: () => void;
  /** Skip handler — undefined hides the Skip link. Spec allows skip on 2+3. */
  onSkip?: () => void;
  /** Disable Next when required Step 1 fields (name + boundary) are missing. */
  nextDisabled?: boolean;
  /** Label override for Next ("Finish" on the last step). */
  nextLabel?: string;
  /** Subtle hint shown above the footer (e.g. "Boundary required"). */
  hint?: string;
  children: ReactNode;
}

export default function ProjectWizardShell({
  step,
  onBack,
  onNext,
  onSkip,
  nextDisabled = false,
  nextLabel = 'Next',
  hint,
  children,
}: ProjectWizardShellProps) {
  const active = WIZARD_STEPS.findIndex((s) => s.id === step);
  return (
    <section className={styles.shell} aria-label="Project setup wizard">
      <header className={styles.indicator}>
        <ol className={styles.steps}>
          {WIZARD_STEPS.map((meta, i) => {
            const state =
              i < active ? 'complete' : i === active ? 'current' : 'pending';
            return (
              <li
                key={meta.id}
                className={styles.step}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className={styles.stepNum}>{i + 1}</span>
                <span className={styles.stepLabel}>{meta.label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className={styles.body}>{children}</div>

      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          {onBack && (
            <button
              type="button"
              className={styles.backBtn}
              onClick={onBack}
            >
              <ChevronLeft size={16} aria-hidden />
              Back
            </button>
          )}
        </div>
        <div className={styles.footerHint}>{hint}</div>
        <div className={styles.footerRight}>
          {onSkip && (
            <button
              type="button"
              className={styles.skipBtn}
              onClick={onSkip}
            >
              Skip for now
            </button>
          )}
          {onNext && (
            <button
              type="button"
              className={styles.nextBtn}
              onClick={onNext}
              disabled={nextDisabled}
            >
              {nextLabel}
              <ChevronRight size={16} aria-hidden />
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
