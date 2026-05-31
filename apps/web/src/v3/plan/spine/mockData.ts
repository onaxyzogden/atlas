// mockData.ts
//
// The prototype's STRATA / OBJECTIVES mock, transcribed VERBATIM from
// olos_plan_spine.jsx. Visual-shell data only — this slice reproduces the
// design artifact pixel-for-pixel; real-data wiring is deferred.

import type { SpineObjective, SpineStratum } from './types.js';

export const STRATA: SpineStratum[] = [
  { n: 1, name: 'Project Foundation', status: 'complete', done: 7, total: 7 },
  { n: 2, name: 'Land Reading', status: 'complete', done: 8, total: 8 },
  { n: 3, name: 'Systems Reading', status: 'active', done: 2, total: 6 },
  { n: 4, name: 'Foundation Decisions', status: 'available', done: 0, total: 8 },
  { n: 5, name: 'Design', status: 'locked', done: 0, total: 9 },
  { n: 6, name: 'Integration', status: 'locked', done: 0, total: 4 },
  { n: 7, name: 'Phasing & Resourcing', status: 'locked', done: 0, total: 6 },
];

export const OBJECTIVES: SpineObjective[] = [
  {
    id: 'o1',
    stratum: 3,
    source: 'universal',
    status: 'complete',
    title: 'Survey water movement & hydrology',
    question: 'How does water move through this site across seasons?',
    actDone: 5,
    actTotal: 5,
    protocols: [
      { id: 'p1', label: 'Surface flows & catchment mapping', count: 2, feeds: 'Water & Hydrology', done: true },
      { id: 'p2', label: 'Springs, seeps & infiltration', count: 2, feeds: 'Water & Hydrology', done: true },
      { id: 'p3', label: 'Drainage infrastructure assessment', count: 1, feeds: 'Infrastructure & Access', done: true },
    ],
    patchProtocols: [],
    gate: 'Hydrological survey complete. Seasonal flow patterns documented.',
    handoff: 'Hydrology Survey Package',
    observeFeeds: ['Water & Hydrology'],
    overlays: ['Hydrology', 'Topography'],
  },
  {
    id: 'o2',
    stratum: 3,
    source: 'universal',
    status: 'in_progress',
    title: 'Survey soil conditions & subsurface',
    question:
      'What soil characteristics are relevant to pasture recovery, tree establishment, and infrastructure foundations?',
    actDone: 2,
    actTotal: 8,
    protocols: [
      {
        id: 'p4',
        label: 'Profile & composition',
        count: 2,
        feeds: 'Soil',
        done: true,
        items: [
          'Conduct soil profile assessment at representative locations — record horizon depth, texture, structure, and colour',
          'Record soil texture class, aggregate structure, and drainage class per horizon',
        ],
      },
      {
        id: 'p5',
        label: 'Fertility & chemistry testing',
        count: 2,
        feeds: 'Soil',
        done: false,
        items: [
          'Test soil pH, organic matter percentage, CEC, and available NPK at each profile site',
          'Assess micronutrient deficiencies — boron, zinc, sulphur — relevant to target enterprise species',
        ],
      },
      {
        id: 'p6',
        label: 'Physical assessment — compaction & drainage',
        count: 2,
        feeds: 'Soil',
        done: false,
        items: [
          'Assess compaction depth and distribution using penetrometer — map zones by severity',
          'Map soil variation and drainage class across the site — identify wet zones, duplex profiles, and hardpan presence',
        ],
      },
    ],
    patchProtocols: [
      {
        id: 'pp1',
        label: 'Silvopasture — forage establishment methodology',
        count: 3,
        feeds: 'Pasture & Forage',
        done: false,
        secondary: 'Silvopasture',
      },
    ],
    gate: 'Soil survey complete. Forage establishment methodology confirmed.',
    handoff: 'Soil Survey Package',
    observeFeeds: ['Soil', 'Pasture & Forage'],
    overlays: ['Soil', 'Topography', 'Hydrology'],
  },
  {
    id: 'o3',
    stratum: 3,
    source: 'secondary',
    status: 'available',
    title: 'Survey stock water availability & seasonal supply',
    question:
      'Is there sufficient water to sustain target stocking numbers through the driest months?',
    actDone: 0,
    actTotal: 6,
    protocols: [
      { id: 'p7', label: 'Demand calculation — stock by species & season', count: 2, feeds: 'Livestock & Animal Health', done: false },
      { id: 'p8', label: 'Source yield & seasonal gap analysis', count: 3, feeds: 'Water & Hydrology', done: false },
      { id: 'p9', label: 'Storage & paddock distribution design', count: 1, feeds: 'Pasture & Forage', done: false },
    ],
    patchProtocols: [],
    gate: 'Stock water availability confirmed. Seasonal gap and storage requirements defined.',
    handoff: 'Stock Water Availability & Seasonal Supply Survey',
    observeFeeds: ['Water & Hydrology', 'Livestock & Animal Health'],
    overlays: ['Water & Hydrology', 'Pasture & Forage'],
  },
  {
    id: 'o4',
    stratum: 3,
    source: 'secondary',
    status: 'locked',
    title: 'Survey soil compaction & structure under grazing',
    question: 'Where is compaction present and what does it tell us about pasture recovery?',
    actDone: 0,
    actTotal: 4,
    protocols: [
      { id: 'p10', label: 'Compaction mapping & remediation', count: 4, feeds: 'Soil', done: false },
    ],
    patchProtocols: [],
    gate: 'Compaction survey complete. Remediation requirements defined per zone.',
    handoff: 'Soil Compaction & Structure Survey',
    observeFeeds: ['Soil'],
    overlays: ['Soil'],
  },
  {
    id: 'o5',
    stratum: 3,
    source: 'secondary',
    status: 'locked',
    title: 'Survey forage productivity & nutritional baseline',
    question:
      'What is the current pasture yield per hectare, seasonal availability, and nutritional profile?',
    actDone: 0,
    actTotal: 5,
    protocols: [
      { id: 'p11', label: 'Yield, nutrition & carrying capacity', count: 5, feeds: 'Pasture & Forage', done: false },
    ],
    patchProtocols: [],
    gate: 'Forage productivity and nutritional baseline complete.',
    handoff: 'Forage Productivity & Nutritional Baseline Survey',
    observeFeeds: ['Pasture & Forage'],
    overlays: ['Pasture & Forage'],
  },
];
