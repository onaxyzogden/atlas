# 2026-05-23 — OLOS story → codebase feature/gap map

**Branch.** `feat/atlas-permaculture`. Documentation only — no source change.

The steward supplied the two-part 17-chapter narrative *"The Story of OLOS"*
(`~/Downloads/The story of OLOS Part 1.md` + `Part 2.md`) and chose, via
AskUserQuestion, **"Map story to codebase"**: cross-reference the narrative's
depicted Steward's-Atlas capabilities against what actually exists in the repo,
producing a feature/gap analysis.

**Decomposed the arc into 12 capabilities** across Observe → Plan → Act and
verified each against current code. **An initial Explore-agent pass produced a
stale draft** (it pre-dated several shipped features); caught it when the `wiki/log/`
index surfaced `2026-05-13-needs-yields-audit-card-v2-inline-edge-authoring` and
`2026-05-13-plan-temporal-slider-succession-maturity-v1` — the two **P0 backlog
items from [[concepts/permaculture-alignment]]** that the draft still listed as
gaps. Ran a second rigorous current-state verification (very-thorough Explore +
direct file reads) before persisting anything to the wiki, per the wiki accuracy
rule.

**Corrected verdict: ~7 of 12 Full · 5 Partial · 0 Missing** — the story is almost
entirely realized. Stale rows fixed: #5 zones (explicit Z0–Z5 via
`lib/zones/permacultureLabels.ts` + `PermacultureZoneTool`), #4 honest-reading
(`store/swotStore.ts` + `ZoneSiteSuitabilityCard` + `HazardZoneTool`), #6
needs-&-yields (`NeedsYieldsAuditCard` + `packages/shared/relationships`, score
weight 0.10), #10 temporal slider (`v3/plan/canvas/temporalScrubStore.ts`), and
#8 Command Centre (the unified `store/workItemStore.ts` spine binds
photos/materials/cost/criteria/sign-off to task rows). The two load-bearing
"Full" claims were checked directly: `store/projectStore.ts` (shared memory) and
`v3/plan/engine/goalCompass/sequencingEngine.ts:10` ("Topologically order the
filtered set by prerequisites + Yeomans phase").

**Five genuine remaining gaps** (the actionable surface, rough priority):
(a) real observation→confidence feedback wire (#10 — multi-year obs *logged* via
proofEventStore but not fed back into layer confidence); (b) dedicated
Goal-Compass sequencing UI (#7 — engine-only today); (c) inline needs-&-yields
edge authoring in the Plan slide-up (#6 — authoring still legacy-canvas-only);
(d) collaboration audit trail / change-log (#9 — RBAC + suggest-edit only);
(e) design-overlay-on-satellite + flyover (#12 — presentation, lowest).

**Wrote** [[concepts/olos-story-codebase-map]] (full capability table + remaining
gaps + a constraint that this is a fast-decaying snapshot to re-verify before
acting) and indexed it under Concepts in `wiki/index.md`. Covenant clean —
nothing reintroduces advance-purchase capital framing per [[fiqh-csra-erased-2026-05-04]].
Complements [[concepts/permaculture-alignment]]; distinct from the dataset-coverage
[[entities/gap-analysis]]. Plan: `~/.claude/plans/c-users-my-own-axis-downloads-the-story-mighty-sifakis.md`.
