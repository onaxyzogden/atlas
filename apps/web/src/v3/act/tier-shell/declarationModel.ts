/**
 * declarationModel -- pure, React-free derivations for the Plan tier-shell's
 * objective-sequencing rail + the Stratum-1 "Declaration" workbench chrome
 * (2026-06-16 restructure; sequencing generalized to every stratum 2026-06-28).
 *
 * The Plan stage presents each stratum's objectives as a sequencing stepper
 * numbered "{ordinal}.{n}" (Stratum 1 -> 1.1..1.6, Stratum 2 -> 2.1.., ...) -- a
 * PRESENTATION layer over the real objective ids (the strata model is NOT
 * renamed; there is no "Tier 0" -- the foundation stratum is Stratum 1). This
 * module owns:
 *
 *   - deriveStratumSequencing -> the per-stratum "1.1 -> [1.2 | 1.3 | 1.4] -> ...
 *                                -> <next stratum>" diagram, with live status.
 *   - deriveCanonicalObjects   -> the two Stratum-1 canonical-object cards
 *                                 (Intent + Team).
 *
 * Kept dependency-free (types only from @ogden/shared) so it unit-tests fast and
 * has no React/store coupling. ASCII-only copy; em/en dashes are written as
 * " -- " / "-" per the project string-escaping rule.
 *
 * On the sequencing GROUPING: Stratum 1 has an AUTHORED shape (vision first, then
 * the rest in parallel) that a pure prerequisite-depth layering does NOT match
 * (s1-boundaries / s1-stakeholders have no prereqs, so they would land in the
 * same rank as s1-vision). It is therefore an editorial override encoded here as
 * SEQUENCE_LAYOUT (registered in STRATUM_SEQUENCE_OVERRIDES) -- an app-layer
 * constant, so the committed shared catalogue stays closed. Every other stratum
 * derives its waves from intra-stratum prerequisites (deriveWaves); in practice
 * S2-S7 carry none, so each yields a single parallel wave. Objectives absent from
 * the resolved set (e.g. the residential 1.6 for a non-residential project) drop
 * out gracefully.
 */

