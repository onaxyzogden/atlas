/**
 * declarationModel -- pure, React-free derivations for the Tier-0 / Stratum-1
 * "Declaration" workbench chrome (2026-06-16 restructure).
 *
 * The Plan-stage Declaration phase presents the six Stratum-1 objectives under a
 * "Tier 0 / 0.1..0.6" numbering that is a PRESENTATION layer over the real S1
 * objective ids (the strata model is NOT renamed). This module owns that mapping
 * plus the two derived read-models the Declaration center renders:
 *
 *   - deriveSequencing      -> the "0.1 -> [0.2 | 0.3 | 0.4] -> [0.5 | 0.6] -> Tier 1"
 *                              objective-sequencing diagram, with live status.
 *   - deriveCanonicalObjects -> the two canonical-object cards (Intent + Team).
 *
 * Kept dependency-free (types only from @ogden/shared) so it unit-tests fast and
 * has no React/store coupling. ASCII-only copy; em/en dashes are written as
 * " -- " / "-" per the project string-escaping rule.
 *
 * On the sequencing GROUPING: no universal S1 objective carries a
 * `parallelGroupId`, and a pure prerequisite-depth layering does NOT match the
 * authored mockup (s1-boundaries / s1-stakeholders have no prereqs, so they would
 * land in the same rank as s1-vision). The grouping is therefore an editorial
 * presentation encoded here as SEQUENCE_LAYOUT -- an app-layer constant, so the
 * committed shared catalogue stays closed -- onto which live status is overlaid.
 * Objectives absent from the resolved set (e.g. 0.6 for a non-residential
 * project) drop out gracefully.
 */

