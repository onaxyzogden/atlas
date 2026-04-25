/**
 * §19 EducationalRouteOverlaysCard — treats every design path as a guided-
 * learning route. For each path, samples points along its LineString,
 * scans nearby placed features (structures, utilities, zones, crop areas)
 * within a path-type-aware proximity threshold, and tags the route with
 * the educational themes those neighbors expose.
 *
 * Pure presentation — no shared-package math, no map overlays, no new
 * entities. Uses a flat-earth distance approximation (lat/lng × meters
 * conversion) so we don't pull in turf for what is essentially a
 * narrative-grade scan.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  usePathStore,
  PATH_TYPE_CONFIG,
  type DesignPath,
  type PathType,
} from '../../store/pathStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../store/utilityStore.js';
import { useZoneStore, type LandZone, type ZoneCategory } from '../../store/zoneStore.js';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import css from './EducationalRouteOverlaysCard.module.css';

/* ── Theme catalogue ───────────────────────────────────────────────────── */

type ThemeId =
  | 'spiritual'
  | 'education'
  | 'food'
  | 'livestock'
  | 'water'
  | 'energy'
  | 'closed_loops'
  | 'community'
  | 'wildlife'
  | 'agroforestry'
  | 'microclimate'
  | 'wayfinding'
  | 'shelter';

interface ThemeMeta {
  label: string;
  glyph: string;
  blurb: string;
}

const THEME_META: Record<ThemeId, ThemeMeta> = {
  spiritual: { label: 'Spiritual contemplation', glyph: '\u2728', blurb: 'Prayer, reflection, qiblah orientation' },
  education: { label: 'Education', glyph: '\u{1F4D6}', blurb: 'Classrooms, teaching gardens, demonstration plots' },
  food: { label: 'Food systems', glyph: '\u{1F33E}', blurb: 'Production beds, kitchen gardens, market crops' },
  livestock: { label: 'Livestock care', glyph: '\u{1F404}', blurb: 'Animal shelters, paddocks, feed handling' },
  water: { label: 'Water systems', glyph: '\u{1F4A7}', blurb: 'Catchment, storage, retention, distribution' },
  energy: { label: 'Energy systems', glyph: '\u26A1', blurb: 'Solar, batteries, generators, lighting load' },
  closed_loops: { label: 'Closed loops', glyph: '\u267B', blurb: 'Composting, biochar, waste sorting, greywater' },
  community: { label: 'Community gathering', glyph: '\u{1F465}', blurb: 'Pavilions, fire circles, commons, lookouts' },
  wildlife: { label: 'Wildlife & ecology', glyph: '\u{1F33F}', blurb: 'Conservation, habitat corridors, pollinator strips' },
  agroforestry: { label: 'Agroforestry', glyph: '\u{1F333}', blurb: 'Orchards, food forests, silvopasture' },
  microclimate: { label: 'Microclimate', glyph: '\u{1F343}', blurb: 'Windbreaks, shelterbelts, canopy modulation' },
  wayfinding: { label: 'Wayfinding', glyph: '\u{1F9ED}', blurb: 'Lighting, arrival sequence, navigational cues' },
  shelter: { label: 'Habitation', glyph: '\u{1F3E1}', blurb: 'Cabins, yurts, earthships, retreat dwellings' },
};

/* ── Theme mapping per feature kind ────────────────────────────────────── */

const STRUCTURE_THEMES: Partial<Record<StructureType, ThemeId[]>> = {
  cabin: ['shelter'],
  yurt: ['shelter'],
  earthship: ['shelter', 'energy'],
  pavilion: ['community'],
  fire_circle: ['community'],
  lookout: ['community', 'wayfinding'],
  greenhouse: ['food', 'agroforestry'],
  barn: ['livestock'],
  animal_shelter: ['livestock'],
  workshop: ['education'],
  classroom: ['education'],
  prayer_space: ['spiritual'],
  bathhouse: ['water'],
  compost_station: ['closed_loops'],
  storage: [],
  water_pump_house: ['water'],
  well: ['water'],
  water_tank: ['water'],
  tent_glamping: ['shelter', 'community'],
  solar_array: ['energy'],
};

