// mockProtocols.ts
//
// Prototype-only sample protocols for the Plan Spine Protocol Layer. The shared
// catalogue (@ogden/shared `templatesForEnterprises`) attributes all of its
// standing operational logic to Stratum 6 — Integration; this spine-local set
// adds illustrative samples for the *other* strata (1–5 and 7) so the gallery
// demo shows that protocol authorship spans the whole planning spine.
//
// These are read-only samples: they carry no §10.1 confirmation/activation
// state (only the Stratum-6 shared templates flow through ProtocolConfirmationFlow).
// They reuse the shared StandardProtocolTemplate shape so ProtocolModePanel's
// existing ProtocolLibraryCard renders them with zero card changes; the only
// addition is `stratum` for grouping.

import type { StandardProtocolTemplate, EnterpriseId } from '@ogden/shared';

/** A standard-template shape plus the authoring stratum, for the grouped prototype view. */
export interface SpineProtocolTemplate extends StandardProtocolTemplate {
  stratum: number;
}

/**
 * Prototype-only sample protocols for strata 1–5 and 7. Stratum 6 keeps coming from the
 * shared catalogue (templatesForEnterprises) so the Integration-approval flow is untouched.
 * These are illustrative read-only samples — they carry no confirmation/activation state.
 */
export const MOCK_STRATUM_PROTOCOLS: SpineProtocolTemplate[] = [
  // ── Stratum 1 — Project Foundation ──────────────────────────────
  {
    id: "foundation-goals-annual-review", stratum: 1, type: "cyclical",
    name: "Project Goals — Annual Review", enterpriseScope: ["sheep_beef"],
    condition: "IF [review interval] elapsed since last whole-farm goals review",
    response: "Revisit project goals, holistic context, and land-tenure constraints with the steward",
    rationale: "Keeps the project anchored to its founding intent so later design and operations do not drift.",
    feeds: [], tierAuthored: "Stratum 1 — Project Foundation",
  },
  {
    id: "foundation-new-enterprise-charter-check", stratum: 1, type: "judgment",
    name: "New Enterprise — Charter Check", enterpriseScope: ["sheep_beef"],
    condition: "IF a new enterprise is proposed for the property",
    response: "Check it against the project charter and tenure constraints before any planning work",
    rationale: "Stops scope creep that would commit land and labour against the agreed founding charter.",
    feeds: [], tierAuthored: "Stratum 1 — Project Foundation",
  },
  // ── Stratum 2 — Land Reading ────────────────────────────────────
  {
    id: "land-heavy-rainfall-reinspection", stratum: 2, type: "threshold",
    name: "Heavy Rainfall — Waterway Re-inspection", enterpriseScope: ["sheep_beef"],
    condition: "IF a rainfall event >= [rainfall trigger] is recorded",
    response: "Re-inspect mapped waterways and erosion-prone zones for change",
    rationale: "Catches erosion and watercourse shifts while they are still small and cheap to address.",
    feeds: ["Water & Hydrology"], tierAuthored: "Stratum 2 — Land Reading",
  },
  {
    id: "land-baseline-resurvey", stratum: 2, type: "cyclical",
    name: "Baseline Map — Periodic Re-survey", enterpriseScope: ["sheep_beef"],
    condition: "IF [survey interval] elapsed since the last baseline soil and contour map",
    response: "Schedule a re-survey of the reference monitoring sites",
    rationale: "Keeps the land baseline current so later strata read from accurate ground truth.",
    feeds: ["Soil"], tierAuthored: "Stratum 2 — Land Reading",
  },
  // ── Stratum 3 — Systems Reading ─────────────────────────────────
  {
    id: "systems-forage-capacity-refresh", stratum: 3, type: "cyclical",
    name: "Forage Capacity — Refresh Before Stocking", enterpriseScope: ["sheep_beef"],
    condition: "IF the forage-capacity reading is older than [survey interval]",
    response: "Re-run the pasture capacity assessment before the next stocking decision",
    rationale: "Prevents stocking decisions from being made on stale carrying-capacity numbers.",
    feeds: ["Pasture & Forage"], tierAuthored: "Stratum 3 — Systems Reading",
  },
  {
    id: "systems-water-flow-recheck", stratum: 3, type: "threshold",
    name: "Water Source — Flow Re-check", enterpriseScope: ["sheep_beef"],
    condition: "IF measured water-source flow drops below [flow baseline]",
    response: "Flag a hydrology re-reading before relying on that supply",
    rationale: "Surfaces a failing water source before livestock are made dependent on it.",
    feeds: ["Water & Hydrology"], tierAuthored: "Stratum 3 — Systems Reading",
  },
  // ── Stratum 4 — Foundation Decisions ────────────────────────────
  {
    id: "foundation-decision-conflict-guard", stratum: 4, type: "judgment",
    name: "Foundation Decision — Conflict Guard", enterpriseScope: ["sheep_beef"],
    condition: "IF a proposed change conflicts with an approved foundation decision",
    response: "Require steward review before proceeding",
    rationale: "Protects the integrity of decisions the whole design depends on from quiet erosion.",
    feeds: [], tierAuthored: "Stratum 4 — Foundation Decisions",
  },
  {
    id: "silvopasture-establishment-review", stratum: 4, type: "threshold",
    name: "Silvopasture — Establishment Review", enterpriseScope: ["sheep_beef"],
    condition: "IF silvopasture tree survival < [establishment target]",
    response: "Revisit the species and placement decision for that zone",
    rationale: "Triggers a design rethink before repeated replanting wastes the establishment window.",
    feeds: ["Pasture & Forage"], tierAuthored: "Stratum 4 — Foundation Decisions",
  },
  // ── Stratum 5 — Design ──────────────────────────────────────────
  {
    id: "design-growth-assumption-review", stratum: 5, type: "threshold",
    name: "Rotation Design — Growth Assumption Review", enterpriseScope: ["sheep_beef"],
    condition: "IF seasonal pasture growth deviates more than [growth deviation] from the design assumption",
    response: "Review the rotation design before the next season",
    rationale: "Keeps the grazing plan matched to actual growth instead of an outdated design assumption.",
    feeds: ["Pasture & Forage"], tierAuthored: "Stratum 5 — Design",
  },
  {
    id: "design-new-species-monitoring", stratum: 5, type: "judgment",
    name: "New Species — Monitoring Cadence Update", enterpriseScope: ["sheep_beef"],
    condition: "IF a new pasture or tree species is introduced",
    response: "Update the monitoring cadence design to cover it",
    rationale: "Ensures every introduced species is actually observed rather than assumed to thrive.",
    feeds: ["Pasture & Forage", "Soil"], tierAuthored: "Stratum 5 — Design",
  },
  {
    // Poultry-scoped on purpose: demonstrates the enterprise filter still hides
    // non-active-enterprise protocols even in the grouped, multi-stratum view.
    id: "design-poultry-range-layout", stratum: 5, type: "judgment",
    name: "Poultry Range — Layout Design", enterpriseScope: ["poultry"],
    condition: "IF poultry are added to the silvopasture rotation",
    response: "Design the range-area layout and shelter placement before introduction",
    rationale: "Plans shelter and range before birds arrive so welfare is built in, not retrofitted.",
    feeds: ["Livestock & Animal Health"], tierAuthored: "Stratum 5 — Design",
  },
  // ── Stratum 7 — Phasing & Resourcing ────────────────────────────
  {
    id: "phasing-milestone-review", stratum: 7, type: "cyclical",
    name: "Phase Milestone — Resourcing Review", enterpriseScope: ["sheep_beef"],
    condition: "IF a phase milestone date is reached",
    response: "Review resourcing and sequencing for the next phase",
    rationale: "Re-checks that resources still match the plan before committing to the next phase.",
    feeds: [], tierAuthored: "Stratum 7 — Phasing & Resourcing",
  },
  {
    id: "phasing-resource-shortfall-pause", stratum: 7, type: "judgment",
    name: "Resource Shortfall — Commitment Pause", enterpriseScope: ["sheep_beef"],
    condition: "IF a resource or budget shortfall is detected for an active phase",
    response: "Pause new phase commitments and re-plan",
    rationale: "Stops over-commitment that would strand a half-finished phase without resources.",
    feeds: [], tierAuthored: "Stratum 7 — Phasing & Resourcing",
  },
  {
    id: "phasing-prerequisite-block", stratum: 7, type: "threshold",
    name: "Phase Prerequisite — Start Block", enterpriseScope: ["sheep_beef"],
    condition: "IF a phase prerequisite from an earlier stratum is unmet",
    response: "Block that phase from starting until it is resolved",
    rationale: "Enforces the planning sequence so phases do not start on unfinished foundations.",
    feeds: [], tierAuthored: "Stratum 7 — Phasing & Resourcing",
  },
];

/** Enterprise filter for the mock samples — mirrors @ogden/shared templatesForEnterprises. */
export function mockProtocolsForEnterprises(
  activeEnterprises: readonly EnterpriseId[],
): readonly SpineProtocolTemplate[] {
  const active = new Set(activeEnterprises);
  if (active.size === 0) return [];
  return MOCK_STRATUM_PROTOCOLS.filter((t) => t.enterpriseScope.some((e) => active.has(e)));
}
