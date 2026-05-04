/**
 * Builtin sample observe-stage fixture.
 *
 * The DB-backed builtin "351 House — Atlas Sample" only ships server-side
 * tables (projects, project_layers, terrain_analysis, …). The OBSERVE
 * (Stage 1 — Roots & Diagnosis) modules in
 * `apps/web/src/features/observe/ObserveHub.tsx` read from purely
 * client-side Zustand stores that the migration never populates, so the
 * sample lands looking empty.
 *
 * This module hydrates those stores with realistic 351-House content
 * keyed to the local project id. Called once per project from
 * `applyBuiltinsToStore` in `projectStore.ts`. Idempotent — re-runs are
 * no-ops when entries already reference the local id.
 *
 * Plan: ~/.claude/plans/few-concerns-shiny-quokka.md
 */

import { useVisionStore } from '../store/visionStore.js';
import {
  useExternalForcesStore,
  type HazardEvent,
  type SectorArrow,
} from '../store/externalForcesStore.js';
import {
  useTopographyStore,
  type Transect,
} from '../store/topographyStore.js';
import {
  useSoilSampleStore,
  type SoilSample,
} from '../store/soilSampleStore.js';
import {
  useEcologyStore,
  type EcologyObservation,
} from '../store/ecologyStore.js';
import {
  useSwotStore,
  type SwotEntry,
} from '../store/swotStore.js';

// ─── Project narrative ──────────────────────────────────────────────────
// Spread onto the LocalProject from `applyBuiltinsToStore` for any builtin
// row. Mirrors the migration's owner_notes / zoning_notes / access_notes /
// water_rights_notes copy so the Notes panel and the Diagnosis Report read
// real content even when the public /builtins endpoint strips these fields.

export const BUILTIN_PROJECT_NARRATIVE = {
  ownerNotes:
    'Family property since 2019. Previous use: cash crop (corn/soy rotation). Tile-drained. Remnant hedgerow on north boundary. Seasonal creek runs SW to NE through lower field.',
  zoningNotes:
    'A (Agricultural) zone — Town of Halton Hills. Permitted: single dwelling, farm operation, home occupation. Conditional: B&B, agritourism, farm winery.',
  accessNotes:
    'Single access from Glenashton Dr (municipal road). 150m gravel lane to building envelope. Second emergency access possible from north boundary.',
  waterRightsNotes:
    'Conservation Halton regulated area. No water-taking permit currently held. Seasonal creek is mapped watercourse — 30m development setback applies.',
  visionStatement:
    'A small Carolinian homestead that produces food, hosts learning, and integrates daily prayer with regenerative care of land — modest scale, long horizon.',
} as const;

// ─── Seeder ────────────────────────────────────────────────────────────

export function seedBuiltinObserveData(localProjectId: string): void {
  seedVision(localProjectId);
  seedRegional(localProjectId);
  seedHazardsAndSectors(localProjectId);
  seedTopography(localProjectId);
  seedSoilSamples(localProjectId);
  seedEcology(localProjectId);
  seedSwot(localProjectId);
  // siteDataStore (Tier-1 climate/elevation summaries) is now populated
  // by `applyBuiltinsToStore` directly from the public /projects/builtins
  // payload (or LOCAL_BUILTIN_FALLBACK_LAYERS when offline) — no fixture
  // duplication here. See projectStore.ts.
}

// ─── Module 1: Human Context ───────────────────────────────────────────

function seedVision(projectId: string): void {
  const store = useVisionStore.getState();
  // Idempotency: if a vision entry already exists for this project AND has
  // a steward name, treat as already seeded.
  const existing = store.getVisionData(projectId);
  if (existing?.steward?.name) return;

  store.ensureDefaults(projectId);
  store.updateSteward(projectId, {
    name: 'Yousef Abdelsalam',
    age: 34,
    occupation: 'Software / regenerative design',
    lifestyle: 'active',
    maintenanceHrsInitial: 20,
    maintenanceHrsOngoing: 8,
    budget: '$15k/yr establishment, $3k/yr ongoing',
    skills: ['carpentry (intermediate)', 'orcharding', 'gardening', 'CAD/GIS'],
    vision: BUILTIN_PROJECT_NARRATIVE.visionStatement,
  });
  store.updatePhaseNote(
    projectId,
    'year1',
    'Observe protractedly: full seasonal hydrology survey, soil sampling on a 30 m grid, sun-arc and frost-pocket mapping, baseline bird/insect counts. Nothing planted in the field — only nursery beds and the kitchen garden near the house.',
  );
  store.updatePhaseNote(
    projectId,
    'years2to3',
    'Earthworks: keyline contour swales on lower field, headwater pond at NE corner (within Conservation Halton setback envelope). Establish windbreak hedgerow on south boundary. Stand up 0.5 ac silvopasture nursery — black locust, hazelnut, sea buckthorn.',
  );
  store.updatePhaseNote(
    projectId,
    'years4plus',
    'Plant 2 ac mixed orchard (pawpaw, persimmon, heritage apple). Begin rotational poultry on lower field. Build outdoor musalla pavilion at east overlook. Open hosting season for retreat days.',
  );
}

