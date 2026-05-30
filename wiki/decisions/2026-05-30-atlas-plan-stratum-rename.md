# ADR: Plan stratum rename (Tier 0-6 -> Stratum 1-7, full identifier rename)

**Date:** 2026-05-30
**Status:** accepted
**Context:**

A Developer Change Note (`OLOS_Dev_Change_Note_Stratum_Renaming.docx`) mandates
renaming the Plan-stage 7-level spine from "Tier 0-6" to "Stratum 1-7" before any
public-facing demo. The **"Stage"** vocabulary (Plan / Act / Observe) is unchanged
-- "stratum" names the levels *within* Plan, which the Phase 1 shell
([[decisions/2026-05-27-atlas-plan-tier-shell-phase1]]) had introduced as "tiers"
(T0 Project Foundation -> T6 Phasing & Resourcing). The note also re-bases the
display numbering off 1 (Stratum 1 .. Stratum 7) rather than 0.

The note proposed a **presentation-only relabel (Approach A)**; the steward chose
the **full identifier rename (Approach B)** -- carry the rename through the data
contract, not just the copy -- accepting a wider diff for long-term cleanliness.

Investigation corrected the note's data-model premise. There is **no numeric
`tier_id`**: tier identity is a **string enum** `PlanTierId`
(`t0-project-foundation` .. `t6-phasing-resourcing`); the only number is a
separate `ordinal` (0-6) used purely for display; and the `t0..t6` prefix is also
baked into ~45 objective ids (`t0-vision`), their checklist-item ids
(`t0-vision-c1`), uppercase Ref codes (`U-T0.1`, `RF-T1.6`), and catalogue
cross-refs (`RES>U-T3.2`). Those slug strings are the **keys** under which
per-project progress is persisted in the browser. Gate/unlock logic is
**string-prerequisite-based** (no numeric comparison), so renumbering the display
value is safe. Nothing reaches Postgres -- plan strata are client-only; the
`synced_records` payload is an opaque JSONB blob with no slug columns, so **no DB
migration** was needed.

**Decision:**

- **Canonical numbering rule, one source of truth.** A new
  `packages/shared/src/constants/plan/remapSlug.ts` (barrel-exported via
  `@ogden/shared`) is imported by **both** the catalogue edits and the web persist
  migrations so they cannot drift:
  - `remapTierId(id)` -- `t{n}-name -> s{n+1}-name`; bare `t{n} -> s{n+1}`;
    pass-through otherwise.
  - `remapId(id)` -- rewrites the **first** hyphen-delimited `t{n}` token only
    (no `g` flag): `t0-vision -> s1-vision`, `t0-vision-c1 -> s1-vision-c1`,
    `rf-t1-landscape -> rf-s2-landscape`.
  - `remapRef(ref)` -- uppercase codes: `-T{n}. -> -S{n+1}.` (global).
  The rule holds **totality** (off-pattern passes through, never throws/drops),
  **injectivity** (no two old slugs collide), **count-preservation**,
  **tier-bijection** (`t0 -> s1` .. `t6 -> s7`), and **idempotency** (re-running on
  an `s{n}` slug is a no-op). A `remapSlug.test.ts` asserts these plus
  catalogue-wide injectivity + full 1-7 coverage.

- **Full coherent symbol rename (Approach B, Scope Decision 1).** TypeScript
  type/const/field symbols renamed: `PlanTierId -> PlanStratumId`,
  `PlanTier -> PlanStratum`, `PlanTierObjective -> PlanStratumObjective`,
  `PLAN_TIERS -> PLAN_STRATA`, `PLAN_TIER_OBJECTIVES -> PLAN_STRATUM_OBJECTIVES`,
  the field `tierId -> stratumId`, `ordinal` bounds `0-6 -> 1-7`, and the
  user-facing route `plan/tier/$tierId -> plan/stratum/$stratumId`.

