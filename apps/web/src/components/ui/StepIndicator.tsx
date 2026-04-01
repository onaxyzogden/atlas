import React from 'react';
import styles from './StepIndicator.module.css';

/* -------------------------------------------------------------------------- */
/*  StepIndicator — OGDEN Atlas Design System                                */
/* -------------------------------------------------------------------------- */

export interface Step {
  id: string;
  label: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: string;
  completedSteps?: string[];
  orientation?: 'horizontal' | 'vertical';
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps = [],
  orientation = 'horizontal',
  onStepClick,
  className,
}: StepIndicatorProps) {
  const rootClasses = [
    styles.root,
    orientation === 'vertical' ? styles.vertical : styles.horizontal,
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav aria-label="Progress" className={rootClasses}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isClickable = isCompleted && !!onStepClick;

          const stepClasses = [
            styles.step,
            isCompleted ? styles.completed : '',
            isCurrent ? styles.current : '',
            !isCompleted && !isCurrent ? styles.upcoming : '',
            isClickable ? styles.clickable : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li key={step.id} className={stepClasses}>
              {/* Connector line (before every step except the first) */}
              {index > 0 && (
                <span
                  className={[
                    styles.connector,
                    completedSteps.includes(step.id) ||
                    step.id === currentStep
                      ? styles.connectorCompleted
                      : styles.connectorUpcoming,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden="true"
                />
              )}

              {/* Circle */}
              <button
                type="button"
                className={styles.circle}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={!isClickable}
                tabIndex={isClickable ? 0 : -1}
                onClick={isClickable ? () => onStepClick(step.id) : undefined}
                aria-label={`${step.label}${isCompleted ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
              >
                {isCompleted ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.5 8.5L6.5 11.5L12.5 4.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span aria-hidden="true">{index + 1}</span>
                )}
              </button>

              {/* Label */}
              <span className={styles.label}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

StepIndicator.displayName = 'StepIndicator';
