// AnswerValue.tsx
//
// Presentational, read-only renderer for a checklist item's resolved answer,
// shared by both surfaces that show a prefilled answerSpec value: the Act
// tier-shell Checklist recap (AnswerRecap, beige sidebar) and the Vision forms
// modal tab (dark BentoBox). It renders the value in its original control style
// -- single_select as a selected chip, multi_select as a chip row, band as
// pills, steward as a list, text as prose -- via labelForOption. Single source
// of truth so both surfaces never drift.

import type { AnswerOptionSetId } from '@ogden/shared';
import type { ResolvedAnswer } from '../../strata/resolveAnswerSpec.js';
import { labelForOption } from '../../strata/answerOptionLabels.js';
import styles from './AnswerValue.module.css';

interface Props {
  resolved: ResolvedAnswer;
  optionSetId: AnswerOptionSetId | undefined;
}

export default function AnswerValue({ resolved, optionSetId }: Props) {
  const { fieldType, values } = resolved;

  if (fieldType === 'single_select') {
    return (
      <span className={`${styles.chip} ${styles.chipSelected}`}>
        {labelForOption(optionSetId, values[0] ?? '')}
      </span>
    );
  }

  if (fieldType === 'multi_select') {
    return (
      <span className={styles.chipRow}>
        {values.map((v) => (
          <span key={v} className={styles.chip}>
            {labelForOption(optionSetId, v)}
          </span>
        ))}
      </span>
    );
  }

  if (fieldType === 'band') {
    return (
      <span className={styles.bandRow}>
        {values.map((v, i) => (
          <span key={`${v}-${i}`} className={styles.bandPill}>
            {labelForOption(optionSetId, v)}
          </span>
        ))}
      </span>
    );
  }

  if (fieldType === 'steward') {
    return (
      <span className={styles.stewardList}>
        {values.map((v) => (
          <span key={v} className={styles.stewardLine}>
            {v}
          </span>
        ))}
      </span>
    );
  }

  // text -- show the captured prose verbatim.
  return <span className={styles.text}>{values.join(' · ')}</span>;
}
