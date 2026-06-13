# 2026-06-13 — Act-side generic objective-tools map takeover (Feature #3, deferred half)

**Project:** Atlas (OLOS) · **Branch:** `main` · **Surface:** `apps/web` (v3 Act tier shell)
**Plan:** `the-early-tiers-stratum-objectives-mossy-turtle` (Act-side mirror) · **Commit:** `74c51a81` (not pushed)
**Model:** Opus 4.8

Completes Feature #3 across **both shells**. The Plan half shipped earlier the same day
(`304e6997`; see [[log/2026-06-13-atlas-plan-survey-fixes-map-takeover]]) with the store + components
built shell-agnostic so the Act shell could reuse them once `ActTierShell.tsx` was no longer operator
WIP. That precondition was met (the file was clean/committed), and the operator directed the deferred
half: *"mirror the Plan wiring — compute `toolsTakeoverActive`, swap the right rail, mount the button
on the Act objective surface, reusing the same store instance."*

## The change — single file, no new mechanism

A **single-file mirror** of the four Plan edits into
`apps/web/src/v3/act/tier-shell/ActTierShell.tsx` (+49/-12). No new files; reuses the existing
`objectiveToolsTakeoverStore` + `_shared/map-takeover/{OpenMapToolsButton,ObjectiveToolsPanel}`. Five edits:

1. **Imports** — `useObjectiveToolsTakeoverStore`, `OpenMapToolsButton`, `ObjectiveToolsPanel`
   (alongside the existing slope-survey imports).
2. **`toolsTakeoverActive`** computed right after `slopeActive` — route-gated selector
   `s.active && s.activeProjectId === id && s.activeObjectiveId === objectiveId`.
3. **Workbench gate** — appended `&& !toolsTakeoverActive` to `showTierZeroWorkbench` (a Tier-0
   draw/place objective yields its workbench to the map canvas, same rationale as the survey gates).
4. **Right-rail branch** — new top branch in the rail ternary, before `surveyActive ?`:
   `toolsTakeoverActive && selectedObjective ? <ObjectiveToolsPanel projectId objective> : …`.
   Collision-free — `open()` already closed the surveys and the active flag is route-gated on `objectiveId`.
5. **`OpenMapToolsButton`** mounted above `ActTierExecutionPanel` in the `rightMode === 'detail'`
   branch (wrapped in a fragment); self-gates via `objectiveNeedsMap` → no dead button on non-spatial
   objectives. `rightMode` defaults to `'detail'` when an objective is routed → discoverable.

**Why the components drop in unchanged:** `objectiveMapTools` =
`resolvePlanTools(getObjectiveActTools(objective)).filter(arm.kind === 'map')`. `resolvePlanTools`
delegates to the Act catalog and only drops Plan-dead `'log'` arms (never `kind:'map'`), so the
`kind:'map'` subset is identical to what Act would resolve itself.

**Mutual exclusion already held both directions** — the generic store's `open()` closes the slope/veg
survey stores, and the shared survey summaries (`SlopeSurveySummary`/`VegetationSurveySummary`)
reverse-close the generic store — so zero extra Act wiring was needed.

## Verification

`npm run typecheck` (web, `--max-old-space-size=8192`) EXIT 0 — only the **4 pre-existing baseline
errors** (`syncServiceWorkItemsFallback.test.ts` ×1, `WorkConflictSection.test.tsx` ×3; committed
foreign test files, unrelated). Bounded vitest (`--pool=forks --singleFork`,
[[feedback-vitest-bounded-runs]]): `objectiveToolsTakeoverStore.test.ts` **5/5** still green (the
mechanism is unchanged; the Act wiring adds no new store behavior, so no new unit test — same as the
Plan slice, which added no `PlanTierShell` render test).

**Live click-through fell back to static + store-test proof** per the approved plan. The v3 map mount
hangs deterministically ([[project-screenshot-hang]]); additionally, RR7 (TanStack Router) would not
navigate into the Act tier shell via a raw `popstate` dispatch, and the operator's in-flight
`ProtocolLibraryCard.tsx` WIP (HMR reload failure) plus the offline API (:3001) were throwing
`<V3ProjectLayout>` into the GlobalErrorBoundary — degrading the running app shell **independent of
this change** (which touches only `ActTierShell.tsx`). Disclosed; the Act wiring is a verbatim mirror
of the already-verified Plan path.

## Commit discipline

One commit on `main`, **not pushed**. Staged with an explicit single-path `git add
apps/web/src/v3/act/tier-shell/ActTierShell.tsx`; all concurrent operator protocol-workspace WIP
(`plan/strata/*`, `PlanTierShell.tsx`, `packages/shared/*`, `softGate.*`, the new `Protocol*` panes,
`STRATUM_93_PROSE_CITES_2026-06-13.md`) left **unstaged and untouched**. Opus 4.8 co-author trailer.

## Amanah

Pure map-tooling-IA mirror — no capital, sale, advance-purchase, or financing surface; no
riba/gharar/`bayʿ mā laysa ʿindak`/CSRA/salam framing; verbatim `scopeNotes` untouched. Feature #3
only surfaces existing draw tools per objective; it adds no economic instrument
([[fiqh-csra-erased-2026-05-04]]).

Entities: [[entities/act-tier-shell]] (SHIPPED section), [[entities/plan-tier-shell]] (Act-side-landed note).
