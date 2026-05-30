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

- **Deliberately KEPT as opaque internal labels** (to bound the diff and avoid
  churning stable identifiers that carry no user-facing meaning): **filenames**
  (`planTierStore.ts`, `tierObjectives.ts`, `planTierObjective.schema.ts`,
  `TierRow.tsx`, `TierSpine.tsx`, `PlanTierShell.tsx`, etc.), internal React
  component identifiers, internal helper / route-const names
  (`usePlanTierProgressStore`, `toProgressMap`, `findPlanTierObjectiveIn`,
  `getTierTitle`, `v3PlanTierRoute`, `navigateToTier`), the persist KEY strings,
  and CSS module class names (`css.tierTitle`). `T0_TIER_ID -> S1_STRATUM_ID`. The
  shell's view discriminator stays `mode: 'tier-spine'` internally but renders the
  visible `label: 'Stratum spine'`. Net effect: no residual "tier" in any
  **user-facing** surface or data-contract value, while the file tree and internal
  call graph keep their existing names.

- **Four persisted-store migrations -- keep KEY, bump version, remap in place.**
  Renaming a localStorage key would orphan saved progress, so each store keeps its
  key string, bumps its persist `version`, and remaps slugs inside `migrate()`:
  `planTierStore` (`ogden-plan-tier-progress`, v2 -> v3: remap progress-map KEYS +
  item-id values via `remapId`, `celebratedByProject` via `remapTierId`);
  `cyclicalReviewStore` (`ogden-cyclical-review`, v1 -> v2: migrate **added**,
  remap objective-id KEYS); `fieldActionStore` (`ogden-field-actions`, v2 -> v3:
  remap each action's `tierId` + `planObjectiveId`, UUID `id` untouched);
  `observeFeedStore` (`ogden-observe-feed`, version bumped +1: migrate **added**,
  remap each entry's `feedKey`). `lib/syncManifest.ts` `schemaVersion` bumped to
  equal each store's new persist version (the manifest's skew guard requires they
  match). Zustand persist writes the migrated result back to localStorage after
  rehydrate (verified live).

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
- Some **internal** identifiers still read "tier" (filenames, helper names, the
  `tier-spine` discriminator). This is intentional -- they are opaque labels with
  no user-facing or data-contract meaning. A future cosmetic pass could rename
  them, but it carries no correctness value and was scoped out.
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

Log: [[log/2026-05-30-plan-stratum-rename]]
