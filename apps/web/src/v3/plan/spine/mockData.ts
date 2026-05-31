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
  // Stratum 6 (Tier 5 — Integration) is set 'available' for this slice so the
  // demo can select its objective and trigger §10.1 protocol auto-instantiation.
  { n: 6, name: 'Integration', status: 'available', done: 0, total: 4 },
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
    decisionGroups: [
      { id: 'p1', label: 'Surface flows & catchment mapping', count: 2, feeds: 'Water & Hydrology', done: true },
      { id: 'p2', label: 'Springs, seeps & infiltration', count: 2, feeds: 'Water & Hydrology', done: true },
      { id: 'p3', label: 'Drainage infrastructure assessment', count: 1, feeds: 'Infrastructure & Access', done: true },
    ],
    patchDecisionGroups: [],
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
    decisionGroups: [
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
    patchDecisionGroups: [
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
    decisionGroups: [
      { id: 'p7', label: 'Demand calculation — stock by species & season', count: 2, feeds: 'Livestock & Animal Health', done: false },
      { id: 'p8', label: 'Source yield & seasonal gap analysis', count: 3, feeds: 'Water & Hydrology', done: false },
      { id: 'p9', label: 'Storage & paddock distribution design', count: 1, feeds: 'Pasture & Forage', done: false },
    ],
    patchDecisionGroups: [],
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
    decisionGroups: [
      { id: 'p10', label: 'Compaction mapping & remediation', count: 4, feeds: 'Soil', done: false },
    ],
    patchDecisionGroups: [],
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
    decisionGroups: [
      { id: 'p11', label: 'Yield, nutrition & carrying capacity', count: 5, feeds: 'Pasture & Forage', done: false },
    ],
    patchDecisionGroups: [],
    gate: 'Forage productivity and nutritional baseline complete.',
    handoff: 'Forage Productivity & Nutritional Baseline Survey',
    observeFeeds: ['Pasture & Forage'],
    overlays: ['Pasture & Forage'],
  },
  {
    // Stratum 6 (Tier 5) — Integration. Approving this objective is the §10.1
    // trigger that instantiates all enterprise-eligible standard protocols as
    // standing operational logic (the confirmation card-stack flow).
    id: 'o6',
    stratum: 6,
    source: 'primary',
    status: 'available',
    title: 'Enterprise integration & feedback loops',
    question:
      'How do the enterprise decisions converge into standing operational logic — the thresholds, judgments, and cycles the land runs on?',
    actDone: 0,
    actTotal: 4,
    decisionGroups: [
      {
        id: 'p12',
        label: 'Operational thresholds & response rules',
        count: 2,
        feeds: 'Livestock & Animal Health',
        done: false,
        items: [
          'Confirm grazing-pressure and feed-cover thresholds that trigger destocking or supplementary feed',
          'Set water-reserve and recovery targets that gate stocking decisions through the dry season',
        ],
      },
      {
        id: 'p13',
        label: 'Monitoring cycles & review cadence',
        count: 2,
        feeds: 'Pasture & Forage',
        done: false,
        items: [
          'Define the pasture-assessment and animal-condition review cadence across the season',
          'Confirm the windows and judgment cues for rotation, weaning, and sale decisions',
        ],
      },
    ],
    patchDecisionGroups: [],
    gate: 'Enterprise feedback loops confirmed. Approving instantiates the standing Protocol Layer from these decisions.',
    handoff: 'Integration & Protocol Instantiation Package',
    observeFeeds: ['Livestock & Animal Health', 'Pasture & Forage', 'Water & Hydrology'],
    overlays: ['Pasture & Forage', 'Water & Hydrology'],
  },
];

/**
 * Illustrative "approved tier outputs" for the prototype's auto-fill (spec §4.1
 * AUTO-FILLED fields). The canonical @ogden/shared catalogue keeps the spec's
 * bracket placeholders verbatim; these mock values are supplied web-side only so
 * the confirmation cards can show substituted IF→THEN segments. Fabricated demo
 * numbers — deliberately kept out of @ogden/shared. Real values will come from
 * genuine approved Stratum-6 outputs (deferred).
 */
export const APPROVED_TIER_OUTPUTS: Record<string, string> = {
  'approved threshold': '1,500 kg DM/ha',
  'approved day limit': '3 days',
  'approved recovery target': '2,400 kg DM/ha',
  'configured window': '7 days',
  'emergency threshold': '800 kg DM/ha',
  'approved minimum': '1,200 kg DM/ha',
  'approved interval': '21 days',
  'approved cover': '2,000 kg DM/ha',
  // Tokens used by the per-stratum sample protocols (mockProtocols.ts).
  'review interval': '12 months',
  'rainfall trigger': '50 mm / 24 h',
  'survey interval': '24 months',
  'flow baseline': '60% of baseline flow',
  'establishment target': '80% survival',
  'growth deviation': '20%',
};
