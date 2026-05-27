// tierObjectives.ts
//
// Seed catalogue of the 7 Plan Tiers and their objectives, derived from
// OLOS Plan Navigation Spec v1. The seed below is the SKELETON shipped
// with Slice 1.1 — every tier has at least one objective so the status
// engine and tier-state engine can be exercised against a realistic
// prereq chain. Real per-objective content (overlay bundles, checklist
// authoring, legacyCardSectionId mappings) is layered in alongside the
// UI work in Slices 1.5-1.9.
//
// Source of truth for the catalogue. Do not duplicate this list in
// apps/web — import from `@ogden/shared/relationships` or via the root
// package export.

import type {
  PlanTier,
  PlanTierObjective,
} from '../../schemas/plan/planTierObjective.schema.js';

export const PLAN_TIERS: readonly PlanTier[] = [
  {
    id: 't0-project-foundation',
    ordinal: 0,
    title: 'Project Foundation',
    summary:
      'Vision, stewardship capacity, and the working agreement that anchors every later decision.',
  },
  {
    id: 't1-land-reading',
    ordinal: 1,
    title: 'Land Reading',
    summary:
      'Base-layer reading of the site: climate, landform, water, soil, ecology.',
  },
  {
    id: 't2-systems-reading',
    ordinal: 2,
    title: 'Systems Reading',
    summary:
      'How the land currently functions as a system — flows, cycles, current use.',
  },
  {
    id: 't3-foundation-decisions',
    ordinal: 3,
    title: 'Foundation Decisions',
    summary:
      'Zones, sectors, and the spatial logic that frames every design choice downstream.',
  },
  {
    id: 't4-system-design',
    ordinal: 4,
    title: 'System Design',
    summary:
      'Water strategy, access, infrastructure, vegetation — the working systems of the land.',
  },
  {
    id: 't5-integration-design',
    ordinal: 5,
    title: 'Integration Design',
    summary:
      'How the systems integrate — yield flows, ecology, stewardship intensity.',
  },
  {
    id: 't6-phasing-resourcing',
    ordinal: 6,
    title: 'Phasing & Resourcing',
    summary:
      'Phasing plan, capital schedule, labour and material sequencing.',
  },
] as const;

/**
 * Lookup helper. Returns the PlanTier or `undefined`.
 */
