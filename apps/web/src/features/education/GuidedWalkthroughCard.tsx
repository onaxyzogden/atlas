/**
 * §19 GuidedWalkthroughCard — passive-learning-tour-walkthrough.
 *
 * Heuristic auto-grouper that builds 4–6 thematic field-trip / guided-tour
 * itineraries from features already placed on the site. Each tour carries
 * a short narrative seed, an ordered list of waypoints (each with a
 * "stop here and ask…" prompt), a recommended audience age band, an
 * estimated duration, and a best-season hint.
 *
 * Discipline: pure presentation. Reads existing structures / zones /
 * utilities; emits no new entities, no map overlays, no shared math.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import { useZoneStore, type LandZone, type ZoneCategory } from '../../store/zoneStore.js';
import { useUtilityStore, type Utility, type UtilityType } from '../../store/utilityStore.js';
import css from './GuidedWalkthroughCard.module.css';

// ─── Tour themes — deterministic feature buckets ──────────────────────────────

type ThemeId = 'water' | 'soil_food' | 'spiritual' | 'community' | 'livestock' | 'energy';

interface ThemeDefinition {
  id: ThemeId;
  label: string;
  glyph: string;
  narrative: string;          // 1-2 sentence educational arc
  ageBand: string;            // "All ages" | "Ages 8+" | "Ages 12+" | "Adult"
  bestSeason: string;         // "Spring–fall" | "Year-round" | "Dry season"
  structureTypes: ReadonlySet<StructureType>;
  zoneCategories: ReadonlySet<ZoneCategory>;
  utilityTypes: ReadonlySet<UtilityType>;
  prompts: {                  // Per-feature reflection prompt by feature kind
    structure: string;
    zone: string;
    utility: string;
  };
}

const THEMES: ThemeDefinition[] = [
  {
    id: 'water',
    label: 'Water Journey',
    glyph: '\u{1F4A7}',
    narrative: 'Trace a drop of rain from sky to soil to tap. Each waypoint shows one stage in the catchment-to-cistern-to-crop arc.',
    ageBand: 'All ages',
    bestSeason: 'Spring (after rains)',
    structureTypes: new Set(['greenhouse', 'bathhouse']),
    zoneCategories: new Set(['water_retention']),
    utilityTypes: new Set(['rain_catchment', 'water_tank', 'well_pump', 'greywater', 'septic']),
    prompts: {
      structure: 'How does this building shed or use water?',
      zone: 'What does this zone hold back, slow down, or soak in?',
      utility: 'Where does the water enter, and where does it leave?',
    },
  },
  {
    id: 'soil_food',
    label: 'Soil & Food',
    glyph: '\u{1F33E}',
    narrative: 'Follow nutrients from compost pile to garden bed to harvest. Where does fertility come from on this site?',
    ageBand: 'Ages 8+',
    bestSeason: 'Growing season',
    structureTypes: new Set(['greenhouse', 'barn', 'compost_station']),
    zoneCategories: new Set(['food_production']),
    utilityTypes: new Set(['compost', 'biochar']),
    prompts: {
      structure: 'What is grown, processed, or stored here?',
      zone: 'What does this bed produce, and how is its soil fed?',
      utility: 'How does this turn waste back into fertility?',
    },
  },
  {
    id: 'spiritual',
    label: 'Spiritual Path',
    glyph: '\u{2728}',
    narrative: 'A reflective walk through the places set apart for prayer, ablution, and contemplation. Pause at each.',
    ageBand: 'All ages',
    bestSeason: 'Year-round',
    structureTypes: new Set(['prayer_space', 'bathhouse']),
    zoneCategories: new Set(['spiritual', 'retreat']),
    utilityTypes: new Set([]),
    prompts: {
      structure: 'What intention is this space built for?',
      zone: 'What kind of stillness does this zone protect?',
      utility: '',
    },
  },
  {
    id: 'community',
    label: 'Community Hubs',
    glyph: '\u{1F465}',
    narrative: 'Where the site gathers — for meals, learning, and shared work. The social skeleton of the design.',
    ageBand: 'All ages',
    bestSeason: 'Spring–fall',
    structureTypes: new Set(['classroom', 'pavilion', 'fire_circle', 'tent_glamping']),
    zoneCategories: new Set(['commons', 'education']),
    utilityTypes: new Set([]),
    prompts: {
      structure: 'Who comes here, and what happens when they do?',
      zone: 'What kind of gathering does this zone hold?',
      utility: '',
    },
  },
  {
    id: 'livestock',
    label: 'Livestock Loop',
    glyph: '\u{1F404}',
    narrative: 'Follow the animal cycle — shelter, paddock, water, manure return. How does each animal serve the land that feeds it?',
    ageBand: 'Ages 8+',
    bestSeason: 'Spring–fall',
    structureTypes: new Set(['barn', 'animal_shelter']),
    zoneCategories: new Set(['livestock']),
    utilityTypes: new Set([]),
    prompts: {
      structure: 'Which animals live or work here, and why this spot?',
      zone: 'How is this paddock rotated, and what feeds back to the soil?',
      utility: '',
    },
  },
  {
    id: 'energy',
    label: 'Energy & Shelter',
    glyph: '\u{2600}',
    narrative: 'Where power is captured, stored, and used. The off-grid metabolism of the homestead, room by room.',
    ageBand: 'Ages 12+',
    bestSeason: 'Year-round',
    structureTypes: new Set(['cabin', 'yurt', 'workshop', 'earthship']),
    zoneCategories: new Set(['habitation']),
    utilityTypes: new Set(['solar_panel', 'battery_room', 'generator']),
    prompts: {
      structure: 'How is this building powered, heated, and cooled?',
      zone: 'What kind of daily life happens here?',
      utility: 'How much does this produce, store, or consume?',
    },
  },
];

// ─── Waypoint shape & ordering ────────────────────────────────────────────────

type WaypointKind = 'structure' | 'zone' | 'utility';

interface Waypoint {
  id: string;
  kind: WaypointKind;
  name: string;
  typeLabel: string;
  prompt: string;
  center: [number, number] | null; // [lng, lat] for spatial sort; null for zones without centroid
}

interface Tour {
  theme: ThemeDefinition;
  waypoints: Waypoint[];
  durationMin: number;
}

// Approximate centroid of the first ring of a polygon — flat-earth average.
// Returns null for unsupported geometry types. Lightweight enough not to need turf.
function polygonCentroid(geom: GeoJSON.Geometry | undefined): [number, number] | null {
  if (!geom) return null;
  if (geom.type === 'Polygon' && geom.coordinates[0] && geom.coordinates[0].length > 0) {
    const ring = geom.coordinates[0];
    let sx = 0, sy = 0, n = 0;
    for (const pt of ring) {
      const x = pt[0]; const y = pt[1];
      if (typeof x === 'number' && typeof y === 'number') { sx += x; sy += y; n++; }
    }
    if (n === 0) return null;
    return [sx / n, sy / n];
  }
  if (geom.type === 'MultiPolygon' && geom.coordinates[0]?.[0]) {
    return polygonCentroid({ type: 'Polygon', coordinates: geom.coordinates[0] });
  }
  return null;
}

// Greedy nearest-neighbour ordering — start from the southwesternmost waypoint
// and walk to the closest unvisited each step. Good enough for a 3-8 stop tour;
// a true TSP isn't worth the dependency for this many points.
function orderWaypointsByProximity(waypoints: Waypoint[]): Waypoint[] {
  const located = waypoints.filter((w) => w.center !== null);
  const unlocated = waypoints.filter((w) => w.center === null);
  if (located.length <= 1) return [...located, ...unlocated];

  // Start at the SW-most located waypoint (lowest lat, then lowest lng).
  let startIdx = 0;
  for (let i = 1; i < located.length; i++) {
    const a = located[i]!.center!;
    const b = located[startIdx]!.center!;
    if (a[1] < b[1] || (a[1] === b[1] && a[0] < b[0])) startIdx = i;
  }

  const remaining = [...located];
  const ordered: Waypoint[] = [];
  let current = remaining.splice(startIdx, 1)[0]!;
  ordered.push(current);

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    const [cx, cy] = current.center!;
    for (let i = 0; i < remaining.length; i++) {
      const [x, y] = remaining[i]!.center!;
      const dx = x - cx; const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) { bestDist = d2; bestIdx = i; }
    }
    current = remaining.splice(bestIdx, 1)[0]!;
    ordered.push(current);
  }

  return [...ordered, ...unlocated];
}

// ─── Tour builder ─────────────────────────────────────────────────────────────

const STRUCTURE_LABEL: Partial<Record<StructureType, string>> = {
  cabin: 'Cabin', yurt: 'Yurt', pavilion: 'Pavilion', greenhouse: 'Greenhouse',
  barn: 'Barn', workshop: 'Workshop', prayer_space: 'Prayer space',
  bathhouse: 'Bathhouse', classroom: 'Classroom', storage: 'Storage',
  animal_shelter: 'Animal shelter', compost_station: 'Compost station',
  tent_glamping: 'Glamping tent', fire_circle: 'Fire circle',
  earthship: 'Earthship',
};

const ZONE_LABEL: Partial<Record<ZoneCategory, string>> = {
  habitation: 'Habitation zone', food_production: 'Food production',
  livestock: 'Livestock paddock', commons: 'Commons',
  spiritual: 'Spiritual ground', education: 'Education ground',
  retreat: 'Retreat ground', conservation: 'Conservation',
  water_retention: 'Water-retention zone',
};

const UTILITY_LABEL: Partial<Record<UtilityType, string>> = {
  solar_panel: 'Solar array', battery_room: 'Battery room', generator: 'Generator',
  water_tank: 'Water tank', well_pump: 'Well / pump', greywater: 'Greywater system',
  septic: 'Septic system', rain_catchment: 'Rain catchment',
  compost: 'Compost station', biochar: 'Biochar kiln',
};

function buildTours(structures: Structure[], zones: LandZone[], utilities: Utility[]): Tour[] {
  return THEMES.map((theme) => {
    const waypoints: Waypoint[] = [];

    for (const s of structures) {
      if (theme.structureTypes.has(s.type)) {
        waypoints.push({
          id: `s:${s.id}`,
          kind: 'structure',
          name: s.name,
          typeLabel: STRUCTURE_LABEL[s.type] ?? s.type.replace(/_/g, ' '),
          prompt: theme.prompts.structure,
          center: s.center ?? polygonCentroid(s.geometry),
        });
      }
    }
    for (const z of zones) {
      if (theme.zoneCategories.has(z.category)) {
        waypoints.push({
          id: `z:${z.id}`,
          kind: 'zone',
          name: z.name,
          typeLabel: ZONE_LABEL[z.category] ?? z.category.replace(/_/g, ' '),
          prompt: theme.prompts.zone,
          center: polygonCentroid(z.geometry),
        });
      }
    }
    for (const u of utilities) {
      if (theme.utilityTypes.has(u.type)) {
        waypoints.push({
          id: `u:${u.id}`,
          kind: 'utility',
          name: u.name,
          typeLabel: UTILITY_LABEL[u.type] ?? u.type.replace(/_/g, ' '),
          prompt: theme.prompts.utility,
          center: u.center ?? null,
        });
      }
    }

    const ordered = orderWaypointsByProximity(waypoints);
    // Approximate ~6 minutes per stop (read sign, observe, ask question).
    const durationMin = ordered.length * 6;

    return { theme, waypoints: ordered, durationMin };
  })
  .filter((t) => t.waypoints.length >= 2); // hide tours with <2 waypoints
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GuidedWalkthroughCardProps {
  project: LocalProject;
}

export default function GuidedWalkthroughCard({ project }: GuidedWalkthroughCardProps) {
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const tours = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    return buildTours(structures, zones, utilities);
  }, [allStructures, allZones, allUtilities, project.id]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h2 className={css.cardTitle}>Guided Walkthrough Tours</h2>
          <p className={css.cardHint}>
            Auto-suggested thematic tours assembled from the features already
            placed on this site. Each tour is an ordered itinerary with prompts
            for the visitor to consider at every stop.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      {tours.length === 0 ? (
        <div className={css.empty}>
          No thematic tours can be built yet — place at least two related
          features (e.g. rain catchment + water tank for the Water Journey,
          or prayer space + bathhouse for the Spiritual Path).
        </div>
      ) : (
        <div className={css.tourList}>
          {tours.map((tour) => (
            <article key={tour.theme.id} className={`${css.tour} ${css[`tour_${tour.theme.id}`] ?? ''}`}>
              <header className={css.tourHead}>
                <span className={css.tourGlyph}>{tour.theme.glyph}</span>
                <div className={css.tourMeta}>
                  <h3 className={css.tourLabel}>{tour.theme.label}</h3>
                  <span className={css.tourSub}>
                    {tour.waypoints.length} stops &middot; ~{tour.durationMin} min &middot; {tour.theme.ageBand} &middot; {tour.theme.bestSeason}
                  </span>
                </div>
              </header>
              <p className={css.tourNarrative}>{tour.theme.narrative}</p>
              <ol className={css.waypointList}>
                {tour.waypoints.map((w, i) => (
                  <li key={w.id} className={css.waypoint}>
                    <span className={css.waypointNum}>{i + 1}</span>
                    <div className={css.waypointBody}>
                      <div className={css.waypointHead}>
                        <span className={css.waypointName}>{w.name}</span>
                        <span className={css.waypointType}>{w.typeLabel}</span>
                      </div>
                      {w.prompt && <p className={css.waypointPrompt}>&ldquo;{w.prompt}&rdquo;</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}

      <p className={css.footnote}>
        Itineraries are <em>presentation-only suggestions</em> &mdash; ordering uses
        a nearest-neighbour walk from the southwesternmost stop. A real tour
        playback engine (auto-advance, voiceover, slide mode) is the §19 P4
        deliverable.
      </p>
    </section>
  );
}
