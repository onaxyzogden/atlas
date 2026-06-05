# 2026-06-04 — Wire resolveProjectProtocols into Protocol Mode + surface severity/Amanah

**Project:** OLOS / Atlas · branch `feat/atlas-permaculture`
**Arm:** Close the last gap from the protocol-catalogue work — the per-stratum × per-type standing-protocol catalogue + the pure `resolveProjectProtocols` resolver were built data+resolver-only and **not wired into any UI**. This slice swaps the read-only Protocol Mode surface onto the resolver and surfaces the two new card fields (`severityTier`, `scopeNotes`).

## What

Protocol Mode previously sourced from the legacy livestock-only path
`templatesForEnterprises(enterprisesForProjectTypes(...))`, which returns the ~10
`enterpriseScope` livestock templates (9 for any livestock-implying type, empty
otherwise). A homestead or market-garden steward therefore saw **no protocols at all**.

Swapped that single data path to `resolveProjectProtocols({ primaryTypeId,
secondaryTypeIds }).protocols`. Every typed project now resolves its full standing
set (universal 22 + primary deltas + compatible-secondary additive/patches), already
sorted S1→S7 by the resolver. Two intended consequences:

- **Grouping moved `tierAuthored` → `stratumId`.** Legacy templates carried free-text
  `tierAuthored` ("Stratum 6 — Integration"); catalogue protocols carry typed
  `stratumId` and omit `tierAuthored`. Grouping by `tierAuthored` would collapse the
  resolved set into one fallback bucket. Now grouped by `stratumId` with `PLAN_STRATA`
  labels (`S{ordinal} · {title}`).
- **Legacy livestock enterprise templates stop appearing in Protocol Mode** (replaced
  by the richer catalogue, which includes `livestock_operation` primary protocols).
  They remain in the codebase; back-compat tests stay green — no deletion.

## Decisions (operator, prior AskUserQuestion)

- **Scope = "wire + scopeNotes + severityTier"** — surface BOTH the verbatim Amanah
  `scopeNotes` caution row AND a `severityTier` badge on the protocol card (not wire-only).

## Key constraints honoured

1. **Verbatim Amanah caution** — when `template.scopeNotes` is present the card renders
   a bordered gold-accent "Amanah" row with the scopeNotes text **verbatim**, never
   truncated or reworded ([[feedback-csa-in-catalogues]]). Proven on
   `mg-market-channel-advance-sale` (CSA sales-channel — *bayʿ mā laysa ʿindak*).
2. **No deletion** — legacy `templatesForEnterprises` / `enterprisesForProjectTypes` /
   `standardTemplates.ts` left intact; the now-optional `enterpriseScope` narrowed with
   `?? []` in the two legacy spine-path files that dereferenced it
   ([[feedback-no-deletion]]).
3. **Zustand v5 hazard preserved** — `templates` useMemo keeps the `secondaryKey`
   stable-primitive dep + eslint-disable; no inline `.filter()` selectors.
4. **Theme tokens** — severity badge uses solid-color border + `C.bg2` bg (not `CA()`),
   because `red`/`textTertiary` have no rgb triplet for the alpha helper.

## Files (committed `fc2c07f1`, not pushed)

- `packages/shared/src/index.ts` — barrel-export `resolveProjectProtocols` + types.
- `apps/web/src/v3/plan/strata/useProtocolLibrary.ts` — **the swap**: source from
  resolver; regroup by `stratumId` via `PLAN_STRATA` labels.
- `apps/web/src/v3/plan/strata/ProtocolLibraryCard.tsx` — `severityTier` badge
  (`resolveSeverityTier`) + verbatim Amanah `scopeNotes` caution row; `data-severity`
  / `data-has-scope-notes` test hooks.
- `apps/web/src/v3/plan/strata/ProtocolLayerPanel.tsx` — type-neutral empty-state /
  header copy + stratum-grouping comment.
- `apps/web/src/v3/plan/spine/{mockProtocols.ts, ProtocolConfirmationFlow.tsx}` —
  `enterpriseScope ?? []` narrowing (legacy spine path).
- `__tests__/{ProtocolColumn,ProtocolDetailColumn,ProtocolLayerPanel,ProtocolLayerPanel.act,ProtocolLibraryCard}.test.tsx`
  — rewritten onto resolved sets + stratum grouping; severity-badge + market_garden
  Amanah-caution assertions.

## Grounding / Amanah

The Amanah caution row exists precisely to keep covenant-sensitive protocols (e.g. CSA
advance-sale, *bayʿ mā laysa ʿindak*) visible verbatim to the steward at the point of
decision rather than silently filtered. No sales channel or financing instrument is
introduced; the CSA scopeNote is surfaced as a caution, not endorsed.

## Verification

- **Shared `tsc` + 329 tests** — green (prior session; shared untouched here beyond barrel).
- **Web `tsc --noEmit`** — **exit 0** (two runs).
- **Web Protocol tests** (`--pool=forks`) — **40/40 green** across 7 files. The
  `ECONNREFUSED :3000` stderr is the builtin-samples fetch falling back to local —
  benign, not a failure.
- **Lint** — repo `lint` = `turbo run lint`; each package's `lint` is `tsc --noEmit`
  (no ESLint config in repo), so the typecheck gate IS the lint gate — covered.
- **Live browser proof** ([[project-screenshot-hang]] → `preview_eval` DOM): on
  homestead+silvopasture project `eee1c083` the resolved standing set renders live
  across **all 7 stratum groups S1→S7** (`S1 · Project Foundation` … `S7 · Phasing &
  Resourcing`), with universal (`u-s1-vision-drift-check`,
  `u-s1-stewardship-capacity-recheck`) + homestead-primary (`hs-household-labour-balance`)
  protocols interleaved by stratum. Selecting a row surfaces the detail card with the
  severity badge rendered live (`u-s1-stewardship-capacity-recheck` → badge **"Watch"**,
  `data-severity="watch"`). The market_garden Amanah caution row is proven by the
  happy-dom unit test (`mg-market-channel-advance-sale`) — no market_garden project is
  seeded for a live click; disclosed rather than claimed.

## Status

**Complete.** Protocol Mode resolves and renders the full per-type standing-protocol
set for any typed project via `resolveProjectProtocols`, grouped S1→S7, with the
`severityTier` badge and verbatim Amanah `scopeNotes` caution surfaced on the card.
Legacy livestock catalogue + tests remain green. All gates pass; live proof captured.
Committed `fc2c07f1` (not pushed, [[project-branch-rebase]]).

## Deferred

- Protocol activation/instantiation persistence + the §10.1 objective-approval →
  protocol-instantiation trigger.
- Wiring the resolver's `activeTensions` / `provenance` into the UI (panel ignores them).
- Deeper per-type / secondary-patch content.
