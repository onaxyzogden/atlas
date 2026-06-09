// mockData.ts — Observe lens surface (mock-backed; not yet wired to live data)
//
// Mock fixtures for the observational-lens Observe concept. Ported verbatim
// (values unchanged) from the source concept, EXCEPT the lens identity layer:
// each lens's id/label/icon/colour/colourDim/mapColour/domains is now sourced
// from the canonical `OBSERVE_LENSES` in @ogden/shared (proving the shared
// concept is live), while the rich display values (observations, freshness,
// summary, keyData, divergence/planTrigger) remain local mock data here.

import { OBSERVE_LENSES, type ObserveLensId } from '@ogden/shared';
import { C } from './tokens.js';
import { OBSERVE_COPY } from '../../copy/index.js';
import type {
  DomainDetail,
  Freshness,
  LensDisplay,
  MockObservation,
} from './types.js';

// ─── DOMAIN DETAIL DATA (per lens) ───────────────────────────────────────────
export const DOMAIN_DETAIL: Partial<Record<ObserveLensId, DomainDetail>> = {
  water: {
    lensLabel: 'Water',
    lensIcon: '◉',
    lensColor: C.water,
    domains: ['Hydrology & Water'],
    totalPoints: 11,
    freshness: 'current',
    lastObserved: '12 days ago',
    sourceTask: 'Hydrological baseline survey — Cycle 1',
    planObjective: 'Survey water movement & hydrology',
    subdomains: [
      {
        id: 'surface',
        label: 'Surface Water',
        icon: '〰',
        collapsed: false,
        points: [
          {
            id: 'dp1', type: 'gps_trace', label: 'Main creek line — seasonal',
            value: '340 m traced', location: 'N boundary → SE corner',
            observedAt: '14 Jan 2025', recordedAt: '15 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Creek mapping walk', planObjective: 'Survey water movement',
            notes: 'Creek runs Nov–Apr. Dry bed visible with clear gravel substrate. Likely perennial springs upstream feeding it.',
            photos: 3, measurements: null, gpsPoints: 1,
            tags: ['seasonal', 'creek', 'surface-flow'],
          },
          {
            id: 'dp2', type: 'measurement', label: 'Runoff zone — Zone A (NW paddock)',
            value: 'High runoff · overland flow observed',
            location: 'NW paddock, 1.2 ha',
            observedAt: '14 Jan 2025', recordedAt: '15 Jan 2025',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Surface flow mapping', planObjective: 'Survey water movement',
            notes: 'Concentrated flow along fence line. Some sheet erosion visible on slope break at 12°.',
            photos: 2, measurements: 'Slope 12°', gpsPoints: 4,
            tags: ['runoff', 'erosion-risk', 'overland-flow'],
          },
        ],
      },
      {
        id: 'infiltration',
        label: 'Infiltration',
        icon: '↓',
        collapsed: false,
        points: [
          {
            id: 'dp3', type: 'logged_result', label: 'Percolation test — Zone A',
            value: '28 mm/hr',
            location: 'Zone A · NW paddock',
            observedAt: '16 Jan 2025', recordedAt: '16 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: true, supersededBy: 'dp3b', supersedesId: null,
            sourceTask: 'Infiltration survey', planObjective: 'Survey water movement',
            notes: 'Compacted topsoil limiting infiltration. Hardpan layer at ~35 cm depth reducing percolation.',
            photos: 1, measurements: '28 mm/hr · hardpan @ 35cm', gpsPoints: 1,
            tags: ['infiltration', 'compaction', 'hardpan'],
          },
          {
            id: 'dp3b', type: 'logged_result', label: 'Percolation test — Zone A (remeasure)',
            value: '41 mm/hr',
            location: 'Zone A · NW paddock',
            observedAt: '18 Mar 2025', recordedAt: '18 Mar 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: 'dp3',
            sourceTask: 'Infiltration re-survey after rainfall', planObjective: 'Survey water movement',
            notes: 'Retested after 40mm rain event. Improved reading likely reflects seasonal soil moisture. Recommend re-testing in dry season.',
            photos: 1, measurements: '41 mm/hr', gpsPoints: 1,
            tags: ['infiltration', 'measurement', 'seasonal'],
          },
          {
            id: 'dp4', type: 'logged_result', label: 'Percolation test — Zone B',
            value: '62 mm/hr',
            location: 'Zone B · Centre paddock',
            observedAt: '16 Jan 2025', recordedAt: '16 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Infiltration survey', planObjective: 'Survey water movement',
            notes: 'Good infiltration. Sandy loam topsoil, no evident compaction. Healthy earthworm activity.',
            photos: 1, measurements: '62 mm/hr · depth to clay 55cm', gpsPoints: 1,
            tags: ['infiltration', 'good-structure', 'earthworms'],
          },
        ],
      },
      {
        id: 'sources',
        label: 'Water Sources',
        icon: '◎',
        collapsed: false,
        points: [
          {
            id: 'dp5', type: 'gps_point', label: 'Spring — active, NE paddock',
            value: 'Active year-round (reported)',
            location: 'NE paddock · fence line',
            observedAt: '14 Jan 2025', recordedAt: '15 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Water source inventory', planObjective: 'Survey water movement',
            notes: 'Landowner reports active all year. Seep rather than point spring — wet area ~15m radius. Possible artesian pressure.',
            photos: 4, measurements: null, gpsPoints: 1,
            tags: ['spring', 'perennial', 'seep'],
          },
          {
            id: 'dp6', type: 'divergence', label: 'Unmarked spring — NW paddock',
            value: 'Discovered during creek survey',
            location: 'NW paddock · 40m from fence',
            observedAt: '25 May 2025', recordedAt: '25 May 2025',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Creek mapping walk (divergence capture)',
            planObjective: 'Survey water movement',
            notes: 'Not on any existing maps. Intermittent flow — active after rain. Could inform water harvesting design. Unresolved — no Plan revision yet.',
            photos: 2, measurements: null, gpsPoints: 1,
            tags: ['spring', 'unmapped', 'divergence', 'water-harvesting'],
            isDivergence: true,
            divergenceStatus: 'unresolved',
            divergenceAge: '8 days',
          },
        ],
      },
      {
        id: 'flood',
        label: 'Flood Risk',
        icon: '⚠',
        collapsed: true,
        points: [
          {
            id: 'dp7', type: 'observation_note', label: 'Flood risk zone — NE low area',
            value: 'Likely 1-in-10yr inundation',
            location: 'NE paddock · low point 0.8 ha',
            observedAt: '14 Jan 2025', recordedAt: '15 Jan 2025',
            cycle: 'Cycle 1', confidence: 'low',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Site reading walk', planObjective: 'Survey water movement',
            notes: 'Watermarks visible on fence posts at ~0.4m. Landowner confirms periodic flooding in wet years. Needs formal flood modelling.',
            photos: 2, measurements: 'Flood mark 0.4m above ground', gpsPoints: 2,
            tags: ['flood-risk', 'low-confidence', 'requires-survey'],
          },
        ],
      },
    ],
    specialised: {
      type: 'hydrology',
      infiltrationData: [
        { zone: 'Zone A', rate: 41, status: 'moderate', x: 0.25 },
        { zone: 'Zone B', rate: 62, status: 'good', x: 0.50 },
        { zone: 'Zone C', rate: 35, status: 'moderate', x: 0.75 },
      ],
      sources: [
        { label: 'NE Spring', type: 'spring', status: 'perennial', confidence: 'high' },
        { label: 'NW Spring', type: 'spring', status: 'intermittent', confidence: 'medium', divergence: true },
        { label: 'Main Creek', type: 'creek', status: 'seasonal', confidence: 'high' },
        { label: 'NW Runoff Zone', type: 'runoff', status: 'risk', confidence: 'medium' },
      ],
    },
  },
  living: {
    lensLabel: 'Living Systems',
    lensIcon: '✦',
    lensColor: C.sage,
    domains: ['Soil & Subsurface', 'Ecology & Biodiversity', 'Plants, Crops & Food Systems', 'Animals, Livestock & Wildlife'],
    totalPoints: 3,
    freshness: 'stale',
    lastObserved: '8 months ago',
    sourceTask: 'Preliminary soil survey — Cycle 1',
    planObjective: 'Survey soil conditions & subsurface',
    subdomains: [
      {
        id: 'soil',
        label: 'Soil & Subsurface',
        icon: '▤',
        collapsed: false,
        points: [
          {
            id: 'ls1', type: 'logged_result', label: 'Soil profile — Zone 1',
            value: 'pH 5.2 · OM 1.8% · Sandy loam',
            location: 'Zone 1 · NW paddock',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Soil profile assessment', planObjective: 'Survey soil conditions',
            notes: 'Low pH, low OM. Signs of compaction at 25cm. Sandy loam topsoil transitioning to clay at 45cm.',
            photos: 2, measurements: 'pH 5.2 · OM 1.8% · Compaction @ 25cm', gpsPoints: 1,
            tags: ['soil-ph', 'low-ph', 'compaction', 'sandy-loam'],
          },
          {
            id: 'ls2', type: 'logged_result', label: 'Soil profile — Zone 2',
            value: 'pH 5.6 · OM 2.3% · Clay loam',
            location: 'Zone 2 · Centre paddock',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Soil profile assessment', planObjective: 'Survey soil conditions',
            notes: 'Better structure than Zone 1. Higher clay content retaining moisture. Some compaction at 30cm but less severe.',
            photos: 2, measurements: 'pH 5.6 · OM 2.3% · Compaction @ 30cm', gpsPoints: 1,
            tags: ['soil-ph', 'clay-loam', 'moisture-retention'],
          },
          {
            id: 'ls3', type: 'logged_result', label: 'Soil profile — Zone 3',
            value: 'pH 6.1 · OM 2.9% · Loam',
            location: 'Zone 3 · SE paddock',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Soil profile assessment', planObjective: 'Survey soil conditions',
            notes: 'Best soil on site. Good structure, active earthworms present. Possible prior market garden use — higher OM.',
            photos: 3, measurements: 'pH 6.1 · OM 2.9% · Earthworms present', gpsPoints: 1,
            tags: ['good-soil', 'earthworms', 'loam', 'best-zone'],
          },
        ],
      },
      {
        id: 'ecology',
        label: 'Ecology & Biodiversity',
        icon: '❧',
        collapsed: true,
        points: [
          {
            id: 'ls4', type: 'species', label: 'Platypus sighting — creek section',
            value: '1 individual observed',
            location: 'Main creek · SE bend',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false,
            sourceTask: 'Ecological baseline survey',
            planObjective: 'Survey ecology & biodiversity',
            notes: 'Single adult observed at dusk. Presence indicates healthy creek ecosystem. Protected species — affects any planned creek works.',
            photos: 1, gpsPoints: 1,
            tags: ['platypus', 'protected-species', 'creek', 'ecological-indicator'],
          },
        ],
      },
    ],
    specialised: {
      type: 'soil',
      phData: [
        { zone: 'Zone 1', ph: 5.2, om: 1.8, compaction: 'moderate' },
        { zone: 'Zone 2', ph: 5.6, om: 2.3, compaction: 'moderate' },
        { zone: 'Zone 3', ph: 6.1, om: 2.9, compaction: 'low' },
      ],
    },
  },

  // ── FOUNDATION ──────────────────────────────────────────────────────────────
  foundation: {
    lensLabel: 'Foundation',
    lensIcon: '◈',
    lensColor: C.earth,
    domains: ['Topography & Landform', 'Land Base & Boundaries'],
    totalPoints: 4,
    freshness: 'current',
    lastObserved: '6 days ago',
    subdomains: [
      {
        id: 'topography',
        label: 'Topography & Landform',
        icon: '∿',
        collapsed: false,
        points: [
          {
            id: 'f1', type: 'measurement', label: 'Elevation survey — high point',
            value: '47 m ASL',
            location: 'N ridge, centre',
            observedAt: '8 Jan 2025', recordedAt: '8 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Terrain survey walk', planObjective: 'Survey terrain & topography',
            notes: 'Highest point on site. Exposed to SW wind. Clear sightlines to all paddocks. Good candidate for wind monitoring station.',
            photos: 2, measurements: '47 m ASL · GPS verified', gpsPoints: 1,
            tags: ['elevation', 'high-point', 'wind-exposure'],
          },
          {
            id: 'f2', type: 'measurement', label: 'Slope assessment — Zone B',
            value: '14° · moderate-steep',
            location: 'Zone B · NW-facing',
            observedAt: '8 Jan 2025', recordedAt: '8 Jan 2025',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Terrain survey walk', planObjective: 'Survey terrain & topography',
            notes: 'NW-facing slope at 14° — cold aspect, limited sun hours in winter. Erosion potential moderate. Compaction visible on slope break.',
            photos: 2, measurements: '14° slope · NW aspect · Erosion moderate', gpsPoints: 3,
            tags: ['slope', 'aspect', 'erosion-risk', 'cold-aspect'],
          },
          {
            id: 'f3', type: 'gps_trace', label: 'Contour trace — 30m interval',
            value: '4 contour lines traced',
            location: 'Site-wide',
            observedAt: '9 Jan 2025', recordedAt: '9 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Contour mapping walk', planObjective: 'Survey terrain & topography',
            notes: 'Traced main contour lines at 18m, 24m, 32m, 40m. Lower contours show concave bowl formation in NE — potential water harvesting zone.',
            photos: 0, measurements: null, gpsPoints: 0, gpsTraces: 4,
            tags: ['contours', 'landform', 'water-harvesting-potential'],
          },
        ],
      },
      {
        id: 'boundaries',
        label: 'Land Base & Boundaries',
        icon: '⬜',
        collapsed: false,
        points: [
          {
            id: 'f4', type: 'logged_result', label: 'Title & boundary confirmation',
            value: '12.4 ha · Legal title confirmed',
            location: 'Site-wide',
            observedAt: '6 Jan 2025', recordedAt: '6 Jan 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Legal & boundary review', planObjective: 'Establish site boundaries & legal constraints',
            notes: 'Title searched and confirmed. All fences on boundary. Easement on NE corner for utility access (5m strip). Council zoning: Rural — primary production.',
            photos: 1, measurements: '12.4 ha', gpsPoints: 0,
            tags: ['title', 'boundary', 'easement', 'zoning'],
          },
        ],
      },
    ],
    specialised: {
      type: 'topography',
      elevationZones: [
        { label: 'Low (18–24 m)', area: '3.1 ha', aspect: 'NE bowl', use: 'Water harvesting potential', color: C.water },
        { label: 'Mid (24–36 m)', area: '6.8 ha', aspect: 'Mixed', use: 'Primary productive zone', color: C.sage },
        { label: 'High (36–47 m)', area: '2.5 ha', aspect: 'N ridge', use: 'Wind exposed · Shelter needed', color: C.amber },
      ],
      slopeBreakdown: [
        { label: 'Flat (0–5°)', pct: 28, color: C.green },
        { label: 'Gentle (5–10°)', pct: 44, color: C.teal },
        { label: 'Moderate (10–15°)', pct: 21, color: C.amber },
        { label: 'Steep (>15°)', pct: 7, color: C.red },
      ],
    },
  },

  // ── CLIMATE ─────────────────────────────────────────────────────────────────
  climate: {
    lensLabel: 'Climate',
    lensIcon: '◎',
    lensColor: C.amber,
    domains: ['Climate & Microclimate', 'Energy, Materials & Resource Flows'],
    totalPoints: 7,
    freshness: 'ageing',
    lastObserved: '4 months ago',
    subdomains: [
      {
        id: 'macroclimate',
        label: 'Macroclimate',
        icon: '◌',
        collapsed: false,
        points: [
          {
            id: 'cl1', type: 'logged_result', label: 'Annual climate record',
            value: '680 mm rainfall · Temperate oceanic',
            location: 'Site-wide',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Climate baseline survey', planObjective: 'Survey climate & sectors',
            notes: 'Based on 20-year BOM records from nearest station (12 km). Rainfall fairly evenly distributed, slightly drier Dec–Feb. Mean annual temp 12.4°C.',
            photos: 0, measurements: '680mm · 12.4°C mean · 210 frost-free days', gpsPoints: 0,
            tags: ['rainfall', 'temperature', 'frost', 'macroclimate'],
          },
          {
            id: 'cl2', type: 'measurement', label: 'Prevailing wind — SW sector',
            value: 'SW · avg 18 km/h · gusts 45 km/h',
            location: 'N ridge (measurement point)',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Wind observation', planObjective: 'Survey climate & sectors',
            notes: 'Dominant SW prevailing wind confirmed. Secondary NE wind in summer (sea breeze). Winter SW gusts create wind chill on exposed northern slope.',
            photos: 0, measurements: 'SW 18 km/h avg · NE secondary', gpsPoints: 1,
            tags: ['wind', 'prevailing', 'sectors', 'shelter-design'],
          },
        ],
      },
      {
        id: 'microclimate',
        label: 'Microclimate Zones',
        icon: '⊙',
        collapsed: false,
        points: [
          {
            id: 'cl3', type: 'observation_note', label: 'Frost pocket — SE low corner',
            value: 'Confirmed frost pocket · ~0.6 ha affected',
            location: 'SE corner · low ground',
            observedAt: 'Nov 2024', recordedAt: 'Nov 2024',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Frost observation walk', planObjective: 'Survey climate & sectors',
            notes: 'Cold air drainage confirmed — frost persists in SE low until 10am when other areas clear by 7:30am. Affects species selection for ~0.6 ha. Observed three consecutive mornings.',
            photos: 3, measurements: '0.6 ha extent · 2.5hr frost persistence differential', gpsPoints: 2,
            tags: ['frost-pocket', 'cold-drainage', 'microclimate', 'species-selection'],
          },
          {
            id: 'cl4', type: 'observation_note', label: 'Warm microclimate — N-facing bank',
            value: 'Protected from SW wind · 2–3°C warmer',
            location: 'N boundary bank',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Microclimate walk', planObjective: 'Survey climate & sectors',
            notes: 'Steep N-facing bank creates wind shadow. Noticeably warmer and sheltered. Good candidate for frost-sensitive species or early-season production.',
            photos: 2, measurements: null, gpsPoints: 1,
            tags: ['warm-microclimate', 'wind-shadow', 'shelter', 'early-production'],
          },
          {
            id: 'cl5', type: 'observation_note', label: 'Wind tunnel — gateway corridor',
            value: 'Accelerated wind channel between sheds',
            location: 'Main gateway · centre',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Microclimate walk', planObjective: 'Survey climate & sectors',
            notes: 'Funnelling effect between existing sheds creates uncomfortable working conditions. Speed visually estimated at 1.5–2× open field speed. Windbreak planting recommended.',
            photos: 1, measurements: null, gpsPoints: 1,
            tags: ['wind-tunnel', 'funnelling', 'shelter-needed', 'working-conditions'],
          },
        ],
      },
      {
        id: 'solar',
        label: 'Solar & Energy',
        icon: '☀',
        collapsed: true,
        points: [
          {
            id: 'cl6', type: 'measurement', label: 'Solar window — main zone',
            value: '6.2 peak sun hours · summer avg',
            location: 'Zone B · open flat',
            observedAt: 'Oct 2024', recordedAt: 'Oct 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Solar assessment', planObjective: 'Survey climate & sectors',
            notes: 'Peak sun estimated from BOM solar radiation data for lat/long. Winter shading from N ridge reduces effective hours by ~1.5 hr. Good solar PV potential on SE-facing barn roof.',
            photos: 0, measurements: '6.2 hr summer · 4.1 hr winter', gpsPoints: 0,
            tags: ['solar', 'sun-hours', 'energy', 'PV-potential'],
          },
          {
            id: 'cl7', type: 'observation_note', label: 'Shade mapping — winter solstice',
            value: 'N slope shades Zone A Nov–Feb',
            location: 'Zone A · NW paddock',
            observedAt: 'Nov 2024', recordedAt: 'Nov 2024',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Shade walk — winter', planObjective: 'Survey climate & sectors',
            notes: 'N ridge casts significant shadow over Zone A from late October. Limits winter grazing productivity. Solar gain on SE aspects confirms warm microclimate potential.',
            photos: 2, measurements: null, gpsPoints: 3,
            tags: ['shade', 'winter-shadow', 'zone-a', 'solar-access'],
          },
        ],
      },
    ],
    specialised: {
      type: 'climate',
      windRose: [
        { dir: 'N', freq: 8, speed: 12 },
        { dir: 'NE', freq: 14, speed: 16 },
        { dir: 'E', freq: 6, speed: 10 },
        { dir: 'SE', freq: 4, speed: 8 },
        { dir: 'S', freq: 10, speed: 14 },
        { dir: 'SW', freq: 32, speed: 22 },
        { dir: 'W', freq: 18, speed: 18 },
        { dir: 'NW', freq: 8, speed: 12 },
      ],
      microclimates: [
        { label: 'SE frost pocket', size: '0.6 ha', character: 'Cold drainage · frost-prone', risk: 'high' },
        { label: 'N bank wind shadow', size: '0.4 ha', character: 'Sheltered · 2–3°C warmer', risk: 'low' },
        { label: 'Gateway wind tunnel', size: '0.1 ha', character: 'Accelerated wind', risk: 'medium' },
      ],
    },
  },

  // ── HUMAN SYSTEMS ────────────────────────────────────────────────────────────
  human: {
    lensLabel: 'Human Systems',
    lensIcon: '◇',
    lensColor: C.violet,
    domains: ['Vision & Project Intent', 'People, Roles & Governance', 'Economics & Capacity', 'Risk, Compliance & Suitability'],
    totalPoints: 8,
    freshness: 'current',
    lastObserved: '2 days ago',
    subdomains: [
      {
        id: 'vision',
        label: 'Vision & Project Intent',
        icon: '◈',
        collapsed: false,
        points: [
          {
            id: 'h1', type: 'logged_result', label: 'Steward survey — capacity & goals',
            value: '2 FTE · 5-year horizon · Regen Farm + Silvopasture',
            location: 'N/A — document',
            observedAt: '30 May 2025', recordedAt: '30 May 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Steward survey completion', planObjective: 'Define vision, goals & stewardship capacity',
            notes: 'Primary steward: full-time. Secondary: part-time seasonal. 5-year goal: profitable regen beef + silvopasture timber. Willing to trial innovative methods. Capital available.',
            photos: 0, measurements: '2 FTE · £85k capital · 5yr horizon', gpsPoints: 0,
            tags: ['vision', 'capacity', 'goals', 'steward-profile'],
          },
        ],
      },
      {
        id: 'governance',
        label: 'People, Roles & Governance',
        icon: '◻',
        collapsed: false,
        points: [
          {
            id: 'h2', type: 'logged_result', label: 'Stakeholder map — complete',
            value: '7 stakeholders mapped',
            location: 'N/A — document',
            observedAt: '28 May 2025', recordedAt: '28 May 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Stakeholder mapping', planObjective: 'Map stakeholders & community relationships',
            notes: 'Key stakeholders: 2 stewards, 3 family members with ownership interest, adjoining neighbour (shared water course), local council planning officer. No Indigenous title consultation initiated.',
            photos: 0, measurements: null, gpsPoints: 0,
            tags: ['stakeholders', 'governance', 'neighbours', 'family'],
          },
          {
            id: 'h3', type: 'observation_note', label: 'Indigenous consultation — not yet initiated',
            value: 'Outstanding — no engagement made',
            location: 'N/A',
            observedAt: '28 May 2025', recordedAt: '28 May 2025',
            cycle: 'Cycle 1', confidence: 'low',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Stakeholder mapping', planObjective: 'Map stakeholders & community relationships',
            notes: 'OLOS protocol requires Indigenous community consultation before design work. Relevant land council identified but contact not yet made. Blocks advancement to Tier 3.',
            photos: 0, measurements: null, gpsPoints: 0,
            tags: ['indigenous', 'consultation', 'outstanding', 'protocol'],
          },
        ],
      },
      {
        id: 'economics',
        label: 'Economics & Capacity',
        icon: '⊟',
        collapsed: false,
        points: [
          {
            id: 'h4', type: 'logged_result', label: 'Capital budget — confirmed',
            value: '£85,000 available · Year 1',
            location: 'N/A — document',
            observedAt: '2 Jun 2025', recordedAt: '2 Jun 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Financial capacity assessment', planObjective: 'Define vision, goals & stewardship capacity',
            notes: '£85k available for Year 1 establishment. £30k earmarked for fencing. £20k water infrastructure. Remainder for tree stock, earthworks, soil amendments. Grant applications in progress.',
            photos: 0, measurements: '£85,000 · £30k fencing · £20k water', gpsPoints: 0,
            tags: ['budget', 'capital', 'year-1', 'financial-capacity'],
          },
          {
            id: 'h5', type: 'logged_result', label: 'Labour capacity assessment',
            value: '2 FTE · seasonal peaks requiring contractors',
            location: 'N/A — document',
            observedAt: '30 May 2025', recordedAt: '30 May 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Steward survey completion', planObjective: 'Define vision, goals & stewardship capacity',
            notes: 'Earthworks and fencing require contractor hire. Stock handling at scale needs seasonal help (lambing, mustering). Tree planting volunteer days viable for Year 1.',
            photos: 0, measurements: '2 FTE + contractor budget', gpsPoints: 0,
            tags: ['labour', 'FTE', 'contractors', 'seasonal'],
          },
        ],
      },
      {
        id: 'risk',
        label: 'Risk, Compliance & Suitability',
        icon: '⚠',
        collapsed: true,
        points: [
          {
            id: 'h6', type: 'logged_result', label: 'Council consent — planning review',
            value: '3 items pending · earthworks, dam, tree clearing',
            location: 'N/A — regulatory',
            observedAt: '1 Jun 2025', recordedAt: '1 Jun 2025',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Regulatory pre-check', planObjective: 'Establish site boundaries & legal constraints',
            notes: 'Planning pre-check submitted. Awaiting officer response on: (1) dam enlargement over threshold, (2) bulk earthworks on slope, (3) vegetation clearing permit for tree removal. Est. 6–8 weeks.',
            photos: 0, measurements: null, gpsPoints: 0,
            tags: ['planning', 'consent', 'dam', 'earthworks', 'tree-clearing', 'regulatory'],
          },
          {
            id: 'h7', type: 'logged_result', label: 'Environmental compliance — initial review',
            value: 'Platypus habitat flagged — creek works restricted',
            location: 'Main creek',
            observedAt: '1 Jun 2025', recordedAt: '1 Jun 2025',
            cycle: 'Cycle 1', confidence: 'high',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Environmental pre-check', planObjective: 'Establish site boundaries & legal constraints',
            notes: 'Platypus confirmed (Living Systems lens). Any works within 50m of creek require EPBC assessment. Bank stabilisation, crossings, and riparian planting must be reviewed. No exclusion — managed constraint.',
            photos: 0, measurements: null, gpsPoints: 0,
            tags: ['platypus', 'EPBC', 'environmental', 'creek-works', 'compliance'],
          },
          {
            id: 'h8', type: 'observation_note', label: 'Asbestos — old machinery shed',
            value: 'Suspected asbestos sheeting · requires assessment',
            location: 'Machinery shed · N boundary',
            observedAt: '8 Jan 2025', recordedAt: '8 Jan 2025',
            cycle: 'Cycle 1', confidence: 'medium',
            isSuperseded: false, supersededBy: null, supersedesId: null,
            sourceTask: 'Site reading walk', planObjective: 'Survey existing infrastructure & access',
            notes: 'Old corrugated sheeting on machinery shed walls consistent with pre-1987 asbestos materials. Do not disturb until tested. Removal cost ~£4–8k. Blocks shed repurposing.',
            photos: 2, measurements: null, gpsPoints: 1,
            tags: ['asbestos', 'hazmat', 'shed', 'compliance', 'cost-risk'],
          },
        ],
      },
    ],
    specialised: {
      type: 'human',
      capacityBars: [
        { label: 'Capital ready', pct: 85, color: C.green },
        { label: 'Labour (FTE)', pct: 40, color: C.amber },
        { label: 'Governance clarity', pct: 70, color: C.violet },
        { label: 'Regulatory clearance', pct: 30, color: C.red },
      ],
      consentItems: [
        { label: 'Dam enlargement permit', status: 'pending', weeks: '6–8 wk' },
        { label: 'Bulk earthworks approval', status: 'pending', weeks: '6–8 wk' },
        { label: 'Vegetation clearing', status: 'pending', weeks: '6–8 wk' },
        { label: 'Indigenous consultation', status: 'outstanding', weeks: '—' },
        { label: 'EPBC — creek works', status: 'flagged', weeks: '8–12 wk' },
      ],
    },
  },

  // ── INFRASTRUCTURE ───────────────────────────────────────────────────────────
  infrastructure: {
    lensLabel: 'Infrastructure',
    lensIcon: '◫',
    lensColor: C.teal,
    domains: ['Built Infrastructure', 'Access, Circulation & Logistics', 'Monitoring, Records & Feedback'],
    totalPoints: 0,
    freshness: 'missing',
    lastObserved: null,
    subdomains: [
      {
        id: 'built',
        label: 'Built Infrastructure',
        icon: '⬛',
        collapsed: false,
        points: [],
        emptyNote: 'No infrastructure observations recorded yet. Asset register will populate as verified Act tasks complete.',
      },
      {
        id: 'access',
        label: 'Access, Circulation & Logistics',
        icon: '→',
        collapsed: false,
        points: [],
        emptyNote: 'Access routes and circulation not yet surveyed. Survey recommended before earthworks design.',
      },
      {
        id: 'monitoring',
        label: 'Monitoring, Records & Feedback',
        icon: '⊡',
        collapsed: true,
        points: [],
        emptyNote: 'Monitoring system not yet defined. Design required before Act cycle 2.',
      },
    ],
    specialised: {
      type: 'infrastructure_empty',
      suggestedTasks: [
        { label: 'Asset register walk', domain: 'Built Infrastructure', priority: 'high' },
        { label: 'Access route & gate mapping', domain: 'Access, Circulation & Logistics', priority: 'high' },
        { label: 'Water infrastructure survey', domain: 'Built Infrastructure', priority: 'high' },
        { label: 'Fence condition assessment', domain: 'Built Infrastructure', priority: 'medium' },
        { label: 'Define monitoring point locations', domain: 'Monitoring, Records & Feedback', priority: 'medium' },
      ],
    },
  },
};

