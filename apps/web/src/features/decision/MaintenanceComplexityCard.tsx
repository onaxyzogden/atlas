/**
 * §21 MaintenanceComplexityCard — annual maintenance labor-hours estimate.
 *
 * Walks every placed feature (zones, structures, paddocks, paths,
 * utilities, crops, livestock species) and assigns each a maintenance
 * burden in annual labor-hours from a per-type rule table. Sums into
 * a project-wide score, then surfaces:
 *
 *   1. Headline annual hours + FTE-equivalent (1 FTE ≈ 2,000 hrs/yr)
 *   2. Complexity band (Light / Moderate / Heavy / Very Heavy) with a
 *      gradient bar
 *   3. Top-5 hotspot list — which placed features carry the most burden
 *   4. Per-category breakdown table — how much labor goes where
 *
 * HEURISTIC: per-type hours-per-year are owner-builder rules of thumb
 * synthesized from regenerative-ag operations literature, not field-
 * measured for any specific bioregion. Decision-support for sizing
 * the labor team / outside contracting envelope, not a job-time
 * estimating tool.
 *
 * Closes manifest §21 `maintenance-complexity-score` (P3 planned → done).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type UtilityType } from '../../store/utilityStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore, type LivestockSpecies } from '../../store/livestockStore.js';
import { usePathStore, type PathType } from '../../store/pathStore.js';
import s from './MaintenanceComplexityCard.module.css';

interface Props {
  project: LocalProject;
}

type Category = 'structures' | 'utilities' | 'zones' | 'crops' | 'livestock' | 'paths' | 'paddocks';

const FTE_HOURS_PER_YEAR = 2000;

// ── Per-type maintenance hours per year ──────────────────────────────

const STRUCTURE_HRS: Record<StructureType, number> = {
  cabin: 40,
  yurt: 60, // canvas + seasonal disassembly
  pavilion: 25,
  greenhouse: 90, // glazing, climate control, beds
  barn: 50,
  workshop: 35,
  prayer_space: 20,
  bathhouse: 70, // plumbing wear, cleaning
  classroom: 30,
  storage: 12,
  animal_shelter: 45,
  compost_station: 30,
  water_pump_house: 35,
  tent_glamping: 80, // canvas + seasonal teardown / re-pitch
  fire_circle: 10,
  lookout: 15,
  earthship: 65, // tire walls + greywater + thermal
  solar_array: 25,
  well: 20,
  water_tank: 18,
};

const UTILITY_HRS: Record<UtilityType, number> = {
  solar_panel: 15, // panel cleaning, inverter checks
  battery_room: 25, // BMS monitoring, ventilation
  generator: 35, // oil, filters, exercise runs
  water_tank: 15,
  well_pump: 30, // sediment, pressure tank, controllers
  greywater: 40, // filter swaps, biofilm
  septic: 25, // pump-out, baffle inspection
  rain_catchment: 20, // gutter, first-flush, screens
  lighting: 8,
  firewood_storage: 10,
  waste_sorting: 15,
  compost: 35, // turning, monitoring, pest control
  biochar: 30, // batch firing, crushing
  tool_storage: 8,
  laundry_station: 25,
};

// Per-acre annual labor for each crop area type. Acre = 4047 m².
const CROP_HRS_PER_ACRE: Record<CropAreaType, number> = {
  orchard: 60,
  row_crop: 80,
  garden_bed: 350, // intensive
  food_forest: 35, // low after establishment
  windbreak: 8,
  shelterbelt: 8,
  silvopasture: 25,
  nursery: 250,
  market_garden: 400, // very intensive
  pollinator_strip: 12,
};

// Per-acre annual labor for each zone category (broad land-use baseline,
// applied independently of any crop / livestock / structure overlays).
const ZONE_HRS_PER_ACRE: Record<ZoneCategory, number> = {
  habitation: 30,
  food_production: 25,
  livestock: 15,
  commons: 8,
  spiritual: 6,
  education: 12,
  retreat: 18,
  conservation: 3,
  water_retention: 10,
  infrastructure: 12,
  access: 8,
  buffer: 4,
  future_expansion: 2,
};

// Per-head annual labor by species (ranges synthesized from small-farm
// budget studies; includes daily chore time + periodic husbandry).
const LIVESTOCK_HRS_PER_HEAD: Record<LivestockSpecies, number> = {
  poultry: 6, // chickens etc. — flock baseline per bird
  ducks_geese: 7,
  rabbits: 8,
  bees: 12, // per hive (treated as 'head' for simplicity)
  sheep: 25,
  goats: 30,
  pigs: 35,
  cattle: 50,
  horses: 120,
};

// Per-100m of path or fence-line maintenance.
const PATH_HRS_PER_100M: Record<PathType, number> = {
  main_road: 4,
  secondary_road: 3,
  emergency_access: 3,
  service_road: 3,
  pedestrian_path: 1.5,
  trail: 1,
  farm_lane: 2,
  animal_corridor: 1.5,
  grazing_route: 1.5,
  arrival_sequence: 2.5,
  quiet_route: 1,
};

// Per-paddock fixed labor (rotation moves, fence inspection, water-line
// maintenance) layered on top of the zone-based baseline.
const PADDOCK_HRS_PER_HECTARE = 12;

// ── Complexity bands ─────────────────────────────────────────────────

interface Band {
  label: string;
  description: string;
  className: string;
  /** Upper bound (annual hours). Last band has Infinity. */
  ceiling: number;
}

