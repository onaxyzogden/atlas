# ADR: Plan Navigation Spec v1.1 functionality merged into the rounded Stratum Spine (incl. section 9 mid-project secondary-add)

**Date:** 2026-05-30
**Status:** accepted
**Context:**

The steward supplied a concept `.tsx` prototype plus an "OLOS Plan Stage
Navigation UX Specification v1.1" for the Stratum Spine page. Their direction was
explicit: *"I prefer the roundedness of what we have now however I appreciate the
functionality of this proposed concept."* So this pass adopts the spec's
**functionality** while keeping the production page's existing **rounded /
organic aesthetic**. The concept's flat, dark, inline-styled look is discarded;
every new element is built with the existing CSS Modules + `tokens.css` recipe
(radius-md cards, radius-full pills, color-mix tinted surfaces, 120ms
transitions, **Inter sans**, gold/sage/teal/amber palette).

Exploration found the production page already had a strong rounded three-panel
shell ([[decisions/2026-05-30-atlas-plan-stratum-rename]] +
[[decisions/2026-05-27-atlas-plan-tier-shell-phase1]]) and -- crucially -- the
**data contract already supported most of the spec** (source tags, patch records,
completion gates, design tensions, cyclical review, `versionHistory`). The gap was
mostly UI surfacing plus one genuinely-absent flow: mid-project secondary-type
addition (spec section 9), where `versionHistory` was never written.

Three steward decisions framed scope (AskUserQuestion, this session):
- **Scope = everything, including the section 9 secondary-addition flow.**
- **Typography = keep current Inter sans** (no Lora/serif titles, no italic
  planning questions from the concept).
- **Act progress bar = wire from real Act data** (`actTaskStore` +
  `verificationRecordStore`), a real `N of M decisions verified` count.

**Decision:**

Ship in two parts on `feat/atlas-permaculture`, each tsc-green and independently
previewable.

**Part A -- display layer (reused the existing data contract; no schema change).**
- **Source tags + filter (section 5).** New `v3/plan/strata/sourceTag.ts`
  (`getSourceTag(objective) -> { kind, label }`, legacy-safe `kind =
  objective.source ?? 'universal'`, secondary label `Secondary - <type label>` via
  `findProjectType`). Pills rendered in `ObjectiveCard` / `NextUpCard` /
  `ObjectiveHeader`; transient segmented `sourceFilter` (All/Universal/Primary/
  Secondary) in `ObjectiveColumn` applied **only to the rendered list**, never to
  the status engine.
- **Patch attribution + completion gate (section 5.5/5.6).** `DecisionChecklist`
  "Expanded by:" -> **"Added by"** with an amber left-border on injected items
  (`data-injected`), plus a new completion-gate block and an amber "Amended by
  <Type>" badge when a secondary patch amended the gate.
- **Act progress bar (section 4.3, wired).** New `ActProgressBar` mounted in
  `ObjectiveDetailPanel`; pure derivation counts Act tasks whose verification
  `outcome === 'pass'` -- empty state "No field actions launched yet".
- **Review-suggested badge (section 7).** Blue per-card badge driven by
  `isCyclicalReviewDue` (complete-only predicate), reusing
  `selectProjectReviewMap`.
