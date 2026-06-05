# 2026-06-04 — Act stage honors the navigated-from stratum (URL-param parity)

**Branch.** `feat/atlas-permaculture` (clean explicit-path code commit `9f720a30`,
6 intended files; **not pushed**; local-only per the out-of-band-rebase rule for
this branch — HEAD had moved from `ea8cf271` to `b5fcd16c` between sessions).

## Problem

The Act tier shell always landed on **Stratum 2** regardless of which stratum the
steward was viewing in Plan. Root cause: `ActTierShell.tsx` hardcoded
`DEFAULT_STRATUM_ID = 's2-land-reading'` and seeded it into **local** `useState`;
the selected stratum never read the URL. Act's routes carried **no** stratum
param, and `HeaderStageSpine` navigated to a bare `/act` on stage-switch,
forwarding no stratum. Plan, by contrast, is URL-driven
(`plan/stratum/$stratumId`). So Act re-initialized to S2 on every mount,
discarding the Plan stratum.

## What shipped

URL-param parity for Act — the URL is now the single source of truth for Act's
rendered stratum, mirroring Plan. Switching Plan→Act preserves the stratum (S5 in
Plan → S5 in Act); cold entry to bare `/act` lands on **S1**
(`s1-project-foundation`, the user-confirmed fallback); the Act stratum is
deep-linkable.

- **`apps/web/src/routes/index.tsx`** — new route
  `act/tier-shell/stratum/$stratumId` (mounts `ActLayout`, which already renders
  `ActTierShell` in tier-shell mode). Registered after
  `v3ActTierShellObjectiveRoute` and before `v3ActModuleRoute`, preserving the
  static-prefix-before-`$module` invariant (the existing
  `act/tier-shell/$objectiveId` objective-deep-link route is kept — an objective
  implies its own stratum).
- **`apps/web/src/v3/act/tier-shell/resolveActStratumId.ts`** (NEW) — pure
  precedence helper: explicit valid `$stratumId` param → selected objective's
  `stratumId` → S1 fallback. Extracted so the derivation is unit-testable without
  rendering the map-/store-heavy shell, **and** to sidestep a strict-union
  typecheck error (a `string` is not assignable to the stratum-id union, so
  `STRATUM_IDS.includes(plainString)` is rejected under `noUncheckedIndexedAccess`;
  the helper takes `validStratumIds: readonly string[]` so `.includes(string)` is
  valid inside).
- **`apps/web/src/v3/act/tier-shell/ActTierShell.tsx`** — deleted
  `DEFAULT_STRATUM_ID` + the `useState`; `selectedStratumId` is now a `useMemo`
  calling `resolveActStratumId` (param→objective→S1). Added `goToStratum` and
  routed `handleSelectStratum`, the `goToObjective` deselect branch, and
  `revealObjective` through URL navigation; **no local stratum state remains**
  (zero `setSelectedStratumId` callers).
- **`apps/web/src/v3/HeaderStageSpine.tsx`** — added `PLAN_STRATUM_RE`; the Act
  branch (incomplete case) forwards the current Plan stratum into
  `act/tier-shell/stratum/$stratumId`, else navigates to bare `/act` (→ S1). The
  `pct >= 100 → /act/command-centre` branch is unchanged.

## Verification

- **Typecheck** (`apps/web`): EXIT 0, clean (the strict-union TS2345 from the first
  pass is resolved by the helper extraction; the two previously-noted foreign
  `spine/` errors no longer surface either).
- **Bounded vitest** (`--pool=forks --no-file-parallelism`): `resolveActStratumId`
  **6/6** (valid param wins / cold-entry→S1 / garbage param→S1 / objective-derived /
  param-over-objective / garbage-param-falls-through-to-objective) + `HeaderStageSpine`
  **16/16** (incl. 4 new: forwards Plan stratum S5; forwards from a deep Plan
  objective route S4; bare `/plan` → bare `/act`; pct===100 → command-centre
  ignores stratum). **22/22.**
- **Preview** (dark + light, client-side `__TSR_ROUTER__.navigate`): the
  `stratum/s5-system-design` route renders the **S5 System Design** dashboard
  (rail + "STRATUM S5" header); cold bare `/act` renders **S1 Project Foundation**.
  Screenshot hung once (transient per `[[project-screenshot-hang]]`), succeeded on
  retry; theme mutation restored to dark afterward.

No ADR — this is an incremental routing/Nav-UX fix (URL-param parity), not an
architectural decision; the chosen mechanism (path param, not a shared store) and
the S1 fallback were both user-confirmed. The `entities/act-tier-shell.md` page was
intentionally **not** edited this session: it was modified in the working tree by a
parallel session (avoid clobbering a peer's in-flight WIP).
