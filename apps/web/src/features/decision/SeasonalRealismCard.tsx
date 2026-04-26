/**
 * §21 SeasonalRealismCard — phasing realism through a *seasonal* lens.
 *
 * The existing Phasing Realism block in DecisionSupportPanel scores phase
 * realism by capital distribution. This card asks the orthogonal question:
 * given the project's regional climate, are the *task types* assigned to
 * each phase actually buildable across enough months to absorb slippage?
 *
 * For each phase, we walk every feature tagged with that phase across the
 * structure / utility / crop / paddock stores, classify them into seasonal
 * task categories (tree planting, seeding, earthworks, building,
 * livestock intro, light install), then evaluate each task against the 12
 * monthly climate normals. Cells are tone-coded ideal / acceptable /
 * risky / severe; a phase whose dominant tasks have <2 ideal months gets
 * flagged as a "narrow window" risk.
 *
 * Pure presentation. No shared-package math; no AI. Heuristic — calibrated
 * against textbook permaculture / construction-season rules of thumb.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePhaseStore, type BuildPhase } from '../../store/phaseStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './SeasonalRealismCard.module.css';

interface SeasonalRealismCardProps {
  project: LocalProject;
}

// ─── Climate / monthly normals ──────────────────────────────────────────

interface MonthlyNormal {
  month: number;
  precip_mm?: number | null;
  mean_max_c?: number | null;
  mean_min_c?: number | null;
}
interface ClimateSummary {
  _monthly_normals?: unknown;
}

// ─── Task classification ────────────────────────────────────────────────

type TaskKind =
  | 'tree_planting'
  | 'seeding'
  | 'earthworks'
  | 'building'
  | 'livestock_intro'
  | 'light_install';

const TASK_LABELS: Record<TaskKind, string> = {
  tree_planting: 'Tree planting',
  seeding: 'Seeding / annuals',
  earthworks: 'Earthworks / dig',
  building: 'Construction',
  livestock_intro: 'Livestock intro',
  light_install: 'Light install',
};

const TREE_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard', 'food_forest', 'silvopasture', 'windbreak', 'shelterbelt',
]);
const SEEDING_CROP_TYPES: ReadonlySet<CropAreaType> = new Set([
  'row_crop', 'garden_bed', 'market_garden', 'pollinator_strip', 'nursery',
]);
const EARTHWORK_UTILITY_TYPES: ReadonlySet<UtilityType> = new Set([
  'well_pump', 'septic', 'rain_catchment', 'water_tank', 'greywater',
]);
const BUILDING_STRUCTURE_TYPES: ReadonlySet<StructureType> = new Set([
  'cabin', 'yurt', 'pavilion', 'greenhouse', 'barn', 'workshop', 'prayer_space',
  'bathhouse', 'classroom', 'storage', 'animal_shelter', 'tent_glamping',
  'lookout', 'earthship', 'water_pump_house', 'fire_circle', 'compost_station',
]);

// ─── Suitability scoring ────────────────────────────────────────────────

type Suitability = 'ideal' | 'ok' | 'risky' | 'severe';

function suitabilityScore(s: Suitability): number {
  return s === 'ideal' ? 2 : s === 'ok' ? 1 : s === 'risky' ? 0 : -1;
}

/**
 * Score each task kind for a given month using climate normals. The rules
 * are calibrated for the *northern* hemisphere; southern-hemisphere
 * projects get their month axis flipped at the call site so January
 * inputs become "July" semantics.
 */
function suitabilityFor(kind: TaskKind, n: MonthlyNormal): Suitability {
  const max = n.mean_max_c ?? null;
  const min = n.mean_min_c ?? null;
  const precip = n.precip_mm ?? null;
  if (max == null || min == null) return 'ok';

  switch (kind) {
    case 'tree_planting':
      // Ideal: dormant season — cool but not freezing — soil workable
      if (min >= -3 && max <= 16 && (precip == null || precip < 180)) return 'ideal';
      if (max > 28) return 'severe';     // mid-summer planting kills nursery stock
      if (min < -8) return 'severe';     // ground frozen
      if (max <= 22) return 'ok';
      return 'risky';
    case 'seeding':
      if (min >= 2 && max >= 12 && max <= 24 && (precip == null || precip < 160)) return 'ideal';
      if (max < 6) return 'severe';
      if (max > 30 && (precip ?? 0) < 40) return 'severe';
      if (max >= 8 && max <= 28) return 'ok';
      return 'risky';
    case 'earthworks':
      if (min > 0 && (precip == null || precip < 80) && max < 30) return 'ideal';
      if (min < -5) return 'severe';     // frozen ground
      if ((precip ?? 0) > 180) return 'severe'; // saturated, equipment bogs
      if ((precip ?? 0) > 110) return 'risky';
      return 'ok';
    case 'building':
      if (min >= -3 && max <= 26 && (precip == null || precip < 110)) return 'ideal';
      if (min < -12) return 'severe';
      if ((precip ?? 0) > 180) return 'severe';
      if (max > 32) return 'risky';      // crew heat stress, materials cure too fast
      return 'ok';
    case 'livestock_intro':
      // Ideal: shoulder seasons — pasture growing, mild weather
      if (min >= 2 && max >= 12 && max <= 22) return 'ideal';
      if (min < -8) return 'severe';
      if (max > 32) return 'risky';
      if (max >= 8 && max <= 28) return 'ok';
      return 'risky';
    case 'light_install':
      // Wiring solar, lighting, biochar burners — dry frost-free is enough
      if (min > -5 && (precip == null || precip < 130)) return 'ideal';
      if (min < -12) return 'severe';
      if ((precip ?? 0) > 200) return 'risky';
      return 'ok';
  }
}

