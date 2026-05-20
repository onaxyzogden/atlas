# 2026-05-16 — WS4 catalog archetype parity (closes spec OQ1)


Closed the last open Workstream-4 item: catalog depth per project
type. Added `ProjectArchetype` (extracted named union) and optional
`Intervention.projectTypes?` tag; the sequencing-engine eligibility
loop now skips an intervention whose non-empty `projectTypes` excludes
the active archetype (untagged ⇒ universal ⇒ the 22 legacy entries are
provably non-regressive — first conjunct short-circuits).

Split monolithic `interventionCatalog.ts` into `interventionCatalog/`
(`_shared` 22 verbatim untagged; empty `homestead`; one module each for
regenerative-farm / retreat / education / conservation /
multi-enterprise; `index` barrel). `interventionCatalog.ts` kept as a
thin re-export ⇒ zero importer churn.

Authored 24 new grounded interventions (6 per non-homestead archetype)
+ shared cross-vocabulary `criterionContributions` on ~13 legacy
entries so non-homestead goal trees can reach them.
`CATALOG_VERSION → goal-compass-v2-2026-05-16`.

**Verification.** `tsc --noEmit` clean (exit 0); new
`archetypeCatalogParity.test.ts` 15/15 (≥6 distinct selected per
archetype + grounded + id-uniqueness + foundations untagged); legacy
`regenerativeFarmCatalog.test.ts` unchanged & green; full plan-engine
suite 102/102.

ADR: `wiki/decisions/2026-05-16-atlas-catalog-archetype-parity.md`.

**Deferred.** `multi-largest-enterprise-pct` intentionally has no
dedicated contribution (emergent revenue-concentration ratio). No
goal-tree template edits, no UI, no persist-version bump.