const BANDS: Band[] = [
  { label: 'Light',      description: 'Manageable as a side project or weekend stewardship.',                      className: s.band_light!,    ceiling: 1500 },
  { label: 'Moderate',   description: 'Sustainable for one full-time steward or part-time team.',                  className: s.band_moderate!, ceiling: 3500 },
  { label: 'Heavy',      description: 'Requires a dedicated team of 2–3 or substantial outside contracting.',     className: s.band_heavy!,    ceiling: 6000 },
  { label: 'Very Heavy', description: 'Sustainable only with a 3+ FTE team; expect specialty contracting layers.', className: s.band_extreme!,  ceiling: Infinity },
];

function bandFor(annualHours: number): Band {
  return BANDS.find((b) => annualHours <= b.ceiling) ?? BANDS[BANDS.length - 1]!;
}

// ── Hotspot rows ─────────────────────────────────────────────────────

interface HotspotRow {
  id: string;
  category: Category;
  label: string;
  qualifier: string;
  hours: number;
}

const CATEGORY_LABEL: Record<Category, string> = {
  structures: 'Structure',
  utilities: 'Utility',
  zones: 'Zone',
  crops: 'Crop area',
  livestock: 'Livestock',
  paths: 'Path / road',
  paddocks: 'Paddock',
};

function fmtHours(h: number): string {
  if (h >= 1000) return `${Math.round(h).toLocaleString()} hrs`;
  return `${Math.round(h)} hrs`;
}

function fmtFte(h: number): string {
  return (h / FTE_HOURS_PER_YEAR).toFixed(2);
}