// ─── Module 1 (regional): Indigenous & Regional Context ───────────────

function seedRegional(projectId: string): void {
  const store = useVisionStore.getState();
  store.ensureDefaults(projectId);
  const existing = store.getVisionData(projectId);
  // Idempotency: if any regional content is already populated, leave it.
  if (
    existing?.regional?.indigenousNames?.length ||
    existing?.regional?.culturalStrengths?.length ||
    existing?.regional?.culturalChallenges?.length ||
    existing?.regional?.localNetwork?.length
  ) {
    return;
  }

  store.updateRegional(projectId, {
    indigenousNames: [
      'Mississaugas of the Credit First Nation — Treaty 19 (1818) lands',
      'Haudenosaunee Confederacy — historical territory under the Dish With One Spoon wampum',
      'Anishinaabe / Wendat — pre-contact seasonal use of the Sixteen Mile Creek corridor',
    ],
    culturalStrengths: [
      'Active Halton Hills agricultural community — long-running farmer cooperatives and seed exchanges',
      'Conservation Halton stewardship programs (riparian planting, well-decommissioning grants)',
      'Active Muslim community in Mississauga / Brampton (~25 min drive) — supports retreat hosting and weekend gatherings',
    ],
    culturalChallenges: [
      'Land-acknowledgement protocols still maturing in rural Halton; consult Mississaugas of the Credit Department of Consultation & Accommodation before any earthworks',
      'Seasonal creek setback corridor overlaps with potentially significant pre-contact archaeological sites — Stage 1 archaeological assessment recommended before excavation',
    ],
    localNetwork: [
      {
        id: crypto.randomUUID(),
        name: 'Conservation Halton — Stewardship Services',
        type: 'regulator',
        contact: 'stewardship@hrca.on.ca',
      },
      {
        id: crypto.randomUUID(),
        name: 'Mississaugas of the Credit — Department of Consultation & Accommodation',
        type: 'first_nation',
        contact: 'consultation@mncfn.ca',
      },
      {
        id: crypto.randomUUID(),
        name: 'Halton Region Federation of Agriculture',
        type: 'community',
        contact: 'info@haltonfa.com',
      },
    ],
  });
}

// ─── Module 2 + 5: Hazards & Sectors ──────────────────────────────────

function seedHazardsAndSectors(projectId: string): void {
  const store = useExternalForcesStore.getState();
  if (store.hazards.some((h) => h.projectId === projectId)) return; // idempotent

  const now = new Date().toISOString();
  const hazards: HazardEvent[] = [
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'flood',
      date: '2023-04',
      severity: 'high',
      description:
        'Spring overland flooding from regulated creek — 30 m setback corridor saturated for ~2 weeks. Lower field unworkable until late May.',
      linkedVulnerabilities: ['orchard establishment', 'access lane culvert'],
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'other',
      date: '2024-05-12',
      severity: 'med',
      description:
        'Late-spring frost pocket in lower field — radiative cooling night, -2 °C at dawn. Loss of early apple bloom on south slope.',
      linkedVulnerabilities: ['orchard establishment'],
      createdAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'blizzard',
      date: '2022-01',
      severity: 'low',
      description:
        'Heavy snow load on outbuilding roof — minor truss deflection, no failure. Roof angle should be revisited before any new structures.',
      createdAt: now,
    },
  ];
  hazards.forEach((h) => store.addHazard(h));

  const sectors: SectorArrow[] = [
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'sun_summer',
      bearingDeg: 180,
      arcDeg: 120,
      intensity: 'high',
      notes: 'Summer solstice arc — high overhead, broad coverage of upper field.',
    },
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'sun_winter',
      bearingDeg: 180,
      arcDeg: 60,
      intensity: 'med',
      notes: 'Winter solstice arc — low, narrow. Drives orchard placement.',
    },
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'wind_prevailing',
      bearingDeg: 250,
      arcDeg: 40,
      intensity: 'med',
      notes: 'Prevailing SW wind — informs windbreak placement on south boundary.',
    },
    {
      id: crypto.randomUUID(),
      projectId,
      type: 'noise',
      bearingDeg: 90,
      arcDeg: 25,
      intensity: 'low',
      notes: 'Low-frequency road noise from Glenashton Dr to the east.',
    },
  ];
  sectors.forEach((s) => store.addSector(s));
}

// ─── Module 3: Topography ─────────────────────────────────────────────

function seedTopography(projectId: string): void {
  const store = useTopographyStore.getState();
  if (store.transects.some((t) => t.projectId === projectId)) return;

  const transect: Transect = {
    id: crypto.randomUUID(),
    projectId,
    name: 'House to creek transect',
    pointA: [-79.70450, 43.50550],
    pointB: [-79.70550, 43.50450],
    sampledAt: new Date().toISOString(),
    elevationProfileM: [268.4, 266.9, 263.7, 259.8, 255.1, 250.4, 246.2, 243.0, 241.4, 240.6, 240.1],
    sourceApi: 'demo (Atlas sample)',
    confidence: 'medium',
    totalDistanceM: 250,
    notes:
      'NE→SW from house pad down to seasonal creek. ~28 m total drop over 250 m — roughly 11 % average grade. Steepest section is the middle third (255→245 m) where the lower field breaks toward the creek corridor.',
  };
  store.addTransect(transect);
}

