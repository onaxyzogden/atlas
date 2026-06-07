# 2026-06-04 — Plan design-tension cross-stratum "Also in" chips

**Branch.** `feat/atlas-permaculture` (clean explicit-path code commit `cf83ff7e`,
7 intended files; **not pushed**; local-only per the out-of-band-rebase rule for
this branch). Predecessor: commit `0df11cea` (this session) made each
`DesignTensionBanner` row clickable — clicking navigates to the tension's single
`resolutionStratumId` and transiently flashes the concerned objective cards.

## Problem

A `DesignTension`'s authored `relatedObjectiveIds` can span **more than one
stratum**. The full concern set was armed in `PlanStratumShell`'s
`tensionHighlightIds` for the 3s window, but cards in a *second* stratum only lit
up if the steward happened to navigate there in time — there was no signal those
cross-stratum concerns existed or where to find them. 4 of the 13 tensions are
genuinely cross-stratum (concerns in both S4 and S5): tension-3
(conservation×silvopasture, resolves S4), tension-6 (silvopasture×market_garden,
resolves S5), tension-12 (livestock_operation×market_garden, resolves S5),
tension-13 (livestock_operation×conservation, resolves S4).

## What shipped

Under each banner row, clickable **"Also in {Stratum} (n)"** chips for every
stratum *other than* the one the row navigates to. Clicking a chip navigates to
that stratum and **re-arms** the flash so the concerned cards light up fresh
(even after a prior window expired).

- **`packages/shared/src/constants/plan/relationshipMatrix.ts`** — new
  `getTensionConcernsByStratum(tension, objectives)` groups the concern ids by
  their objective's `stratumId` in **first-seen order**, reusing
  `getTensionConcernObjectiveIds` (so present-filter / de-dupe / resolution-stratum
  fallback are inherited, single source of truth). Auto-exported via the `export *`
  barrel — `src/index.ts` was **not** edited.
- **`apps/web/.../PlanStratumShell.tsx`** — extracted
  `flashTensionAtStratum(tension, stratumId)` shared by the row click
  (`handleSelectTension` → `resolutionStratumId`) and the new chip click
  (`handleSelectTensionStratum` → chosen stratum). Memoized `tensionStrataHints`
  (`Record<tensionId, {stratumId,label,count}[]>`) excluding each tension's own
  `resolutionStratumId`; label from `findPlanStratum(id)?.title`.
- **`apps/web/.../ObjectiveColumn.tsx`** — pass-through of `tensionStrataHints` +
  `onSelectTensionStratum` (column stays logic-free, per convention).
- **`apps/web/.../DesignTensionBanner.tsx` (+ `.module.css`)** — chips rendered as
  **siblings of `.rowButton`, never nested** (a button inside a button is invalid
  HTML); amber palette + dashed top separator + `focus-visible` ring; back-compat
  (no chips when `onSelectTensionStratum` omitted or hint list empty).

## Verification

- Typecheck clean for all changed files (`packages/shared` EXIT 0; `apps/web` only
  the two **pre-existing, foreign** `spine/` errors — `mockProtocols.ts`,
  `ProtocolConfirmationFlow.tsx` — untouched by this slice).
- Bounded vitest (`--pool=forks --no-file-parallelism`): shared
  `relationshipMatrix.tensions.test.ts` **10/10**; web `DesignTensionBanner.test.tsx`
  **12/12** (chips render + click callback; sibling-not-nested assertion; no chips
  when callback omitted / hints empty).
- Preview (dark + light): seeded conservation-primary + silvopasture-secondary on
  the 351 House sample (store mutation + theme + localStorage restored afterward).
  tension-3 row shows **"Also in System Design (1)"**; clicking the chip navigates
  **S4 → S5** and flashes the **Fencing & exclusion infrastructure** card
  (`con-s5-fencing-exclusion`).

## Note on the count

The chip read **(1)**, not the plan's hypothesized (2): with conservation as
*primary* and silvopasture as *secondary*, only `con-s5-fencing-exclusion`
resolves in S5 — `silv-s5-fencing` is a silvopasture *primary*-role id, absent
here because silvopasture is layered as a secondary (→ `silv-sec-*` ids). The
count is correct for the arrangement and reads off the live resolved set.

No ADR — this is an incremental Plan-Nav UX addition on top of the existing
highlight machinery, not an architectural decision. The new shared helper is
recorded here; the `entities/shared-package.md` row for `relationshipMatrix.ts`
was intentionally **not** edited this session because that page was mid-edit by a
parallel session in the working tree (avoid clobbering a peer's in-flight WIP).