// ─── LENSES ───────────────────────────────────────────────────────────────────
// Local mock display values keyed by the canonical lens id. Structural identity
// (label/icon/colour/colourDim/mapColour/domains) is merged in from the shared
// OBSERVE_LENSES below, so the lens taxonomy stays single-sourced.
type LensMockDisplay = Pick<
  LensDisplay,
  'observations' | 'freshness' | 'lastObserved' | 'summary' | 'keyData' | 'divergence' | 'planTrigger'
>;

const LENS_DISPLAY: Record<ObserveLensId, LensMockDisplay> = {
  foundation: {
    observations: 4, freshness: 'current', lastObserved: '6 days ago',
    summary: '12.4ha boundary confirmed. 3 distinct landform zones mapped.',
    keyData: [
      { label: 'Area', value: '12.4 ha', confidence: 'high' },
      { label: 'Elevation range', value: '18–47 m', confidence: 'high' },
      { label: 'Avg slope', value: '8–14°', confidence: 'medium' },
      { label: 'Legal title', value: 'Confirmed', confidence: 'high' },
    ],
  },
  climate: {
    observations: 7, freshness: 'ageing', lastObserved: '4 months ago',
    summary: '3 microclimate zones identified. Frost pocket confirmed SE corner.',
    keyData: [
      { label: 'Annual rainfall', value: '680 mm', confidence: 'high' },
      { label: 'Frost-free days', value: '210', confidence: 'medium' },
      { label: 'Prevailing wind', value: 'SW · 18 km/h avg', confidence: 'high' },
      { label: 'Microclimate zones', value: '3 mapped', confidence: 'medium' },
    ],
  },
  water: {
    observations: 11, freshness: 'current', lastObserved: '12 days ago',
    summary: 'Main creek seasonal. Two springs active. Infiltration 28–62 mm/hr by zone.',
    keyData: [
      { label: 'Seasonal creek', value: '340 m mapped', confidence: 'high' },
      { label: 'Springs', value: '2 active', confidence: 'high' },
      { label: 'Infiltration avg', value: '41 mm/hr', confidence: 'high' },
      { label: 'Flood risk zone', value: 'NE 0.8 ha', confidence: 'medium' },
    ],
    divergence: { label: 'Unmarked spring found — NW paddock', age: '8 days', priority: 'high' },
  },
  living: {
    observations: 3, freshness: 'stale', lastObserved: '8 months ago',
    summary: 'Soil pH 5.2–6.1. Compaction moderate. Ecology survey incomplete.',
    keyData: [
      { label: 'Soil pH range', value: '5.2 – 6.1', confidence: 'medium' },
      { label: 'OM content', value: '2.1% avg', confidence: 'medium' },
      { label: 'Compaction', value: 'Moderate · 3 zones', confidence: 'low' },
      { label: 'Species records', value: '14 flora · 9 fauna', confidence: 'low' },
    ],
    planTrigger: { label: 'Soil data stale — affects Zone 2 planting objective', priority: 'high' },
  },
  human: {
    observations: 8, freshness: 'current', lastObserved: '2 days ago',
    summary: 'Steward survey complete. Legal review in progress. Budget confirmed.',
    keyData: [
      { label: 'Steward capacity', value: '2 FTE · seasonal', confidence: 'high' },
      { label: 'Capital budget', value: '£85,000', confidence: 'high' },
      { label: 'Council consent', value: 'Pending — 3 items', confidence: 'medium' },
      { label: 'Indigenous consult', value: 'Not yet initiated', confidence: 'low' },
    ],
  },
  infrastructure: {
    observations: 0, freshness: 'missing', lastObserved: null,
    summary: null, keyData: [],
  },
};

