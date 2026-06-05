// types.ts
//
// TypeScript shapes for the Plan Spine prototype's mock data. The prototype
// (olos_plan_spine.jsx) is plain JS; these types make the verbatim reproduction
// type-safe without changing any rendered values. Mock-data-only — real wiring
// is deferred (the live, token-styled Design Mode already exists in
// PlanStratumShell and is untouched by this slice).

export type SpineStratumStatus = 'complete' | 'active' | 'available' | 'locked';

export type SpineObjectiveStatus =
  | 'complete'
  | 'in_progress'
  | 'available'
  | 'locked';

export type SpineObjectiveSource = 'universal' | 'primary' | 'secondary';

/**
 * Per-proposal decision in the §4.1 auto-instantiation confirmation flow.
 * Web-only prototype UI state — distinct from the spec's canonical
 * `ProtocolStatus` lifecycle (draft/active/triggered/suspended/retired). A
 * proposal starts 'pending', then the steward either 'activated' it (becomes a
 * standing protocol) or 'skipped' it (recoverable from the §4.1 skipped list).
 */
export type ProposalDecision = 'pending' | 'activated' | 'skipped';

export interface SpineStratum {
  n: number;
  name: string;
  status: SpineStratumStatus;
  done: number;
  total: number;
}

/**
 * A named scope within an objective that partitions its Act checklist items and
 * feeds an Observe domain. Mirrors the live `decisionGroups` field on
 * planStratumObjective.schema.ts (DecisionGroup[]). Formerly mislabeled
 * "protocol" in the prototype — renamed to free "Protocol" for the spec's
 * conditional-rule Protocol Layer.
 */
export interface SpineDecisionGroup {
  id: string;
  label: string;
  count: number;
  feeds: string;
  done: boolean;
  /** Expandable read-only item previews (Act-only methodology). */
  items?: string[];
  /** Set on patch groups — the secondary layer that added them. */
  secondary?: string;
}

export interface SpineObjective {
  id: string;
  stratum: number;
  source: SpineObjectiveSource;
  status: SpineObjectiveStatus;
  title: string;
  question: string;
  actDone: number;
  actTotal: number;
  decisionGroups: SpineDecisionGroup[];
  patchDecisionGroups: SpineDecisionGroup[];
  gate: string;
  handoff: string;
  observeFeeds: string[];
  overlays: string[];
}