// ─── Module 4a: Soil samples ──────────────────────────────────────────

function seedSoilSamples(projectId: string): void {
  const store = useSoilSampleStore.getState();
  if (store.samples.some((s) => s.projectId === projectId)) return;

  const now = new Date().toISOString();
  const samples: SoilSample[] = [
    {
      id: crypto.randomUUID(),
      projectId,
      sampleDate: '2024-06-04',
      label: 'House yard — kitchen garden bed',
      location: [-79.70460, 43.50540],
      depth: '0_5cm',
      ph: 6.4,
      organicMatterPct: 4.2,
      texture: 'silt_loam',
      cecMeq100g: 18.4,
      ecDsM: 0.42,
      bulkDensityGCm3: 1.21,
      npkPpm: 'N 22 / P 38 / K 165',
      biologicalActivity: 'moderate',
      notes:
        'Visible earthworm casts; root mat well developed under the existing perennial bed. Small chunks of granular crumb structure.',
      lab: 'A&L Western',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      sampleDate: '2024-06-05',
      label: 'Lower field — west corner',
      location: [-79.70530, 43.50480],
      depth: '5_15cm',
      ph: 6.8,
      organicMatterPct: 3.1,
      texture: 'clay_loam',
      cecMeq100g: 22.7,
      ecDsM: 0.51,
      bulkDensityGCm3: 1.38,
      npkPpm: 'N 14 / P 22 / K 188',
      biologicalActivity: 'low',
      notes:
        'Compaction layer at ~12 cm depth (likely tile-drainage era plough pan). Few visible roots beyond that. Minimal earthworm activity in core.',
      lab: 'A&L Western',
      jarTest: { sandPct: 25, siltPct: 40, clayPct: 35 },
      percolationInPerHr: 0.6,
      depthToBedrockM: 1.8,
      createdAt: now,
      updatedAt: now,
    },
  ];
  samples.forEach((s) => store.addSample(s));
}

// ─── Module 4b: Ecology observations ──────────────────────────────────

function seedEcology(projectId: string): void {
  const store = useEcologyStore.getState();
  if (store.ecology.some((o) => o.projectId === projectId)) return;

  const observedAt = new Date().toISOString();
  const observations: EcologyObservation[] = [
    {
      id: crypto.randomUUID(),
      projectId,
      species: 'White oak (Quercus alba) — heritage tree',
      trophicLevel: 'producer',
      notes: 'SE of dwelling, ~24 m crown spread. Locally heritage-designated.',
      observedAt,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      species: 'Red-tailed hawk (Buteo jamaicensis)',
      trophicLevel: 'tertiary',
      notes: 'Pair seen hunting the lower field margin in late afternoon.',
      observedAt,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      species: 'Eastern garter snake (Thamnophis sirtalis)',
      trophicLevel: 'secondary',
      notes: 'Multiple sightings near hedgerow rock pile. Healthy small-mammal predator population.',
      observedAt,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      species: 'Differential grasshopper (Melanoplus differentialis)',
      trophicLevel: 'primary',
      notes: 'High summer densities along south margin — typical of disturbed pasture transition.',
      observedAt,
    },
  ];
  observations.forEach((o) => store.addObservation(o));
  store.setSuccessionStage(projectId, 'mid');
}

// ─── Module 6: SWOT ───────────────────────────────────────────────────

function seedSwot(projectId: string): void {
  const store = useSwotStore.getState();
  if (store.swot.some((e) => e.projectId === projectId)) return;

  const createdAt = new Date().toISOString();
  const entries: SwotEntry[] = [
    {
      id: crypto.randomUUID(),
      projectId,
      bucket: 'S',
      title: 'Existing hedgerow on north boundary',
      body: 'Mature mixed hedgerow already buffers the prevailing NW wind and supports overwintering birds. Provides a head-start for a future shelterbelt.',
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      bucket: 'W',
      title: 'Tile-drained lower field — disrupted hydrology',
      body: 'Decades of cash-crop tile drainage have shortcut the natural sheet-flow. Spring water leaves the parcel before it can infiltrate.',
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      bucket: 'O',
      title: 'Spring-fed creek for keyline storage',
      body: 'Seasonal creek + ~28 m drop over 250 m gives high keyline-storage potential if a headwater pond can be permitted within the regulated corridor.',
      createdAt,
    },
    {
      id: crypto.randomUUID(),
      projectId,
      bucket: 'T',
      title: 'Conservation Halton 30 m setback',
      body: 'Regulated watercourse setback restricts pond placement and any earthworks within the creek corridor. Permit pathway is slow and costly.',
      createdAt,
    },
  ];
  entries.forEach((e) => store.addSwot(e));
}