/**
 * The lens rows the dashboard renders. Identity/order/domains come from the
 * shared OBSERVE_LENSES (canonical order: foundation → climate → water →
 * living → human → infrastructure); display values merge in from LENS_DISPLAY.
 */
export const LENSES: LensDisplay[] = OBSERVE_LENSES.map((l) => ({
  id: l.id,
  label: l.label,
  icon: l.icon,
  color: l.color,
  colorDim: l.colorDim,
  mapColor: l.mapColor,
  domains: l.domains,
  ...LENS_DISPLAY[l.id],
}));

export const MOCK_OBSERVATIONS: MockObservation[] = [
  { id: 'obs1', lens: 'water', x: 0.42, y: 0.31, type: 'measurement', label: 'Spring · active', age: '12d' },
  { id: 'obs2', lens: 'water', x: 0.61, y: 0.55, type: 'gps_trace', label: 'Creek line · 340m', age: '12d' },
  { id: 'obs3', lens: 'foundation', x: 0.28, y: 0.44, type: 'measurement', label: 'Slope 14° · Zone B', age: '6d' },
  { id: 'obs4', lens: 'living', x: 0.55, y: 0.38, type: 'logged_result', label: 'Soil pH 5.6', age: '8mo' },
  { id: 'obs5', lens: 'living', x: 0.35, y: 0.60, type: 'logged_result', label: 'Soil pH 6.1', age: '8mo' },
  { id: 'obs6', lens: 'climate', x: 0.72, y: 0.70, type: 'observation', label: 'Frost pocket · SE corner', age: '4mo' },
  { id: 'obs7', lens: 'water', x: 0.30, y: 0.28, type: 'divergence', label: 'Unmarked spring', age: '8d' },
  { id: 'obs8', lens: 'foundation', x: 0.50, y: 0.20, type: 'gps_point', label: 'Elevation 47m · high pt', age: '6d' },
  { id: 'obs9', lens: 'human', x: 0.65, y: 0.42, type: 'photo', label: 'Existing barn condition', age: '2d' },
  { id: 'obs10', lens: 'living', x: 0.45, y: 0.65, type: 'species', label: 'Platypus · creek section', age: '8mo' },
];

