// stratumObjectives.ts
//
// Seed catalogue of the 7 Plan Strata and their objectives, derived from
// OLOS Plan Navigation Spec v1. The seed below is the SKELETON shipped
// with Slice 1.1 — every stratum has at least one objective so the status
// engine and stratum-state engine can be exercised against a realistic
// prereq chain. Real per-objective content (overlay bundles, checklist
// authoring, legacyCardSectionId mappings) is layered in alongside the
// UI work in Slices 1.5-1.9.
//
// Source of truth for the catalogue. Do not duplicate this list in
// apps/web — import from `@ogden/shared/relationships` or via the root
// package export.

import type {
  PlanStratum,
  PlanStratumObjective,
} from '../../schemas/plan/planStratumObjective.schema.js';

export const PLAN_STRATA: readonly PlanStratum[] = [
  {
    id: 's1-project-foundation',
    ordinal: 1,
    title: 'Project Foundation',
    summary:
      'Vision, stewardship capacity, and the working agreement that anchors every later decision.',
  },
  {
    id: 's2-land-reading',
    ordinal: 2,
    title: 'Land Reading',
    summary:
      'Base-layer reading of the site: climate, landform, water, soil, ecology.',
  },
  {
    id: 's3-systems-reading',
    ordinal: 3,
    title: 'Systems Reading',
    summary:
      'How the land currently functions as a system — flows, cycles, current use.',
  },
  {
    id: 's4-foundation-decisions',
    ordinal: 4,
    title: 'Foundation Decisions',
    summary:
      'Zones, sectors, and the spatial logic that frames every design choice downstream.',
  },
  {
    id: 's5-system-design',
    ordinal: 5,
    title: 'System Design',
    summary:
      'Water strategy, access, infrastructure, vegetation — the working systems of the land.',
  },
  {
    id: 's6-integration-design',
    ordinal: 6,
    title: 'Integration Design',
    summary:
      'How the systems integrate — yield flows, ecology, stewardship intensity.',
  },
  {
    id: 's7-phasing-resourcing',
    ordinal: 7,
    title: 'Phasing & Resourcing',
    summary:
      'Phasing plan, capital schedule, labour and material sequencing.',
  },
] as const;

/**
 * Lookup helper. Returns the PlanStratum or `undefined`.
 */
