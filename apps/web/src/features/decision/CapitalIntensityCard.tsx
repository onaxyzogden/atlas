/**
 * §21 CapitalIntensityCard — 4-axis decomposition of project intensity.
 *
 * The existing Capital Intensity strip in DecisionSupportPanel collapses
 * the project into a single $-band label. That hides the trade-off
 * structure that determines whether a project is *fragile in the same
 * way that a high-cost project is fragile* or *fragile in the way an
 * over-staffed homestead is fragile*. This card decomposes the headline
 * into four orthogonal axes and classifies the project into one of five
 * intensity archetypes.
 *
 * Axes (each normalized 0-100):
 *   1. Capital cost      — total mid-investment, normalized to $1M = 100
 *   2. Operational labor — annual hrs/yr summed across features, 6000 = 100
 *   3. System count      — distinct feature count, 30 = 100
 *   4. Seasonal coupling — share of crop area in seasonal vs perennial,
 *                          0 perennial = 100 fully seasonal exposure
 *
 * Classification:
 *   - All axes <  30 → Lean
 *   - Capital ≥ 60 AND ops < 40       → Capital-heavy
 *   - Ops ≥ 60 AND capital < 40       → Ops-heavy
 *   - All axes ≥ 60                   → Complex
 *   - Otherwise                       → Balanced
 *
 * Pure presentation; reuses simplified FTE math from
 * MaintenanceComplexityCard. No shared-package math; no AI.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore, type LivestockSpecies } from '../../store/livestockStore.js';
import { usePathStore, type PathType } from '../../store/pathStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import css from './CapitalIntensityCard.module.css';

interface Props {
  project: LocalProject;
}

// ─── Per-feature labor heuristics (mirrors MaintenanceComplexityCard) ───

const STRUCTURE_HRS: Record<StructureType, number> = {
  cabin: 40, yurt: 60, pavilion: 25, greenhouse: 90, barn: 50, workshop: 35,
  prayer_space: 20, bathhouse: 70, classroom: 30, storage: 12, animal_shelter: 45,
  compost_station: 30, water_pump_house: 35, tent_glamping: 80, fire_circle: 10,
  lookout: 15, earthship: 65, solar_array: 25, well: 20, water_tank: 18,
};
const UTILITY_HRS: Record<UtilityType, number> = {
  solar_panel: 15, battery_room: 25, generator: 35, water_tank: 15, well_pump: 30,
  greywater: 40, septic: 25, rain_catchment: 20, lighting: 8, firewood_storage: 10,
  waste_sorting: 15, compost: 35, biochar: 30, tool_storage: 8, laundry_station: 25,
};
const CROP_HRS_PER_ACRE: Record<CropAreaType, number> = {
  orchard: 60, row_crop: 80, garden_bed: 350, food_forest: 35, windbreak: 8,
  shelterbelt: 8, silvopasture: 25, nursery: 250, market_garden: 400, pollinator_strip: 12,
};
const ZONE_HRS_PER_ACRE: Record<ZoneCategory, number> = {
  habitation: 30, food_production: 25, livestock: 15, commons: 8, spiritual: 6,
  education: 12, retreat: 18, conservation: 3, water_retention: 10, infrastructure: 12,
  access: 8, buffer: 4, future_expansion: 2,
};
const LIVESTOCK_HRS_PER_HEAD: Record<LivestockSpecies, number> = {
  poultry: 6, ducks_geese: 7, rabbits: 8, bees: 12, sheep: 25, goats: 30,
  pigs: 35, cattle: 50, horses: 120,
};
const PATH_HRS_PER_100M: Record<PathType, number> = {
  main_road: 4, secondary_road: 3, emergency_access: 3, service_road: 3,
  pedestrian_path: 1.5, trail: 1, farm_lane: 2, animal_corridor: 1.5,
  grazing_route: 1.5, arrival_sequence: 2.5, quiet_route: 1,
};

const FTE_HOURS_PER_YEAR = 2000;

// Crop types that are heavily seasonal (one-shot annual harvest cycle).
// Perennial / mixed-stratum systems have a much flatter labor and revenue arc.
const SEASONAL_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard', 'row_crop', 'garden_bed', 'market_garden', 'nursery',
]);
const PERENNIAL_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'food_forest', 'silvopasture', 'windbreak', 'shelterbelt', 'pollinator_strip',
]);

// ─── Card ───────────────────────────────────────────────────────────────

interface AxisScore {
  key: 'capital' | 'ops' | 'systems' | 'seasonal';
  label: string;
  rawLabel: string;
  score: number; // 0-100
}

interface Archetype {
  label: string;
  description: string;
  className: string;
}

export default function CapitalIntensityCard({ project }: Props) {
  const allStructures = useStructureStore((st) => st.structures);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const allZones = useZoneStore((st) => st.zones);
  const allCrops = useCropStore((st) => st.cropAreas);
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allPaths = usePathStore((st) => st.paths);

  const structures = useMemo(() => allStructures.filter((x) => x.projectId === project.id), [allStructures, project.id]);
  const utilities = useMemo(() => allUtilities.filter((x) => x.projectId === project.id), [allUtilities, project.id]);
  const zones = useMemo(() => allZones.filter((x) => x.projectId === project.id), [allZones, project.id]);
  const crops = useMemo(() => allCrops.filter((x) => x.projectId === project.id), [allCrops, project.id]);
  const paddocks = useMemo(() => allPaddocks.filter((x) => x.projectId === project.id), [allPaddocks, project.id]);
  const paths = useMemo(() => allPaths.filter((x) => x.projectId === project.id), [allPaths, project.id]);

  const model = useFinancialModel(project.id);

  // ── Capital axis ──
  const capitalUsd = model?.totalInvestment.mid ?? 0;
  const capitalScore = clamp01(capitalUsd / 1_000_000) * 100;

  // ── Operational-labor axis (compressed re-implementation of FTE rollup) ──
  const totalHours = useMemo(() => {
    let h = 0;
    for (const st of structures) h += STRUCTURE_HRS[st.type] ?? 25;
    for (const u of utilities) h += UTILITY_HRS[u.type] ?? 15;
    for (const z of zones) h += (ZONE_HRS_PER_ACRE[z.category] ?? 8) * ((z.areaM2 ?? 0) / 4047);
    for (const c of crops) h += (CROP_HRS_PER_ACRE[c.type] ?? 50) * ((c.areaM2 ?? 0) / 4047);
    for (const pk of paddocks) {
      const hectares = (pk.areaM2 ?? 0) / 10_000;
      h += hectares * 12;
      for (const sp of pk.species) h += (LIVESTOCK_HRS_PER_HEAD[sp] ?? 20) * 5;
    }
    for (const p of paths) h += (p.lengthM / 100) * (PATH_HRS_PER_100M[p.type] ?? 1);
    return h;
  }, [structures, utilities, zones, crops, paddocks, paths]);
  const opsScore = clamp01(totalHours / 6000) * 100;
  const fte = totalHours / FTE_HOURS_PER_YEAR;

  // ── System-count axis ──
  const systemCount =
    structures.length + utilities.length + paddocks.length +
    crops.length + zones.length + paths.length;
  const systemScore = clamp01(systemCount / 30) * 100;

  // ── Seasonal-coupling axis ──
  const seasonalCoupling = useMemo(() => {
    let seasonalAcres = 0;
    let perennialAcres = 0;
    let neutralAcres = 0;
    for (const c of crops) {
      const acres = (c.areaM2 ?? 0) / 4047;
      if (SEASONAL_CROP_TYPES.has(c.type)) seasonalAcres += acres;
      else if (PERENNIAL_CROP_TYPES.has(c.type)) perennialAcres += acres;
      else neutralAcres += acres;
    }
    const total = seasonalAcres + perennialAcres + neutralAcres;
    if (total === 0) return { score: 0, seasonalAcres, perennialAcres };
    // 100 = fully seasonal exposure; perennial pulls toward 0
    const score = ((seasonalAcres + neutralAcres * 0.5) / total) * 100;
    return { score, seasonalAcres, perennialAcres };
  }, [crops]);

  const axes: AxisScore[] = [
    {
      key: 'capital',
      label: 'Capital cost',
      rawLabel: capitalUsd > 0 ? `$${Math.round(capitalUsd / 1000).toLocaleString()}K` : 'no model',
      score: Math.round(capitalScore),
    },
    {
      key: 'ops',
      label: 'Operational labor',
      rawLabel: totalHours > 0 ? `${Math.round(totalHours).toLocaleString()} hrs/yr (${fte.toFixed(2)} FTE)` : 'no features',
      score: Math.round(opsScore),
    },
    {
      key: 'systems',
      label: 'System count',
      rawLabel: `${systemCount} feature${systemCount === 1 ? '' : 's'}`,
      score: Math.round(systemScore),
    },
    {
      key: 'seasonal',
      label: 'Seasonal coupling',
      rawLabel: seasonalCoupling.seasonalAcres + seasonalCoupling.perennialAcres > 0
        ? `${seasonalCoupling.seasonalAcres.toFixed(1)} ac seasonal / ${seasonalCoupling.perennialAcres.toFixed(1)} ac perennial`
        : 'no crops placed',
      score: Math.round(seasonalCoupling.score),
    },
  ];

  const archetype = classify(axes);

  // ── Pre-rendered radar polygon points (200x200 viewBox) ──
  const radarPoints = useMemo(() => buildRadarPoints(axes), [axes]);

  if (systemCount === 0 && capitalUsd === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Capital × Ops Intensity</h3>
            <p className={css.cardHint}>
              No features placed and no financial model available. Place structures, utilities,
              crops or paddocks to surface the four-axis intensity profile.
            </p>
          </div>
          <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Capital × Ops Intensity</h3>
          <p className={css.cardHint}>
            Decomposes the project into four orthogonal axes {'\u2014'} how much money it
            takes, how much labor it demands, how many distinct systems must run, and
            how much of revenue rides on a single annual harvest. The shape, not the
            score, is what classifies the archetype.
          </p>
        </div>
        <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
      </div>

      <div className={css.body}>
        <div className={css.radarWrap}>
          <svg className={css.radarSvg} viewBox="-60 -30 320 260" aria-label="Intensity radar">
            {/* Concentric grid */}
            {[25, 50, 75, 100].map((r) => (
              <polygon
                key={r}
                points={buildGridPoints(r)}
                className={css.radarGrid}
              />
            ))}
            {/* Axis spokes */}
            {[0, 1, 2, 3].map((i) => {
              const { x, y } = polarPoint(i, 100);
              return (
                <line
                  key={i}
                  x1={100} y1={100} x2={x} y2={y}
                  className={css.radarSpoke}
                />
              );
            })}
            {/* Score polygon */}
            <polygon points={radarPoints} className={css.radarFill} />
            {/* Axis labels */}
            {axes.map((axis, i) => {
              const { x, y } = polarPoint(i, 118);
              return (
                <text
                  key={axis.key}
                  x={x}
                  y={y}
                  className={css.radarLabel}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {axis.label}
                </text>
              );
            })}
          </svg>
        </div>

        <div className={css.archetypeWrap}>
          <div className={`${css.archetypeBadge} ${archetype.className}`}>{archetype.label}</div>
          <p className={css.archetypeDesc}>{archetype.description}</p>
        </div>
      </div>

      <div className={css.axisList}>
        {axes.map((axis) => (
          <div key={axis.key} className={css.axisRow}>
            <div className={css.axisHead}>
              <span className={css.axisLabel}>{axis.label}</span>
              <span className={css.axisScore}>{axis.score}</span>
            </div>
            <div className={css.axisBarTrack}>
              <div
                className={`${css.axisBarFill} ${barToneClass(axis.score)}`}
                style={{ width: `${Math.max(2, axis.score)}%` }}
              />
            </div>
            <div className={css.axisRaw}>{axis.rawLabel}</div>
          </div>
        ))}
      </div>

      <div className={css.footnote}>
        Heuristic. Capital normalized at $1M = 100; labor at 6,000 hrs/yr = 100 (matches the
        Heavy ceiling on the Maintenance card); system count at 30 features = 100; seasonal
        coupling weights perennial systems at 0, mixed at 50%, single-harvest annuals at 100%.
        Archetype labels are diagnostic shorthand, not a fitness verdict.
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function clamp01(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function classify(axes: AxisScore[]): Archetype {
  const cap = axes.find((a) => a.key === 'capital')?.score ?? 0;
  const ops = axes.find((a) => a.key === 'ops')?.score ?? 0;
  const sys = axes.find((a) => a.key === 'systems')?.score ?? 0;
  const sea = axes.find((a) => a.key === 'seasonal')?.score ?? 0;
  const all = [cap, ops, sys, sea];

  if (all.every((s) => s < 30)) {
    return {
      label: 'Lean',
      description: 'Low capital, low labor, few systems. A side-project or pilot footprint that one steward can keep running on weekends.',
      className: css.archetypeLean ?? '',
    };
  }
  if (all.every((s) => s >= 60)) {
    return {
      label: 'Complex',
      description: 'High on every axis. Expect a 3+ FTE team plus specialty contracting, and watch for compounding fragility when any one axis slips.',
      className: css.archetypeComplex ?? '',
    };
  }
  if (cap >= 60 && ops < 40) {
    return {
      label: 'Capital-heavy',
      description: 'Money-intensive build with low ongoing labor. Risks cluster at the financing stage; once built it runs lean.',
      className: css.archetypeCapital ?? '',
    };
  }
  if (ops >= 60 && cap < 40) {
    return {
      label: 'Ops-heavy',
      description: 'Cheap to build, expensive to run. Recruit and retain a stewardship team early; thin labor margins make slippage compound.',
      className: css.archetypeOps ?? '',
    };
  }
  if (sea >= 70 && (cap >= 50 || sys >= 50)) {
    return {
      label: 'Seasonally exposed',
      description: 'Capital and systems are concentrated against a single annual harvest cycle. A bad weather year is an existential year.',
      className: css.archetypeSeasonal ?? '',
    };
  }
  return {
    label: 'Balanced',
    description: 'No single axis dominates. Easier to absorb shocks because risks are diversified across capital, labor, system count and seasonality.',
    className: css.archetypeBalanced ?? '',
  };
}

function polarPoint(axisIndex: number, radius: number): { x: number; y: number } {
  // 4 axes: top (0), right (1), bottom (2), left (3)
  const angle = (axisIndex * Math.PI) / 2 - Math.PI / 2;
  const cx = 100;
  const cy = 100;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function buildGridPoints(radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = polarPoint(i, radius);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return pts.join(' ');
}

function buildRadarPoints(axes: AxisScore[]): string {
  const pts: string[] = [];
  axes.forEach((axis, i) => {
    const r = (axis.score / 100) * 100; // map 0..100 score to 0..100 radius units
    const { x, y } = polarPoint(i, Math.max(2, r));
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  });
  return pts.join(' ');
}

function barToneClass(score: number): string {
  if (score >= 75) return css.barRust ?? '';
  if (score >= 50) return css.barAmber ?? '';
  if (score >= 25) return css.barNeutral ?? '';
  return css.barSage ?? '';
}
