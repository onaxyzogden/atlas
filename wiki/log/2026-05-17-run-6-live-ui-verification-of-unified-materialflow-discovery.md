# 2026-05-17 — Run-6: live-UI verification of unified `MaterialFlow` (discovery-only)


Closed the single open leg of the unification session — the deferred
browser verification — on a now-available non-sibling preview server
(`web-a1`, port 5240, serverId `2a89ece2-…`, `cwd` = main atlas tree
carrying shipped build `759cfa57`). Discovery-only, **no code changes**,
non-destructive throwaway pid `run6-fcef85be-058f-474e-8cf8-e5787fc8de39`
appended to `ogden-projects` (12 pre-existing `ogden-*` keys untouched,
`preservedPriorIds:true`).

Three live probes, all **WORKS** (DOM-text / store-state reads, no
screenshots — WebGL canvas undrivable):

- **(B) Foreign-key fold.** Seeded `ogden-flow-connectors` `{state:{connectors:[fc-r6 …]}}`
  → `await useClosedLoopStore.persist.rehydrate()` → `materialFlows`
  gains `fc-r6` `origin:'canvas'`, geometry preserved,
  `sourceLabel:'chip pile'`/`sinkLabel:'bed 3'`, `materialKind:'mulch'`;
  `localStorage['ogden-flow-connectors']` → **null** (dead key deleted);
  no collateral loss. Mapping matches `flowConnectorToFlow`
  (`closedLoopStore.ts:137-156`).
- **(C) Canvas-origin scoring.** Injected 2 `fertilityInfra` + canvas
  `MaterialFlow` `mf-r6` (structured `sourceId`/`sinkId`, `origin:'canvas'`).
  SOIL → "Closed-loop graph": SVG `[aria-label="Closed-loop nutrient graph"]`,
  `<line>` count = 1 (mf-r6 drawn), footer `2 vector(s)`, **"Orphan
  fertility units = 0"** — proving #59 (canvas flows now earn closed-loop
  credit).
- **(D) Calendar jump-to-date.** `input[aria-label="Jump to date"]` set to
  `2032-09-01` + dispatched change → month label "May 2026" → **"September
  2032" in one action** (replaces the 76-click nav).

No defects. Two doc/method nuances (not product issues): same-key v1→v2
`migrate` is **not live-verifiable non-destructively** (shipped store is
`version:2`; `ogden-closed-loop` is one shared blob — seeding a v1 blob
would destroy sibling sessions' `materialFlows`) → stays covered by green
unit test `closedLoopStore.test.ts` test #1; and the day-cell aria is
ordinal (`"September 1st, 2032 — 0 entries"`), not the predicted date-fns
`PPP`. Walkthrough: `docs/ux-walkthrough-regen-farm-run6-2026-05-17.md`
(runs 1–5 byte-for-byte unmodified). No commit/push (not requested).