import type {
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';

// ---------------------------------------------------------------------------
// Display mapping: real S1 objective id -> "0.x" presentation + canonical-object
// membership. Membership in this record IS the definition of the Declaration set
// (the six curated objectives); any other S1 objective renders without a "0.x".
// ---------------------------------------------------------------------------

/** Canonical never-re-asked objects constituted in the Declaration phase. */
export type CanonicalKind = 'intent' | 'team';

export interface TierZeroDisplayEntry {
  /** Presentation number shown in the chrome, e.g. "0.1". */
  display: string;
  /** Set when this objective constitutes a canonical object. */
  canonical?: CanonicalKind;
  /** True for objectives introduced/added by the 2026-06-16 restructure. */
  isNew?: boolean;
}

export const TIER_ZERO_DISPLAY: Readonly<Record<string, TierZeroDisplayEntry>> = {
  's1-vision': { display: '0.1', canonical: 'intent' },
  's1-steward': { display: '0.2', canonical: 'team', isNew: true },
  's1-boundaries': { display: '0.3' },
  's1-stakeholders': { display: '0.4' },
  'rf-s1-enterprise-mix': { display: '0.5' },
  'res-s1-household-needs': { display: '0.6', isNew: true },
};

/** The display entry for an objective id, or undefined when it is not in the set. */
export function tierZeroDisplayFor(
  objectiveId: string,
): TierZeroDisplayEntry | undefined {
  return TIER_ZERO_DISPLAY[objectiveId];
}

/** Reverse lookup: canonical kind -> the objective id that constitutes it. */
const CANONICAL_OBJECTIVE_ID: Readonly<Record<CanonicalKind, string>> = (() => {
  const out: Partial<Record<CanonicalKind, string>> = {};
  for (const [id, entry] of Object.entries(TIER_ZERO_DISPLAY)) {
    if (entry.canonical) out[entry.canonical] = id;
  }
  return out as Record<CanonicalKind, string>;
})();

// ---------------------------------------------------------------------------
// Threshold checkpoints -- the spine dividers between strata (mockup nav).
// ---------------------------------------------------------------------------

export interface ThresholdMarker {
  /** The stratum id this checkpoint divider sits AFTER in the spine. */
  afterStratumId: string;
  /** Display name, e.g. "Threshold 1 -- Reality Check". */
  name: string;
}

/**
 * The three OLOS gate checkpoints, mapped onto the real seven-stratum spine:
 *   - Reality Check  after S1 (Declaration), entering land reading.
 *   - Coherence Check after S6 (Integration Design), entering launch prep.
 *   - Act Mandate     after S7 (Phasing & Resourcing), entering the Act stage.
 */
export const THRESHOLDS: readonly ThresholdMarker[] = [
  { afterStratumId: 's1-project-foundation', name: 'Threshold 1 -- Reality Check' },
  { afterStratumId: 's6-integration-design', name: 'Threshold 2 -- Coherence Check' },
  { afterStratumId: 's7-phasing-resourcing', name: 'Threshold 3 -- Act Mandate' },
];

// ---------------------------------------------------------------------------
// Mode-header + section copy (centralized so the Amanah wording-pin test can
// assert over the rendered strings in one place).
// ---------------------------------------------------------------------------

export const DECLARATION_MODE = {
  pill: 'Mode 1 -- Declaration',
  tier: 'Tier 0',
  titleLead: 'Establish ',
  titleEm: 'intent',
  titleTail: ' and team before the land is read',
  desc:
    'Two canonical objects are built here and referenced throughout every tier ' +
    'that follows. The Intent Object becomes the lens for all land reading in ' +
    'Tiers 1 and 2. The Steward/Team Object is the single source of truth for ' +
    'who is doing this work and what they can contribute -- it is never re-asked.',
  sequencingLabel: 'Tier 0 -- Objective Sequencing',
} as const;

const CANONICAL_COPY: Readonly<
  Record<CanonicalKind, { name: string; desc: string }>
> = {
  intent: {
    name: 'Intent Object',
    desc:
      'Vision, purpose, success criteria, and non-negotiables. The lens through ' +
      'which all Tier 1-2 land reading is conducted.',
  },
  team: {
    name: 'Steward / Team Object',
    desc:
      'Who is here, in what roles, with what capabilities. Referenced by every ' +
      'downstream objective that asks "who" or "how much."',
  },
};

// ---------------------------------------------------------------------------
// Objective sequencing diagram.
// ---------------------------------------------------------------------------

/** Curated presentation layout of the Declaration set (see module header). */
const SEQUENCE_LAYOUT: ReadonlyArray<{
  kind: 'single' | 'parallel';
  ids: readonly string[];
}> = [
  { kind: 'single', ids: ['s1-vision'] },
  { kind: 'parallel', ids: ['s1-steward', 's1-boundaries', 's1-stakeholders'] },
  { kind: 'parallel', ids: ['rf-s1-enterprise-mix', 'res-s1-household-needs'] },
];

export interface SequencingNode {
  id: string;
  /** "0.x" presentation number. */
  display: string;
  status: PlanStratumObjectiveStatus;
}

export interface SequencingGroup {
  /** 'single' renders one bare node; 'parallel' renders a labelled group. */
  kind: 'single' | 'parallel';
  nodes: SequencingNode[];
}

export interface SequencingNext {
  /** Terminal node label (the next tier). */
  label: string;
  /** 'available' once every present declaration objective is complete. */
  status: 'available' | 'locked';
}

export interface SequencingModel {
  groups: SequencingGroup[];
  next: SequencingNext;
}

type StatusMap = Readonly<Record<string, PlanStratumObjectiveStatus>>;

/**
 * Build the objective-sequencing model: overlay live statuses onto the curated
 * layout, dropping objectives absent from the resolved `objectives` set. A
 * parallel group left with a single surviving node collapses to 'single' so no
 * lone "parallel" label renders. The terminal "Tier 1" node unlocks only once
 * every present declaration objective is complete.
 */
export function deriveSequencing(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
): SequencingModel {
  const present = new Set(objectives.map((o) => o.id));
  const groups: SequencingGroup[] = [];
  const presentNodes: SequencingNode[] = [];

  for (const layout of SEQUENCE_LAYOUT) {
    const nodes: SequencingNode[] = [];
    for (const id of layout.ids) {
      if (!present.has(id)) continue;
      const entry = TIER_ZERO_DISPLAY[id];
      if (!entry) continue;
      const node: SequencingNode = {
        id,
        display: entry.display,
        status: statuses[id] ?? 'locked',
      };
      nodes.push(node);
      presentNodes.push(node);
    }
    if (nodes.length === 0) continue;
    groups.push({
      kind: nodes.length > 1 ? layout.kind : 'single',
      nodes,
    });
  }

  const allComplete =
    presentNodes.length > 0 &&
    presentNodes.every((n) => n.status === 'complete');

  return {
    groups,
    next: { label: 'Tier 1', status: allComplete ? 'available' : 'locked' },
  };
}

// ---------------------------------------------------------------------------
// Canonical-object cards.
// ---------------------------------------------------------------------------

export type CanonicalTag = 'done' | 'wip' | 'idle';

export interface CanonicalObjectCard {
  kind: CanonicalKind;
  objectiveId: string;
  name: string;
  desc: string;
  status: PlanStratumObjectiveStatus;
  tag: CanonicalTag;
  tagLabel: string;
}

/** Status -> (tag, label) for the canonical-object card eyebrow. */
export function canonicalTagFor(status: PlanStratumObjectiveStatus): {
  tag: CanonicalTag;
  tagLabel: string;
} {
  if (status === 'complete') return { tag: 'done', tagLabel: 'Established' };
  if (status === 'active') return { tag: 'wip', tagLabel: 'In Progress' };
  return { tag: 'idle', tagLabel: 'Not started' };
}

/**
 * Build the canonical-object cards (Intent first, Team second). A card is
 * emitted only when its constituting objective is present in the resolved set;
 * the universal Intent + Team always resolve, so both render for any project.
 */
export function deriveCanonicalObjects(
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
): CanonicalObjectCard[] {
  const present = new Set(objectives.map((o) => o.id));
  const order: CanonicalKind[] = ['intent', 'team'];
  const cards: CanonicalObjectCard[] = [];
  for (const kind of order) {
    const objectiveId = CANONICAL_OBJECTIVE_ID[kind];
    if (!objectiveId || !present.has(objectiveId)) continue;
    const status = statuses[objectiveId] ?? 'locked';
    const { tag, tagLabel } = canonicalTagFor(status);
    cards.push({
      kind,
      objectiveId,
      name: CANONICAL_COPY[kind].name,
      desc: CANONICAL_COPY[kind].desc,
      status,
      tag,
      tagLabel,
    });
  }
  return cards;
}
