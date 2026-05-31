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

export interface SpineStratum {
  n: number;
  name: string;
  status: SpineStratumStatus;
  done: number;
  total: number;
}

export interface SpineProtocol {
  id: string;
  label: string;
  count: number;
  feeds: string;
  done: boolean;
  /** Expandable read-only item previews (Act-only methodology). */
  items?: string[];
  /** Set on patch protocols — the secondary layer that added them. */
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
  protocols: SpineProtocol[];
  patchProtocols: SpineProtocol[];
  gate: string;
  handoff: string;
  observeFeeds: string[];
  overlays: string[];
}
