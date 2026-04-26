/**
 * §12 SeasonalProductivityCard — 12-month productivity strip per crop area.
 *
 * Heuristic — no harvest months exist in the species catalog. Each
 * `CropAreaType` carries a temperate-NH 12-month productivity vector
 * (0–1, peaks aligned to typical seasonal arc). Per-area vectors are
 * refined by the placed species' category mix, then area-weighted into
 * an aggregate "all zones" strip. Hemisphere flip via project centroid
 * latitude (south of equator → shift by 6 months).
 *
 * Visual: SVG strips (one per area + aggregate) with month labels and
 * a "gap month" callout when the aggregate dips below threshold.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { SPECIES_BY_ID } from '../planting/plantSpeciesData.js';
import css from './SeasonalProductivityCard.module.css';

// ── Heuristic monthly-productivity vectors (Northern Hemisphere) ───────────
// 12 floats per type, 0–1. Peaks aligned to typical seasonal arc:
//   orchard         → late-summer / fall fruit (Aug–Oct)
//   row_crop        → mid-summer harvest (Jun–Sep)
//   garden_bed      → broad spring/summer/fall (Apr–Oct)
//   food_forest     → mixed; berries May–Jul, fruit Aug–Oct
//   windbreak       → minimal productive yield (light fall fruit)
//   shelterbelt     → minimal productive yield (light fall fruit)
//   silvopasture    → fall mast / late forage (Aug–Oct)
//   nursery         → spring sale window (Mar–May)
//   market_garden   → continuous succession Apr–Oct, peak Jun–Sep
//   pollinator_strip→ bloom proxy May–Aug (not edible — represents nectar window)
const MONTHLY_BY_TYPE: Record<CropAreaType, number[]> = {
  //              J     F     M     A     M     J     J     A     S     O     N     D
  orchard:       [0.00, 0.00, 0.00, 0.00, 0.05, 0.15, 0.35, 0.85, 1.00, 0.80, 0.20, 0.00],
  row_crop:      [0.00, 0.00, 0.00, 0.00, 0.10, 0.50, 0.85, 1.00, 0.90, 0.40, 0.05, 0.00],
  garden_bed:    [0.00, 0.00, 0.10, 0.40, 0.65, 0.85, 0.95, 1.00, 0.85, 0.55, 0.20, 0.00],
  food_forest:   [0.00, 0.00, 0.05, 0.15, 0.45, 0.70, 0.75, 0.90, 1.00, 0.85, 0.30, 0.05],
  windbreak:     [0.00, 0.00, 0.00, 0.00, 0.05, 0.10, 0.10, 0.15, 0.30, 0.40, 0.10, 0.00],
  shelterbelt:   [0.00, 0.00, 0.00, 0.00, 0.05, 0.10, 0.10, 0.15, 0.30, 0.40, 0.10, 0.00],
  silvopasture:  [0.00, 0.00, 0.00, 0.10, 0.30, 0.45, 0.60, 0.85, 1.00, 0.80, 0.30, 0.05],
  nursery:       [0.00, 0.05, 0.40, 0.85, 1.00, 0.65, 0.30, 0.20, 0.30, 0.40, 0.20, 0.05],
  market_garden: [0.00, 0.00, 0.15, 0.50, 0.75, 0.90, 1.00, 1.00, 0.90, 0.65, 0.25, 0.05],
  pollinator_strip:[0.00, 0.00, 0.00, 0.10, 0.50, 0.85, 1.00, 0.85, 0.45, 0.10, 0.00, 0.00],
};

type SpeciesCategory = 'tree' | 'shrub' | 'vine' | 'ground_cover';

// Refinement factor — multiplied month-by-month with the type baseline so
// shrub-heavy plantings nudge productivity earlier (berry summer), tree-heavy
// plantings sharpen the late-summer/fall peak, vines occupy late summer, and
// ground-cover (annuals/herbs) broadens the shoulder months.
const MONTHLY_REFINE_BY_CATEGORY: Record<SpeciesCategory, number[]> = {
  //              J     F     M     A     M     J     J     A     S     O     N     D
  tree:          [0.0,  0.0,  0.0,  0.1,  0.2,  0.3,  0.5,  1.0,  1.0,  0.9,  0.3,  0.0],
  shrub:         [0.0,  0.0,  0.0,  0.2,  0.6,  1.0,  1.0,  0.7,  0.5,  0.3,  0.1,  0.0],
  vine:          [0.0,  0.0,  0.0,  0.0,  0.1,  0.3,  0.6,  1.0,  1.0,  0.7,  0.2,  0.0],
  ground_cover:  [0.1,  0.1,  0.3,  0.7,  1.0,  1.0,  1.0,  1.0,  0.8,  0.5,  0.2,  0.1],
};

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Aggregate value below this is flagged as a "gap month" (low across-portfolio
// productivity — the steward likely wants succession plantings or storage).
const GAP_THRESHOLD = 0.18;

interface AreaStrip {
  areaId: string;
  areaName: string;
  type: CropAreaType;
  areaM2: number;
  monthly: number[];
  speciesCount: number;
}

function shiftSouth(vec: number[]): number[] {
  // Southern hemisphere: shift by 6 months (Jan ↔ Jul, etc.)
  const out = new Array<number>(12).fill(0);
  for (let i = 0; i < 12; i++) {
    out[(i + 6) % 12] = vec[i] ?? 0;
  }
  return out;
}

function blendVector(a: number[], b: number[], weightB: number): number[] {
  // Multiplicative refinement: out[i] = a[i] * (1 - w + w * b[i])
  // weightB ∈ [0,1] — 0 = pure type baseline; 1 = full category refinement.
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    out.push(av * (1 - weightB + weightB * bv));
  }
  return out;
}

function buildAreaStrip(area: CropArea, southern: boolean): AreaStrip {
  let baseline = MONTHLY_BY_TYPE[area.type] ?? new Array<number>(12).fill(0);

  // Tally species categories from the placed list
  const catCount: Record<SpeciesCategory, number> = {
    tree: 0, shrub: 0, vine: 0, ground_cover: 0,
  };
  let known = 0;
  for (const speciesId of area.species) {
    const sp = SPECIES_BY_ID[speciesId];
    if (!sp) continue;
    catCount[sp.category] += 1;
    known += 1;
  }

  // If we know any species, blend in a category-weighted refinement.
  if (known > 0) {
    let refined: number[] = [...baseline];
    for (const cat of Object.keys(catCount) as SpeciesCategory[]) {
      const weight = (catCount[cat] / known) * 0.5; // cap refinement at 50%
      if (weight <= 0) continue;
      refined = blendVector(refined, MONTHLY_REFINE_BY_CATEGORY[cat], weight);
    }
    baseline = refined;
  }

  if (southern) baseline = shiftSouth(baseline);

  return {
    areaId: area.id,
    areaName: area.name,
    type: area.type,
    areaM2: area.areaM2,
    monthly: baseline,
    speciesCount: known,
  };
}

function buildAggregate(strips: AreaStrip[]): number[] {
  if (strips.length === 0) return new Array<number>(12).fill(0);
  const totalArea = strips.reduce((s, st) => s + st.areaM2, 0);
  if (totalArea <= 0) return new Array<number>(12).fill(0);
  const sum = new Array<number>(12).fill(0);
  for (const st of strips) {
    const w = st.areaM2 / totalArea;
    for (let i = 0; i < 12; i++) sum[i]! += (st.monthly[i] ?? 0) * w;
  }
  // Normalize so peak month = 1 (visual scale) — keeps the strip readable.
  const peak = Math.max(...sum, 0.0001);
  return sum.map((v) => v / peak);
}

function deriveLatitude(project: LocalProject): number | null {
  const fc = project.parcelBoundaryGeojson;
  if (!fc || !fc.features || fc.features.length === 0) return null;
  try {
    const c = turf.centroid(fc);
    const coords = c.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords[1] ?? null;
  } catch {
    return null;
  }
}

interface SeasonalProductivityCardProps {
  project: LocalProject;
}

export default function SeasonalProductivityCard({ project }: SeasonalProductivityCardProps) {
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );

  const lat = useMemo(() => deriveLatitude(project), [project]);
  const southern = lat !== null && lat < 0;

  const strips = useMemo(
    () => cropAreas.map((a) => buildAreaStrip(a, southern)),
    [cropAreas, southern],
  );

  const aggregate = useMemo(() => buildAggregate(strips), [strips]);

  const gapMonths = useMemo(() => {
    const out: number[] = [];
    for (let i = 0; i < 12; i++) {
      if ((aggregate[i] ?? 0) < GAP_THRESHOLD) out.push(i);
    }
    return out;
  }, [aggregate]);

  if (cropAreas.length === 0) return null;

  const hemisphereLabel = southern ? 'Southern hemisphere (calibrated)' : 'Northern hemisphere (default)';

  return (
    <div className={css.section}>
      <h2 className={css.sectionLabel}>SEASONAL PRODUCTIVITY</h2>
      <span className={css.heuristicBadge}>Heuristic — derived from area type + species mix</span>

      <div className={css.card}>
        {/* Aggregate strip */}
        <div className={css.row}>
          <div className={css.rowHead}>
            <span className={css.rowName}>All Zones</span>
            <span className={css.rowMeta}>
              {cropAreas.length} {cropAreas.length === 1 ? 'area' : 'areas'}
            </span>
          </div>
          <Strip vector={aggregate} accent="aggregate" />
        </div>

        {/* Per-zone strips */}
        {strips.map((st) => (
          <div key={st.areaId} className={css.row}>
            <div className={css.rowHead}>
              <span className={css.rowName}>{st.areaName || '(unnamed)'}</span>
              <span className={css.rowMeta}>
                {st.type.replace(/_/g, ' ')}
                {st.speciesCount > 0 ? ` \u00B7 ${st.speciesCount} species` : ''}
              </span>
            </div>
            <Strip vector={st.monthly} accent="zone" />
          </div>
        ))}

        {/* Gap-month callout */}
        {gapMonths.length > 0 && (
          <div className={css.gapCallout}>
            <span className={css.gapLabel}>Lean months</span>
            <span className={css.gapMonths}>
              {gapMonths.map((m) => MONTH_NAMES[m]).filter(Boolean).join(', ')}
            </span>
            <p className={css.gapHint}>
              Consider succession plantings, storage crops, or season-extending structures
              to flatten the across-portfolio productivity arc.
            </p>
          </div>
        )}

        <p className={css.footnote}>
          Productivity vectors are heuristic — derived from each area&rsquo;s
          <em> type</em> (e.g., orchard, market garden) and refined by the
          <em> category mix</em> of placed species. {hemisphereLabel}.
          Visualization is normalized: aggregate peak = 100%.
        </p>
      </div>
    </div>
  );
}

interface StripProps {
  vector: number[];
  accent: 'aggregate' | 'zone';
}

function Strip({ vector, accent }: StripProps) {
  const W = 360;
  const H = 28;
  const cellW = W / 12;
  const cellH = H;

  return (
    <div className={css.stripWrap}>
      <svg className={css.strip} viewBox={`0 0 ${W} ${H + 14}`} preserveAspectRatio="none">
        {vector.map((v, i) => {
          const intensity = Math.max(0, Math.min(1, v));
          const opacity = 0.08 + intensity * 0.85;
          const fill = accent === 'aggregate'
            ? `rgba(202, 138, 4, ${opacity.toFixed(3)})`   // harvest gold
            : `rgba(21, 128, 61, ${opacity.toFixed(3)})`;  // earth green
          return (
            <rect
              key={i}
              x={i * cellW + 1}
              y={0}
              width={cellW - 2}
              height={cellH}
              rx={2}
              fill={fill}
            />
          );
        })}
        {MONTH_LABELS.map((label, i) => (
          <text
            key={i}
            x={i * cellW + cellW / 2}
            y={H + 11}
            textAnchor="middle"
            className={css.monthLabel}
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
