/**
 * Regeneration methodology — the spec §3.2.1 "system obligation" content.
 *
 * Every property containing a Barren / Compacted zone MUST receive an
 * explicit regeneration pathway specifying: recommended methods, an
 * estimated timeline to productive use, and what the land becomes
 * available for afterwards. This module is the authoritative content the
 * planning engine injects (see engine/goalCompass/sequencingEngine.ts).
 *
 * This is a core platform value, not an optional feature — degraded land
 * is never treated as ready-to-use.
 *
 * Spec ref: OLOS_Atlas_Platform_Workflow_Spec_v1.docx §3.2.1, Open Q4.
 */

import type { Citation } from './goalCompassTypes.js';
import type { MaintenanceSchedule, SoilCompaction } from './goalCompassTypes.js';

export interface RegenerationMethod {
  id: string;
  name: string;
  /** What the method does and why it is sequenced where it is. */
  description: string;
  /** Yeomans-aligned ordering hint within the pathway (lower = earlier). */
  order: number;
  /** Season the method is typically initiated. */
  season: 'spring' | 'summer' | 'fall' | 'winter';
  /** Years this method runs before the next step can rely on it. */
  durationYears: number;
  /** Catalog intervention id this method maps to, when one exists. */
  interventionId?: string;
  /** Only include this method when compaction is at one of these levels. */
  compactionGate?: SoilCompaction[];
  /**
   * Recurring upkeep this method demands while it is running (spec §4.3.3).
   * Only the methods that are themselves ongoing commitments (cover-crop
   * sequencing, managed grazing) carry one; the one-shot mechanical steps
   * (ripping, biochar) do not. Folded into the maintenance rollup so a
   * regeneration zone shows its true ongoing labor/cost load, not just the
   * one-time install.
   */
  maintenanceSchedule?: MaintenanceSchedule;
  sources: Citation[];
}

const NRCS: Citation = {
  source:
    'USDA NRCS (2022). Soil Health Management — Conservation Practice Standards (Cover Crop 340, Deep Tillage 324, Prescribed Grazing 528).',
  year: 2022,
  kind: 'standard',
};

/**
 * Canonical regeneration toolkit. The builder selects and orders a
 * subset based on the zone's compaction signal; biochar and managed
 * grazing are conditional, the rest are baseline for any barren zone.
 */
