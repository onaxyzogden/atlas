/**
 * WizardVisionFormFields — Phase 2 / Slice 2.2.
 *
 * Direct-form fields for Step 2 (Vision & Capacity). Five inputs:
 *
 *   - Land-use goals — multi chip, **max 3 enforced inline**  → primaryOutcomes
 *   - Budget        — single chip                              → budgetRange
 *   - Labour        — single chip (singleton array)            → resourceConstraints
 *   - Timeline      — single chip                              → timelineProgress
 *   - Vision        — optional textarea, 280 chars             → landIdentity[0]
 *
 * Every change goes through `commit(next)`, which writes through to
 * `project.metadata.visionProfile` via a 300 ms debounce. `onBlur` on
 * the textarea flushes immediately so a tab close mid-typing doesn't
 * lose the last keystrokes. The wizard's "Next" handler also forces a
 * sync flush before navigating.
 *
 * Goal/budget/timeline option ids are reused verbatim from Stage Zero's
 * `visionBuilderQuestions.ts` so the Tier 0 bridge in
 * `visionProfileToChecklist.ts` derives evidence with no extra mapping.
 * Labour chips are wizard-local — `resourceConstraints` is permissive
 * (`z.string().max(120)`) so any id works.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { VisionProfile } from '@ogden/shared';
import styles from './WizardVisionFormFields.module.css';

const VISION_STATEMENT_MAX = 280;
const PRIMARY_OUTCOMES_MAX = 3;
const DEBOUNCE_MS = 300;

interface ChipOption {
  id: string;
  label: string;
}

// Land-use goals — copied from VISION_QUESTIONS[primary-outcomes]. 16
// options is too many for a wizard surface; we narrow to the 8 that
// the Plan Tier 0 bridge can do something useful with. The bridge
// accepts any of the 16 ids unchanged so the catalog stays compatible.
const LAND_USE_GOAL_OPTIONS: readonly ChipOption[] = Object.freeze([
  { id: 'household_self_sufficiency', label: 'Household self-sufficiency' },
  { id: 'food_for_sale', label: 'Food production for sale' },
  { id: 'food_for_community', label: 'Food for family / community' },
  { id: 'ecological_restoration', label: 'Ecological restoration' },
  { id: 'soil_regeneration', label: 'Soil regeneration' },
  { id: 'wildlife_habitat', label: 'Wildlife habitat' },
  { id: 'education_workshops', label: 'Education / workshops' },
  { id: 'land_legacy', label: 'Long-term land legacy' },
]);

// Budget bands — verbatim from VISION_QUESTIONS[budget-range].
const BUDGET_OPTIONS: readonly ChipOption[] = Object.freeze([
  { id: 'under_10k', label: 'Under $10,000' },
  { id: '10k_50k', label: '$10,000 - $50,000' },
  { id: '50k_150k', label: '$50,000 - $150,000' },
  { id: '150k_500k', label: '$150,000 - $500,000' },
  { id: 'over_500k', label: '$500,000+' },
  { id: 'unknown', label: 'Not ready to answer' },
]);

// Labour bands — wizard-local. Singleton-array shape lets future Phase
// adds widen this to multi without a schema change.
const LABOUR_OPTIONS: readonly ChipOption[] = Object.freeze([
  { id: 'solo_full_time', label: 'Solo, full attention' },
  { id: 'solo_part_time', label: 'Solo, part attention' },
  { id: 'couple_family', label: 'Couple / family' },
  { id: 'small_team', label: 'Small team (2-5)' },
  { id: 'larger_team', label: 'Larger team (5+)' },
  { id: 'seasonal_help', label: 'Seasonal help only' },
]);

// Timeline — verbatim from VISION_QUESTIONS[timeline].
const TIMELINE_OPTIONS: readonly ChipOption[] = Object.freeze([
  { id: 'immediately', label: 'Immediately' },
  { id: '3_months', label: 'Within 3 months' },
  { id: '6_months', label: 'Within 6 months' },
  { id: '1_year', label: 'Within 1 year' },
  { id: '1_3_years', label: '1 - 3 years' },
  { id: '3_5_years', label: '3 - 5 years' },
  { id: '5_plus_years', label: '5+ years' },
]);

export interface WizardVisionFormFieldsProps {
  /** Current vision profile from `project.metadata.visionProfile`. */
  profile: VisionProfile;
  /**
   * Write-through callback. Called with the FULL merged VisionProfile
   * (never a delta) so the caller can spread it into metadata and
   * call updateProject in one step.
   */
  onChange: (next: VisionProfile) => void;
  /**
   * Optional ref that exposes a `flush()` for the wizard's Next button
   * to force any pending debounced write before navigation.
   */
  flushRef?: React.MutableRefObject<(() => void) | null>;
}

function arrayHas(arr: readonly string[] | undefined, id: string): boolean {
  return Array.isArray(arr) && arr.includes(id);
}

