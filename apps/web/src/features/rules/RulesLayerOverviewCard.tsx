/**
 * §17 RulesLayerOverviewCard — rules-layer configuration snapshot.
 *
 * The Siting panel already surfaces *what* is currently violated
 * (Alerts), *how* the steward weights priorities (Weights), and the
 * *full menu* of rule definitions (Catalog). What was missing is a
 * single-glance answer to "what does the rules layer currently look
 * like for this project?" — i.e., per weight bucket: how many rules
 * fall under it, what the steward has dialed it to, and how that
 * dial maps to escalate / neutral / de-escalate behavior.
 *
 * This card is pure presentation. It reads RULE_CATALOG (static rule
 * inventory) plus the live weight map from useSitingWeightStore and
 * renders one row per weight category showing rule count, current
 * weight, and the resulting tone band. A header strip detects the
 * closest matching preset (sum-of-squared-differences against the
 * seven defined PRESETS) so the steward can see whether their
 * current configuration drifted from the chosen archetype.
 *
 * Closes manifest §17 `rules-layer-siting-logic` (P3) partial -> done.
 */

import { useMemo } from 'react';
import { useSitingWeightStore } from '../../store/sitingWeightStore.js';
import {
  RULE_CATALOG,
  type RuleWeightCategory,
} from './SitingRules.js';
import css from './RulesLayerOverviewCard.module.css';

/* ------------------------------------------------------------------ */
/*  Static config                                                      */
/* ------------------------------------------------------------------ */

const CATEGORIES: RuleWeightCategory[] = [
  'ecological',
  'hydrological',
  'structural',
  'agricultural',
  'experiential',
  'spiritual',
];

const CATEGORY_LABELS: Record<RuleWeightCategory, string> = {
  ecological: 'Ecological',
  hydrological: 'Hydrological',
  structural: 'Structural',
  agricultural: 'Agricultural',
  experiential: 'Experiential',
  spiritual: 'Spiritual',
};

const CATEGORY_HINT: Record<RuleWeightCategory, string> = {
  ecological: 'Habitat, ecosystem function, biodiversity',
  hydrological: 'Flood, drainage, water access, watershed',
  structural: 'Slope, setbacks, access, utilities, wind',
  agricultural: 'Frost, grazing, soil suitability for crops',
  experiential: 'Privacy, guest circulation, sensory buffers',
  spiritual: 'Qibla, sacred-zone buffers, acoustic shelter',
};

/* Mirror of presets in sitingWeightStore — kept here for label-match. */
const PRESET_DEFAULTS: Record<RuleWeightCategory, number> = {
  ecological: 50,
  hydrological: 50,
  structural: 50,
  agricultural: 50,
  experiential: 50,
  spiritual: 50,
};

const PRESETS: { key: string; label: string; weights: Record<RuleWeightCategory, number> }[] = [
  {
    key: 'conservation',
    label: 'Conservation',
    weights: { ...PRESET_DEFAULTS, ecological: 80, hydrological: 70, agricultural: 40, experiential: 30, structural: 40, spiritual: 40 },
  },
  {
    key: 'regenerative_farm',
    label: 'Regenerative farm',
    weights: { ...PRESET_DEFAULTS, agricultural: 80, ecological: 70, hydrological: 65, structural: 50, experiential: 30, spiritual: 40 },
  },
  {
    key: 'retreat_center',
    label: 'Retreat',
    weights: { ...PRESET_DEFAULTS, experiential: 80, spiritual: 75, structural: 60, ecological: 50, hydrological: 50, agricultural: 30 },
  },
  {
    key: 'moontrance',
    label: 'Moontrance',
    weights: { ...PRESET_DEFAULTS, spiritual: 85, experiential: 80, ecological: 60, hydrological: 55, structural: 55, agricultural: 30 },
  },
  {
    key: 'homestead',
    label: 'Homestead',
    weights: { ...PRESET_DEFAULTS, structural: 70, hydrological: 60, agricultural: 60, ecological: 50, experiential: 40, spiritual: 40 },
  },
  {
    key: 'educational_farm',
    label: 'Educational',
    weights: { ...PRESET_DEFAULTS, agricultural: 70, experiential: 65, ecological: 60, structural: 55, hydrological: 55, spiritual: 40 },
  },
  {
    key: 'multi_enterprise',
    label: 'Multi-enterprise',
    weights: { ...PRESET_DEFAULTS, structural: 65, agricultural: 60, hydrological: 60, ecological: 55, experiential: 50, spiritual: 40 },
  },
];

