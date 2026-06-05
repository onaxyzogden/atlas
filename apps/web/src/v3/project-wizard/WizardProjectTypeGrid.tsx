/**
 * WizardProjectTypeGrid — Sub-slice E.1.
 *
 * The required primary-type selector for Wizard Step 2 (Section A). Renders the
 * 12 can-be-primary types from the shared PROJECT_TYPES taxonomy as a
 * single-select radio grid. Each card carries the type's operator-authored
 * description as an inline decision hint (Decision Tree v1.0 guidance), so the
 * steward can tell the types apart without leaving the wizard.
 *
 * Controlled component: the selected id and the change handler are owned by
 * WizardStep2Vision, which writes the choice straight to
 * metadata.projectTypeRecord. No store access here.
 */

import type { ProjectTypeId } from '@ogden/shared';
import { PRIMARY_TYPES } from '@ogden/shared';
import styles from './WizardProjectTypeGrid.module.css';

export interface WizardProjectTypeGridProps {
  /** Currently selected primary type id, or null if none chosen yet. */
  selectedId: ProjectTypeId | null;
  /** Called with the chosen primary type id. */
  onSelect: (id: ProjectTypeId) => void;
}

export default function WizardProjectTypeGrid({
  selectedId,
  onSelect,
}: WizardProjectTypeGridProps) {
  return (
    <div
      className={styles.grid}
      role="radiogroup"
      aria-label="Primary project type (required)"
    >
      {PRIMARY_TYPES.map((type) => {
        const selected = type.id === selectedId;
        return (
          <button
            type="button"
            key={type.id}
            className={styles.card}
            role="radio"
            aria-checked={selected}
            data-selected={selected ? 'true' : 'false'}
            onClick={() => onSelect(type.id)}
          >
            <span className={styles.cardLabel}>{type.label}</span>
            <span className={styles.cardDesc}>{type.description}</span>
          </button>
        );
      })}
    </div>
  );
}