export default function WizardVisionFormFields({
  profile,
  onChange,
  flushRef,
}: WizardVisionFormFieldsProps) {
  // Local mirror of the textarea so typing is responsive; the chip
  // groups write straight through (chip taps are infrequent enough
  // that a debounce there would just delay feedback).
  const [statement, setStatement] = useState<string>(
    profile.landIdentity?.[0] ?? '',
  );
  const debounceRef = useRef<number | null>(null);
  const latestProfileRef = useRef<VisionProfile>(profile);
  latestProfileRef.current = profile;

  const flush = useCallback(() => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!flushRef) return;
    flushRef.current = flush;
    return () => {
      flushRef.current = null;
    };
  }, [flush, flushRef]);

  useEffect(() => {
    // Cancel pending timers on unmount so a Step 2 -> back nav can't
    // fire a stale write after the component is gone.
    return () => flush();
  }, [flush]);

  const commitNow = useCallback(
    (next: VisionProfile) => {
      flush();
      onChange(next);
    },
    [flush, onChange],
  );

  const commitDebounced = useCallback(
    (next: VisionProfile) => {
      flush();
      debounceRef.current = window.setTimeout(() => {
        onChange(next);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    },
    [flush, onChange],
  );

  const selectedGoals = useMemo(
    () => profile.primaryOutcomes ?? [],
    [profile.primaryOutcomes],
  );
  const goalsAtCap = selectedGoals.length >= PRIMARY_OUTCOMES_MAX;

  const toggleGoal = (id: string) => {
    const selected = arrayHas(selectedGoals, id);
    if (!selected && goalsAtCap) return; // 4th tap no-ops
    const next = selected
      ? selectedGoals.filter((g) => g !== id)
      : [...selectedGoals, id];
    commitNow({ ...latestProfileRef.current, primaryOutcomes: next });
  };

  const setBudget = (id: string) => {
    const current = profile.budgetRange;
    commitNow({
      ...latestProfileRef.current,
      budgetRange: current === id ? undefined : id,
    });
  };

  const setLabour = (id: string) => {
    const current = profile.resourceConstraints?.[0];
    commitNow({
      ...latestProfileRef.current,
      resourceConstraints: current === id ? [] : [id],
    });
  };

  const setTimeline = (id: string) => {
    const current = profile.timelineProgress;
    commitNow({
      ...latestProfileRef.current,
      timelineProgress: current === id ? undefined : id,
    });
  };

  const handleStatementChange = (raw: string) => {
    const clipped = raw.slice(0, VISION_STATEMENT_MAX);
    setStatement(clipped);
    const trimmed = clipped.trim();
    commitDebounced({
      ...latestProfileRef.current,
      landIdentity: trimmed ? [trimmed] : [],
    });
  };

  const handleStatementBlur = () => {
    const trimmed = statement.trim();
    commitNow({
      ...latestProfileRef.current,
      landIdentity: trimmed ? [trimmed] : [],
    });
  };

  return (
    <div className={styles.fields}>
      <fieldset className={styles.field}>
        <legend className={styles.label}>
          Land-use goals
          <span className={styles.hint}>
            {' '}
            ({selectedGoals.length}/{PRIMARY_OUTCOMES_MAX} - pick up to{' '}
            {PRIMARY_OUTCOMES_MAX})
          </span>
        </legend>
        <div className={styles.chipRow}>
          {LAND_USE_GOAL_OPTIONS.map((opt) => {
            const selected = arrayHas(selectedGoals, opt.id);
            const disabled = !selected && goalsAtCap;
            return (
              <button
                type="button"
                key={opt.id}
                className={styles.chip}
                data-selected={selected ? 'true' : 'false'}
                data-disabled={disabled ? 'true' : 'false'}
                onClick={() => toggleGoal(opt.id)}
                aria-pressed={selected}
                aria-disabled={disabled || undefined}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Development budget</legend>
        <div className={styles.chipRow}>
          {BUDGET_OPTIONS.map((opt) => {
            const selected = profile.budgetRange === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                className={styles.chip}
                data-selected={selected ? 'true' : 'false'}
                onClick={() => setBudget(opt.id)}
                aria-pressed={selected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Labour available</legend>
        <div className={styles.chipRow}>
          {LABOUR_OPTIONS.map((opt) => {
            const selected = profile.resourceConstraints?.[0] === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                className={styles.chip}
                data-selected={selected ? 'true' : 'false'}
                onClick={() => setLabour(opt.id)}
                aria-pressed={selected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className={styles.field}>
        <legend className={styles.label}>Timeline to meaningful progress</legend>
        <div className={styles.chipRow}>
          {TIMELINE_OPTIONS.map((opt) => {
            const selected = profile.timelineProgress === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                className={styles.chip}
                data-selected={selected ? 'true' : 'false'}
                onClick={() => setTimeline(opt.id)}
                aria-pressed={selected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>
          Vision statement{' '}
          <span className={styles.hint}>(optional)</span>
        </span>
        <textarea
          className={styles.textarea}
          value={statement}
          onChange={(e) => handleStatementChange(e.target.value)}
          onBlur={handleStatementBlur}
          placeholder="In one or two sentences, what does this land become at its best?"
          maxLength={VISION_STATEMENT_MAX}
          rows={4}
        />
        <span className={styles.counter}>
          {statement.length}/{VISION_STATEMENT_MAX}
        </span>
      </label>
    </div>
  );
}