export const PROJECT = {
  name: 'Millbrook Farm', type: 'Regen Farm + Silvopasture', cycle: 1,
  totalDataPoints: 33, domainsCurrentCount: 8, domainsAgeingCount: 3, domainsMissingCount: 5,
  planRevision: {
    active: true, priority: 'high', count: 2, triggers: [
      { domain: 'Water', detail: 'Unmarked spring — NW paddock unresolved 8 days', priority: 'high' },
      { domain: 'Living Systems', detail: 'Soil data stale — affects Zone 2 planting objective', priority: 'high' },
    ],
  },
};

export const FRESHNESS: Record<Freshness, { color: string; label: string; dot: boolean }> = {
  current: { color: C.green, label: 'Current', dot: true },
  ageing: { color: C.amber, label: 'Ageing', dot: true },
  stale: { color: C.red, label: 'Needs refresh', dot: true },
  missing: { color: C.textTertiary, label: OBSERVE_COPY.notYetRead, dot: false },
};

export const TYPE_ICON: Record<string, string> = {
  measurement: '⊞', gps_trace: '〰', gps_point: '•', logged_result: '⊟',
  observation_note: '✎', species: '❧', photo: '⊡', divergence: '▲',
};

// ─── CYCLE DATA ───────────────────────────────────────────────────────────────
// Represents the current Plan→Act→Observe spiral position for Cycle 1
export const CYCLE = {
  number: 1,
  name: 'Year 1 Establishment',
  startDate: '15 Jan 2025',
  totalDays: 180,
  elapsed: 138, // days into cycle
  nextReviewDays: 13, // days until next scheduled Observe review
  phases: [
    { id: 'plan', label: 'Plan', color: '#4A8FD4', startPct: 0, endPct: 22, status: 'complete', days: 40 },
    { id: 'act', label: 'Act', color: '#8A6AB4', startPct: 22, endPct: 72, status: 'complete', days: 90 },
    { id: 'obs', label: 'Observe', color: '#5AAF72', startPct: 72, endPct: 100, status: 'active', days: 50 },
  ],
  // Past cycles (for context strip)
  history: [
    { number: 0, label: 'Baseline', endedDaysAgo: 185, dataPoints: 8 },
  ],
  staleDomains: ['Living Systems'], // domains whose data has gone stale this cycle
  ageingDomains: ['Climate'],
};
