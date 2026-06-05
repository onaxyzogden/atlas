/**
 * WizardSecondaryPicker — Sub-slice E.1.
 *
 * Optional multi-select of compatible secondary layers for the chosen primary
 * (Wizard Step 2, Section A). Reads the shared relationship matrix: only
 * can-be-secondary types whose (secondary, primary) cell is not 'NA' are
 * offered; incompatible pairings are hidden entirely (never shown disabled).
 * Each chip carries a short relation hint derived from the matrix cell
 * (adds objectives / adds + adapts / has a design tension).
 *
 * Controlled by WizardStep2Vision; selections are written to
 * metadata.projectTypeRecord.secondaryTypeIds.
 */

import type { ProjectTypeId, RelationCell } from '@ogden/shared';
import {
  SECONDARY_TYPES,
  getPairRelation,
  isCompatibleSecondary,
} from '@ogden/shared';
import styles from './WizardSecondaryPicker.module.css';

export interface WizardSecondaryPickerProps {
  /** The chosen primary type the secondaries are layered onto. */
  primaryId: ProjectTypeId;
  /** Currently selected secondary type ids. */
  selectedIds: readonly ProjectTypeId[];
  /** Toggle a secondary type id on or off. */
  onToggle: (id: ProjectTypeId) => void;
  /**
   * Secondary type ids to omit from the offered chips entirely. Used by the
   * mid-project add-secondary flow to hide layers the project already carries
   * (those are not re-addable). Defaults to none - the wizard offers every
   * compatible secondary.
   */
  excludeIds?: readonly ProjectTypeId[];
}

// Display-only hint per non-NA matrix cell. 'X' (tension) is surfaced in full
// by the separate WizardTensionPanel; here it is just a one-line flag.
const RELATION_HINT: Record<Exclude<RelationCell, 'NA'>, string> = {
  A: 'Adds objectives',
  M: 'Adds + adapts objectives',
  X: 'Has a design tension',
};

export default function WizardSecondaryPicker({
  primaryId,
  selectedIds,
  onToggle,
  excludeIds,
}: WizardSecondaryPickerProps) {
  const excluded = new Set(excludeIds ?? []);
  const compatible = SECONDARY_TYPES.filter(
    (t) => isCompatibleSecondary(t.id, primaryId) && !excluded.has(t.id),
  );

  if (compatible.length === 0) {
    return (
      <p className={styles.none}>
        No optional secondary layers are available for this project type.
      </p>
    );
  }

  return (
    <div
      className={styles.group}
      role="group"
      aria-label="Optional secondary layers"
    >
      {compatible.map((type) => {
        const selected = selectedIds.includes(type.id);
        // Safe cast: compatible types are filtered to cell !== 'NA' above.
        const relation = getPairRelation(type.id, primaryId) as Exclude<
          RelationCell,
          'NA'
        >;
        return (
          <button
            type="button"
            key={type.id}
            className={styles.card}
            data-selected={selected ? 'true' : 'false'}
            aria-pressed={selected}
            onClick={() => onToggle(type.id)}
          >
            <span className={styles.cardLabel}>{type.label}</span>
            <span className={styles.cardDesc}>{type.description}</span>
            <span className={styles.cardHint}>{RELATION_HINT[relation]}</span>
          </button>
        );
      })}
    </div>
  );
}