// ─── Hemisphere helpers ─────────────────────────────────────────────────

function flipMonthForHemisphere(monthIdx: number, southern: boolean): number {
  // monthIdx is 0-11 (Jan..Dec). For southern-hem, treat each month using
  // the climate it would correspond to in the north (offset 6).
  if (!southern) return monthIdx;
  return (monthIdx + 6) % 12;
}

// ─── Card ───────────────────────────────────────────────────────────────

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function SeasonalRealismCard({ project }: SeasonalRealismCardProps) {
  const structures = useStructureStore((st) => st.structures).filter((x) => x.projectId === project.id);
  const utilities = useUtilityStore((st) => st.utilities).filter((x) => x.projectId === project.id);
  const cropAreas = useCropStore((st) => st.cropAreas).filter((x) => x.projectId === project.id);
  const paddocks = useLivestockStore((st) => st.paddocks).filter((x) => x.projectId === project.id);
  const allPhases = usePhaseStore((st) => st.phases);
  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  const siteData = useSiteData(project.id);
  const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;

  const monthlyNormals = useMemo<MonthlyNormal[] | null>(() => {
    const raw = (climate as { _monthly_normals?: unknown } | null)?._monthly_normals;
    if (!Array.isArray(raw) || raw.length !== 12) return null;
    return raw as MonthlyNormal[];
  }, [climate]);

  const southern = useMemo(() => {
    if (!project.parcelBoundaryGeojson) return false;
    try {
      const lat = turf.centroid(project.parcelBoundaryGeojson).geometry.coordinates[1];
      return typeof lat === 'number' && lat < 0;
    } catch {
      return false;
    }
  }, [project.parcelBoundaryGeojson]);

  const phaseRows = useMemo(() => {
    return phases.map((ph) => buildPhaseRow(ph, {
      structures, utilities, cropAreas, paddocks,
      normals: monthlyNormals, southern,
    }));
  }, [phases, structures, utilities, cropAreas, paddocks, monthlyNormals, southern]);

  if (phases.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Seasonal Realism</h3>
            <p className={css.cardHint}>
              Phases are not yet defined for this project. Add phases on the Phasing
              dashboard to see month-by-month construction-window guidance.
            </p>
          </div>
          <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
        </div>
      </div>
    );
  }

  const overall = computeOverall(phaseRows);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Seasonal Realism</h3>
          <p className={css.cardHint}>
            Whether each phase{'\u2019'}s task mix has enough good-weather months to absorb slippage.
            Each row scores tree planting, seeding, earthworks, construction, livestock intro and
            light installs against the regional monthly normals. <em>Ideal</em> = primary window;
            <em> ok</em> = workable with care; <em>risky / severe</em> = season fights you.
          </p>
        </div>
        <span className={css.modeBadge}>P2 {'\u00B7'} §21</span>
      </div>

      {!monthlyNormals && (
        <div className={css.fallbackBanner}>
          No monthly climate normals available for this site {'\u2014'} suitability defaults to
          neutral. Pull a climate layer to surface the seasonal arc.
        </div>
      )}

      <div className={css.phaseList}>
        {phaseRows.map((row) => (
          <PhaseRowView key={row.phaseId} row={row} />
        ))}
      </div>

      <div className={css.summary}>
        <span><strong>{overall.avgScore}</strong> avg realism score</span>
        <span><strong>{overall.narrowest ?? '\u2014'}</strong> narrowest phase</span>
        <span><strong>{overall.totalTasks}</strong> total tasks scored</span>
      </div>

      <div className={css.footnote}>
        Heuristic windows from textbook construction-season rules of thumb (USDA hardiness for
        planting, OSHA crew-heat for builds, contractor-rule-of-thumb for excavation). Calibrated
        for northern hemisphere; southern-hemisphere projects flip the month axis automatically.
      </div>
    </div>
  );
}