export function findPlanTier(
  id: string,
): PlanTier | undefined {
  return PLAN_TIERS.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Tier objectives — skeleton seed (Slice 1.1).
//
// Each objective gets a basic checklist (3 items) so the status engine has
// something to bind to. Overlay bundles are intentionally empty here; they
// are populated in Slice 1.6 when the MapActivationStrip lands.
// ---------------------------------------------------------------------------

export const PLAN_TIER_OBJECTIVES: readonly PlanTierObjective[] = [
  // ---------- T0 ----------
  {
    id: 't0-vision',
    tierId: 't0-project-foundation',
    title: 'Define vision, goals & stewardship capacity',
    focusedQuestion:
      'What is this land for, who is it for, and how much capacity do you have to steward it?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't0-vision-c1',
        label: 'Articulate the land vision in one paragraph.',
        feedsInto: ['t1-land-baseline'],
        optional: false,
      },
      {
        id: 't0-vision-c2',
        label: 'List the primary land-use goals (max 3).',
        feedsInto: ['t3-zones-sectors'],
        optional: false,
      },
      {
        id: 't0-vision-c3',
        label: 'Set stewardship time + budget capacity bands.',
        feedsInto: ['t6-phasing'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
    parallelGroupId: 't0-foundation',
  },
  {
    id: 't0-stewardship',
    tierId: 't0-project-foundation',
    title: 'Identify key decision-makers and stewards',
    focusedQuestion: 'Who else works on this land, and in what role?',
    prerequisiteObjectiveIds: [],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't0-stewardship-c1',
        label: 'List primary steward and any co-stewards.',
        feedsInto: [],
        optional: false,
      },
      {
        id: 't0-stewardship-c2',
        label: 'Note contractor and reviewer roles if known.',
        feedsInto: [],
        optional: true,
      },
    ],
    outputKind: 'plan-decision-record',
    parallelGroupId: 't0-foundation',
  },

  // ---------- T1 ----------
  {
    id: 't1-land-baseline',
    tierId: 't1-land-reading',
    title: 'Read the land baseline (climate, landform, water, soil, ecology)',
    focusedQuestion:
      'What is the land already telling you across the base layers?',
    prerequisiteObjectiveIds: ['t0-vision', 't0-stewardship'],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't1-land-baseline-c1',
        label: 'Capture the contour/landform overview.',
        feedsInto: ['t3-zones-sectors'],
        optional: false,
      },
      {
        id: 't1-land-baseline-c2',
        label: 'Note current water flow + standing water.',
        feedsInto: ['t4-water-strategy'],
        optional: false,
      },
      {
        id: 't1-land-baseline-c3',
        label: 'Record dominant soils + ecology observations.',
        feedsInto: ['t3-zones-sectors'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
  },

  // ---------- T2 ----------
  {
    id: 't2-systems-baseline',
    tierId: 't2-systems-reading',
    title: 'Read current systems (flows, cycles, current use)',
    focusedQuestion: 'How is the land currently functioning as a system?',
    prerequisiteObjectiveIds: ['t1-land-baseline'],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't2-systems-baseline-c1',
        label: 'Document existing access + movement patterns.',
        feedsInto: ['t4-water-strategy'],
        optional: false,
      },
      {
        id: 't2-systems-baseline-c2',
        label: 'Note current resource flows on the land.',
        feedsInto: ['t5-yield-flows'],
        optional: false,
      },
      {
        id: 't2-systems-baseline-c3',
        label: 'Note existing infrastructure and utilities.',
        feedsInto: ['t4-water-strategy'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
  },

  // ---------- T3 ----------
  {
    id: 't3-zones-sectors',
    tierId: 't3-foundation-decisions',
    title: 'Set zones and sectors',
    focusedQuestion:
      'How should the site be zoned, and what sectors influence it?',
    prerequisiteObjectiveIds: ['t2-systems-baseline'],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't3-zones-sectors-c1',
        label: 'Draft zone boundaries on the site map.',
        feedsInto: ['t4-water-strategy'],
        optional: false,
      },
      {
        id: 't3-zones-sectors-c2',
        label: 'Confirm sector directions and seasonal coverage.',
        feedsInto: ['t4-water-strategy'],
        optional: false,
      },
      {
        id: 't3-zones-sectors-c3',
        label: 'Capture rationale and trade-offs.',
        feedsInto: ['t5-yield-flows'],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
  },

  // ---------- T4 ----------
  {
    id: 't4-water-strategy',
    tierId: 't4-system-design',
    title: 'Set water strategy',
    focusedQuestion:
      'How does water move, slow, sink, and spread across the design?',
    prerequisiteObjectiveIds: ['t3-zones-sectors'],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't4-water-strategy-c1',
        label: 'Identify keypoints and primary water lines.',
        feedsInto: ['t5-yield-flows'],
        optional: false,
      },
      {
        id: 't4-water-strategy-c2',
        label: 'Choose storage strategy (swales / dams / tanks).',
        feedsInto: ['t6-phasing'],
        optional: false,
      },
      {
        id: 't4-water-strategy-c3',
        label: 'Note flood, drought, and contamination risks.',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
  },

  // ---------- T5 ----------
  {
    id: 't5-yield-flows',
    tierId: 't5-integration-design',
    title: 'Integrate yield flows across systems',
    focusedQuestion:
      'How do the elements yield to and feed each other across the design?',
    prerequisiteObjectiveIds: ['t4-water-strategy'],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't5-yield-flows-c1',
        label: 'Map primary yield outputs by element.',
        feedsInto: ['t6-phasing'],
        optional: false,
      },
      {
        id: 't5-yield-flows-c2',
        label: 'Identify circular flows + waste-to-yield loops.',
        feedsInto: ['t6-phasing'],
        optional: false,
      },
      {
        id: 't5-yield-flows-c3',
        label: 'Flag unrouted outputs needing a downstream use.',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
  },

  // ---------- T6 ----------
  {
    id: 't6-phasing',
    tierId: 't6-phasing-resourcing',
    title: 'Build the phasing plan',
    focusedQuestion:
      'In what order will the design land, and what does each phase need?',
    prerequisiteObjectiveIds: ['t5-yield-flows'],
    defaultOverlayBundle: [],
    checklist: [
      {
        id: 't6-phasing-c1',
        label: 'Group decisions into phases with dependencies clear.',
        feedsInto: [],
        optional: false,
      },
      {
        id: 't6-phasing-c2',
        label: 'Estimate labour + material per phase.',
        feedsInto: [],
        optional: false,
      },
      {
        id: 't6-phasing-c3',
        label: 'Set capital schedule against phase windows.',
        feedsInto: [],
        optional: false,
      },
    ],
    outputKind: 'plan-decision-record',
  },
] as const;

/**
 * Returns all tier-objectives for a given tier id, in seed order.
 */
export function getObjectivesForTier(
  tierId: string,
): readonly PlanTierObjective[] {
  return PLAN_TIER_OBJECTIVES.filter((o) => o.tierId === tierId);
}

/**
 * Returns the canonical tier-objective for a given id, or `undefined`.
 */
export function findPlanTierObjective(
  id: string,
): PlanTierObjective | undefined {
  return PLAN_TIER_OBJECTIVES.find((o) => o.id === id);
}