import type {
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';

// ---------------------------------------------------------------------------
// Canonical-object membership for the Stratum-1 Declaration set. Membership in
// this record IS the definition of the Declaration set (the six curated
// objectives); the `canonical` field drives the Intent/Team cards. The `display`
// field holds the Stratum-1 badge number ("1.1".."1.6") rendered by the
// TeamRegistryPanel; the sequencing stepper derives the same number from the
// stratum ordinal (see deriveStratumSequencing).
// ---------------------------------------------------------------------------

/** Canonical never-re-asked objects constituted in the Declaration phase. */
export type CanonicalKind = 'intent' | 'team';

export interface TierZeroDisplayEntry {
  /**
   * Stratum-1 presentation number (e.g. "1.2"), rendered as the
   * TeamRegistryPanel eyebrow badge. The objective-sequencing stepper derives
   * the same "{ordinal}.{n}" number independently from the stratum ordinal (see
   * deriveStratumSequencing); this field is the badge source for the
   * Declaration reference panel.
   */
  display: string;
  /** Set when this objective constitutes a canonical object. */
  canonical?: CanonicalKind;
  /** True for objectives introduced/added by the 2026-06-16 restructure. */
  isNew?: boolean;
}

export const TIER_ZERO_DISPLAY: Readonly<Record<string, TierZeroDisplayEntry>> = {
  's1-vision': { display: '1.1', canonical: 'intent' },
  's1-steward': { display: '1.2', canonical: 'team', isNew: true },
  's1-boundaries': { display: '1.3' },
  's1-stakeholders': { display: '1.4' },
  'rf-s1-enterprise-mix': { display: '1.5' },
  'res-s1-household-needs': { display: '1.6', isNew: true },
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

/** Stable kebab id for a threshold checkpoint (route param + clickable-spine key). */
export type ThresholdId = 'threshold-1' | 'threshold-2' | 'threshold-3';

export interface ThresholdMarker {
  /**
   * Stable id for the checkpoint -- the `plan/threshold/$thresholdId` route param
   * and the clickable-spine key. Additive (2026-06-17 Threshold-1 build); the
   * display divider never used it, so existing consumers are unaffected.
   */
  id: ThresholdId;
  /** The stratum id this checkpoint divider sits AFTER in the spine. */
  afterStratumId: string;
  /** Display name, e.g. "Threshold 1 -- Reality Check". */
  name: string;
}

/**
 * The three OLOS gate checkpoints, mapped onto the real seven-stratum spine.
 * 2026-06-16 (Tier-2 Reception restructure): the spec relocates the gates onto
 * the Systems-Reading model -- the Reality Check now sits AFTER S3 (Systems
 * Reading), once the land has actually been read, and the Coherence Check after
 * S5 (System Design). T3 (Act Mandate) is unchanged. This is the single source
 * of truth (receptionModel imports it); the shift intentionally moves the
 * already-shipped Tier-0 spine display too.
 *   - Reality Check   after S3 (Systems Reading), land read before any decision.
 *   - Coherence Check after S5 (System Design), design coheres before integration.
 *   - Act Mandate     after S7 (Phasing & Resourcing), entering the Act stage.
 */
export const THRESHOLDS: readonly ThresholdMarker[] = [
  { id: 'threshold-1', afterStratumId: 's3-systems-reading', name: 'Threshold 1 -- Reality Check' },
  { id: 'threshold-2', afterStratumId: 's5-system-design', name: 'Threshold 2 -- Coherence Check' },
  { id: 'threshold-3', afterStratumId: 's7-phasing-resourcing', name: 'Threshold 3 -- Act Mandate' },
];

// Two related threshold id sets, kept as distinct constants because they answer
// different questions even though they are now COEXTENSIVE.
//
//   REACHABLE_THRESHOLD_IDS -- the checkpoints the Plan rail-header switcher
//     renders as a CLICKABLE row (consumed by clickableThresholdIds). Originally
//     this held only the two soft checkpoints; Threshold 3 (Act Mandate) was
//     excluded so its row stayed a decorative separator. REVERSED 2026-06-19 by
//     operator decision ("this should be a button that functions like the other
//     two thresholds"): T3 is now clickable too. Clicking it only NAVIGATES to
//     the Act Mandate surface (`plan/threshold/threshold-3`) -- it does NOT arm
//     the project-wide planReadOnly lock. The one-way Begin-Act crossing is
//     still entered only via the surface's own deliberate "Begin Act" CTA, so
//     clickability != arming. (The s7 "Enter the Act Mandate" cue + deep-links
//     remain valid alternate entry paths.)
//
//   ROUTABLE_THRESHOLD_IDS -- the thresholds whose content surface is BUILT and
//     therefore valid as a `plan/threshold/$thresholdId` route / deep-link.
//     Consumed by the threshold route guard (isThresholdReachable). All three
//     surfaces exist, so this matches REACHABLE; it is kept separate because
//     "has a built surface" (route reach) is a distinct concern from "is a
//     clickable switcher row" (nav affordance), and they could diverge again.
export const REACHABLE_THRESHOLD_IDS = [
  'threshold-1',
  'threshold-2',
  'threshold-3',
] as const;

export const ROUTABLE_THRESHOLD_IDS = [
  'threshold-1',
  'threshold-2',
  'threshold-3',
] as const;

/** True when a threshold has a BUILT surface (route guard / deep-link check). */
export function isThresholdReachable(id: string): boolean {
  return (ROUTABLE_THRESHOLD_IDS as readonly string[]).includes(id);
}

// ---------------------------------------------------------------------------
// Mode-header + section copy (centralized so the Amanah wording-pin test can
// assert over the rendered strings in one place).
// ---------------------------------------------------------------------------

export const DECLARATION_MODE = {
  pill: 'Mode 1 -- Declaration',
  tier: 'Stratum 1',
  titleLead: 'Establish ',
  titleEm: 'intent',
  titleTail: ' and team before the land is read',
  desc:
    'Two canonical objects are built here and referenced throughout every ' +
    'stratum that follows. The Intent Object becomes the lens for all land ' +
    'reading in Strata 2 and 3. The Steward/Team Object is the single source of ' +
    'truth for who is doing this work and what they can contribute -- it is ' +
    'never re-asked.',
} as const;

const CANONICAL_COPY: Readonly<
  Record<CanonicalKind, { name: string; desc: string }>
> = {
  intent: {
    name: 'Intent Object',
    desc:
      'Vision, purpose, success criteria, and non-negotiables. The lens through ' +
      'which all Strata 2-3 land reading is conducted.',
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

/** Curated presentation layout of the Stratum-1 Declaration set (module header). */
const SEQUENCE_LAYOUT: ReadonlyArray<{
  kind: 'single' | 'parallel';
  ids: readonly string[];
}> = [
  { kind: 'single', ids: ['s1-vision'] },
  { kind: 'parallel', ids: ['s1-steward', 's1-boundaries', 's1-stakeholders'] },
  { kind: 'parallel', ids: ['rf-s1-enterprise-mix', 'res-s1-household-needs'] },
];

/**
 * Per-stratum curated wave layout, keyed by PlanStratum.id. Only Stratum 1 has
 * an authored shape; every other stratum derives its waves from intra-stratum
 * prerequisites (deriveWaves).
 */
const STRATUM_SEQUENCE_OVERRIDES: Readonly<
  Record<
    string,
    ReadonlyArray<{ kind: 'single' | 'parallel'; ids: readonly string[] }>
  >
> = {
  's1-project-foundation': SEQUENCE_LAYOUT,
};

export interface SequencingNode {
  id: string;
  /** "{ordinal}.{n}" presentation number, e.g. "1.1" on Stratum 1. */
  display: string;
  status: PlanStratumObjectiveStatus;
}

export interface SequencingGroup {
  /** 'single' renders one bare node; 'parallel' renders a labelled group. */
  kind: 'single' | 'parallel';
  nodes: SequencingNode[];
}

export interface SequencingNext {
  /** Terminal node label: the next stratum's name, or "Plan complete". */
  label: string;
  /** 'available' once every present objective in the stratum is complete. */
  status: 'available' | 'locked';
}

export interface SequencingModel {
  groups: SequencingGroup[];
  next: SequencingNext;
}

type StatusMap = Readonly<Record<string, PlanStratumObjectiveStatus>>;

/**
 * Layer a stratum's objectives into sequencing "waves" by INTRA-stratum
 * prerequisites: an objective whose every same-stratum prerequisite is already
 * placed joins the current wave. Prereqs pointing at other strata are ignored
 * here -- they gate the whole stratum, not the order within it. A bounded loop
 * with a cycle-fallback (dump the unresolved remainder into one wave) guarantees
 * termination. In practice S2-S7 carry no intra-stratum prereqs, so this yields
 * a single wave of every objective.
 */
function deriveWaves(
  objectives: readonly PlanStratumObjective[],
): Array<{ kind: 'single' | 'parallel'; ids: string[] }> {
  const ownIds = new Set(objectives.map((o) => o.id));
  const placed = new Set<string>();
  let remaining = [...objectives];
  const waves: Array<{ kind: 'single' | 'parallel'; ids: string[] }> = [];
  // Bound: each pass places >= 1 objective (the fallback places ALL remaining
  // when nothing is ready), so length+1 passes always drains it.
  let guard = remaining.length + 1;
  while (remaining.length > 0 && guard > 0) {
    guard -= 1;
    const ready = remaining.filter((o) =>
      (o.prerequisiteObjectiveIds ?? [])
        .filter((p) => ownIds.has(p))
        .every((p) => placed.has(p)),
    );
    // Cycle / unsatisfiable fallback: place the remainder together rather than
    // looping forever.
    const wave = ready.length > 0 ? ready : remaining;
    for (const o of wave) placed.add(o.id);
    waves.push({
      kind: wave.length > 1 ? 'parallel' : 'single',
      ids: wave.map((o) => o.id),
    });
    remaining = remaining.filter((o) => !placed.has(o.id));
  }
  return waves;
}

/**
 * Build a stratum's objective-sequencing model: resolve the wave layout (a
 * curated override for Stratum 1, else prereq-derived waves), number the present
 * objectives "{ordinal}.{n}" in wave order, and overlay live statuses. Objectives
 * absent from the resolved `objectives` set drop out; a parallel wave left with a
 * single surviving node collapses to 'single' so no lone "parallel" label
 * renders. The terminal node carries the caller-supplied `nextLabel` (the next
 * stratum's name, or "Plan complete") and unlocks only once every present
 * objective in the stratum is complete.
 */
export function deriveStratumSequencing(
  stratum: Pick<PlanStratum, 'id' | 'ordinal'>,
  objectives: readonly PlanStratumObjective[],
  statuses: StatusMap,
  nextLabel: string,
): SequencingModel {
  const present = new Set(objectives.map((o) => o.id));
  const override = STRATUM_SEQUENCE_OVERRIDES[stratum.id];
  const layout = override
    ? override.map((w) => ({
        kind: w.kind,
        ids: w.ids.filter((id) => present.has(id)),
      }))
    : deriveWaves(objectives);

  const groups: SequencingGroup[] = [];
  const presentNodes: SequencingNode[] = [];
  let counter = 0;

  for (const wave of layout) {
    const nodes: SequencingNode[] = [];
    for (const id of wave.ids) {
      if (!present.has(id)) continue;
      counter += 1;
      const node: SequencingNode = {
        id,
        display: `${stratum.ordinal}.${counter}`,
        status: statuses[id] ?? 'locked',
      };
      nodes.push(node);
      presentNodes.push(node);
    }
    if (nodes.length === 0) continue;
    groups.push({ kind: nodes.length > 1 ? wave.kind : 'single', nodes });
  }

  const allComplete =
    presentNodes.length > 0 &&
    presentNodes.every((n) => n.status === 'complete');

  return {
    groups,
    next: { label: nextLabel, status: allComplete ? 'available' : 'locked' },
  };
}

/**
 * objectiveId -> "{ordinal}.{n}" presentation number for a stratum, IDENTICAL to
 * the numbers the sequencing rail renders. It reuses deriveStratumSequencing (the
 * single numbering authority) with neutral status/next inputs and reads back each
 * node's `display`, so the Act objective cards and the sequencing stepper can
 * never diverge. Keyed by objective id, so filtering/reordering the rail never
 * shifts a number; objectives absent from the resolved set are simply absent from
 * the map (their card renders no badge).
 */
export function deriveObjectiveDisplayMap(
  stratum: Pick<PlanStratum, 'id' | 'ordinal'>,
  objectives: readonly PlanStratumObjective[],
): Map<string, string> {
  const model = deriveStratumSequencing(stratum, objectives, {}, '');
  const map = new Map<string, string>();
  for (const group of model.groups) {
    for (const node of group.nodes) map.set(node.id, node.display);
  }
  return map;
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