const UTILITY_THEMES: Partial<Record<UtilityType, ThemeId[]>> = {
  solar_panel: ['energy'],
  battery_room: ['energy'],
  generator: ['energy'],
  water_tank: ['water'],
  well_pump: ['water'],
  greywater: ['closed_loops', 'water'],
  septic: ['closed_loops'],
  rain_catchment: ['water', 'closed_loops'],
  lighting: ['wayfinding'],
  firewood_storage: ['shelter'],
  waste_sorting: ['closed_loops'],
  compost: ['closed_loops'],
  biochar: ['closed_loops'],
  tool_storage: [],
  laundry_station: ['water'],
};

const ZONE_THEMES: Partial<Record<ZoneCategory, ThemeId[]>> = {
  habitation: ['shelter'],
  food_production: ['food'],
  livestock: ['livestock'],
  commons: ['community'],
  spiritual: ['spiritual'],
  education: ['education'],
  retreat: ['shelter', 'spiritual'],
  conservation: ['wildlife'],
  water_retention: ['water'],
  infrastructure: ['energy'],
  access: ['wayfinding'],
  buffer: ['microclimate'],
  future_expansion: [],
};

const CROP_THEMES: Partial<Record<CropAreaType, ThemeId[]>> = {
  orchard: ['agroforestry', 'food'],
  food_forest: ['agroforestry', 'food', 'wildlife'],
  silvopasture: ['agroforestry', 'livestock'],
  windbreak: ['microclimate'],
  shelterbelt: ['microclimate'],
  pollinator_strip: ['wildlife', 'microclimate'],
  market_garden: ['food'],
  garden_bed: ['food'],
  row_crop: ['food'],
  nursery: ['food', 'education'],
};

/* ── Path-type proximity thresholds (meters) ───────────────────────────── */

const PROXIMITY_M_BY_TYPE: Record<PathType, number> = {
  main_road: 60,
  secondary_road: 50,
  emergency_access: 40,
  service_road: 40,
  pedestrian_path: 25,
  trail: 30,
  farm_lane: 50,
  animal_corridor: 40,
  grazing_route: 60,
  arrival_sequence: 50,
  quiet_route: 25,
};

/* ── Geometry helpers (no turf) ────────────────────────────────────────── */

/** Approximate metres per degree latitude/longitude at a given latitude. */
function metersPerDegree(latDeg: number): { mPerLat: number; mPerLng: number } {
  const cosLat = Math.cos((latDeg * Math.PI) / 180);
  return { mPerLat: 110_540, mPerLng: 111_320 * cosLat };
}

/** Straight-line distance between two [lng,lat] points in metres (flat-earth). */
function distMeters(a: [number, number], b: [number, number]): number {
  const { mPerLat, mPerLng } = metersPerDegree((a[1] + b[1]) / 2);
  const dx = (a[0] - b[0]) * mPerLng;
  const dy = (a[1] - b[1]) * mPerLat;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Sample N points along a LineString proportional to segment length. */
function sampleLine(line: GeoJSON.LineString, samples: number): [number, number][] {
  const coords = line.coordinates as [number, number][];
  if (coords.length === 0) return [];
  if (coords.length === 1) return [coords[0]!];

  // Cumulative length per segment.
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const d = distMeters(coords[i]!, coords[i + 1]!);
    segLens.push(d);
    total += d;
  }
  if (total === 0) return [coords[0]!];

  const out: [number, number][] = [];
  for (let i = 0; i < samples; i++) {
    const target = (i / (samples - 1 || 1)) * total;
    let acc = 0;
    for (let j = 0; j < segLens.length; j++) {
      const segLen = segLens[j]!;
      if (acc + segLen >= target || j === segLens.length - 1) {
        const t = segLen > 0 ? (target - acc) / segLen : 0;
        const a = coords[j]!;
        const b = coords[j + 1]!;
        out.push([
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t,
        ]);
        break;
      }
      acc += segLen;
    }
  }
  return out;
}

