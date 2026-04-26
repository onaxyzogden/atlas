/**
 * §22 PathModesCard — "Fastest feasible / Lowest cost / Most regenerative /
 * Investor presentation" path modes for the buildout arc. Same entities, four
 * narratives: each lens re-prioritizes which placed features the steward
 * should land in Phase 1 to satisfy that lens's success criterion.
 *
 * Pure presentation-layer ranking — no new entities, no shared math, no
 * mutation of the underlying phase assignments. The PhasingDashboard's
 * default Phase 1–4 cards remain authoritative.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../../store/structureStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../../store/utilityStore.js';
import { usePathStore, type DesignPath, type PathType } from '../../../store/pathStore.js';
import { useCropStore, type CropArea, type CropAreaType } from '../../../store/cropStore.js';
import css from './PathModesCard.module.css';

interface Props {
  project: LocalProject;
}

type Mode = 'fastest' | 'cheapest' | 'regen' | 'investor';

interface ModeMeta {
  id: Mode;
  label: string;
  tagline: string;
  successCriterion: string;
}

const MODES: ModeMeta[] = [
  { id: 'fastest', label: 'Fastest feasible', tagline: 'Operational + revenue ASAP', successCriterion: 'Steward can occupy and run the site within a single build season.' },
  { id: 'cheapest', label: 'Lowest cost', tagline: 'Defer capital-intensive items', successCriterion: 'Phase 1 capex stays under the lowest-cost decile of placed entities.' },
  { id: 'regen', label: 'Most regenerative', tagline: 'Soil + water + canopy first', successCriterion: 'Site regeneration begins before any net-new disturbance.' },
  { id: 'investor', label: 'Investor presentation', tagline: 'Visible deliverables Y1', successCriterion: "Site reads as 'underway and intentional' to a first-time visitor." },
];

interface RankedItem {
  id: string;
  label: string;
  kind: 'structure' | 'utility' | 'path' | 'crop';
  type: string;
  score: number;
  reason: string;
  cost: number;
}

// ── Per-mode scoring tables. Higher = ship sooner. ──────────────────────────
// Values 0–100. Anything above 60 lands in the Phase-1 reorder list.

const FASTEST_STRUCT: Partial<Record<StructureType, number>> = {
  yurt: 90, tent_glamping: 90, cabin: 75, animal_shelter: 80, water_pump_house: 78, water_tank: 70,
  greenhouse: 65, well: 95, storage: 60, compost_station: 55,
  earthship: 35, prayer_space: 30, classroom: 25, pavilion: 40, barn: 50, workshop: 45,
  bathhouse: 50, fire_circle: 25, lookout: 20, solar_array: 60,
};
const FASTEST_UTIL: Partial<Record<UtilityType, number>> = {
  well_pump: 95, water_tank: 80, septic: 75, solar_panel: 65, generator: 70,
  rain_catchment: 55, greywater: 50, lighting: 45, compost: 40, battery_room: 60,
  firewood_storage: 30, waste_sorting: 30, biochar: 25, tool_storage: 35, laundry_station: 40,
};
const FASTEST_PATH: Partial<Record<PathType, number>> = {
  main_road: 95, secondary_road: 75, service_road: 70, farm_lane: 65, emergency_access: 60,
  pedestrian_path: 45, trail: 35, animal_corridor: 55, grazing_route: 50, arrival_sequence: 50, quiet_route: 30,
};
const FASTEST_CROP: Partial<Record<CropAreaType, number>> = {
  market_garden: 85, garden_bed: 80, row_crop: 70, nursery: 60, pollinator_strip: 35,
  orchard: 55, food_forest: 30, silvopasture: 35, windbreak: 25, shelterbelt: 25,
};

const CHEAP_STRUCT: Partial<Record<StructureType, number>> = {
  fire_circle: 90, lookout: 75, compost_station: 80, storage: 65, tent_glamping: 70,
  greenhouse: 50, animal_shelter: 55, yurt: 60, water_tank: 55,
  cabin: 25, earthship: 15, barn: 20, prayer_space: 30, classroom: 20, pavilion: 35,
  workshop: 30, bathhouse: 25, water_pump_house: 50, well: 40, solar_array: 30,
};
const CHEAP_UTIL: Partial<Record<UtilityType, number>> = {
  rain_catchment: 80, greywater: 75, compost: 85, biochar: 70, firewood_storage: 75,
  waste_sorting: 80, tool_storage: 70, lighting: 55, water_tank: 50, laundry_station: 45,
  well_pump: 30, septic: 25, solar_panel: 35, battery_room: 25, generator: 50,
};
const CHEAP_PATH: Partial<Record<PathType, number>> = {
  pedestrian_path: 90, trail: 85, animal_corridor: 80, grazing_route: 75, quiet_route: 70,
  arrival_sequence: 60, farm_lane: 55, secondary_road: 50, service_road: 45,
  emergency_access: 35, main_road: 30,
};
const CHEAP_CROP: Partial<Record<CropAreaType, number>> = {
  pollinator_strip: 85, garden_bed: 80, market_garden: 70, nursery: 65, windbreak: 70,
  shelterbelt: 65, food_forest: 55, silvopasture: 50, orchard: 40, row_crop: 60,
};

const REGEN_STRUCT: Partial<Record<StructureType, number>> = {
  compost_station: 90, water_tank: 75, water_pump_house: 70, well: 80, animal_shelter: 60,
  greenhouse: 55, earthship: 70, solar_array: 65,
  cabin: 25, yurt: 30, prayer_space: 35, classroom: 30, pavilion: 25, barn: 30, workshop: 30,
  bathhouse: 25, fire_circle: 20, lookout: 15, tent_glamping: 25, storage: 35,
};
const REGEN_UTIL: Partial<Record<UtilityType, number>> = {
  rain_catchment: 95, greywater: 90, compost: 90, biochar: 85, well_pump: 75,
  water_tank: 70, septic: 60, waste_sorting: 70, solar_panel: 75, battery_room: 55,
  firewood_storage: 50, lighting: 30, tool_storage: 35, generator: 25, laundry_station: 35,
};
const REGEN_PATH: Partial<Record<PathType, number>> = {
  animal_corridor: 80, grazing_route: 80, trail: 70, pedestrian_path: 65, quiet_route: 65,
  farm_lane: 50, arrival_sequence: 45, secondary_road: 40, service_road: 35,
  main_road: 30, emergency_access: 35,
};
const REGEN_CROP: Partial<Record<CropAreaType, number>> = {
  food_forest: 95, silvopasture: 90, windbreak: 85, shelterbelt: 85, pollinator_strip: 80,
  orchard: 75, nursery: 70, garden_bed: 60, market_garden: 50, row_crop: 35,
};

const INVESTOR_STRUCT: Partial<Record<StructureType, number>> = {
  prayer_space: 90, pavilion: 85, lookout: 80, classroom: 75, fire_circle: 70,
  cabin: 75, earthship: 80, barn: 65, greenhouse: 70, bathhouse: 50,
  yurt: 60, tent_glamping: 65, animal_shelter: 50, workshop: 40, storage: 30,
  compost_station: 25, water_pump_house: 30, water_tank: 35, well: 50, solar_array: 75,
};
const INVESTOR_UTIL: Partial<Record<UtilityType, number>> = {
  solar_panel: 80, lighting: 75, well_pump: 60, water_tank: 50, rain_catchment: 65,
  battery_room: 50, generator: 40, tool_storage: 30, firewood_storage: 35,
  septic: 15, greywater: 25, compost: 25, biochar: 30, waste_sorting: 20, laundry_station: 30,
};
const INVESTOR_PATH: Partial<Record<PathType, number>> = {
  main_road: 95, arrival_sequence: 90, secondary_road: 75, pedestrian_path: 70, trail: 65,
  quiet_route: 60, farm_lane: 55, service_road: 50, animal_corridor: 45, grazing_route: 40,
  emergency_access: 35,
};
const INVESTOR_CROP: Partial<Record<CropAreaType, number>> = {
  orchard: 90, market_garden: 80, food_forest: 75, silvopasture: 70, pollinator_strip: 70,
  garden_bed: 65, windbreak: 55, shelterbelt: 55, nursery: 45, row_crop: 50,
};

// ── Per-mode rationale templates. Keep short; the score does the lifting. ───

function reasonFor(mode: Mode, kind: RankedItem['kind'], type: string, score: number): string {
  const tag = score >= 80 ? 'priority' : score >= 65 ? 'recommended' : 'consider';
  const subject = formatType(type);
  if (mode === 'fastest') {
    if (kind === 'utility' && (type === 'well_pump' || type === 'water_tank')) return `${subject}: water source/storage unlocks every other build thread.`;
    if (kind === 'path' && type === 'main_road') return `${subject}: vehicular access required before structures, deliveries, or emergency response.`;
    if (kind === 'crop' && (type === 'market_garden' || type === 'garden_bed')) return `${subject}: shortest-cycle revenue / food production.`;
    if (kind === 'structure' && (type === 'yurt' || type === 'tent_glamping')) return `${subject}: lightest-touch dwelling — habitable in weeks, not months.`;
    return `${subject}: short setup horizon (${tag}).`;
  }
  if (mode === 'cheapest') {
    if (kind === 'utility' && type === 'compost') return `${subject}: zero-capex on-site biology — defers commercial fertility costs.`;
    if (kind === 'utility' && type === 'rain_catchment') return `${subject}: gravity-fed catchment is cheaper than well drilling per-gallon over Y1-3.`;
    if (kind === 'path' && (type === 'pedestrian_path' || type === 'trail')) return `${subject}: hand-built with crew or volunteers, no machine cost.`;
    if (kind === 'crop' && type === 'pollinator_strip') return `${subject}: seed-cost only, no infrastructure.`;
    return `${subject}: low capex (${tag}).`;
  }
  if (mode === 'regen') {
    if (kind === 'crop' && (type === 'food_forest' || type === 'silvopasture')) return `${subject}: multi-strata perennial polyculture — soil-building begins immediately.`;
    if (kind === 'utility' && (type === 'rain_catchment' || type === 'greywater')) return `${subject}: closes the water cycle on-site, reduces extractive draw.`;
    if (kind === 'utility' && type === 'compost') return `${subject}: nutrient cycling foundation for every downstream crop.`;
    if (kind === 'crop' && (type === 'windbreak' || type === 'shelterbelt')) return `${subject}: shelter trees protect every downstream field-scale planting.`;
    return `${subject}: regenerative leverage (${tag}).`;
  }
  // investor
  if (kind === 'path' && type === 'main_road') return `${subject}: first impression — visible from the property edge.`;
  if (kind === 'structure' && (type === 'prayer_space' || type === 'pavilion')) return `${subject}: signature gathering structure communicates mission immediately.`;
  if (kind === 'crop' && type === 'orchard') return `${subject}: photogenic perennial planting reads as "long-term commitment".`;
  if (kind === 'structure' && type === 'solar_array') return `${subject}: visible renewable infrastructure — quick credibility win.`;
  return `${subject}: visible to a Y1 visitor (${tag}).`;
}

function formatType(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreFor(
  mode: Mode,
  kind: RankedItem['kind'],
  type: string,
): number {
  if (mode === 'fastest') {
    if (kind === 'structure') return FASTEST_STRUCT[type as StructureType] ?? 50;
    if (kind === 'utility') return FASTEST_UTIL[type as UtilityType] ?? 50;
    if (kind === 'path') return FASTEST_PATH[type as PathType] ?? 50;
    return FASTEST_CROP[type as CropAreaType] ?? 50;
  }
  if (mode === 'cheapest') {
    if (kind === 'structure') return CHEAP_STRUCT[type as StructureType] ?? 50;
    if (kind === 'utility') return CHEAP_UTIL[type as UtilityType] ?? 50;
    if (kind === 'path') return CHEAP_PATH[type as PathType] ?? 50;
    return CHEAP_CROP[type as CropAreaType] ?? 50;
  }
  if (mode === 'regen') {
    if (kind === 'structure') return REGEN_STRUCT[type as StructureType] ?? 50;
    if (kind === 'utility') return REGEN_UTIL[type as UtilityType] ?? 50;
    if (kind === 'path') return REGEN_PATH[type as PathType] ?? 50;
    return REGEN_CROP[type as CropAreaType] ?? 50;
  }
  if (kind === 'structure') return INVESTOR_STRUCT[type as StructureType] ?? 50;
  if (kind === 'utility') return INVESTOR_UTIL[type as UtilityType] ?? 50;
  if (kind === 'path') return INVESTOR_PATH[type as PathType] ?? 50;
  return INVESTOR_CROP[type as CropAreaType] ?? 50;
}

function structureCost(s: Structure): number {
  return s.costEstimate ?? 0;
}

function fmtCurrency(n: number): string {
  if (!Number.isFinite(n) || n === 0) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function PathModesCard({ project }: Props) {
  const [mode, setMode] = useState<Mode>('fastest');

  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((p) => p.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);

  const ranked = useMemo<RankedItem[]>(() => {
    const out: RankedItem[] = [];
    for (const s of structures as Structure[]) {
      const score = scoreFor(mode, 'structure', s.type);
      out.push({
        id: s.id,
        label: s.name || formatType(s.type),
        kind: 'structure',
        type: s.type,
        score,
        reason: reasonFor(mode, 'structure', s.type, score),
        cost: structureCost(s),
      });
    }
    for (const u of utilities as Utility[]) {
      const score = scoreFor(mode, 'utility', u.type);
      out.push({
        id: u.id,
        label: u.name || formatType(u.type),
        kind: 'utility',
        type: u.type,
        score,
        reason: reasonFor(mode, 'utility', u.type, score),
        cost: 0,
      });
    }
    for (const p of paths as DesignPath[]) {
      const score = scoreFor(mode, 'path', p.type);
      out.push({
        id: p.id,
        label: p.name || formatType(p.type),
        kind: 'path',
        type: p.type,
        score,
        reason: reasonFor(mode, 'path', p.type, score),
        cost: 0,
      });
    }
    for (const c of crops as CropArea[]) {
      const score = scoreFor(mode, 'crop', c.type);
      out.push({
        id: c.id,
        label: c.name || formatType(c.type),
        kind: 'crop',
        type: c.type,
        score,
        reason: reasonFor(mode, 'crop', c.type, score),
        cost: 0,
      });
    }
    return out.sort((a, b) => b.score - a.score);
  }, [mode, structures, utilities, paths, crops]);

  const phaseOne = useMemo(() => ranked.filter((r) => r.score >= 65), [ranked]);
  const deferred = useMemo(() => ranked.filter((r) => r.score < 40), [ranked]);
  const phaseOneCost = useMemo(() => phaseOne.reduce((acc, r) => acc + r.cost, 0), [phaseOne]);
  const totalCost = useMemo(() => ranked.reduce((acc, r) => acc + r.cost, 0), [ranked]);

  const meta = MODES.find((m) => m.id === mode) ?? MODES[0]!;

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Build Path Modes — Same Site, Four Narratives</h3>
          <p className={css.cardHint}>
            Re-prioritizes your placed features under four lenses. The default Phase 1–4 cards
            above remain authoritative — this view shows <em>what would land in Phase 1 first</em>
            if the steward optimized for the selected outcome.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      <div className={css.modeRow}>
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`${css.modeTab} ${m.id === mode ? css.modeTabActive : ''}`}
            onClick={() => setMode(m.id)}
          >
            <span className={css.modeLabel}>{m.label}</span>
            <span className={css.modeTagline}>{m.tagline}</span>
          </button>
        ))}
      </div>

      <div className={css.successBox}>
        <span className={css.successLabel}>Success criterion</span>
        <span className={css.successText}>{meta.successCriterion}</span>
      </div>

      {ranked.length === 0 ? (
        <p className={css.empty}>No structures, utilities, paths, or crop areas placed yet — drop a few features on the map to see how each lens would sequence them.</p>
      ) : (
        <>
          <div className={css.summaryRow}>
            <div className={css.summaryBlock}>
              <span className={css.summaryValue}>{phaseOne.length}</span>
              <span className={css.summaryLabel}>Phase 1 lift</span>
            </div>
            <div className={css.summaryBlock}>
              <span className={css.summaryValue}>{ranked.length - phaseOne.length - deferred.length}</span>
              <span className={css.summaryLabel}>Phase 2-3 follow</span>
            </div>
            <div className={css.summaryBlock}>
              <span className={css.summaryValue}>{deferred.length}</span>
              <span className={css.summaryLabel}>Defer to later</span>
            </div>
            <div className={css.summaryBlock}>
              <span className={css.summaryValue}>{fmtCurrency(phaseOneCost)}</span>
              <span className={css.summaryLabel}>Phase 1 capex</span>
            </div>
          </div>

          <h4 className={css.sectionTitle}>Phase 1 lift — ship these first under "{meta.label}"</h4>
          {phaseOne.length === 0 ? (
            <p className={css.subEmpty}>No placed features score above the Phase-1 threshold for this lens. Consider whether the lens fits your current entity mix, or expand the placement set.</p>
          ) : (
            <ul className={css.list}>
              {phaseOne.slice(0, 12).map((item) => (
                <li key={item.id} className={`${css.row} ${scoreClass(item.score)}`}>
                  <div className={css.rowHead}>
                    <span className={`${css.scoreTag} ${scoreTagClass(item.score)}`}>
                      {item.score}
                    </span>
                    <span className={css.rowTitle}>{item.label}</span>
                    <span className={css.kindBadge}>{item.kind}</span>
                  </div>
                  <p className={css.rowReason}>{item.reason}</p>
                </li>
              ))}
              {phaseOne.length > 12 && (
                <li className={css.moreNote}>+{phaseOne.length - 12} more above the Phase-1 threshold.</li>
              )}
            </ul>
          )}

          {deferred.length > 0 && (
            <>
              <h4 className={css.sectionTitle}>Defer to later — low-leverage under this lens</h4>
              <ul className={css.deferList}>
                {deferred.slice(0, 8).map((item) => (
                  <li key={item.id} className={css.deferRow}>
                    <span className={css.deferScore}>{item.score}</span>
                    <span className={css.deferLabel}>{item.label}</span>
                    <span className={css.deferKind}>{item.kind}</span>
                  </li>
                ))}
                {deferred.length > 8 && (
                  <li className={css.moreNote}>+{deferred.length - 8} more below the defer threshold.</li>
                )}
              </ul>
            </>
          )}
        </>
      )}

      <p className={css.footnote}>
        Scoring is deterministic per <em>(mode × entity type)</em> — the same project will produce
        the same ordering across sessions. Costs sum only the user-entered <em>structure</em>{' '}
        estimates (utilities, paths, and crops have no cost field today). Total project capex from
        all placed entities: {fmtCurrency(totalCost)}.
      </p>
    </section>
  );
}

function scoreClass(score: number): string {
  if (score >= 80) return css.row_high ?? '';
  if (score >= 65) return css.row_med ?? '';
  return css.row_low ?? '';
}
function scoreTagClass(score: number): string {
  if (score >= 80) return css.tag_high ?? '';
  if (score >= 65) return css.tag_med ?? '';
  return css.tag_low ?? '';
}
