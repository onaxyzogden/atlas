/**
 * RingRadiiFields — the "Both" sizing control for seeded Mollison rings:
 * a quick overall-scale slider PLUS an expandable per-ring panel (home
 * centre + Z1–Z5 set independently). Pure / controlled: it renders the
 * given `value` and reports edits via `onChange`; persistence + the
 * monotonic clamp happen at the call site on commit (so mid-typing never
 * fights the steward).
 *
 * Used by the before-placement seed-tool popover. The after-placement
 * "Resize rings" editor renders the equivalent fields through the
 * inline-form schema instead (its host can't embed React children), but
 * both share the same scale → radii math in `zoneRingConfigStore`.
 */

import { Fragment, useState } from 'react';
import {
  scaleRadii,
  type ZoneRingRadii,
} from '../../../store/zoneRingConfigStore.js';
import css from '../../observe/components/draw/ObserveDrawHost.module.css';

const ROWS: { key: keyof ZoneRingRadii; label: string }[] = [
  { key: 'homeM', label: 'Home' },
  { key: 'z1M', label: 'Z1' },
  { key: 'z2M', label: 'Z2' },
  { key: 'z3M', label: 'Z3' },
  { key: 'z4M', label: 'Z4' },
  { key: 'z5M', label: 'Z5' },
];

interface Props {
  value: ZoneRingRadii;
  onChange: (next: ZoneRingRadii) => void;
}

export default function RingRadiiFields({ value, onChange }: Props) {
  const [scale, setScale] = useState(1);
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={css.row}>
        <span className={css.fieldLabel}>Scale</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={scale}
          aria-label="Overall ring scale"
          style={{ flex: 1 }}
          onChange={(e) => {
            const s = Number(e.target.value);
            setScale(s);
            // Scale multiplies the canonical ladder into all six radii.
            onChange(scaleRadii(s));
          }}
        />
        <span className={css.readoutValue}>{scale.toFixed(1)}×</span>
      </div>

      <button
        type="button"
        className={css.secondaryBtn}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Hide per-ring sizes' : 'Per-ring sizes'}
      </button>

      {open && (
        <div className={css.radiiGrid}>
          {ROWS.map((r) => (
            <Fragment key={String(r.key)}>
              <span className={css.radiiLabel}>{r.label}</span>
              <div className={css.row}>
                <input
                  className={css.input}
                  type="number"
                  min={1}
                  step={1}
                  value={Math.round(value[r.key])}
                  aria-label={`${r.label} radius (metres)`}
                  onChange={(e) =>
                    // No live clamp — let the steward type freely; the
                    // monotonic clamp runs once on commit.
                    onChange({ ...value, [r.key]: Number(e.target.value) })
                  }
                />
                <span className={css.fieldLabel}>m</span>
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </>
  );
}
