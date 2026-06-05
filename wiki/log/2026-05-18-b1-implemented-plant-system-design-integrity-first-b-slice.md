# 2026-05-18 — B1 implemented: plant-system design integrity (first B slice)


**Branch.** `feat/atlas-permaculture`.

Built B1 per [[2026-05-18-atlas-bd-subproject-decomposition]]: a pure
companion-planting constraint checker (`guildIntegrityMath.ts` — matrix
+ mandatory catalog-`incompatible` fallback + explicit `unmatched` info,
spacing heuristic, maturity spread) with a read-only `GuildIntegrityCard`,
plus a net-new additive `successionPathStore` slice and editable
`SuccessionPathCard` (Year0→Year30). Registration was 2 append-only edits
(`types.ts`, `PlanModuleSlideUp.tsx`) — `plant-systems` was already a
registered module so no `PlanModule` union change. Three ADR-deferred
per-part calls made at build: two cards (not one), new persisted designer
(separate persist key, no migrate), pure validator with **no goal-tree
criterion** (EdgeConnectivity/TemporalCoherence precedent).

Verified: apps/web tsc clean for all 8 B1 files; packages/shared tsc
exit 0; vitest 13/13 (`guildIntegrityMath` 8, `successionPathStore` 5).
Remaining project tsc/Vite errors are pre-existing out-of-band D0 work
(`workItemStore*`), not B1. Per the screenshot-honesty rule no browser
screenshot claimed (cards sit deep behind plant-systems nav; the
out-of-band `workItemStore.migration` import error blocks the shell).

**Commit posture.** Mixed working tree (B1 + active uncommitted D0 work).
B1 staged by explicit path only; commit/push decision surfaced to the
operator rather than blanket-committing — CLAUDE.md (don't clobber
others' uncommitted work). See ADR
[[2026-05-18-atlas-b1-plant-system-design-integrity]].