export function findPlanStratum(
  id: string,
): PlanStratum | undefined {
  return PLAN_STRATA.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Stratum objectives — skeleton seed (Slice 1.1).
//
// Each objective gets a basic checklist (3 items) so the status engine has
// something to bind to. Overlay bundles are intentionally empty here; they
// are populated in Slice 1.6 when the MapActivationStrip lands.
// ---------------------------------------------------------------------------

export const PLAN_STRATUM_OBJECTIVES: readonly PlanStratumObjective[] = [
  // ---------- S1 ----------
  {
    id: 's1-vision',
    stratumId: 's1-project-foundation',
    title: 'Define vision, goals & stewardship capacity',
    shortTitle: 'Vision, goals & stewardship capacity',
    focusedQuestion:
      'What is this land for, who is it for, and how much capacity do you have to steward it?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's1-vision-c1',
        label: 'Articulate the land vision in one paragraph.',
        feedsInto: ['s2-land-baseline'],
        optional: false,
      },
      {
        id: 's1-vision-c2',
        label: 'List the primary land-use goals (max 3).',
        feedsInto: ['s4-zones-sectors'],
        optional: false,
      },
      {
        id: 's1-vision-c3',
        label: 'Set stewardship time + budget capacity bands.',
        feedsInto: ['s7-phasing'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    parallelGroupId: 's1-foundation',
    // Steward's "what is this land for" is the goal-compass develop-plan
    // surface in the legacy module bar — closest existing card for the
    // vision capture work.
    legacyCardSectionId: 'plan-develop-plan',
  },
  {
    id: 's1-stewardship',
    stratumId: 's1-project-foundation',
    title: 'Identify key decision-makers and stewards',
    shortTitle: 'Key decision-makers and stewards',
    focusedQuestion: 'Who else works on this land, and in what role?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's1-stewardship-c1',
        label: 'List primary steward and any co-stewards.',
        feedsInto: [],
        optional: false,
      },
      {
        id: 's1-stewardship-c2',
        label: 'Note contractor and reviewer roles if known.',
        feedsInto: [],
        optional: true,
      },
    ],
    outputKind: 'plan-decision-record',
    parallelGroupId: 's1-foundation',
    // Social-nodes card already captures people-on-land authoring; reused
    // here for the steward roster work.
    legacyCardSectionId: 'plan-social-nodes',
  },

  // ---------- S2 ----------
  {
    id: 's2-land-baseline',
    stratumId: 's2-land-reading',
    title: 'Read the land baseline (climate, landform, water, soil, ecology)',
    shortTitle: 'Land baseline (climate, landform, water, soil, ecology)',
    focusedQuestion:
      'What is the land already telling you across the base layers?',
    prerequisiteObjectiveIds: ['s1-vision', 's1-stewardship'],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's2-land-baseline-c1',
        label: 'Capture the contour/landform overview.',
        feedsInto: ['s4-zones-sectors'],
        optional: false,
      },
      {
        id: 's2-land-baseline-c2',
        label: 'Note current water flow + standing water.',
        feedsInto: ['s5-water-strategy'],
        optional: false,
      },
      {
        id: 's2-land-baseline-c3',
        label: 'Record dominant soils + ecology observations.',
        feedsInto: ['s4-zones-sectors'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    // Soil baseline card is the most concrete observable-baseline surface
    // among the existing soil-fertility cards.
    legacyCardSectionId: 'plan-soil-baseline',
  },

  // ---------- S3 ----------
  {
    id: 's3-systems-baseline',
    stratumId: 's3-systems-reading',
    title: 'Read current systems (flows, cycles, current use)',
    shortTitle: 'Systems (flows, cycles, current use)',
    focusedQuestion: 'How is the land currently functioning as a system?',
    prerequisiteObjectiveIds: ['s2-land-baseline'],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's3-systems-baseline-c1',
        label: 'Document existing access + movement patterns.',
        feedsInto: ['s5-water-strategy'],
        optional: false,
      },
      {
        id: 's3-systems-baseline-c2',
        label: 'Note current resource flows on the land.',
        feedsInto: ['s6-yield-flows'],
        optional: false,
      },
      {
        id: 's3-systems-baseline-c3',
        label: 'Note existing infrastructure and utilities.',
        feedsInto: ['s5-water-strategy'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    // Zone-circulation overview is the closest existing surface for reading
    // current access/movement + how the land functions as a system.
    legacyCardSectionId: 'plan-zone-overview',
  },

  // ---------- S4 ----------
  {
    id: 's4-zones-sectors',
    stratumId: 's4-foundation-decisions',
    title: 'Set zones and sectors',
    shortTitle: 'Zones and sectors',
    focusedQuestion:
      'How should the site be zoned, and what sectors influence it?',
    prerequisiteObjectiveIds: ['s3-systems-baseline'],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's4-zones-sectors-c1',
        label: 'Draft zone boundaries on the site map.',
        feedsInto: ['s5-water-strategy'],
        optional: false,
      },
      {
        id: 's4-zones-sectors-c2',
        label: 'Confirm sector directions and seasonal coverage.',
        feedsInto: ['s5-water-strategy'],
        optional: false,
      },
      {
        id: 's4-zones-sectors-c3',
        label: 'Capture rationale and trade-offs.',
        feedsInto: ['s6-yield-flows'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    // Sector overlay card authors the sector directions + seasonal coverage
    // this objective decides.
    legacyCardSectionId: 'plan-sector-overlay',
  },

  // ---------- S5 ----------
  {
    id: 's5-water-strategy',
    stratumId: 's5-system-design',
    title: 'Set water strategy',
    shortTitle: 'Water strategy',
    focusedQuestion:
      'How does water move, slow, sink, and spread across the design?',
    prerequisiteObjectiveIds: ['s4-zones-sectors'],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's5-water-strategy-c1',
        label: 'Identify keypoints and primary water lines.',
        feedsInto: ['s6-yield-flows'],
        optional: false,
      },
      {
        id: 's5-water-strategy-c2',
        label: 'Choose storage strategy (swales / dams / tanks).',
        feedsInto: ['s7-phasing'],
        optional: false,
      },
      {
        id: 's5-water-strategy-c3',
        label: 'Note flood, drought, and contamination risks.',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    // Water network & balance card is the existing surface for keylines,
    // storage strategy, and water-line design.
    legacyCardSectionId: 'plan-water-network',
  },

  // ---------- S6 ----------
  {
    id: 's6-yield-flows',
    stratumId: 's6-integration-design',
    title: 'Integrate yield flows across systems',
    shortTitle: 'Yield flows across systems',
    focusedQuestion:
      'How do the elements yield to and feed each other across the design?',
    prerequisiteObjectiveIds: ['s5-water-strategy'],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's6-yield-flows-c1',
        label: 'Map primary yield outputs by element.',
        feedsInto: ['s7-phasing'],
        optional: false,
      },
      {
        id: 's6-yield-flows-c2',
        label: 'Identify circular flows + waste-to-yield loops.',
        feedsInto: ['s7-phasing'],
        optional: false,
      },
      {
        id: 's6-yield-flows-c3',
        label: 'Flag unrouted outputs needing a downstream use.',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    // Closed-loop graph card visualises yield outputs + waste-to-yield loops
    // across elements — the integration this objective designs.
    legacyCardSectionId: 'plan-closed-loop-graph',
    // §10.1 Integration — the steward enters real operating thresholds here.
    // Each item's `token` is transcribed VERBATIM from the standard protocol
    // template catalogue (constants/protocol/standardTemplates.ts); approving
    // this objective derives the protocol token substitutions from the entered
    // values (buildProtocolOutputs). Labels/units/placeholders are descriptive
    // UI only — NOT fabricated approved values (placeholders are illustrative).
    parameterGroup: {
      id: 's6-yield-flows-params',
      label: 'Operating thresholds',
      items: [
        {
          id: 's6-yield-flows-param-cover-trigger',
          token: 'approved threshold',
          label: 'Paddock rotation — cover trigger',
          unit: 'kg DM/ha',
          placeholder: 'e.g. 1,500',
        },
        {
          id: 's6-yield-flows-param-day-limit',
          token: 'approved day limit',
          label: 'Paddock rotation — grazing day limit',
          unit: 'days',
          placeholder: 'e.g. 3',
        },
        {
          id: 's6-yield-flows-param-recovery-target',
          token: 'approved recovery target',
          label: 'Rest period — re-entry recovery target',
          unit: 'kg DM/ha',
          placeholder: 'e.g. 2,400',
        },
        {
          id: 's6-yield-flows-param-bcs-window',
          token: 'configured window',
          label: 'Livestock health — body-condition check window',
          unit: 'days',
          placeholder: 'e.g. 30',
        },
        {
          id: 's6-yield-flows-param-emergency-threshold',
          token: 'emergency threshold',
          label: 'Emergency destocking — cover floor',
          unit: 'kg DM/ha',
          placeholder: 'e.g. 800',
        },
      ],
    },
  },

  // ---------- S7 ----------
  {
    id: 's7-phasing',
    stratumId: 's7-phasing-resourcing',
    title: 'Build the phasing plan',
    shortTitle: 'Phasing plan',
    focusedQuestion:
      'In what order will the design land, and what does each phase need?',
    prerequisiteObjectiveIds: ['s6-yield-flows'],
    defaultOverlayBundle: [],
    decisionGroups: [],
    checklist: [
      {
        id: 's7-phasing-c1',
        label: 'Group decisions into phases with dependencies clear.',
        feedsInto: [],
        optional: false,
      },
      {
        id: 's7-phasing-c2',
        label: 'Estimate labour + material per phase.',
        feedsInto: [],
        optional: false,
      },
      {
        id: 's7-phasing-c3',
        label: 'Set capital schedule against phase windows.',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    // Phasing matrix card is the existing scale-of-permanence phasing surface
    // this objective builds against.
    legacyCardSectionId: 'plan-phasing-matrix',
  },
] as const;

/**
 * Returns all stratum-objectives for a given stratum id, in seed order.
 */
export function getObjectivesForStratum(
  stratumId: string,
): readonly PlanStratumObjective[] {
  return PLAN_STRATUM_OBJECTIVES.filter((o) => o.stratumId === stratumId);
}

/**
 * Returns the canonical stratum-objective for a given id, or `undefined`.
 */
export function findPlanStratumObjective(
  id: string,
): PlanStratumObjective | undefined {
  return PLAN_STRATUM_OBJECTIVES.find((o) => o.id === id);
}
