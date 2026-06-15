// PrefillRecap.tsx
//
// Non-destructive pre-fill recap shown ABOVE a vision-form's fields/textarea in
// VisionFormsTabsModal. It surfaces candidate values resolved by
// resolveFormPrefill -- grouped "Based on your steward profile" / "Based on
// earlier objectives" -- each with an inert "Use this" button that merges a
// single field into the LOCAL draft (never saves, never marks complete, never
// fabricates). A suggestion is shown ONLY while its draft slot is still empty
// (the clobber guard), so a value the steward has typed or already saved
// suppresses its own suggestion and is never overwritten.

import type { FormValue } from './actToolCatalog.js';
import type {
  FormPrefillResult,
  PrefillSuggestion,
} from '../../strata/resolveFormPrefill.js';
import styles from './PrefillRecap.module.css';

interface PrefillRecapProps {
  /** Suggestions for the active form (undefined => nothing to offer). */
  result: FormPrefillResult | undefined;
  /** Current structured draft -- clobber guard for keyed suggestions. */
  draft: FormValue;
  /** Current textarea draft -- clobber guard for null-key suggestions. */
  textDraft: string;
  /** Apply one suggestion to the local draft (the modal routes by fieldKey). */
  onUse: (suggestion: PrefillSuggestion) => void;
}

/** A suggestion is offered only while its target draft slot is empty. */
function slotIsEmpty(
  draft: FormValue,
  textDraft: string,
  s: PrefillSuggestion,
): boolean {
  if (s.fieldKey === null) return textDraft.trim() === '';
  const slot = draft[s.fieldKey];
  if (Array.isArray(s.value)) {
    if (!Array.isArray(slot)) return true;
    return !slot.some((e) => typeof e === 'string' && e.trim() !== '');
  }
  if (typeof slot === 'string') return slot.trim() === '';
  return slot === undefined;
}

function preview(value: string | string[]): string {
  const text = Array.isArray(value) ? value.join(', ') : value;
  return text.length > 90 ? `${text.slice(0, 89)}…` : text;
}

function SuggestionRows({
  items,
  onUse,
}: {
  items: PrefillSuggestion[];
  onUse: (s: PrefillSuggestion) => void;
}) {
  return (
    <>
      {items.map((s, i) => (
        <div
          key={`${s.origin}:${s.fieldKey ?? '__text__'}:${i}`}
          className={styles.row}
          data-field-key={s.fieldKey ?? '__text__'}
        >
          <span className={styles.rowText}>
            <span className={styles.fieldLabel}>{s.fieldLabel}</span>
            <span className={styles.value}>{preview(s.value)}</span>
          </span>
          <button
            type="button"
            className={styles.useBtn}
            onClick={() => onUse(s)}
          >
            Use this
          </button>
        </div>
      ))}
    </>
  );
}

export default function PrefillRecap({
  result,
  draft,
  textDraft,
  onUse,
}: PrefillRecapProps) {
  if (!result) return null;
  const steward = result.fromSteward.filter((s) =>
    slotIsEmpty(draft, textDraft, s),
  );
  const prior = result.fromPriorObjectives.filter((s) =>
    slotIsEmpty(draft, textDraft, s),
  );
  if (steward.length === 0 && prior.length === 0) return null;

  return (
    <section className={styles.recap} aria-label="Pre-fill suggestions">
      <span className={styles.caption}>
        Suggested from what you have already recorded — nothing is saved
        until you press Save.
      </span>
      {steward.length > 0 ? (
        <div className={styles.group}>
          <span className={styles.groupHeading}>
            Based on your steward profile
          </span>
          <SuggestionRows items={steward} onUse={onUse} />
        </div>
      ) : null}
      {prior.length > 0 ? (
        <div className={styles.group}>
          <span className={styles.groupHeading}>Based on earlier objectives</span>
          <SuggestionRows items={prior} onUse={onUse} />
        </div>
      ) : null}
    </section>
  );
}