- **Deliberately KEPT as opaque internal labels** (to bound *this* rename's diff
  and avoid churning stable identifiers that carried no user-facing meaning):
  **filenames** (`planTierStore.ts`, `tierObjectives.ts`,
  `planTierObjective.schema.ts`, `TierRow.tsx`, `TierSpine.tsx`,
  `PlanTierShell.tsx`, etc.), internal React component identifiers, internal
  helper / route-const names (`usePlanTierProgressStore`, `findPlanTierObjectiveIn`,
  `getTierTitle`, `v3PlanTierRoute`, `navigateToTier`), CSS module class names
  (`css.tierTitle`), `T0_TIER_ID`, and the shell's view discriminator value
  (`mode: 'tier-spine'`, rendering the visible `label: 'Stratum spine'`). Net
  effect at the time: no residual "tier" in any **user-facing** surface or
  data-contract value, while the file tree and internal call graph kept their
  existing names.
  **[Narrowed 2026-05-30 -- see Addendum below: a follow-up internal-coherence
  pass renamed every one of these to `stratum` (including the discriminator value,
  via a `projectStore` v6 -> v7 migrate). The identifiers kept "tier" by design
  are now only the persist KEY strings, the `remapTierId`/`remapId`/`remapRef`
  helpers + `remapSlug.ts`, the `schemaVersion`/`storeKey` strings, and
  `toProgressMap`.]**

