/**
 * \u00A722 MissionImpactRollupCard \u2014 multi-axis presentation of the
 * already-computed `MissionScore` (financial / ecological / spiritual /
 * community). Same scores as the small numeric tiles inside
 * EconomicsPanel; this card is the *cross-cutting visualisation* that
 * lives on EcologicalDashboard so a steward can see the four impact
 * axes at a glance without opening the financial-model panel.
 *
 * Pure presentation. No new math, no new shared-package exports. The
 * `MissionScore` itself is computed by `computeMissionScore` in the
 * financial engine (already wired through `useFinancialModel`).
 *
 * Maps to manifest \u00A722 `mission-weighted-donor-grant-income` (P3, planned)
 * \u2014 the mission-weighted half of the spec ("mission-weighted and
 * donor/grant income modeling"). Donor/grant income remains a future
 * follow-on.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import css from './MissionImpactRollupCard.module.css';

/* \u2500\u2500 Per-axis rationale builders (read-only; mirror the inputs the
   financial engine uses, so the wording stays in lock-step). \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

const ECOLOGICAL_ZONES = new Set(['conservation', 'water_retention', 'buffer']);
const SPIRITUAL_ZONES = new Set(['spiritual']);
const COMMUNITY_ZONES = new Set(['education', 'commons', 'retreat']);
const SPIRITUAL_STRUCTURES = new Set(['prayer_space', 'bathhouse']);
const COMMUNITY_STRUCTURES = new Set(['classroom', 'pavilion', 'fire_circle']);

interface AxisDescriptor {
  key: 'financial' | 'ecological' | 'spiritual' | 'community';
  label: string;
  glyph: string;
}

const AXES: AxisDescriptor[] = [
  { key: 'financial',  label: 'Financial',  glyph: '\u00A4' },
  { key: 'ecological', label: 'Ecological', glyph: '\u2698' },
  { key: 'spiritual',  label: 'Spiritual',  glyph: '\u2641' },
  { key: 'community',  label: 'Community',  glyph: '\u2625' },
];

interface AxisDetail {
  rationale: string;
  liftHint: string;
}

function describeFinancial(breakEvenYear: number | null): AxisDetail {
  if (breakEvenYear === null) {
    return {
      rationale: 'No clear break-even within ten years.',
      liftHint: 'Add a market garden, orchard, or rental enterprise to anchor revenue.',
    };
  }
  if (breakEvenYear <= 4) {
    return {
      rationale: `Break-even projected by year ${breakEvenYear}.`,
      liftHint: 'Healthy. Protect by phasing capital and avoiding overbuilds.',
    };
  }
  if (breakEvenYear <= 7) {
    return {
      rationale: `Break-even projected by year ${breakEvenYear}.`,
      liftHint: 'Trim capital intensity or add a faster-ramping enterprise to shorten payback.',
    };
  }
  return {
    rationale: `Break-even projected at year ${breakEvenYear} \u2014 long horizon.`,
    liftHint: 'Add revenue-generating enterprises or scale back fixed-cost infrastructure.',
  };
}

function describeEcological(
  zones: { category: string; areaM2: number }[],
): AxisDetail {
  const total = zones.reduce((s, z) => s + z.areaM2, 0);
  if (total === 0) {
    return {
      rationale: 'No zones defined yet.',
      liftHint: 'Designate conservation, water-retention, or buffer zones.',
    };
  }
  const eco = zones.filter((z) => ECOLOGICAL_ZONES.has(z.category))
    .reduce((s, z) => s + z.areaM2, 0);
  const pct = (eco / total) * 100;
  return {
    rationale: `${pct.toFixed(0)}% of zoned area in conservation, water-retention, or buffer.`,
    liftHint: pct >= 25
      ? 'Solid ecological reserve. Continue layering pollinator and corridor plantings.'
      : 'Lift by adding a conservation, water-retention, or buffer zone.',
  };
}

function describeSpiritual(
  zones: { category: string }[],
  structures: { type: string }[],
): AxisDetail {
  const hasZone = zones.some((z) => SPIRITUAL_ZONES.has(z.category));
  const count = structures.filter((s) => SPIRITUAL_STRUCTURES.has(s.type)).length;
  if (!hasZone && count === 0) {
    return {
      rationale: 'No prayer space or spiritual zone yet.',
      liftHint: 'Add a prayer space or designate a quiet spiritual zone.',
    };
  }
  const parts: string[] = [];
  if (hasZone) parts.push('spiritual zone designated');
  if (count > 0) parts.push(`${count} spiritual structure${count === 1 ? '' : 's'} placed`);
  return {
    rationale: parts.join(' \u00B7 ') + '.',
    liftHint: count >= 2
      ? 'Strong spiritual presence. Consider qibla orientation and sight-lines.'
      : 'Add a second spiritual structure (e.g. bathhouse for ablution near the prayer space).',
  };
}

function describeCommunity(
  zones: { category: string }[],
  structures: { type: string }[],
): AxisDetail {
  const zoneCount = zones.filter((z) => COMMUNITY_ZONES.has(z.category)).length;
  const structCount = structures.filter((s) => COMMUNITY_STRUCTURES.has(s.type)).length;
  if (zoneCount === 0 && structCount === 0) {
    return {
      rationale: 'No commons, education, or gathering features yet.',
      liftHint: 'Add a classroom, pavilion, fire circle, or commons zone.',
    };
  }
  const parts: string[] = [];
  if (zoneCount > 0) parts.push(`${zoneCount} community zone${zoneCount === 1 ? '' : 's'}`);
  if (structCount > 0) parts.push(`${structCount} gathering structure${structCount === 1 ? '' : 's'}`);
  return {
    rationale: parts.join(' \u00B7 ') + '.',
    liftHint: structCount >= 2
      ? 'Robust gathering capacity. Lift further with seasonal-event flow planning.'
      : 'Add a pavilion or fire circle to anchor community gatherings.',
  };
}

/* \u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

interface Props {
  project: LocalProject;
}

export default function MissionImpactRollupCard({ project }: Props) {
  const model = useFinancialModel(project.id);
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);

  const details = useMemo<Record<AxisDescriptor['key'], AxisDetail>>(() => {
    return {
      financial: describeFinancial(model?.breakEven.breakEvenYear.mid ?? null),
      ecological: describeEcological(zones),
      spiritual: describeSpiritual(zones, structures),
      community: describeCommunity(zones, structures),
    };
  }, [model, zones, structures]);

  if (!model) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Mission-Weighted Impact</h4>
            <p className={css.cardHint}>
              Multi-axis impact rollup across financial, ecological, spiritual,
              and community dimensions.
            </p>
          </div>
          <span className={css.heuristicBadge}>Heuristic</span>
        </div>
        <div className={css.empty}>
          Place at least one zone, structure, paddock, crop, path, or utility
          to compute the mission impact rollup.
        </div>
      </div>
    );
  }

  const ms = model.missionScore;
  // Find lowest non-zero axis as the "biggest gap".
  const sorted = [...AXES].sort((a, b) => ms[a.key] - ms[b.key]);
  const lowest = sorted[0]!;
  const highest = sorted[sorted.length - 1]!;
  const overallTone: 'good' | 'fair' | 'poor' =
    ms.overall >= 65 ? 'good' : ms.overall >= 40 ? 'fair' : 'poor';

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h4 className={css.cardTitle}>Mission-Weighted Impact</h4>
          <p className={css.cardHint}>
            Multi-axis impact rollup across financial, ecological, spiritual,
            and community dimensions \u2014 same scores as the financial-model
            mission tiles, presented side-by-side with rationale per axis.
          </p>
        </div>
        <span className={css.heuristicBadge}>Heuristic</span>
      </div>

      {/* Headline overall */}
      <div className={`${css.overallRow} ${css[`tone_${overallTone}`]}`}>
        <div className={css.overallVal}>
          {ms.overall}
          <span className={css.overallOf}>/100</span>
        </div>
        <div className={css.overallMeta}>
          <span className={css.overallWord}>Overall mission alignment</span>
          <span className={css.overallSub}>
            Strongest: {highest.label} ({ms[highest.key]}) \u00B7 Weakest:{' '}
            {lowest.label} ({ms[lowest.key]})
          </span>
        </div>
      </div>

      {/* Axis bars */}
      <div className={css.axes}>
        {AXES.map((axis) => {
          const value = ms[axis.key];
          const tone: 'good' | 'fair' | 'poor' =
            value >= 65 ? 'good' : value >= 40 ? 'fair' : 'poor';
          const detail = details[axis.key];
          return (
            <div key={axis.key} className={css.axisRow}>
              <div className={css.axisHead}>
                <span className={css.axisGlyph} aria-hidden>{axis.glyph}</span>
                <span className={css.axisLabel}>{axis.label}</span>
                <span className={`${css.axisValue} ${css[`tone_${tone}`]}`}>
                  {value}
                </span>
              </div>
              <div className={css.axisBarTrack}>
                <div
                  className={`${css.axisBarFill} ${css[`fill_${tone}`]}`}
                  style={{ width: `${Math.max(2, value)}%` }}
                />
              </div>
              <p className={css.axisRationale}>{detail.rationale}</p>
            </div>
          );
        })}
      </div>

      {/* Biggest gap callout */}
      <div className={css.gapCallout}>
        <span className={css.gapLabel}>Biggest opportunity</span>
        <p className={css.gapBody}>
          <strong>{lowest.label}</strong> ({ms[lowest.key]}/100) \u2014{' '}
          {details[lowest.key].liftHint}
        </p>
      </div>

      <p className={css.footnote}>
        <em>Heuristic.</em> Scores are computed by the financial engine's
        mission-scoring module: Financial inverts break-even year,
        Ecological measures % of zoned area in conservation / water-retention
        / buffer, Spiritual rewards prayer space / bathhouse / spiritual zone,
        Community rewards classroom / pavilion / fire circle / commons /
        education / retreat. Weights are configurable in the financial-model
        panel \u2014 this card always shows the unweighted per-axis values so
        the source of each lift is visible.
      </p>
    </div>
  );
}
