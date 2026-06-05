/**
 * VisionQuestionCard — the active question: heading, the selectable option
 * grid, and (for multi questions) the "multiple selections" affordance.
 *
 * Rendering is agnostic to single vs multi; the page wires `onToggle` to
 * either setSingle or toggleMulti. Grouped questions (systems-in-scope) are
 * flat here — each systems question is its own VisionQuestion in the config.
 */

import { Check } from 'lucide-react';
import type { VisionQuestion } from '../data/visionBuilderQuestions.js';
import styles from './VisionQuestionCard.module.css';

interface Props {
  question: VisionQuestion;
  selected: string[];
  onToggle: (optionId: string) => void;
  /** Multi questions only: select-all / clear-all toggle. */
  onSelectAll?: () => void;
  /** Multi questions only: whether every option is currently selected. */
  allSelected?: boolean;
}

export function VisionQuestionCard({
  question,
  selected,
  onToggle,
  onSelectAll,
  allSelected = false,
}: Props) {
  const isMulti = question.kind === 'multi';
  const selectedSet = new Set(selected);

  // Caps were removed from Stage Zero multi questions, so the hint is uniform.
  const multiHint = question.maxSelections
    ? `Choose up to ${question.maxSelections}`
    : 'Choose all that apply';

  return (
    <div className={styles.root}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{question.eyebrow}</p>
        <h1 className={styles.title}>{question.title}</h1>
        {question.subtitle && (
          <p className={styles.subtitle}>{question.subtitle}</p>
        )}
      </div>

      {isMulti && (
        <div className={styles.multiRow} role="note">
          <span className={styles.switch} data-on aria-hidden="true">
            <span className={styles.switchThumb} />
          </span>
          <span className={styles.multiLabel}>
            Multiple selections allowed
          </span>
          <span className={styles.multiHint}>· {multiHint}</span>
          {onSelectAll && (
            <button
              type="button"
              className={styles.selectAll}
              onClick={onSelectAll}
            >
              {allSelected ? 'Clear all' : 'Select all'}
            </button>
          )}
        </div>
      )}

      <div
        className={styles.grid}
        role={isMulti ? 'group' : 'radiogroup'}
        aria-label={question.title}
      >
        {question.options.map((opt) => {
          const isSelected = selectedSet.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              role={isMulti ? 'checkbox' : 'radio'}
              aria-checked={isSelected}
              className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
              onClick={() => onToggle(opt.id)}
            >
              <span className={styles.optionBody}>
                <span className={styles.optionLabel}>{opt.label}</span>
                {opt.description && (
                  <span className={styles.optionDesc}>{opt.description}</span>
                )}
              </span>
              <span className={styles.check} aria-hidden="true">
                {isSelected && <Check size={14} strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
