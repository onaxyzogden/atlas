# OLOS / Atlas — Regen-Farm UX Walkthrough (Run 6 — Live-UI Verification of unified `MaterialFlow`)

**Date:** 2026-05-17
**Build:** branch `feat/atlas-permaculture`, closed-loop unification +
calendar jump-to-date shipped build (atlas `759cfa57`), web app served at
`http://localhost:5240/` (server `web-a1`, serverId
`2a89ece2-cda5-4e05-b305-24bc63873428`, `cwd` = **main atlas tree** — not a
sibling worktree).
**Environment:** **Frontend-only, offline.** No Docker → no
Postgres/Redis/Fastify API. Persistence is browser `localStorage` only.
**Driver:** `preview_*` MCP tools (project mandate). The Mapbox/WebGL canvas
cannot be driven, so endpoint/flow state was injected through the real Zustand
store (`useProjectStore.setState` append, `useClosedLoopStore.setState` /
`persist.rehydrate()`) and is **explicitly labelled "(simulated)"**. The
migration fold, the closed-loop graph and the calendar itself ran natively.
DOM text/aria + store state were read directly; **no screenshot claims**.
**Project used:** a **fresh throwaway** project
`run6-fcef85be-058f-474e-8cf8-e5787fc8de39` ("Run-6 MaterialFlow
(simulated)"), appended to `ogden-projects` (12 pre-existing `ogden-*` keys
left untouched).