/** Compute centroid of a Polygon or MultiPolygon (first ring). */
function polygonCentroid(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number] | null {
  let ring: number[][] | undefined;
  if (geom.type === 'Polygon') {
    ring = geom.coordinates[0];
  } else {
    ring = geom.coordinates[0]?.[0];
  }
  if (!ring || ring.length === 0) return null;
  let sx = 0, sy = 0, n = 0;
  for (const c of ring) {
    if (c.length >= 2) { sx += c[0]!; sy += c[1]!; n += 1; }
  }
  return n > 0 ? [sx / n, sy / n] : null;
}

/** Min distance from an [lng,lat] point to the nearest sampled point on a path. */
function minDistanceToPath(point: [number, number], samples: [number, number][]): number {
  let best = Infinity;
  for (const s of samples) {
    const d = distMeters(point, s);
    if (d < best) best = d;
  }
  return best;
}

/* ── Per-path scan ─────────────────────────────────────────────────────── */

interface RouteOverlay {
  pathId: string;
  pathName: string;
  pathType: PathType;
  pathTypeLabel: string;
  lengthM: number;
  proximityM: number;
  themes: ThemeId[];
  encounteredCount: number;
  /** First-pass list of feature names along the route, capped for display. */
  featureCallouts: string[];
}

function buildOverlay(
  path: DesignPath,
  structures: Structure[],
  utilities: Utility[],
  zones: LandZone[],
  cropAreas: CropArea[],
): RouteOverlay {
  const proximityM = PROXIMITY_M_BY_TYPE[path.type] ?? 30;
  // 24 samples is enough resolution for a path of any practical length —
  // a 1 km path gets ~42 m resolution which is finer than our threshold.
  const samples = sampleLine(path.geometry, 24);

  const themeSet = new Set<ThemeId>();
  const callouts: string[] = [];
  let encountered = 0;

  // Structures
  for (const s of structures) {
    if (minDistanceToPath(s.center, samples) <= proximityM) {
      encountered += 1;
      callouts.push(s.name || `(${s.type})`);
      for (const t of STRUCTURE_THEMES[s.type] ?? []) themeSet.add(t);
    }
  }
  // Utilities
  for (const u of utilities) {
    if (minDistanceToPath(u.center, samples) <= proximityM) {
      encountered += 1;
      callouts.push(u.name || `(${u.type})`);
      for (const t of UTILITY_THEMES[u.type] ?? []) themeSet.add(t);
    }
  }
  // Zones
  for (const z of zones) {
    const c = polygonCentroid(z.geometry);
    if (c && minDistanceToPath(c, samples) <= proximityM * 1.5) {
      // Zones are larger; loosen the threshold a bit so a path that runs
      // through the edge of a big zone still picks it up.
      encountered += 1;
      callouts.push(z.name || `(${z.category})`);
      for (const t of ZONE_THEMES[z.category] ?? []) themeSet.add(t);
    }
  }
  // Crop areas
  for (const c of cropAreas) {
    const ctr = polygonCentroid(c.geometry);
    if (ctr && minDistanceToPath(ctr, samples) <= proximityM * 1.25) {
      encountered += 1;
      callouts.push(c.name || `(${c.type})`);
      for (const t of CROP_THEMES[c.type] ?? []) themeSet.add(t);
    }
  }

  // Stable theme order: order keys of THEME_META.
  const themes = (Object.keys(THEME_META) as ThemeId[]).filter((t) => themeSet.has(t));

  return {
    pathId: path.id,
    pathName: path.name || '(unnamed)',
    pathType: path.type,
    pathTypeLabel: PATH_TYPE_CONFIG[path.type]?.label ?? path.type,
    lengthM: path.lengthM,
    proximityM,
    themes,
    encounteredCount: encountered,
    featureCallouts: callouts.slice(0, 6),
  };
}

/* ── Component ─────────────────────────────────────────────────────────── */

interface Props {
  project: LocalProject;
}

