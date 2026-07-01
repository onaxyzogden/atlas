/**
 * CapacityBandCapture -- two-slider UX for s1-vision-c3:
 * "Set stewardship time + budget capacity bands."
 *
 * Each slider starts at a sensible default display position but writes nothing
 * to the FormValue until the user drags it. Valid = both sliders touched.
 * The filled portion of the track changes color and shows a band label.
 */

import { useState } from 'react';
import type { FormValue } from './actToolCatalog.js';
import css from './CapacityBandCapture.module.css';

// --------------------------------------------------------------------------
// Band definitions
// --------------------------------------------------------------------------

interface TimeBand {
  max: number;
  sig: string;
  color: 'unset' | 'low' | 'medium' | 'good' | 'great';
}

const TIME_BANDS: readonly TimeBand[] = [
  { max: 8, sig: 'Very light — 1 small task per week', color: 'low' },
  { max: 15, sig: 'Light — foundational tasks only', color: 'medium' },
  { max: 25, sig: 'Medium — 1-2 major tasks per week', color: 'medium' },
  { max: 40, sig: 'Good — solid delivery pace', color: 'good' },
  { max: 60, sig: 'Strong — full implementation possible', color: 'great' },
  { max: 999, sig: 'Full-time operation', color: 'great' },
];

const MAX_HOURS = 80;
const DEFAULT_HOURS = 20;

interface BudgetBand {
  label: string;
  sublabel: string;
}

const BUDGET_BANDS: readonly BudgetBand[] = [
  { label: '< $10k / year', sublabel: 'Volunteer or minimal budget' },
  { label: '$10k–$30k / year', sublabel: 'Cottage scale' },
  { label: '$30k–$80k / year', sublabel: 'Small operation' },
  { label: '$80k–$200k / year', sublabel: 'Established operation' },
  { label: '$200k–$500k / year', sublabel: 'Significant enterprise' },
  { label: '$500k+ / year', sublabel: 'Large-scale operation' },
];

// --------------------------------------------------------------------------
// Encode / decode / valid / summarise (exported for DecisionWorkingPanel)
// --------------------------------------------------------------------------

export interface CapacityBandModel {
  timeHours: number | null;
  budgetIdx: number | null;
}

export function decodeCapacityBand(fv: FormValue): CapacityBandModel {
  const h = parseInt(String(fv.timeHours ?? ''), 10);
  const b = parseInt(String(fv.budgetIdx ?? ''), 10);
  return {
    timeHours: !isNaN(h) && h > 0 ? h : null,
    budgetIdx: !isNaN(b) && b >= 0 && b < BUDGET_BANDS.length ? b : null,
  };
}

export function isCapacityBandValid(m: CapacityBandModel): boolean {
  return m.timeHours !== null && m.budgetIdx !== null;
}

export function summariseCapacityBand(m: CapacityBandModel): string {
  const parts: string[] = [];
  if (m.timeHours !== null) parts.push(`~${m.timeHours} hrs/week`);
  if (m.budgetIdx !== null) parts.push(BUDGET_BANDS[m.budgetIdx]?.label ?? '');
  return parts.join(' · ');
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function getTimeBand(h: number): TimeBand {
  return TIME_BANDS.find((b) => h <= b.max) ?? TIME_BANDS[TIME_BANDS.length - 1]!;
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

export interface CapacityBandCaptureProps {
  value: FormValue;
  onChange: (v: FormValue) => void;
  readOnly?: boolean;
}

export function CapacityBandCapture({
  value,
  onChange,
  readOnly = false,
}: CapacityBandCaptureProps) {
  // Seed display values from persisted FormValue; fall back to sensible defaults.
  const initH = parseInt(String(value.timeHours ?? ''), 10);
  const initB = parseInt(String(value.budgetIdx ?? ''), 10);

  const [displayHours, setDisplayHours] = useState(
    !isNaN(initH) && initH > 0 ? initH : DEFAULT_HOURS,
  );
  const [displayBudget, setDisplayBudget] = useState(
    !isNaN(initB) && initB >= 0 ? initB : 0,
  );

  // "set" = the user has explicitly dragged the slider (value written to FormValue).
  const timeSet = Boolean(value.timeHours);
  const budgetSet = value.budgetIdx !== undefined && value.budgetIdx !== '';

  const timePct = ((displayHours - 1) / (MAX_HOURS - 1)) * 100;
  const budgetPct = (displayBudget / (BUDGET_BANDS.length - 1)) * 100;

  const timeBand = getTimeBand(displayHours);
  const budgetBand = BUDGET_BANDS[displayBudget]!;

  // Fill color: plan blue when set, muted border-color when idle.
  const fillSet = 'var(--color-stage-plan, #5278a0)';
  const fillUnset = 'var(--color-border, rgba(84,92,100,0.35))';

  return (
    <div className={css.root}>
      {/* ── Time slider ──────────────────────────────────────────────── */}
      <div className={css.section}>
        <div className={css.labelRow}>
          <span className={css.sectionLabel}>Stewardship time</span>
          {timeSet ? (
            <span className={css.currentValue}>{displayHours} hrs/week</span>
          ) : (
            <span className={css.hint}>Drag to set</span>
          )}
        </div>
        <input
          type="range"
          className={css.slider}
          min={1}
          max={MAX_HOURS}
          step={1}
          value={displayHours}
          disabled={readOnly}
          aria-label="Stewardship time in hours per week"
          aria-valuetext={`${displayHours} hours per week — ${timeBand.sig}`}
          style={
            {
              '--pct': `${timePct}%`,
              '--fill': timeSet ? fillSet : fillUnset,
            } as React.CSSProperties
          }
          onChange={(e) => {
            const h = parseInt(e.target.value, 10);
            setDisplayHours(h);
            onChange({ ...value, timeHours: String(h) });
          }}
        />
        <div
          className={css.bandChip}
          data-color={timeSet ? timeBand.color : 'unset'}
        >
          {timeSet
            ? timeBand.sig
            : 'Move the slider to set your time capacity'}
        </div>
      </div>

      {/* ── Budget slider ────────────────────────────────────────────── */}
      <div className={css.section}>
        <div className={css.labelRow}>
          <span className={css.sectionLabel}>Annual operating budget</span>
          {budgetSet ? (
            <span className={css.currentValue}>{budgetBand.label}</span>
          ) : (
            <span className={css.hint}>Drag to set</span>
          )}
        </div>
        <input
          type="range"
          className={css.slider}
          min={0}
          max={BUDGET_BANDS.length - 1}
          step={1}
          value={displayBudget}
          disabled={readOnly}
          aria-label="Annual operating budget band"
          aria-valuetext={`${budgetBand.label} — ${budgetBand.sublabel}`}
          style={
            {
              '--pct': `${budgetPct}%`,
              '--fill': budgetSet ? fillSet : fillUnset,
            } as React.CSSProperties
          }
          onChange={(e) => {
            const b = parseInt(e.target.value, 10);
            setDisplayBudget(b);
            onChange({ ...value, budgetIdx: String(b) });
          }}
        />
        <div className={css.sublabel} data-set={String(budgetSet)}>
          {budgetSet
            ? budgetBand.sublabel
            : 'Move the slider to set your annual budget band'}
        </div>
      </div>
    </div>
  );
}

export default CapacityBandCapture;