> This is a **discovery-only / verification** run. Purpose, per the approved
> directive: close the single open leg from the closed-loop unification
> session — live-confirm, on the real shipped build, (B) the foreign-key
> migration fold, (C) closed-loop scoring of a **canvas-origin** flow with
> structured endpoints (#59), and (D) the new calendar jump-to-date. **No
> code changes.** Runs 1–5 (`docs/ux-walkthrough-regen-farm.md`,
> `…-run2-2026-05-16.md`, `…-run3-2026-05-17.md`, `…-run4-2026-05-17.md`,
> `…-run5-2026-05-17.md`) are left **byte-for-byte unmodified**.

---

## Severity Legend

| Tag | Meaning |
|---|---|
| **WORKS** | Stage produced the expected output, DOM/localStorage-verified |
| **MAJOR** | Output present but functionally unusable |
| **MINOR** | Friction / latent robustness gap |
| **CAVEAT** | Harness/fixture-authoring limitation, not a product defect |

---

## Headline

**The closed-loop unification (#58/#59) + calendar jump-to-date are FIXED —
live-confirmed on the shipped build.** The dead `ogden-flow-connectors` blob
was folded into `materialFlows` as a `origin:'canvas'` entry with geometry
and free-text labels preserved, then the dead key was deleted, with zero
collateral loss. A canvas-origin `MaterialFlow` carrying structured
`sourceId`/`sinkId` drew exactly one edge in the live `ClosedLoopGraphCard`
and cleared the orphan-fertility check — proving #59 (canvas-drawn flows now
earn closed-loop credit). The new jump-to-date input moved the Event calendar
anchor from "May 2026" to **"September 2032" in a single action** (replacing
the 76-click nav that prompted the feature). No regressions observed; no
defects found.

---

## Per-phase verdict

| Phase | Probe | Verdict | Evidence |
|---|---|---|---|
| A | Server identity + throwaway project | **WORKS** | `preview_list` → `2a89ece2…` running, port 5240, `cwd`=main atlas tree. Store import confirms unified build: `useClosedLoopStore` exposes `materialFlows` + `addMaterialFlow/updateMaterialFlow/removeMaterialFlow`, **no legacy `wasteVectors`**, `MATERIAL_KIND_CONFIG` exported. Project appended: `projects` 2→3, pid `run6-fcef85be…`; 12 `ogden-*` keys unchanged |
| B | Foreign-key fold (live, additive) | **WORKS** | Seeded `ogden-flow-connectors` `{state:{connectors:[fc-r6 …]}}` → `await useClosedLoopStore.persist.rehydrate()` → `materialFlows` gains `fc-r6`: `origin:'canvas'`, `geometry.type:'LineString'`, `sourceId:null`, `sinkId:null`, `sourceLabel:'chip pile'`, `sinkLabel:'bed 3'`, `materialKind:'mulch'`, `label:'r6 chip->bed'`, correct `projectId`. `localStorage['ogden-flow-connectors']` → **null** (dead key deleted). `preservedPriorIds:true` — no collateral loss. Mapping exactly matches `flowConnectorToFlow` (`closedLoopStore.ts:137-156`) |
| C | Canvas-origin flow scores in `ClosedLoopGraphCard` | **WORKS** | Injected 2 `fertilityInfra` (fi-a composter, fi-b compost bay) + canvas `MaterialFlow` `mf-r6` (`sourceId:'fi-a'`, `sinkId:'fi-b'`, `origin:'canvas'`, geometry). SOIL module → "Closed-loop graph": SVG `[aria-label="Closed-loop nutrient graph"]` present, **`<line>` count = 1** (mf-r6 drawn), `<circle>` count = 2, node labels `composter`/`compost bay`, footer `fertility (2)` · `2 vector(s)`. Validation: **"Orphan fertility units (no flows in or out)" = 0** (fi-a/fi-b wired by the canvas flow). `fc-r6` (null endpoints) correctly draws no line but is counted as a vector |
| C | Diagnostic still fires correctly | **WORKS** | "Fertility units producing without feedstock = 1" → composter (source of the only flow, no incoming) — expected for a single fi-a→fi-b flow; the card's gap-detection is intact, not a defect |
| D | Calendar jump-to-date | **WORKS** | `/v3/project/<pid6>/act/schedule` → Schedule module → "Event calendar" tab. `input[aria-label="Jump to date"]` (class `_dateJump_…`, `type=date`, value `2026-05-17`), month label `_monthLabel_…` "May 2026". Native-setter set to `2032-09-01` + dispatched input/change → month label → **"September 2032"** in one action; 49-cell grid rendered incl. day cell aria `"September 1st, 2032 — 0 entries"` |

---

## Findings

No defects. Two documentation/method nuances (not product issues):

- **CAVEAT — same-key v1→v2 migrate not live-verifiable non-destructively.**
  `closedLoopStore.ts:285-293` runs `migrate` only when the persisted
  `version < 2`; the shipped store is `version: 2` and `ogden-closed-loop`
  is a **single shared blob across all projects**. Overwriting it with a v1
  blob to force `migrate` would destroy sibling sessions' `materialFlows`
  (servers 5200/5210 share this browser profile). This half stays covered by
  the **green unit test** `apps/web/src/store/__tests__/closedLoopStore.test.ts`
  test #1 ("same-key v1→v2: wasteVectors → materialFlows (list origin)"),
  part of the 1096/1096 web vitest pass. Not a gap — a deliberate,
  documented harness constraint.
- **CAVEAT — day-cell aria format.** Pre-run exploration predicted
  `aria-label*="September 1, 2032"` (date-fns `PPP`). Actual rendered aria
  is ordinal: `"September 1st, 2032 — 0 entries"`. The cell exists and the
  jump works; only the predicted substring was off — a doc nuance, not a
  defect.

---

## Honesty caveats

- WebGL/Mapbox canvas is undrivable in the harness → endpoint and flow state
  was injected via real store actions, labelled "(simulated)". The migration
  fold, graph render, and calendar ran natively; assertions are DOM-text /
  store-state reads, never screenshots.
- Non-destructive: a fresh throwaway pid was appended; the 12 pre-existing
  `ogden-*` keys and other projects' `materialFlows` were preserved
  (`preservedPriorIds:true`). The throwaway `run6-…` project + its
  `materialFlows`/`fertilityInfra` entries remain in `ogden-closed-loop`,
  labelled "(simulated)", consistent with Run-4/Run-5 convention (no shared
  blob wipe attempted).
- Servers 5200 / 5210 (sibling worktrees) were not touched.

---

## Prioritized recommendations

1. **MINOR** — canvas-folded flows arrive with `sourceId/sinkId: null`
   (free-text labels retained). To earn closed-loop credit the steward must
   re-pick endpoints via the new From/To pickers. Already documented in ADR
   `2026-05-17-atlas-closed-loop-material-flow-unification.md` as accepted;
   a future nicety would be a "needs endpoints" affordance surfacing
   label-only canvas flows in `ClosedLoopGraphCard` so the re-pick is
   discoverable. Out of scope this session.
2. **NICE-TO-HAVE** — the next opportunistic UX run could exercise the From/To
   pickers themselves (list + canvas authoring paths) once the canvas is
   drivable, to confirm `useFlowEndpointOptions` surfaces livestock / water /
   guild endpoints in the live form (unit-locked today via
   `useFlowEndpointOptions.test.ts`).

---

## Verdict

All three live probes (B foreign-key fold, C canvas-origin scoring, D
jump-to-date) **WORK** on the shipped build `759cfa57`. Combined with the
green unit suite (1096/1096, incl. the same-key-migrate lock not
live-verifiable for the documented non-destructive reason), the closed-loop
model unification (#58/#59) and the calendar jump-to-date affordance are
**verified end-to-end**. No code changes; no follow-up fix required.