// ─── Sub-views ──────────────────────────────────────────────────────────

interface PhaseRow {
  phaseId: string;
  phaseName: string;
  timeframe: string;
  color: string;
  completed: boolean;
  taskCounts: Map<TaskKind, number>;
  // suitability[taskKind][monthIdx] -> Suitability
  matrix: Partial<Record<TaskKind, Suitability[]>>;
  realismScore: number; // 0-100
  bestWindow: { start: number; end: number; score: number } | null;
  warning: string | null;
  totalTasks: number;
}

function PhaseRowView({ row }: { row: PhaseRow }) {
  const taskKinds = Array.from(row.taskCounts.keys());
  if (taskKinds.length === 0) {
    return (
      <div className={css.phaseRow}>
        <div className={css.phaseHead}>
          <div className={css.phaseHeadLeft}>
            <span className={css.phaseDot} style={{ background: row.color }} />
            <span className={css.phaseName}>{row.phaseName}</span>
            <span className={css.phaseTimeframe}>{row.timeframe}</span>
          </div>
          <span className={css.phaseScoreNeutral}>{'\u2014'}</span>
        </div>
        <div className={css.emptyPhase}>No features assigned to this phase.</div>
      </div>
    );
  }

  const scoreToneClass =
    row.realismScore >= 70 ? css.phaseScoreGood :
    row.realismScore >= 45 ? css.phaseScoreFair :
    css.phaseScorePoor;

  return (
    <div className={css.phaseRow}>
      <div className={css.phaseHead}>
        <div className={css.phaseHeadLeft}>
          <span className={css.phaseDot} style={{ background: row.color }} />
          <span className={css.phaseName}>{row.phaseName}</span>
          <span className={css.phaseTimeframe}>{row.timeframe}</span>
          {row.completed && <span className={css.completedBadge}>complete</span>}
        </div>
        <span className={scoreToneClass}>{row.realismScore}</span>
      </div>

      <div className={css.matrix}>
        <div className={css.matrixHeader}>
          <span className={css.matrixCorner}>{'\u00A0'}</span>
          {MONTHS.map((m, i) => (
            <span key={i} className={css.matrixMonth}>{m}</span>
          ))}
        </div>
        {taskKinds.map((kind) => {
          const cells = row.matrix[kind] ?? [];
          const count = row.taskCounts.get(kind) ?? 0;
          return (
            <div key={kind} className={css.matrixRow}>
              <span className={css.matrixLabel}>
                {TASK_LABELS[kind]} <span className={css.matrixCount}>{count}</span>
              </span>
              {cells.map((s, i) => (
                <span
                  key={i}
                  className={`${css.matrixCell} ${suitabilityClass(s)}`}
                  title={`${MONTH_NAMES[i] ?? ''}: ${s}`}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className={css.phaseFooter}>
        {row.bestWindow ? (
          <span>
            Best window: <strong>{MONTH_NAMES[row.bestWindow.start]}{'\u2013'}
            {MONTH_NAMES[row.bestWindow.end]}</strong>
          </span>
        ) : (
          <span>No clear ideal window</span>
        )}
        {row.warning && <span className={css.phaseWarn}>{row.warning}</span>}
      </div>
    </div>
  );
}

function suitabilityClass(s: Suitability): string {
  switch (s) {
    case 'ideal': return css.cellIdeal ?? '';
    case 'ok': return css.cellOk ?? '';
    case 'risky': return css.cellRisky ?? '';
    case 'severe': return css.cellSevere ?? '';
  }
}

// ─── Builders ───────────────────────────────────────────────────────────

interface BuildPhaseInputs {
  structures: { phase: string; type: StructureType }[];
  utilities: { phase: string; type: UtilityType }[];
  cropAreas: { phase: string; type: CropAreaType }[];
  paddocks: { phase: string }[];
  normals: MonthlyNormal[] | null;
  southern: boolean;
}

function classifyStructure(t: StructureType): TaskKind {
  if (t === 'solar_array' || t === 'well' || t === 'water_tank') return 'light_install';
  if (BUILDING_STRUCTURE_TYPES.has(t)) return 'building';
  return 'building';
}
function classifyUtility(t: UtilityType): TaskKind {
  if (EARTHWORK_UTILITY_TYPES.has(t)) return 'earthworks';
  return 'light_install';
}
function classifyCrop(t: CropAreaType): TaskKind {
  if (TREE_CROP_TYPES.has(t)) return 'tree_planting';
  if (SEEDING_CROP_TYPES.has(t)) return 'seeding';
  return 'seeding';
}

function buildPhaseRow(phase: BuildPhase, inputs: BuildPhaseInputs): PhaseRow {
  const taskCounts = new Map<TaskKind, number>();
  const bump = (k: TaskKind) => taskCounts.set(k, (taskCounts.get(k) ?? 0) + 1);

  for (const s of inputs.structures) {
    if (s.phase === phase.id) bump(classifyStructure(s.type));
  }
  for (const u of inputs.utilities) {
    if (u.phase === phase.id) bump(classifyUtility(u.type));
  }
  for (const c of inputs.cropAreas) {
    if (c.phase === phase.id) bump(classifyCrop(c.type));
  }
  for (const pk of inputs.paddocks) {
    if (pk.phase === phase.id) bump('livestock_intro');
  }

  const matrix: Partial<Record<TaskKind, Suitability[]>> = {};
  let totalScore = 0;
  let totalCells = 0;

  for (const [kind] of taskCounts) {
    const arr: Suitability[] = [];
    for (let m = 0; m < 12; m++) {
      let s: Suitability = 'ok';
      if (inputs.normals) {
        const lookupIdx = flipMonthForHemisphere(m, inputs.southern);
        const normal = inputs.normals.find((n) => n.month === lookupIdx + 1);
        if (normal) s = suitabilityFor(kind, normal);
      }
      arr.push(s);
      totalScore += suitabilityScore(s);
      totalCells += 1;
    }
    matrix[kind] = arr;
  }

  // Realism score: 0-100 from totalScore in [-totalCells, 2 * totalCells]
  let realismScore = 0;
  if (totalCells > 0) {
    const norm = (totalScore + totalCells) / (3 * totalCells); // 0..1
    realismScore = Math.round(norm * 100);
  }

  // Best 3-month window: average suitability across all task rows for each
  // contiguous triple, take the top.
  const bestWindow = findBestWindow(matrix);

  // Warning: if any tree-planting task and 0 ideal months for it.
  let warning: string | null = null;
  const treeRow = matrix.tree_planting;
  if (treeRow && treeRow.filter((s) => s === 'ideal').length === 0) {
    warning = 'No ideal tree-planting months \u2014 schedule slips will compound';
  }
  const earthRow = matrix.earthworks;
  if (!warning && earthRow && earthRow.filter((s) => s === 'ideal').length < 2) {
    warning = 'Narrow earthworks window \u2014 weather slippage risks the dig';
  }

  const totalTasks = Array.from(taskCounts.values()).reduce((a, b) => a + b, 0);

  return {
    phaseId: phase.id,
    phaseName: phase.name,
    timeframe: phase.timeframe,
    color: phase.color,
    completed: phase.completed,
    taskCounts,
    matrix,
    realismScore,
    bestWindow,
    warning,
    totalTasks,
  };
}

function findBestWindow(
  matrix: Partial<Record<TaskKind, Suitability[]>>,
): { start: number; end: number; score: number } | null {
  const rows = Object.values(matrix).filter((r): r is Suitability[] => Array.isArray(r));
  if (rows.length === 0) return null;

  const monthScores: number[] = [];
  for (let m = 0; m < 12; m++) {
    let s = 0;
    for (const row of rows) {
      const cell = row[m];
      if (cell !== undefined) s += suitabilityScore(cell);
    }
    monthScores.push(s);
  }

  let bestStart = 0;
  let bestScore = -Infinity;
  for (let m = 0; m < 12; m++) {
    const a = monthScores[m] ?? 0;
    const b = monthScores[(m + 1) % 12] ?? 0;
    const c = monthScores[(m + 2) % 12] ?? 0;
    const sum = a + b + c;
    if (sum > bestScore) {
      bestScore = sum;
      bestStart = m;
    }
  }

  return { start: bestStart, end: (bestStart + 2) % 12, score: bestScore };
}

interface OverallSummary {
  avgScore: number;
  narrowest: string | null;
  totalTasks: number;
}
function computeOverall(rows: PhaseRow[]): OverallSummary {
  const scored = rows.filter((r) => r.totalTasks > 0);
  if (scored.length === 0) return { avgScore: 0, narrowest: null, totalTasks: 0 };
  const avg = Math.round(scored.reduce((a, r) => a + r.realismScore, 0) / scored.length);
  let narrowest: PhaseRow | null = null;
  for (const r of scored) {
    if (!narrowest || r.realismScore < narrowest.realismScore) narrowest = r;
  }
  return {
    avgScore: avg,
    narrowest: narrowest ? narrowest.phaseName : null,
    totalTasks: scored.reduce((a, r) => a + r.totalTasks, 0),
  };
}