export default function MaintenanceComplexityCard({ project }: Props) {
  const allStructures = useStructureStore((st) => st.structures);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const allZones = useZoneStore((st) => st.zones);
  const allCrops = useCropStore((st) => st.cropAreas);
  const allLivestock = useLivestockStore((st) => st.paddocks);
  const allPaths = usePathStore((st) => st.paths);

  const structures = useMemo(() => allStructures.filter((x) => x.projectId === project.id), [allStructures, project.id]);
  const utilities = useMemo(() => allUtilities.filter((x) => x.projectId === project.id), [allUtilities, project.id]);
  const zones = useMemo(() => allZones.filter((x) => x.projectId === project.id), [allZones, project.id]);
  const crops = useMemo(() => allCrops.filter((x) => x.projectId === project.id), [allCrops, project.id]);
  const paddocks = useMemo(() => allLivestock.filter((x) => x.projectId === project.id), [allLivestock, project.id]);
  const paths = useMemo(() => allPaths.filter((x) => x.projectId === project.id), [allPaths, project.id]);

  const hotspots: HotspotRow[] = useMemo(() => {
    const rows: HotspotRow[] = [];

    for (const st of structures) {
      const hrs = STRUCTURE_HRS[st.type] ?? 25;
      rows.push({
        id: `struct-${st.id}`,
        category: 'structures',
        label: st.name,
        qualifier: st.type.replace(/_/g, ' '),
        hours: hrs,
      });
    }

    for (const u of utilities) {
      const hrs = UTILITY_HRS[u.type] ?? 15;
      rows.push({
        id: `util-${u.id}`,
        category: 'utilities',
        label: u.name,
        qualifier: u.type.replace(/_/g, ' '),
        hours: hrs,
      });
    }

    for (const z of zones) {
      const acres = (z.areaM2 ?? 0) / 4047;
      const hrs = (ZONE_HRS_PER_ACRE[z.category] ?? 8) * acres;
      if (hrs < 2) continue; // skip negligible zones
      rows.push({
        id: `zone-${z.id}`,
        category: 'zones',
        label: z.name,
        qualifier: `${z.category.replace(/_/g, ' ')} · ${acres.toFixed(2)} ac`,
        hours: hrs,
      });
    }

    for (const c of crops) {
      const acres = (c.areaM2 ?? 0) / 4047;
      const hrs = (CROP_HRS_PER_ACRE[c.type] ?? 50) * acres;
      if (hrs < 2) continue;
      rows.push({
        id: `crop-${c.id}`,
        category: 'crops',
        label: c.name,
        qualifier: `${c.type.replace(/_/g, ' ')} · ${acres.toFixed(2)} ac`,
        hours: hrs,
      });
    }

    for (const pa of paddocks) {
      const hectares = (pa.areaM2 ?? 0) / 10_000;
      const baseHrs = hectares * PADDOCK_HRS_PER_HECTARE;
      const speciesHrs = pa.species
        .map((sp) => (LIVESTOCK_HRS_PER_HEAD[sp] ?? 20) * 5) // assume ~5 head per species per paddock as a placeholder
        .reduce((a, b) => a + b, 0);
      rows.push({
        id: `paddock-${pa.id}`,
        category: 'paddocks',
        label: pa.name,
        qualifier: `${hectares.toFixed(2)} ha${pa.species.length > 0 ? ' · ' + pa.species.join(', ') : ''}`,
        hours: baseHrs,
      });
      if (speciesHrs > 0) {
        rows.push({
          id: `livestock-${pa.id}`,
          category: 'livestock',
          label: `${pa.name} herd`,
          qualifier: pa.species.join(', ') || 'mixed',
          hours: speciesHrs,
        });
      }
    }

    for (const p of paths) {
      const per100m = PATH_HRS_PER_100M[p.type] ?? 1;
      const hrs = (p.lengthM / 100) * per100m;
      if (hrs < 1) continue;
      rows.push({
        id: `path-${p.id}`,
        category: 'paths',
        label: p.name,
        qualifier: `${p.type.replace(/_/g, ' ')} · ${p.lengthM >= 1000 ? (p.lengthM / 1000).toFixed(1) + ' km' : Math.round(p.lengthM) + ' m'}`,
        hours: hrs,
      });
    }

    return rows.sort((a, b) => b.hours - a.hours);
  }, [structures, utilities, zones, crops, paddocks, paths]);

  const totalHours = useMemo(() => hotspots.reduce((acc, r) => acc + r.hours, 0), [hotspots]);

  const byCategory = useMemo(() => {
    const out: Record<Category, number> = {
      structures: 0, utilities: 0, zones: 0, crops: 0, livestock: 0, paths: 0, paddocks: 0,
    };
    for (const r of hotspots) out[r.category] += r.hours;
    return out;
  }, [hotspots]);

  const band = bandFor(totalHours);
  const fteEquivalent = totalHours / FTE_HOURS_PER_YEAR;
  const top5 = hotspots.slice(0, 5);

  if (hotspots.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Maintenance Complexity</h3>
            <p className={s.cardHint}>
              Annual labor-hours estimate, summed across every placed feature.
            </p>
          </div>
          <span className={s.heuristicBadge}>HEURISTIC</span>
        </div>
        <p className={s.empty}>
          No features placed yet — maintenance score runs once zones, structures,
          paddocks, crops, paths, or utilities are present on the plan.
        </p>
      </div>
    );
  }

  // Compute the bar fill — within the active band, where does totalHours sit?
  // Use a log-ish capped scale so the very-heavy band still moves.
  const maxScale = 8000;
  const fillPct = Math.min(100, (totalHours / maxScale) * 100);

  // Per-category bars use the largest category as the 100% reference.
  const categoryEntries = (Object.entries(byCategory) as [Category, number][])
    .filter(([, h]) => h > 0)
    .sort((a, b) => b[1] - a[1]);
  const maxCategoryHrs = categoryEntries.length > 0 ? categoryEntries[0]![1] : 1;

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Maintenance Complexity</h3>
          <p className={s.cardHint}>
            Annual labor-hours summed across every placed feature, with
            per-feature hotspot ranking and per-category breakdown.
            <em> {' '}1 FTE ≈ 2,000 hrs/year.</em>
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={s.headlineRow}>
        <div className={s.headlineBlock}>
          <span className={s.headlineValue}>{fmtHours(totalHours)}</span>
          <span className={s.headlineLabel}>Annual Labor</span>
        </div>
        <div className={s.headlineBlock}>
          <span className={s.headlineValue}>{fmtFte(totalHours)}</span>
          <span className={s.headlineLabel}>FTE Equivalent</span>
        </div>
        <div className={`${s.headlineBlock} ${s.headlineBand} ${band.className}`}>
          <span className={s.headlineValue}>{band.label}</span>
          <span className={s.headlineLabel}>Complexity</span>
        </div>
      </div>

      <div className={s.complexityBar} role="img" aria-label={`Complexity ${band.label} at ${Math.round(totalHours)} hours`}>
        <div className={`${s.complexityFill} ${band.className}`} style={{ width: `${fillPct}%` }} />
        <div className={s.complexityTick} style={{ left: `${(1500 / maxScale) * 100}%` }} title="Light / Moderate boundary (1,500 hrs)" />
        <div className={s.complexityTick} style={{ left: `${(3500 / maxScale) * 100}%` }} title="Moderate / Heavy boundary (3,500 hrs)" />
        <div className={s.complexityTick} style={{ left: `${(6000 / maxScale) * 100}%` }} title="Heavy / Very Heavy boundary (6,000 hrs)" />
      </div>
      <p className={s.bandCaption}>{band.description}</p>

      <div className={s.sectionTitle}>Top 5 Hotspots</div>
      <ul className={s.list}>
        {top5.map((r) => (
          <li key={r.id} className={s.row}>
            <div className={s.rowMain}>
              <span className={s.rowCat}>{CATEGORY_LABEL[r.category]}</span>
              <span className={s.rowTitle}>{r.label}</span>
              <span className={s.rowQual}>{r.qualifier}</span>
            </div>
            <span className={s.rowHours}>{fmtHours(r.hours)}/yr</span>
          </li>
        ))}
      </ul>

      <div className={s.sectionTitle}>Labor by Category</div>
      <div className={s.catList}>
        {categoryEntries.map(([cat, hrs]) => (
          <div key={cat} className={s.catRow}>
            <span className={s.catLabel}>{CATEGORY_LABEL[cat]}</span>
            <div className={s.catBarTrack}>
              <div className={s.catBarFill} style={{ width: `${(hrs / maxCategoryHrs) * 100}%` }} />
            </div>
            <span className={s.catValue}>{fmtHours(hrs)}/yr</span>
          </div>
        ))}
      </div>

      <p className={s.footnote}>
        Per-type labor-hour rates are owner-builder rules of thumb
        synthesized from regenerative-ag operations literature, not
        field-measured. Livestock burden assumes ~5 head per species per
        paddock as a placeholder (paddock entity does not yet carry head
        counts). Use this as decision-support for sizing the labor team
        and outside contracting envelope, not as a job-time estimating
        tool. Bands: Light ≤1,500 hrs · Moderate ≤3,500 · Heavy ≤6,000 ·
        Very Heavy &gt;6,000.
      </p>
    </div>
  );
}