/* ------------------------------------------------------------------ */
/*  Tone bands                                                         */
/* ------------------------------------------------------------------ */

type Tone = 'high' | 'medium' | 'low' | 'neutral';

function toneFor(weight: number): Tone {
  if (weight >= 70) return 'high';
  if (weight <= 30) return 'low';
  if (weight === 50) return 'neutral';
  return 'medium';
}

const TONE_LABEL: Record<Tone, string> = {
  high: 'Escalate',
  medium: 'Default',
  neutral: 'Neutral',
  low: 'De-escalate',
};

const TONE_CLASS: Record<Tone, string> = {
  high: css.toneHigh!,
  medium: css.toneMedium!,
  neutral: css.toneNeutral!,
  low: css.toneLow!,
};

/* ------------------------------------------------------------------ */
/*  Severity counts                                                    */
/* ------------------------------------------------------------------ */

interface CategoryRow {
  category: RuleWeightCategory;
  ruleCount: number;
  errors: number;
  warnings: number;
  infos: number;
  weight: number;
  tone: Tone;
  delta: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RulesLayerOverviewCard() {
  const weights = useSitingWeightStore((s) => s.weights);

  const { rows, totalRules, dataSourceCount } = useMemo(() => {
    const counts = new Map<RuleWeightCategory, { rules: number; errors: number; warnings: number; infos: number }>();
    const dataSources = new Set<string>();
    for (const cat of CATEGORIES) {
      counts.set(cat, { rules: 0, errors: 0, warnings: 0, infos: 0 });
    }
    for (const entry of RULE_CATALOG) {
      const bucket = counts.get(entry.weightCategory);
      if (!bucket) continue;
      bucket.rules += 1;
      if (entry.defaultSeverity === 'error') bucket.errors += 1;
      else if (entry.defaultSeverity === 'warning') bucket.warnings += 1;
      else bucket.infos += 1;
      dataSources.add(entry.dataSource);
    }
    const rowList: CategoryRow[] = CATEGORIES.map((cat) => {
      const c = counts.get(cat) ?? { rules: 0, errors: 0, warnings: 0, infos: 0 };
      const w = weights[cat];
      return {
        category: cat,
        ruleCount: c.rules,
        errors: c.errors,
        warnings: c.warnings,
        infos: c.infos,
        weight: w,
        tone: toneFor(w),
        delta: w - 50,
      };
    });
    return {
      rows: rowList,
      totalRules: RULE_CATALOG.length,
      dataSourceCount: dataSources.size,
    };
  }, [weights]);

  const presetMatch = useMemo(() => {
    let best: { label: string; key: string; distance: number } | null = null;
    for (const p of PRESETS) {
      let dist = 0;
      for (const cat of CATEGORIES) {
        const diff = weights[cat] - p.weights[cat];
        dist += diff * diff;
      }
      if (best === null || dist < best.distance) {
        best = { label: p.label, key: p.key, distance: dist };
      }
    }
    if (!best) return null;
    // Per-category RMS: sqrt(distance / 6)
    const rms = Math.sqrt(best.distance / CATEGORIES.length);
    let fit: 'exact' | 'close' | 'drift' | 'custom';
    if (rms < 1) fit = 'exact';
    else if (rms <= 8) fit = 'close';
    else if (rms <= 18) fit = 'drift';
    else fit = 'custom';
    return { label: best.label, key: best.key, rms, fit };
  }, [weights]);

  const escalatedCount = rows.filter((r) => r.tone === 'high').length;
  const dampenedCount = rows.filter((r) => r.tone === 'low').length;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Rules layer overview
            <span className={css.badge}>HEURISTIC</span>
            <span className={css.tag}>§17</span>
          </h3>
          <p className={css.cardHint}>
            Snapshot of the siting rules layer as it is currently configured for
            this project. Each row shows how many rules sit under that weight
            bucket and how the steward&rsquo;s slider position translates into
            evaluation tone. Adjust in the <em>Weights</em> tab below.
          </p>
        </div>
        {presetMatch && (
          <div className={`${css.presetPill} ${css[`fit_${presetMatch.fit}`] ?? ''}`}>
            <span className={css.presetLabel}>
              {presetMatch.fit === 'custom' ? 'Custom mix' : `Closest preset`}
            </span>
            <span className={css.presetName}>
              {presetMatch.fit === 'custom' ? '\u2014' : presetMatch.label}
            </span>
            {presetMatch.fit !== 'custom' && (
              <span className={css.presetFit}>
                {presetMatch.fit === 'exact'
                  ? 'exact match'
                  : presetMatch.fit === 'close'
                    ? `${presetMatch.rms.toFixed(1)}-pt drift`
                    : `${presetMatch.rms.toFixed(1)}-pt drift`}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={css.statsRow}>
        <div className={css.stat}>
          <span className={css.statLabel}>Rules</span>
          <span className={css.statValue}>
            {totalRules}
            <span className={css.statDim}> active</span>
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Buckets</span>
          <span className={css.statValue}>
            {CATEGORIES.length}
            <span className={css.statDim}> weight categories</span>
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Data sources</span>
          <span className={css.statValue}>
            {dataSourceCount}
            <span className={css.statDim}> distinct</span>
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>Escalated</span>
          <span className={`${css.statValue} ${escalatedCount > 0 ? css.statHigh : ''}`}>
            {escalatedCount}
            <span className={css.statDim}>{escalatedCount === 1 ? ' bucket' : ' buckets'}</span>
          </span>
        </div>
        <div className={css.stat}>
          <span className={css.statLabel}>De-escalated</span>
          <span className={`${css.statValue} ${dampenedCount > 0 ? css.statLow : ''}`}>
            {dampenedCount}
            <span className={css.statDim}>{dampenedCount === 1 ? ' bucket' : ' buckets'}</span>
          </span>
        </div>
      </div>

      <ul className={css.rowList}>
        {rows.map((row) => (
          <li key={row.category} className={css.row}>
            <div className={css.rowHead}>
              <span className={css.rowName}>{CATEGORY_LABELS[row.category]}</span>
              <span className={css.rowCount}>
                {row.ruleCount}
                <span className={css.rowCountDim}>{row.ruleCount === 1 ? ' rule' : ' rules'}</span>
              </span>
              <span className={`${css.tonePill} ${TONE_CLASS[row.tone]}`}>
                {TONE_LABEL[row.tone]}
              </span>
            </div>
            <p className={css.rowHint}>{CATEGORY_HINT[row.category]}</p>
            <div className={css.rowMeter}>
              <div className={css.meterTrack}>
                <div
                  className={`${css.meterFill} ${TONE_CLASS[row.tone]}`}
                  style={{ width: `${row.weight}%` }}
                />
                <div className={css.meterMark} style={{ left: '50%' }} />
              </div>
              <span className={css.meterValue}>{row.weight}</span>
              <span className={css.meterDelta}>
                {row.delta === 0
                  ? '\u00B10'
                  : row.delta > 0
                    ? `+${row.delta}`
                    : `${row.delta}`}
              </span>
            </div>
            {row.ruleCount > 0 && (
              <div className={css.severityChips}>
                {row.errors > 0 && (
                  <span className={`${css.sevChip} ${css.sevChipError}`}>
                    {row.errors} blocking
                  </span>
                )}
                {row.warnings > 0 && (
                  <span className={`${css.sevChip} ${css.sevChipWarn}`}>
                    {row.warnings} warning{row.warnings === 1 ? '' : 's'}
                  </span>
                )}
                {row.infos > 0 && (
                  <span className={`${css.sevChip} ${css.sevChipInfo}`}>
                    {row.infos} advisory
                  </span>
                )}
              </div>
            )}
            {row.ruleCount === 0 && (
              <p className={css.rowEmpty}>No rules registered yet &mdash; reserved bucket.</p>
            )}
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        <em>How weights apply:</em> a rule&rsquo;s default severity is escalated
        one level when its weight bucket is &ge;70, and de-escalated one level
        when &le;30. The <em>Catalog</em> tab below lists each rule by name and
        data source; the <em>Weights</em> tab is where the sliders live.
      </p>
    </section>
  );
}
