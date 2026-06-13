# 2026-06-13 — Cyclical Review Mode (ADR 11): reverse `feedsInto` consumer + full review UI; §9.3 verified already-satisfied

**Project:** OLOS / atlas
**Objective:** (A) Build the reverse, data-derived cyclical-Review consumer of the now-complete forward `feedsInto` graph plus the full ADR 11 Cyclical Review Mode UI; (B) backfill §9.3 upstream prose-cites for the three "sparse" catalogues.
**Branch:** `main`. **Status:** built + verified; NOT committed; nothing pushed.

## Context

The forward `feedsInto` channel was completed and test-locked earlier (1327 feed-bearing items; `spineTraceability.conformance.test.ts` 14->18 assertions; `feedsIntoCoverage.baseline.json`). ADR 5 (`2026-05-29-atlas-spec-feeds-into-data-model`) ratified that same field as the single source for both the forward "Feeds" chips (shipped) and the **reverse cyclical-Review flags**; ADR 11 (`2026-05-29-atlas-spec-cyclical-review-mode`) layers the full review-mode UI on top. Key discovery: the review plumbing already ran live but flagged by **domain-membership only** — it never consulted `feedsInto`. So the core ask was a **resolver upgrade + attribution**, not a from-scratch build.

Four operator decisions framed the build: flag direction = BOTH (upstream feeders ∪ downstream consumers); relationship to existing trigger = AUGMENT (union with domain-membership); UI scope = full ADR 11; §9.3 = research + author the cites.

## Workstream A — Cyclical Review Mode (full ADR 11)

- **A1 — pure resolver.** New `packages/shared/src/relationships/reviewFlagResolver.ts` — `resolveReviewFlaggedObjectives({ objectives, divergedDomains })` returns `Map<objectiveId, { via: ('membership'|'upstream'|'downstream')[]; domains }>`. Union of three signals: domain-membership (existing semantics), downstream (`feedsInto` targets of changed-domain objectives), upstream (objectives whose items feed a changed-domain objective). Project-scoped, pure, I/O-free. Exported from `relationships/index.ts` + `src/index.ts`. 5/5 unit tests.
- **A2 — store attribution + migration.** `cyclicalReviewStore` gained `triggerContext: { domains; via } | null`; persist bumped to v3 with an additive migration (default `null`); `confirmDecision`/`acknowledgeRevise`/`clearForcedTrigger` clear it; round-trip migration test.
- **A3 — rewire sync.** `usePlanRevisionFlagSync` now calls the resolver once, diffs against persisted state, and forces/clears with `triggerContext` (membership folded into the resolver; diff-guard keeps steady-state churn at zero).
- **A4–A7 — UI.** `describeObserveChange` change-descriptor (reuses `AsBuiltReconciliationCard` diff-format + `formatCapturedAt`); Screen 1 review-entry modal (Observe-driven reason + flagged-objective list + Begin/Dismiss) on `CyclicalReviewBanner`; Screen 2 blue "Decision updated" variant + downstream-effects summary on `CyclicalReviewModal`; new `ObserveUpdatesSection` (§2b) in `ObjectiveDetailPanel` between MAP ACTIVATION and YOUR DECISIONS.
- **A8 — soft gates.** UI-layer only (kept `computeObjectiveStatus` I/O-free): a `locked` objective/stratum that was previously completed (`lastReviewedAt != null`) AND a review is active renders as an **accessible amber review checkpoint** instead of a hard lock — `softGate.ts` resolver (5/5), `ObjectiveCard` `reviewCheckpoint` amber badge + `data-soft-review`, `ObjectiveColumn` `softReviewObjectiveIds` pass-through, `PlanStratumShell` `softGates` memo + soft-route, `StratumSpine`/`StratumSpineCircle` amber accessible tier. Only ever OPENS access; never-reached tiers stay hard-gated.

## Workstream B — §9.3: verified already-satisfied (NO authoring)

**Halt-and-surface finding.** The 2026-06-11 audit rated agritourism/ecovillage/education "sparse" and asked for offGrid-pattern upstream prose-cites. Direct inspection (line-level grep + 3 independent Explore agents) shows **every S4+ objective in all three catalogues already carries exactly that cite** — agritourism 22/22, ecovillage 20/20, education 14/14, each a terminal `c5`/`c6`/`c7` item naming the real upstream Stratum/Tier output ("Confirm/Ground/Site X against the Stratum-N/Tier-N Y"). The "sparse" rating predates the cite backfill that landed with the `feedsInto` sweep (all three files are uncommitted `M`). Authoring more would duplicate existing cites and violate verbatim-discipline / no-invention. Phase B was therefore discharged as a **verification**, not an authoring pass; reviewable artifact `STRATUM_93_PROSE_CITES_2026-06-13.md` documents per-objective coverage. Conformance + catalogue suites green unchanged.

**Amanah:** `feedsInto` and the reverse-Review flag are advisory/display-only — never a gate; soft gates only OPEN access. The ecovillage financial cites (`ev-s4-financial-model`, `ev-s7-financial-plan`) point at Stratum 1 communal-fund governance / provision balance — collective stewardship framing, no yield-extraction, no CSRA/salam. Nothing financial edited. Clean ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- `@ogden/shared` full suite: **1383/1383** (82 files; incl. conformance, catalogues, observeRevisionTrigger, A1 resolver, A2 migration).
- `@ogden/web` affected suites: **306/306** (41 files; incl. ObjectiveCard 7, revision dir, cyclicalReviewStore).
- `spineTraceability.conformance` + `catalogues`: **125/125**.
- `@ogden/shared` `tsc --noEmit`: clean. `@ogden/web` `tsc`: only the 4 pre-existing baseline errors (`syncServiceWorkItemsFallback`, `WorkConflictSection`, commit c7fafad6), zero new.
- Preview not used for soft-gate visuals (deterministic hang on v3 Observe lens mounts, [[project-screenshot-hang]]); component/unit tests serve as proof.

## Deferred

Optional B3 cite-count ratchet (not built — §9.3 is structurally complete; a ratchet would add maintenance cost for a now-saturated field). Commit/push of the A1–A8 build awaits operator authorization.

Entity [[entities/plan-tier-shell]]. Implements reverse half of the feeds-into ADR (forward half locked earlier 2026-06-13).
