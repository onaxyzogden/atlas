# 2026-05-21 — Retire legacy DiagnosePage + DiscoverPage; drop wind/hazards/views matrix keys

**Branch.** `feat/atlas-permaculture` (commit `4c146818`).
Direct follow-up to the SectorCompass HUD work
([2026-05-21 — Observe SectorCompass HUD replaces wedges](2026-05-21-observe-sector-compass-hud-replaces-wedges.md))
and the BaseMapCard legend consolidation
([2026-05-21 — BaseMapCard: consolidate sector overlay rows into single "Sector compass"](2026-05-21-observe-basemap-legend-sector-compass-row.md)).
Closes the orphan-matrix-keys followup flagged in both prior entries.

**What changed.**

Deletions:

- [`apps/web/src/v3/pages/DiagnosePage.tsx`](../../apps/web/src/v3/pages/DiagnosePage.tsx)
- [`apps/web/src/v3/pages/DiagnosePage.module.css`](../../apps/web/src/v3/pages/DiagnosePage.module.css)
- [`apps/web/src/v3/pages/DiscoverPage.tsx`](../../apps/web/src/v3/pages/DiscoverPage.tsx)
- [`apps/web/src/v3/components/overlays/WindSectorsOverlay.tsx`](../../apps/web/src/v3/components/overlays/WindSectorsOverlay.tsx)
- [`apps/web/src/v3/components/overlays/SectorsOverlay.tsx`](../../apps/web/src/v3/components/overlays/SectorsOverlay.tsx)

Edits:

- [`apps/web/src/store/matrixTogglesStore.ts`](../../apps/web/src/store/matrixTogglesStore.ts) —
  removed `'wind' | 'hazards' | 'views'` from `MatrixToggleKey`,
  `MatrixTogglesState`, defaults, and `setAll`. Bumped persist version
  12 → 13 with a migrate clause that strips those three keys from any
  older snapshot. Older clients silently drop them on next mount, no
  console errors.
- [`apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx`](../../apps/web/src/v3/observe/components/layers/ObserveAnnotationLayers.tsx) —
  deleted the inert `windVisible` / `hazardsVisible` / `viewsVisible`
  subscriptions and their three dead `subToggles` entries; trimmed the
  three keys from the `useMemo` deps array.
- [`apps/web/src/v3/plan/canvas/BaseMapCard.tsx`](../../apps/web/src/v3/plan/canvas/BaseMapCard.tsx) —
  reduced the legend's back-compat comment to a one-liner pointing at
  the ADR.
- [`apps/web/src/routes/index.tsx`](../../apps/web/src/routes/index.tsx) —
  the `v3DiscoverRoute` / `v3DiagnoseRoute` redirect routes stay
  (preserve deep-link compatibility), but their comment now reflects
  that the page components are retired.
- [`apps/web/src/v3/observe/README.md`](../../apps/web/src/v3/observe/README.md) —
  dropped `DiscoverPage` and `DiagnosePage` from the "preserved on
  purpose" list; added one paragraph of rationale linking the ADR.

**Preserved on purpose.**

`CategoryCard`, `InsightPanel`, `ParcelSatelliteSnapshot`,
`DiagnoseCategoryDrawer`, `exportDiagnoseBrief.ts` (pattern source for
[`exportFeasibilityBrief.ts`](../../apps/web/src/features/decision/lib/exportFeasibilityBrief.ts)),
`discoverStore`, `candidateFilter`, `CompareTray`, `DiscoverRail`, and
`DiscoverPage.module.css` (shared with `ProjectsLandingPage.tsx`). All
have surviving non-DiagnosePage / non-DiscoverPage consumers.

**Why now.**

`/diagnose` and `/discover` had been redirecting to
`/observe/human-context` for some time, with `component: () => null` —
the page components were unreachable. Once the SectorCompass HUD landed
(7f036f5a) and the BaseMapCard legend collapsed to one `sectors` row
(cba7a651), the only remaining consumers of the orphaned `wind` /
`hazards` / `views` matrix-toggle keys were the two dead overlays
mounted inside the unreachable `DiagnosePage`. Removing the page
components made the matrix-store consolidation possible without losing
any user-visible functionality.

**`feedback_no_deletion` exception.**

The global memory rule says to preserve legacy stage components for
possible Plan/Act reuse. This session deletes two of them. The
exception is grounded in:

1. Explicit user authorisation via plan-time AskUserQuestion ("Wider —
   also retire DiscoverPage").
2. The two deleted pages had already been route-redirected away (their
   `component: () => null` redirect routes have existed since the
   Observe shell was shipped); they were dead reachable code.
3. The shared components they imported (`CategoryCard`, `InsightPanel`,
   `ParcelSatelliteSnapshot`, `DiagnoseCategoryDrawer`,
   `exportDiagnoseBrief`, etc.) are preserved for future Plan/Act
   reuse — only the two top-level page shells and the two
   overlay-only-used-by-DiagnosePage components were removed.

**Phase A — y8-projected.mdx investigation outcome.**

The earlier diagnosis ("TypeScript `!` non-null assertion inside JSX")
turned out to be **stale**. `npx vite build` ran cleanly against the
current branch — the showcase entry compiled fine, including
`y5-projected.mdx` and `y8-projected.mdx`. No code change applied. The
original block report likely came from a stricter build context
(possibly a prior commit on the rebased branch) that no longer exists.

**Verification.**

- `npm run typecheck` — zero new errors from the diff; same 6
  pre-existing baseline errors carry over (`StepBoundary.tsx`,
  pasture-fence `turf.polygonToLine` / `buffer` overload at
  `ObserveAnnotationLayers.tsx:668,673` — line numbers shifted by 6
  from the trim, same root cause; `vegetationResolver.ts`, two
  `HostUnion*` test files).
- `npm test` — 181 / 181 test files pass (1825 tests, 4 skipped) in
  ~73s. The `DiagnoseCategoryDrawer.test.tsx` and
  `exportDiagnoseBrief.test.ts` suites still green since their target
  components were preserved.
- `npx vite build` — clean production bundle + showcase prerender.
- Routing: `/v3/project/mtc/diagnose` and `/v3/project/mtc/discover`
  still resolve via redirect to `/v3/project/mtc/observe/human-context`
  (deferred to live verification; the redirect code path is unchanged).

**Branch hygiene.**

During this session the working tree picked up unrelated, uncommitted
"Phase 3.5 Prong B" showcase entry-rewrite work (`vite.config.ts`
modifications + new `showcase.html`, `src/showcase-entry.tsx`,
`src/showcase/router.tsx`). Per
[[feedback-commit-immediately-on-rebased-branches]] only this session's
explicit paths were staged for the commit; the Prong B work was left in
the working tree for whoever owns it to commit separately. This matches
the prior session's handling of an external rebase that absorbed our
`ObserveAnnotationLayers.tsx` cleanup.

**Out of scope.**

- Deleting `DiagnoseCategoryDrawer.tsx`, `exportDiagnoseBrief.ts`, or
  any other shared component imported by the deleted pages.
- Retiring the `/discover` and `/diagnose` redirect routes themselves.
- Editing the Phase 3.5 Prong B showcase entry work present in the
  working tree.
- The y8 mdx cast — proven unnecessary by Phase A.