- **Design-tension banner (section 8).** New persisted `planTensionBannerStore`
  (key `ogden-plan-tension-banner`, collapsed-by-project, default collapsed) +
  `DesignTensionBanner` (collapsed count / expanded rows with "Resolved at
  <stratum>"); auto-expands ~5s when the active stratum is a tension's resolution
  anchor.

**Part B -- mid-project secondary-type addition (section 9).**
- **Shared schema + delta helper (B0).** `projectTypeTaxonomy.schema.ts` gained
  `ReopeningAck` + `reopeningAcknowledgements: ReopeningAck[]` (Zod `.default([])`)
  and optional `actor?`/`action?` on `ProjectTypeVersion` -- **all additive +
  defaulted, so existing records validate unchanged**. New pure
  `relationships/computeObjectivesDelta.ts` re-runs `resolveProjectObjectives`
  before/after and diffs by objective id, item id (`expandedBySecondaryId`), and
  gate-string inequality; injectable `deps` for tests.
- **Store actions (B1).** `projectStore.addSecondaryType(projectId,
  secondaryTypeId, opts?) -> boolean` (guards: not primary / not duplicate /
  `isCompatibleSecondary` / `< 8` -> false; on success appends a
  `ProjectTypeVersion` with `actor: 'yousef@ogden.ag'` + `action:
  'secondary-added'`, appends any newly-active `TensionAck`, sets
  `secondaryTypeIds`) and `acknowledgeReopening(...)` (append-only `ReopeningAck`).
  Both write metadata wholesale through `updateProject` (reusing its builtin
  allowlist + `updatedAt`). **No persist bump (stays v7).**
- **Preview hook (B2).** `useSecondaryAddPreview(projectId, candidate)` resolves
  the objective set before/after, computes statuses against the **same** progress
  map, and reports reopened objectives (`complete` before, not after), new
  tensions, and observe-stage gaps. The reopen is a **pure consequence of
  re-resolution** -- a modifying patch injects a fresh required item that is absent
  from progress -- so **no objective is force-cleared and unrelated objectives
  never reopen**.
- **UI (B3).** A rounded "Project type" pill in the spine intro opens
  `SecondaryAddModal` (gold accent; reuses `WizardSecondaryPicker` with a new
  additive `excludeIds` prop to hide already-added secondaries; live consequences
  preview; inline `WizardTensionPanel` gating confirm). `SecondaryReopenModal`
  (amber) lists exactly the reopened complete objectives as `navigateToObjective`
  deep-links. `ObserveGapBanner` (teal) flags new objectives needing
  Observe-stage field data; dismiss is component state (no persist). Injected
  items + amended gates render automatically through the existing
  `useProjectObjectives -> DecisionChecklist` path (Part A).

**Consequences:**

- The Stratum Spine now carries source tags + a working filter, patch attribution
  + a completion-gate block with "Amended by", a real Act progress bar, a
  per-card review badge, a persistent design-tension banner, and an end-to-end
  mid-project secondary-add flow -- **all visually indistinguishable from today's
  rounded page** (tokens / CSS Modules; Inter sans; no flat/dark inline styling).
- **No `projectStore` persist bump (v7) and no `ogden-projects` manifest
  schemaVersion bump.** Every section 9 schema field is additive + Zod-defaulted; an
  older client simply ignores `reopeningAcknowledgements` / the new
  `ProjectTypeVersion` fields rather than skipping the whole blob (same reasoning
  as the rename ADR's `schemaVersion`-independence note).
- **Reopen is targeted, not a blanket clear** -- guaranteed by a round-trip test
  (regenerative_farm + residential -> the complete `s3-hydrology` objective gains 2
  injected required items, flips `complete -> active`, its original items stay
  checked, root objectives with no new items stay complete, `versionHistory` grows
  by exactly one, duplicate add is a no-op).
- **Verification:** `@ogden/shared` + `apps/web` `tsc --noEmit` exit 0; scoped
  vitest green (`computeObjectivesDelta` 7/7, `projectStore.secondaryReopen` 5/5);
  preview DOM-exercised on a live `regenerative_farm` project at
  `/v3/project/.../plan` -- "Project type" trigger renders as a rounded pill,
  `SecondaryAddModal` opens with the correct reopen-semantics copy, eligible
  secondaries list with `residential` correctly excluded (the `excludeIds` prop
  proven live), candidate selection works, Cancel closes without mutating the
  steward's data. `preview_screenshot` not attempted -- `/plan` is a MapLibre WebGL
  route ([[project-screenshot-hang]]); DOM-exercise is the documented standard.
- **Commits** (explicit-path, foreign parallel-session WIP untouched per
  [[feedback-no-deletion]]; ASCII-only; messages co-authored): Part A
  `55f4c1c6` (source tags / patch / gate / Act bar) + `a82207fd` (review badge +
  tension banner). Part B `d20db7e9` (shared delta + schema, B0), B1+B2 (store
  actions + preview hook; the original B1+B2 commit was **folded by the out-of-band
  rebase** into the reachable tree at `e0cd375f` -- content verified present and
  clean, [[project-branch-rebase]]), `7b08c8e5` (section 9 UI, B3), `fe928247`
  (reopen round-trip test, B4).
- **Not pushed** -- awaiting the steward's "go" ([[project-branch-rebase]];
  `git fetch` + divergence check before any push).
- CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); covenant framing intact.

**Deferred seams (flagged, out of scope for v1):**
- **Secondary removal** (spec section 8.3) -- needs a "Deferred" objective state +
  blocking UI that do not exist; no remove button in v1.
- **Full greyed previous-gate history** (`completion_gate_history`) -- not stored;
  "Amended by" attribution ships, gate history does not.
- **Real Observe-stage render of the observe-gap** -- the Plan-side teal banner
  ships; the Observe-stage surfacing is a separate seam.

Log: [[log/2026-05-30-plan-nav-v1.1-merge]]
