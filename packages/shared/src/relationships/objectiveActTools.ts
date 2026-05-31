// objectiveActTools.ts
//
// Explicit per-objective map of which Act map tools a Plan tier objective
// "calls for". Drives the Act tier-shell bottom rail: selecting an objective
// reveals exactly the tools that objective needs, and field logs (harvest /
// water / livestock) become objective-conditional rather than always-on.
//
// This is net-new product data authored explicitly (not derived from the
// Observe-domain mapping or shown-all). It returns catalogue-id STRINGS only
// (e.g. 'contour', 'paddocks', 'harvest') so the file stays in packages/shared
// with no app-layer deps; the app-layer catalogue
// (apps/web/src/v3/act/tier-shell/actToolCatalog.ts) joins these ids to labels,
// icons, and the real MapToolId each arms.
//
// Two layers of resolution, mirroring objectiveObserveDomains.ts:
//   1. Per-objective override (`OBJECTIVE_ACT_TOOLS_OVERRIDE`) — the explicit,
//      ordered tool list for an objective.
//   2. Per-tier default (`STRATUM_ACT_TOOLS_DEFAULT`) — a defensive backstop
//      used when an objective carries no override.
//
// Order matters: the rail groups tools by category in catalogue order, but the
// override list documents intent per objective. Non-spatial objectives
// (s1-vision, s1-stewardship) resolve to `[]`, which the rail renders as an
// empty state.

import type {
  PlanStratumObjective,
  PlanStratumId,
} from '../schemas/plan/planStratumObjective.schema.js';

/**
 * Per-tier default tool sets — used when an objective has no override.
 * Conservative and small; the per-objective override is the primary surface.
 */
export const STRATUM_ACT_TOOLS_DEFAULT: Readonly<
  Record<PlanStratumId, readonly string[]>
> = {
  's1-project-foundation': [],
  's2-land-reading': ['contour', 'drainage', 'soil', 'vegetation', 'erosion'],
  's3-systems-reading': [
    'roads',
    'power',
    'water-lines',
    'gates',
    'fencing',
    'buildings',
  ],
  's4-foundation-decisions': ['roads', 'gates', 'fencing', 'buildings'],
  's5-system-design': ['water-lines', 'tanks', 'wells', 'water'],
  's6-integration-design': [
    'crops',
    'orchards',
    'paddocks',
    'beds',
    'compost',
    'harvest',
    'livestock',
  ],
  's7-phasing-resourcing': ['buildings', 'barns', 'tanks'],
} as const;

/**
 * Per-objective override. The explicit, ordered tool list each objective
 * calls for. Absent ids fall through to `STRATUM_ACT_TOOLS_DEFAULT`.
 */
export const OBJECTIVE_ACT_TOOLS_OVERRIDE: Readonly<
  Record<string, readonly string[]>
> = {
  // ---------- S1 — Project Foundation (non-spatial) ----------
  's1-vision': [],
  's1-stewardship': [],

  // ---------- S2 — Land Reading ----------
  // Read the land baseline: landform, water, soil, ecology, erosion.
  's2-land-baseline': ['contour', 'drainage', 'soil', 'vegetation', 'erosion'],

  // ---------- S3 — Systems Reading ----------
  // Existing access, utilities, and infrastructure on the ground.
  's3-systems-baseline': [
    'roads',
    'power',
    'water-lines',
    'gates',
    'fencing',
    'buildings',
  ],

  // ---------- S4 — Foundation Decisions ----------
  // Zones + sectors framed by access boundaries and primary structures.
  's4-zones-sectors': ['roads', 'gates', 'fencing', 'buildings'],

  // ---------- S5 — System Design ----------
  // Water strategy: lines, storage, sources, plus the maintenance log.
  's5-water-strategy': ['water-lines', 'tanks', 'wells', 'water'],

  // ---------- S6 — Integration Design ----------
  // Production systems + yield/livestock field logs.
  's6-yield-flows': [
    'crops',
    'orchards',
    'paddocks',
    'beds',
    'compost',
    'harvest',
    'livestock',
  ],

  // ---------- S7 — Phasing & Resourcing ----------
  // Structures phasing/placement.
  's7-phasing': ['buildings', 'barns', 'tanks'],
};

/**
 * Resolve the ordered list of Act tool catalogue ids an objective calls for.
 * Per-objective override wins; tier default is the fallback. Returns `[]`
 * when no mapping exists (defensive — a brand-new objective without an entry
 * shows the rail's empty state rather than every tool).
 */
export function getObjectiveActTools(
  objective: PlanStratumObjective,
): readonly string[] {
  const override = OBJECTIVE_ACT_TOOLS_OVERRIDE[objective.id];
  if (override) return override;
  return STRATUM_ACT_TOOLS_DEFAULT[objective.stratumId] ?? [];
}