export const REGENERATION_METHODS: RegenerationMethod[] = [
  {
    id: 'keyline-subsoiling',
    name: 'Keyline ripping / subsoiling',
    description:
      'Single-tine subsoiler run on the keyline pattern fractures the ' +
      'hardpan without inverting soil, opening compacted profiles to air, ' +
      'water, and root penetration before any biology is introduced.',
    order: 1,
    season: 'fall',
    durationYears: 1,
    interventionId: 'keyline-access-track',
    compactionGate: ['med', 'high'],
    sources: [
      {
        source: 'Yeomans, P. A. (1958). The Keyline Plan. Waite & Bull.',
        year: 1958,
        kind: 'book',
      },
      NRCS,
    ],
  },
  {
    id: 'cover-crop-rebuild',
    name: 'Multi-species cover-crop rebuild',
    description:
      'Two-to-three season legume + brassica + deep-rooting grass sequence. ' +
      'Roots continue breaking compaction biologically, biomass feeds soil ' +
      'life, and nitrogen is fixed for the first productive rotation.',
    order: 2,
    season: 'spring',
    durationYears: 3,
    interventionId: 'cover-crop-rebuild',
    maintenanceSchedule: {
      frequency: 'quarterly',
      season: 'any',
      laborHrsPerOccurrence: 4,
      costUSDPerOccurrence: 60,
      materialsPerOccurrence: [
        { label: 'Successive cover-crop seed', unit: 'lbs' },
      ],
      equipmentRequired: ['no-till drill / roller-crimper'],
      notes: 'Each window during the 2-3 season rebuild: terminate the standing mix and drill the next species sequence.',
    },
    sources: [
      {
        source:
          'Drinkwater, L. E., Wagoner, P., & Sarrantonio, M. (1998). Legume-based cropping systems have reduced carbon and nitrogen losses. Nature, 396, 262-265.',
        year: 1998,
        kind: 'journal',
      },
      NRCS,
    ],
  },
  {
    id: 'compost-amendment',
    name: 'Compost & biology amendment',
    description:
      'Finished compost and compost-extract applications inoculate the ' +
      'fractured, cover-cropped profile with soil biology and stable ' +
      'organic matter, accelerating aggregate formation.',
    order: 3,
    season: 'spring',
    durationYears: 1,
    interventionId: 'compost-system',
    sources: [
      {
        source: 'Coleman, E. (2018). The New Organic Grower (3rd ed.). Chelsea Green.',
        year: 2018,
        kind: 'book',
      },
    ],
  },
  {
    id: 'biochar-amendment',
    name: 'Biochar amendment',
    description:
      'Inoculated biochar incorporated into the worst-degraded blocks ' +
      'provides durable habitat for microbiology and long-residence carbon. ' +
      'Reserved for severely degraded (high-compaction) ground.',
    order: 4,
    season: 'fall',
    durationYears: 1,
    compactionGate: ['high'],
    sources: [
      {
        source:
          'Lehmann, J., & Joseph, S. (2015). Biochar for Environmental Management (2nd ed.). Routledge.',
        year: 2015,
        kind: 'book',
      },
    ],
  },
  {
    id: 'managed-grazing-compaction',
    name: 'Managed grazing for compaction relief',
    description:
      'High-density, short-duration mob grazing with long recovery cycles ' +
      'stimulates root turnover and litter incorporation, relieving surface ' +
      'compaction once a living cover is established.',
    order: 5,
    season: 'summer',
    durationYears: 2,
    interventionId: 'pasture-renovation-overseed',
    compactionGate: ['med', 'high'],
    maintenanceSchedule: {
      frequency: 'monthly',
      season: 'any',
      laborHrsPerOccurrence: 10,
      costUSDPerOccurrence: 80,
      equipmentRequired: ['portable electric fence + energizer'],
      notes: 'High-density moves on a long-recovery chart through the grazing season — daily moves modeled as a monthly labor block.',
    },
    sources: [
      {
        source: 'Savory, A., & Butterfield, J. (2016). Holistic Management (3rd ed.). Island Press.',
        year: 2016,
        kind: 'book',
      },
      NRCS,
    ],
  },
];

export interface RegenerationPathway {
  /** Ordered methods the steward must complete before productive use. */
  methods: RegenerationMethod[];
  /** Estimated years from start until the zone is productively usable. */
  timelineToProductiveYears: number;
  /** Plain-language statement of what the land becomes available for. */
  becomesAvailableFor: string;
  /** Why this pathway is mandatory — surfaced in plan + report. */
  obligationNote: string;
}

/**
 * Build the mandatory regeneration pathway for a Barren / Compacted zone.
 * Methods are filtered by the zone's compaction signal (defaulting to
 * 'high' when unknown — degraded land is treated conservatively), then
 * ordered. Timeline is the critical-path sum of the sequential core
 * steps (subsoiling → cover crop → amendment), which gates productive use.
 */
export function buildRegenerationPathway(
  compaction: SoilCompaction | null,
): RegenerationPathway {
  const level: SoilCompaction = compaction ?? 'high';

  const methods = REGENERATION_METHODS.filter(
    (m) => !m.compactionGate || m.compactionGate.includes(level),
  ).sort((a, b) => a.order - b.order);

  // Critical path: ripping (yr) + cover-crop rebuild (multi-yr) + amendment.
  // Grazing/biochar run concurrently with the cover-crop window and do not
  // extend the timeline.
  const ripping = methods.find((m) => m.id === 'keyline-subsoiling');
  const cover = methods.find((m) => m.id === 'cover-crop-rebuild');
  const amend = methods.find((m) => m.id === 'compost-amendment');
  const timelineToProductiveYears =
    (ripping?.durationYears ?? 0) +
    (cover?.durationYears ?? 3) +
    (amend ? 1 : 0);

  return {
    methods,
    timelineToProductiveYears,
    becomesAvailableFor:
      'Once organic matter, infiltration, and living ground cover targets ' +
      'are met, the zone is released for active growing, grazing, or ' +
      'agroforestry — whichever the project goals call for.',
    obligationNote:
      'This zone was observed as Barren / Compacted. Per the OLOS ' +
      'regeneration obligation it cannot carry crops, animals, or active ' +
      'infrastructure until this pathway is acknowledged and underway.',
  };
}