export default function EducationalRouteOverlaysCard({ project }: Props) {
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allZones = useZoneStore((s) => s.zones);
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const paths = useMemo(
    () => allPaths.filter((p) => p.projectId === project.id),
    [allPaths, project.id],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );

  const overlays = useMemo<RouteOverlay[]>(
    () => paths.map((p) => buildOverlay(p, structures, utilities, zones, cropAreas)),
    [paths, structures, utilities, zones, cropAreas],
  );

  // Site-wide theme rollup — which themes does the path network as a
  // whole expose to a walker / steward / visitor?
  const siteThemes = useMemo<ThemeId[]>(() => {
    const set = new Set<ThemeId>();
    for (const o of overlays) for (const t of o.themes) set.add(t);
    return (Object.keys(THEME_META) as ThemeId[]).filter((t) => set.has(t));
  }, [overlays]);

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'EDUCATIONAL ROUTE NARRATIVES (\u00A719)'}</h3>

      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>What does each path teach?</h4>
            <p className={css.cardHint}>
              Every drawn path is a guided-learning route. Each one is
              scanned for nearby structures, utilities, zones, and crop
              areas, then tagged with the educational themes those features
              expose{' \u2014 '}so a visitor walking a trail or driving an
              arrival sequence can be narrated through what they pass.
            </p>
          </div>
          <span className={css.heuristicBadge}>Planning-grade</span>
        </div>

        {paths.length === 0 ? (
          <div className={css.empty}>
            <p>
              No paths drawn yet. Add a trail, arrival sequence, or grazing
              route from the Map view to surface the themes each route
              passes through.
            </p>
          </div>
        ) : (
          <>
            {/* Site-wide theme rollup */}
            <div className={css.siteRollup}>
              <span className={css.siteRollupLabel}>SITE-WIDE THEMES SURFACED</span>
              {siteThemes.length > 0 ? (
                <div className={css.themeChips}>
                  {siteThemes.map((t) => (
                    <span key={t} className={css.themeChip} title={THEME_META[t].blurb}>
                      <span className={css.themeChipGlyph}>{THEME_META[t].glyph}</span>
                      {THEME_META[t].label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={css.siteRollupEmpty}>
                  Paths are drawn but pass too far from any placed feature to
                  pick up themes. Consider routing them past a structure,
                  zone, or crop area.
                </p>
              )}
            </div>

            {/* Per-path rows */}
            <div className={css.routeList}>
              {overlays.map((o) => (
                <div key={o.pathId} className={css.routeRow}>
                  <div className={css.routeHead}>
                    <span className={css.routeName}>{o.pathName}</span>
                    <span className={css.routeType}>{o.pathTypeLabel}</span>
                  </div>
                  <div className={css.routeMeta}>
                    {`${Math.round(o.lengthM).toLocaleString()} m \u00B7 scanned at \u00B1${o.proximityM} m \u00B7 ${o.encounteredCount} features along route`}
                  </div>
                  {o.themes.length > 0 ? (
                    <>
                      <div className={css.themeChipsSm}>
                        {o.themes.map((t) => (
                          <span key={t} className={css.themeChipSm} title={THEME_META[t].blurb}>
                            <span className={css.themeChipGlyph}>{THEME_META[t].glyph}</span>
                            {THEME_META[t].label}
                          </span>
                        ))}
                      </div>
                      {o.featureCallouts.length > 0 && (
                        <div className={css.routeCallouts}>
                          <span className={css.routeCalloutsLabel}>Passes</span>
                          {o.featureCallouts.join(' \u00B7 ')}
                          {o.encounteredCount > o.featureCallouts.length && (
                            <span className={css.routeCalloutsMore}>
                              {` \u00B7 +${o.encounteredCount - o.featureCallouts.length} more`}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={css.routeEmpty}>
                      Route runs through open ground{' \u2014 '}no nearby
                      features to interpret. Use it as a contemplation route
                      or extend it past a placed feature.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <p className={css.footnote}>
          <em>Heuristic.</em> Proximity threshold varies by path kind
          {' \u2014 '}quiet routes and pedestrian paths use a tight 25 m
          radius (the walker reads what's right there), grazing routes use
          60 m (animals and stewards both pick things up at distance). Zone
          proximity is loosened by 50% so a path through the edge of a large
          food-production or conservation zone still picks it up. Themes are
          designer-authored mappings from feature kind{' \u2192 '}educational
          intent and are intended as <strong>narrative scaffolding</strong>,
          not tour-guide copy.
        </p>
      </div>
    </div>
  );
}
