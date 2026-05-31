// objectiveEvidence.ts
//
// Explicit per-objective map of which field-evidence items a Plan tier
// objective requires. Drives the Act tier-shell right-rail Evidence section:
// selecting an objective reveals exactly the proof items that objective needs
// (e.g. checkpoint photos for a terrain survey, route-passable confirmation for
// access objectives, a summary note for every objective) instead of one
// hardcoded trio shown for all objectives.
//
// Unlike objectiveActTools.ts (whose catalogue lives app-side because it joins
// lucide icons + the MapToolId union), the Evidence descriptor data has NO app
// deps -- it is pure data (id, kind, label, required, target). So the catalogue
// AND the per-objective map both live here in packages/shared, and the resolver
// returns ready-to-render descriptors. The app layer (ActTierExecutionPanel)
// only renders.
//
// Two layers of resolution, mirroring objectiveActTools.ts:
//   1. Per-objective override (`OBJECTIVE_EVIDENCE_OVERRIDE`) -- the explicit,
//      ordered evidence list for an objective, keyed by REAL objective id.
//   2. Per-stratum default (`STRATUM_EVIDENCE_DEFAULT`) -- a defensive backstop
//      used when an objective carries no override.
//
// Every objective resolves to at least a `summary-note` (universal proof of
// work). Conformance is guarded by objectiveEvidenceCoverage.test.ts.

import type {
  PlanStratumObjective,
  PlanStratumId,
} from '../schemas/plan/planStratumObjective.schema.js';

export type EvidenceKind = 'photo' | 'confirm' | 'note';

export interface EvidenceDescriptor {
  /** Stable catalogue id; also the React key + state key in the panel. */
  id: string;
  /** Render shape: photo slots, single confirm button, or a textarea note. */
  kind: EvidenceKind;
  /** ASCII-only card title (double-quote any apostrophes). */
  label: string;
  /** Drives the asterisk on the card title. */
  required: boolean;
  /** Photo target count (the `n/N`); confirm/note are always `/1`. */
  target?: number;
}

/**
 * Reusable evidence descriptors. The original three
 * (`checkpoint-photos`, `route-passable`, `summary-note`) are preserved
 * verbatim so existing visuals stay byte-identical; `site-photo` and
 * `measurement-confirm` are lighter generics for survey / spec objectives.
 */
export const EVIDENCE_CATALOG: Readonly<Record<string, EvidenceDescriptor>> = {
  // ---- photo ----
  'checkpoint-photos': {
    id: 'checkpoint-photos',
    kind: 'photo',
    label: 'Checkpoint photos',
    required: true,
    target: 3,
  },
  'site-photo': {
    id: 'site-photo',
    kind: 'photo',
    label: 'Site photo',
    required: false,
    target: 1,
  },
  // ---- confirm ----
  'route-passable': {
    id: 'route-passable',
    kind: 'confirm',
    label: 'Route passable confirmation',
    required: true,
  },
  'measurement-confirm': {
    id: 'measurement-confirm',
    kind: 'confirm',
    label: 'Measurements verified on site',
    required: true,
  },
  // ---- note ----
  'summary-note': {
    id: 'summary-note',
    kind: 'note',
    label: 'Summary note',
    required: true,
  },
};

/**
 * Per-stratum default evidence -- used when an objective has no override.
 * Every stratum yields at least a summary note; the two reading strata add a
 * site photo as a sensible field-proof default.
 */
export const STRATUM_EVIDENCE_DEFAULT: Readonly<
  Record<PlanStratumId, readonly string[]>
> = {
  's1-project-foundation': ['summary-note'],
  's2-land-reading': ['site-photo', 'summary-note'],
  's3-systems-reading': ['site-photo', 'summary-note'],
  's4-foundation-decisions': ['summary-note'],
  's5-system-design': ['summary-note'],
  's6-integration-design': ['summary-note'],
  's7-phasing-resourcing': ['summary-note'],
} as const;

/**
 * Per-objective override. The explicit, ordered evidence list each objective
 * requires, scoped to that objective's OWN work. Keyed by the REAL objective
 * ids in constants/plan/catalogues/universal.ts.
 *
 * Assignment principle:
 *   - `summary-note` on every objective (universal written proof of work).
 *   - photos on objectives that survey or place physical things on site.
 *   - `route-passable` ONLY on the two access/circulation objectives
 *     (`s2-infrastructure` surveys existing access; `s5-access` designs it).
 *   - `measurement-confirm` on objectives whose output is a measured/specified
 *     design that should be field-verified.
 */
export const OBJECTIVE_EVIDENCE_OVERRIDE: Readonly<
  Record<string, readonly string[]>
> = {
  // ---------- S1 -- Project Foundation ----------
  's1-vision': ['summary-note'],
  's1-boundaries': ['site-photo', 'summary-note'],
  's1-stakeholders': ['summary-note'],

  // ---------- S2 -- Land Reading ----------
  's2-terrain': ['checkpoint-photos', 'summary-note'],
  's2-climate': ['site-photo', 'summary-note'],
  's2-ecology': ['checkpoint-photos', 'summary-note'],
  's2-infrastructure': ['checkpoint-photos', 'route-passable', 'summary-note'],

  // ---------- S3 -- Systems Reading ----------
  's3-hydrology': ['checkpoint-photos', 'summary-note'],
  's3-soil': ['checkpoint-photos', 'measurement-confirm', 'summary-note'],

  // ---------- S4 -- Foundation Decisions ----------
  's4-direction': ['summary-note'],
  's4-water-strategy': ['measurement-confirm', 'summary-note'],
  's4-zones': ['site-photo', 'summary-note'],

  // ---------- S5 -- System Design ----------
  's5-access': ['checkpoint-photos', 'route-passable', 'summary-note'],
  's5-water-infrastructure': [
    'checkpoint-photos',
    'measurement-confirm',
    'summary-note',
  ],
  's5-soil-improvement': ['site-photo', 'measurement-confirm', 'summary-note'],

  // ---------- S6 -- Integration Design ----------
  's6-monitoring': ['summary-note'],

  // ---------- S7 -- Phasing & Resourcing ----------
  's7-phase1': ['summary-note'],
  's7-resource-plan': ['summary-note'],
  's7-risk-register': ['summary-note'],
};

/**
 * Resolve the ordered list of evidence DESCRIPTORS an objective requires.
 * Per-objective override wins; stratum default is the fallback; a bare
 * summary-note is the final defensive backstop. Unknown ids are dropped.
 */
export function getObjectiveEvidence(
  objective: PlanStratumObjective,
): readonly EvidenceDescriptor[] {
  const ids =
    OBJECTIVE_EVIDENCE_OVERRIDE[objective.id] ??
    STRATUM_EVIDENCE_DEFAULT[objective.stratumId] ??
    ['summary-note'];
  const out: EvidenceDescriptor[] = [];
  for (const id of ids) {
    const descriptor = EVIDENCE_CATALOG[id];
    if (descriptor) out.push(descriptor);
  }
  return out;
}
