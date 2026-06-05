# 2026-05-30 -- Plan stratum rename: Tier 0-6 -> Stratum 1-7 (full identifier rename + persist migrations)

Renamed the Plan-stage 7-level spine from "Tier 0-6" to "Stratum 1-7" per the
Developer Change Note (`OLOS_Dev_Change_Note_Stratum_Renaming.docx`), as a **full
identifier rename (Approach B)** rather than the note's proposed presentation-only
relabel. "Stage" (Plan / Act / Observe) is unchanged; "stratum" names the levels
*within* Plan that [[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] had shipped
as "tiers". Display numbering re-bases off 1, so `t0 -> s1` .. `t6 -> s7`. Rationale,
scope decisions, and the kept-vs-renamed boundary are recorded in the ADR
[[decisions/2026-05-30-atlas-plan-stratum-rename]]. Four explicit-path-staged commits
on `feat/atlas-permaculture` (three code/test slices interleaved with foreign
parallel-session sync commits).

Key data-model finding that shaped the work: there is **no numeric `tier_id`** --
identity is a string enum (`t0-project-foundation` .. `t6-phasing-resourcing`),
`ordinal` (0-6) is display-only, and the `t{n}` prefix is baked into ~45 objective
ids, their `-c{n}` checklist items, uppercase `Ref` codes, and `RES>...` cross-refs,
which are the **localStorage keys** for per-project progress. Gate/unlock is
string-prerequisite-based (no numeric comparison), so renumbering display is safe;
nothing reaches Postgres (plan strata are client-only, `synced_records` payload is
opaque), so **no DB migration**.

## Slice 1 -- shared data contract (`ac492783`)

New `constants/plan/remapSlug.ts` (barrel-exported via `@ogden/shared`) is the
single source of truth, imported by both the catalogue edits and the web
migrations so they cannot drift: `remapTierId` (`t{n}-name -> s{n+1}-name`, bare
`t{n} -> s{n+1}`, pass-through), `remapId` (first `t{n}` token only, no `g` flag),
`remapRef` (`-T{n}. -> -S{n+1}.`). Properties held + tested: totality, injectivity,
count-preservation, `t0->s1`..`t6->s7` bijection, idempotency. Then the schema enum
`PlanTierId -> PlanStratumId` (`t0..t6 -> s1..s7`), field `tierId -> stratumId`,
`ordinal` bounds `0-6 -> 1-7`; the catalogue skeleton + the
universal/regenFarm/ecovillage/residential/agritourism catalogues renumbered
(every objective/item slug + every `*-T{n}.x` Ref via `remapRef` + residential
`RES>...` patch refs); and the relationships layer (`computeTierState` ->
`computeStratumState`, both `objectiveObserveDomains` maps, `relationshipMatrix`
`resolutionTierId -> resolutionStratumId` + the "Tier 3 -> Stratum 4" label,
`authoring.ts` `ObjectiveInput.tierId -> stratumId`). Type/const symbols renamed
coherently (`PLAN_TIERS -> PLAN_STRATA`, `PLAN_TIER_OBJECTIVES ->
PLAN_STRATUM_OBJECTIVES`).

## Slices 2-3 -- web stores, routes, components, copy (`0724581f`)

Four persist migrations (keep KEY, bump `version`, remap in `migrate()`):
`planTierStore` v2->v3 (progress-map KEYS + item-id values via `remapId`,
`celebratedByProject` via `remapTierId`), `cyclicalReviewStore` v1->v2 (migrate
**added**, objective-id KEYS), `fieldActionStore` v2->v3 (`tierId` +
`planObjectiveId`, UUID `id` untouched), `observeFeedStore` +1 (migrate **added**,
`feedKey`). `lib/syncManifest.ts` `schemaVersion` bumped to match each store's
persist version (the manifest skew guard requires equality). Route
`plan/tier/$tierId -> plan/stratum/$stratumId` (+ `PlanSearch` token `t0 -> s1`);
display renumber across `TierRow` / `ObjectiveHeader` / `TierUnlockCelebration` /
`TierLockedPopover` / home `NextUpCard`; copy `Plan tier spine -> Plan stratum
spine`, `7 tiers -> 7 strata`, `Tier 0 checklist -> Stratum 1 checklist`,
`T0_TIER_ID -> S1_STRATUM_ID`, the `tier.ordinal === 0` guard -> `=== 1`. The view
discriminator stays `mode: 'tier-spine'` internally but renders the visible
`label: 'Stratum spine'`. **Kept as opaque internal labels** (Scope Decision 1
boundary): all filenames, internal React component identifiers, helper/route-const
names (`usePlanTierProgressStore`, `toProgressMap`, `findPlanTierObjectiveIn`,
`getTierTitle`, `v3PlanTierRoute`, `navigateToTier`), persist KEY strings, and CSS
module class names.

## Slice 4 -- tests (`05a25f8d`, 14 files)

New: `remapSlug.test.ts` (rule examples + totality/idempotency + catalogue-wide
injectivity + full 1-7 coverage) and three store round-trip suites
(`planTierStore.migrate` / `cyclicalReviewStore.migrate` / `observeFeedStore.migrate`)
seeding realistic old-version blobs and asserting every key/value remapped,
projectId keys unchanged, counts preserved. Updated: shared suites (`catalogues`,
`objectiveObserveDomains`, `resolveProjectObjectives`, `tierObjectiveStatus`
ordinal `=== idx -> === idx + 1`) and web suites; off-pattern fixtures hand-fixed.
Stale-but-passing fixtures that carried real plan-tier slug *data* were renumbered
atomically (input + stub + expectation together) so they stay green AND coherent:
`fieldActionStore.observeWiring` (`tierId:'t0' -> stratumId:'s1'`),
`useProjectUrgency` (`planObjectiveId:'t0-vision' -> 's1-vision'`, `tierId:'t0' ->
stratumId:'s1'`), `buildRevisionEvents` (`t4-water-strategy -> s5-water-strategy`,
`t1-land-baseline -> s2-land-baseline`), `cycleAdvance` (`s1-vision` /
`s2-land-baseline`).

## Verification

- **Typecheck:** `packages/shared` `tsc --noEmit` clean (Slice 1); `apps/web`
  `NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` exit 0 (Slices 2-3).
- **Vitest:** shared full suite **717 green** (includes `remapSlug`, `catalogues`,
  `objectiveObserveDomains`, `resolveProjectObjectives`, `tierObjectiveStatus`).
  Every web rename-touched suite green in scoped runs -- the three new migration
  round-trips + extended `fieldActionStore.migrate` (34), `cycleAdvance` (6),
  `useProjectUrgency` (5), `buildRevisionEvents` (9), `PerProjectHomePage` (10).
  Vitest isolates per file, so a scoped pass is authoritative for those files; the
  full `apps/web` together-run was abandoned as **hung on a foreign suite** (a
  parallel session's sync-queue refactor logs `syncQueue.reconcile is not a
  function`; the timer-based `OfflineBanner` / `actWorkItemModule` foreign suites
  never settled) -- not relied upon, since it adds nothing the per-file isolation
  doesn't already guarantee for the rename.
- **Preview (screenshot captured):** the spine renders **Stratum 1 .. Stratum 7**
  with titles, a "Plan stratum spine" heading + "7 strata" subtitle, a "STRATUM 1
  UNLOCKED" celebration, and an "OPEN STRATUM" CTA; DOM read `tierWordCount: 0` on
  the user-facing copy.
- **Migration smoke (live browser):** seeded `ogden-plan-tier-progress` with a v2
  blob (old `t{n}-` keys + a completed item + a celebrated tier), reloaded, and the
  same completion rendered under the renamed stratum at version 3 -- no progress
  lost; clean save/restore.
- **Denylist spot-check:** pipeline ("Tier-1/Tier-3"), subscription
  ("Stewarding-tier"), and showcase (`'dreaming' | 'transitioning' | 'stewarding'`)
  surfaces all intact; no "stratum" leaked into them.

## Out of scope (intentional)

- No DB migration (slugs are client-only; `synced_records` payload opaque). The 5
  `ogden-olos-*` `{domain}--{stage}` stores are deliberately excluded -- `remapId`
  does not match their namespace; the pass-through proves them inert.
- Foreign parallel-session WIP (Sync Conflicts panel, financial/economics/
  capital-partner, MaterialSubstitutions, DesignMap/DiagnoseMap/OperateMap,
  graphify-out, ZoneSomSidebar) left uncommitted per [[feedback-no-deletion]].
- Internal "tier" identifiers (filenames, helper names, the `tier-spine`
  discriminator) intentionally retained as opaque labels -- a future cosmetic-only
  pass could rename them, but it carries no correctness value.

## Branch state

`feat/atlas-permaculture`. Three code/test slice commits (`ac492783` shared ->
`0724581f` web -> `05a25f8d` tests); this log entry + the ADR + the `log.md` and
`index.md` pointers + the `shared-package.md` "7 tiers -> 7 strata" coherence edit
land in a fourth wiki commit. **Not pushed** -- the branch is rebased out-of-band
([[project-branch-rebase]]); push only after the steward says go, with a
`git fetch origin` + divergence check first
([[feedback-commit-immediately-on-rebased-branches]]). The code/test HEAD before
this wiki commit was `05a25f8d`, with the foreign `e28ed6cb` (Sync Conflicts)
landed on top mid-session; this wiki commit is HEAD at session close. CSRA model
untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.