- **Four persisted-store migrations -- keep KEY, bump version, remap in place.**
  Renaming a localStorage key would orphan saved progress, so each store keeps its
  key string, bumps its persist `version`, and remaps slugs inside `migrate()`:
  `planTierStore` (`ogden-plan-tier-progress`, v2 -> v3: remap progress-map KEYS +
  item-id values via `remapId`, `celebratedByProject` via `remapTierId`);
  `cyclicalReviewStore` (`ogden-cyclical-review`, v1 -> v2: migrate **added**,
  remap objective-id KEYS); `fieldActionStore` (`ogden-field-actions`, v2 -> v3:
  remap each action's `tierId` + `planObjectiveId`, UUID `id` untouched);
  `observeFeedStore` (`ogden-observe-feed`, version bumped +1: migrate **added**,
  remap each entry's `feedKey`). `lib/syncManifest.ts` `schemaVersion` was bumped
  for each of these stores (corrected 2026-05-30 -- see Addendum: `schemaVersion`
  is **independent** of the persist `version`; the manifest skew guard only asserts
  each descriptor carries a numeric `schemaVersion`, it does **not** require the
  two to be equal). Zustand persist writes the migrated result back to localStorage
  after rehydrate (verified live).

- **Migration scope = exactly these 4 stores.** The 5 `ogden-olos-*` stores key on
  the OLOS `{domain}--{stage}` namespace (`vision-intent--plan`), which `remapId`
  does not match -- the pass-through is the safety backstop proving they are inert.

- **Denylist (unrelated "tier" meanings) left untouched:** data-pipeline tiers
  (`Tier1LayerType`, `ADAPTER_REGISTRY`, "Tier-1/Tier-3" API comments), subscription
  "Stewarding-tier" copy, and showcase `Tier = 'dreaming' | 'transitioning' |
  'stewarding'`. No global find/replace was used; edits were scoped to plan-spine
  files and the compiler (string-enum value change + field rename) surfaced every
  consumer as a `tsc` error.

**Consequences:**

- Every user-facing surface now reads **Stratum 1-7**; the data contract uses
  `stratumId` + `s1..s7` slugs end to end; existing saved progress migrates forward
  losslessly (proven by per-store round-trip tests + a live `v2 -> v3` browser
  smoke test that preserved a completed item and a celebrated stratum).
- Some **internal** identifiers were initially kept reading "tier" (filenames,
  helper names, the `tier-spine` discriminator) as opaque labels with no
  user-facing or data-contract meaning. The follow-up **internal-coherence pass**
  (2026-05-30, see Addendum) renamed these to `stratum`; only the documented
  residuals (persist KEY strings, the `remap*` helpers + `remapSlug.ts`,
  `schemaVersion`/`storeKey`, `toProgressMap`) remain "tier" by design.
- This ADR **renames the spine introduced by**
  [[decisions/2026-05-27-atlas-plan-tier-shell-phase1]]; that ADR stays **accepted**
  as the canonical record of the shell *architecture* (12 slices, stores,
  components, cyclical-review) -- only the level *naming* and display numbering
  evolved here. Its "Tier 0-6" / "T0..T6" prose is now historical.
- Slices landed as three explicit-path commits on `feat/atlas-permaculture`:
  `ac492783` (shared data contract), `0724581f` (web stores / routes / components /
  copy), `05a25f8d` (remap + migration round-trips + fixtures). Not pushed
  (out-of-band rebase rule, [[feedback-commit-immediately-on-rebased-branches]]);
  foreign parallel-session WIP left uncommitted per [[feedback-no-deletion]].
- CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy.

**Addendum (2026-05-30, internal-coherence follow-up):**

The Session Debrief recommended closing the residual "tier" identifiers above; the
steward approved a **cosmetic-only internal-coherence pass** that reverses the
"deliberately kept as opaque" Decision for the file tree and call graph. No
correctness change except one steward-chosen sub-change (the discriminator rename).

- **Renamed to `stratum`** (previously kept): shared files `tierObjectives.ts ->
  stratumObjectives.ts`, `planTierObjective.schema.ts ->
  planStratumObjective.schema.ts`, `tierState.ts -> stratumState.ts`,
  `tierObjectiveStatus.ts -> stratumObjectiveStatus.ts`; web store
  `planTierStore.ts -> planStratumStore.ts` (`usePlanTierProgressStore ->
  usePlanStratumProgressStore`, `migratePlanTierProgress ->
  migratePlanStratumProgress`); directory `v3/plan/tiers/ -> v3/plan/strata/` + its
  components (`PlanTierShell -> PlanStratumShell`, `TierRow -> StratumRow`,
  `TierSpine -> StratumSpine`, `TierUnlockCelebration -> StratumUnlockCelebration`,
  `TierLockedPopover -> StratumLockedPopover`) + their `.module.css` siblings +
  keyframes; route consts (`v3PlanTierRoute -> v3PlanStratumRoute`,
  `v3PlanTierObjectiveRoute -> v3PlanStratumObjectiveRoute`); `T0_TIER_ID ->
  S1_STRATUM_ID`; `deriveTier0*Map -> deriveStratum1*Map`; and the co-located
  `.tierTitle`-style CSS class names.

- **Discriminator value rename + migrate (steward's explicit choice).** The view
  discriminator value `planShellMode: 'tier-spine' -> 'stratum-spine'` (not kept as
  an opaque token). `projectStore` persist bumped **v6 -> v7** with a `migrate()`
  that rewrites only the exact legacy value (`'module-bar'` + unset pass through); a
  v6 -> v7 round-trip test + a live browser migrate smoke confirm it.

- **Manifest `schemaVersion` deliberately NOT bumped for this rename** (and this
  corrects the Decision/Log claim that "the skew guard requires they match").
  `schemaVersion` is **independent** of the persist `version` -- it is the
  wire-vocabulary marker stamped on pushed blobs (`buildBlobEnvelope`) and compared
  against incoming server blobs (a newer-than-mine blob is skipped whole). The
  `syncManifest.test.ts` skew guard only asserts each descriptor carries a numeric
  `schemaVersion`; it does **not** require `schemaVersion === persist version`
  (live proof: `ogden-projects` runs persist **7** / manifest **4**, green).
  Bumping `ogden-projects` schemaVersion for a cosmetic view-pref field would make
  old clients skip the whole projects blob; instead an unmatched `planShellMode`
  degrades gracefully to module-bar rendering -- no data loss across the sync
  boundary, and the persist `migrate()` normalizes the local value (the steward's
  stated goal).

- **Documented intentional residuals that remain "tier" by design** (no correctness
  value to renaming): persist KEY strings (`ogden-plan-tier-progress` etc. --
  renaming orphans saved data), the `remapTierId`/`remapId`/`remapRef` helpers +
  `remapSlug.ts` (they map *from* the old tier vocabulary), the `schemaVersion` /
  `storeKey` strings, and `toProgressMap`. The denylist (pipeline `Tier1LayerType`,
  subscription "Stewarding-tier", showcase `Tier='dreaming'|...`, Act
  `tier-prototype`) is unrelated and untouched.

- **Verification:** `packages/shared` + `apps/web` `tsc --noEmit` exit 0; scoped
  vitest green (renamed `planStratumStore.migrate` round-trip + new
  `projectStore.migrate` v6 -> v7 + rename-touched suites); preview regression
  screenshot (spine renders Stratum 1-7 unchanged); live migrate smoke (a v6
  `'tier-spine'` project opens the spine after the v7 migrate).

- **Commits** on `feat/atlas-permaculture` (explicit-path; not pushed): `0c514335`
  (shared, Slice A), `d50b1f39` (web, Slices B-D), `569bd890` (tests, Slice E),
  `5bba6993` (stale-comment cleanup). Foreign parallel-session WIP left uncommitted
  per [[feedback-no-deletion]].

Log: [[log/2026-05-30-plan-stratum-rename]] (this rename); follow-up coherence pass
[[log/2026-05-30-plan-stratum-internal-coherence]]
