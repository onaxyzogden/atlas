# 2026-05-22 — Phase C consolidation + end-to-end verify (PDC Phase C, C6)

**Branch.** `feat/atlas-permaculture`. Wiki/ADR/roadmap commit (no source
change). Closes Phase C of the "make Atlas the only tool a student uses to
produce an OSU PDC portfolio" roadmap.

**End-to-end verification (best-effort, stated not claimed).** Re-confirmed the
full Phase C unit surface green: C1 `featureMappingPath` 4/4 · C2
`featureMappingUtility` 5/5 · C3 `syncManifest` 10/10 + `syncManifestRoundTrip`
67/67 · C4 `utilityPointTypes` 5/5 · C5 `utilityPointEditSchema` 7/7. Web tsc
(8 GB node script) at the **3-error pre-existing baseline**
(`StepBoundary.tsx`, `HostUnionContextMenu.test.tsx`,
`HostUnionDrilldownCard.test.tsx`); foreign `WasteVectorDashboardView.tsx` /
`ZoneSomSidebar*` / `EconomicsPanel*` / `capitalPartner*` WIP untouched.
**Live DOM (Claude Preview, web :5200):** the seeded `/v3/project/mtc/plan`
route loads with a live MapLibre canvas (`hasCanvas:true`, `canvasCount:1`,
body ~136 KB) **after** the C5 changes, with **no C5-related console error** —
only the expected `[SYNC] :3001 ECONNREFUSED` (API down, irrelevant). That is
a real regression gate: the new utility-point edit-click `useEffect` and the
`orient` symbol layer do not crash the Plan render.

**Verification deferrals (the standing Phase C wall).** The orientation chevron
*drawing* on a selected structure, and the utility-point edit form *opening on
a map-feature click*, both require the full stack — running web server +
authenticated session + the seeded typed `design_features` (structures /
utility points load via initial sync from the API that is **down** at `:3001`)
+ headless WebGL + a MapTiler tile key — and `preview_screenshot` hangs on this
WebGL/backgrounded canvas; MapLibre canvas clicks also can't be synthesized via
DOM eval. **No visual success claimed** (per project CLAUDE.md). The same wall
covers the live cross-device draw → reload → POST `/design-features` →
master-plan PDF feature-roster round-trip. Covered meanwhile by the C1–C5 unit
tests + typecheck — the durable verification posture for the whole permaculture
authoring surface in this environment.

**Consolidation ADR.** New
[[decisions/2026-05-22-atlas-phase-c-consolidation]] — umbrella tying C1–C5:
the **canonical-ownership matrix** (C4), the **typed-promotion pattern** (C1/C2,
with C3 as the inverse no-transport safety lesson), the **authoring-surface
type-split** (C4), and the **v3 edit-parity surface** (paths/structures/utility
points, C5). Declares Phase C complete and records the standing live-WebGL
verification deferral. Documents that **no persisted data migrated across all
of Phase C** (every change is transport/authoring; stewardship sovereignty
preserved) and that the three roadmap gaps (Phase A master-plan export, Phase B
planting-plan, Phase C Plan-stage authoring) are now closed — the remaining
Canvas + peer-review-blog boundary is the course LMS, intentionally out of
scope.

**Bookkeeping.** Flipped C5/C6 from deferred to **done** in the C1–C2 ADR
([[decisions/2026-05-22-atlas-typed-promotion-access-utility]]) and the C4 ADR
([[decisions/2026-05-22-atlas-canonical-feature-ownership-c4]]) "Phase C
remainder" sections; marked **Phase C done** in the roadmap
(`~/.claude/plans/how-close-is-atlas-olos-lexical-metcalfe.md`); added the C5
log ([[log/2026-05-22-c5-structure-orientation-utility-edit-parity]]) and this
C6 log under `wiki/log/`, indexed in `wiki/log.md`; registered the
consolidation ADR in `wiki/index.md`.

**Covenant + IA.** No public-facing capital framing touched — "capital partners
& allies" per [[fiqh-csra-erased-2026-05-04]] untouched; no CSRA / *bayʿ mā
laysa ʿindak* / salam reintroduced. 3-item Observe/Plan/Act IA unchanged.
Continues [[log/2026-05-22-c5-structure-orientation-utility-edit-parity]].
