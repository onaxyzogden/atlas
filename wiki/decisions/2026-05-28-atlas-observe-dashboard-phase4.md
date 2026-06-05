# 2026-05-28 — Observe Dashboard (Phase 4: 5 slices + Gap D, Unified Land State + Domain Detail + Plan Revision Banner + Temporal Layer + Presentation Mode)

**Status.** Implemented on `feat/atlas-permaculture` across 5 explicit-path
slice commits + one follow-up fix (Slice 4.1 `09024746` → 4.2 `639b9062`
→ 4.3 `0352045b` → 4.4 `1a209d5f` → 4.5 `9251abd8` → Gap D `a881cfed`).
Phase 4 of the 7-phase OLOS UX spec implementation plan
(`~/.claude/plans/c-users-my-own-axis-downloads-olos-proj-delightful-jellyfish.md`).
Continues [[decisions/2026-05-27-atlas-plan-tier-shell-phase1]] (Phase 1
producer-first ordering: Plan tier state is the consumer Phase 4
revision banner reads, and the cyclical-review predicate Phase 1 left
behind an optional `observeRevisionFlag` fn for is now wired live).

## Context

The OLOS Observe Dashboard UX spec
(`~/Downloads/OLOS_Observe_Dashboard_Spec_v1 (1).docx` v1.0 Ratified)
defines three Observe surfaces — Unified Land State (the default
domain-grid landing), Domain Detail Views (per-domain workbench), and
Temporal Layer (per-domain trends with cycle annotations) — wired
together by a Plan Revision Banner that ranks divergence + freshness
events by priority and deep-links to the Plan tier objective they
impact. Presentation Mode + share links are the steward's read-only
export path; cyclical review (Phase 1) wires to real observation data
in Phase 4 so a 90-day refresh prompt fires not just on time but on
any observation event that meaningfully reframes a complete objective.

The substrate already shipped from Phase 3 (
[[decisions/2026-05-27-atlas-act-state-machine-phase3]] —
`observeFeedStore`, `fieldActionStore`, `cyclicalReviewStore`,
divergence + verification routing). What was missing was the
**spec-shaped surfaces + revision/freshness/supersession ranking layer
+ presentation export** that wrap that substrate.

Seven locked decisions framed Phase 4:

1. **Coexist behind a toggle** (mirrors Phases 1 + 3). New routes
   `/v3/project/$id/observe/dashboard` + `dashboard/domain/$domainId`
   + `dashboard/temporal/$domainId`. `ObserveShellToggle` in header:
   `Dashboard` default for new projects, `Module bar` legacy for MTC
   seed. Existing `ObserveLayout` 7-module shell untouched. Persisted
   in projectStore as `observeShellMode`.
2. **New `ObserveDataPoint` schema, retain Phase 3 `ObserveFeedEntry`.**
   No deletion. Dashboard reads the union via stable selectors so both
   Phase 3 + Phase 4 capture pathways feed Plan Revision + supersession
   + temporal. Phase 7 may consolidate.
3. **16 spec domains; map existing 7 modules via `legacyModuleMapping`.**
   Domain Detail Views embed the matching existing module dashboard
   inline (Topography → `TopographyPanel`, EarthWaterEcology → the
   Hydrology/Soil/Ecology trio, etc.). Net-new domains (Vision/Outcome,
   Land Base, Plants/Crops, Animals, Access/Circulation,
   Energy/Materials, Economics) get thin Domain Detail panels with
   overlay strip + observation list + needs reader.
4. **Supersession backend local-first.** Computed automatically on data
   point insert (domain + location proximity ≤10m per spec §4.3). "Not
   a replacement" CTA restores both. Server endpoint deferred.
5. **Presentation share local-first.** Tokens persisted in
   `project.metadata.presentationShares[]` (additive, passthrough).
   Viewer route `/v3/observe/share/$token` resolves from projectStore.
   7/30/90/permanent expiry per spec §6.2.
6. **Temporal chart inline SVG, no new dep.** Reuses sparkline patterns
   already in `observe/components/measure/sparkline.ts`; extended for
   the full Temporal chart with cycle annotations.
7. **Reuse existing observation-needs + capture scaffolding.** Domain
   Detail's "Open observation needs" rail reads `useObservationNeed`
   unchanged; tapping deep-links to the existing Observation Capture
   Workspace. No new capture surface in Phase 4.

## Decision

Ship the 5 Phase-4 slices in sequence on `feat/atlas-permaculture`,
each committing the moment its gate verifies per
[[feedback-commit-immediately-on-rebased-branches]]. Branch is rebased
out-of-band; never accumulate uncommitted slices.

### Slice 4.1 — Substrate (`09024746`)

- `packages/shared/src/schemas/observe/dataPoint.schema.ts` —
  `ObserveDataPoint` Zod schema (id / projectId / domainId /
  sourceType / sourceActionId / sourceFeedEntryId / locationGeometry /
  cycleId / isSuperseded / supersededBy / statusOutput /
  measurementValue / proofItems / capturedAt / capturedBy).
- `packages/shared/src/schemas/observe/{supersession,cycle,presentationShare}.schema.ts`
  — adjunct schemas (`SupersessionEdge` + `ObserveCycleEntry` +
  `PresentationShare`).
- `packages/shared/src/constants/observe/domains.ts` — 16-domain
  catalog with `defaultOverlayBundle`, `freshnessThresholds`,
  `allowedStatusOutputs`, `legacyModuleMapping`, optional
  `supersessionProximityMeters`.
- `packages/shared/src/relationships/supersession.ts` — pure
  `computeSupersession(newPoint, existingPoints, opts)` returning
  `{ supersedes: string[] }`; haversine within 10m + same-domain.
- `packages/shared/src/relationships/observeFreshness.ts` — pure
  `computeFreshness(point, now, thresholds)` returning
  `'current' | 'ageing' | 'stale' | 'missing'` per spec §2.3 cadence.
- `packages/shared/src/relationships/observeRevisionTrigger.ts` —
  `computeObserveRevisionFlag(objectiveId, deps)` returning `true`
  when any diverged feed entry / data point matches the objective's
  `defaultOverlayBundle` or mapped domain. Wires the optional
  `observeRevisionFlag` arg Phase 1 left in `isCyclicalReviewDue`.
- `packages/shared/src/relationships/revisionPriority.ts` —
  `computeRevisionPriority(events) → 'critical' | 'high' |
  'informational' | null`. Critical = divergence + `major_constraint`
  or `potential_disqualifier`; High = divergence + `needs_investigation`
  OR `stale` freshness on a foundation domain; Informational =
  everything else newer than `lastDismissedAt`.
- Stores: `apps/web/src/store/{observeDataPointStore,observeCycleStore,
  presentationShareStore}.ts` — Zustand+persist; registered in
  `syncManifest.ts` (data points + cycles `byProject`; shares `whole`
  since projectId is in token resolution).
- `LocalProject.observeShellMode: 'dashboard' | 'module-bar'`; default
  `dashboard` for new projects, `module-bar` for `id === 'mtc'` /
  MTC_SEED lineage (parity with `planShellMode`).
- ProjectMetadata additive (passthrough):
  `presentationShares?: PresentationShare[]`.
- Vitest specs for the four helpers + cycle monotonicity + supersession
  round-trip + revision-priority decision table.

### Slice 4.2 — ObserveShellToggle + dashboard routes + Unified Land State (`639b9062`)

- Routes: `/v3/project/$projectId/observe/dashboard` (Unified Land
  State) + child routes for Domain Detail (4.3) and Temporal (4.5).
  Legacy module-bar routes untouched.
- `ObserveShellToggle.tsx` — header chip pair `Dashboard` / `Module
  bar`. Persists per-project; matches Plan/Act toggle visuals.
- `ObserveDashboardLayout.tsx` — outlet host for the three surface
  routes.
- `UnifiedLandStateSurface.tsx` — top: `LandStateSummary` + Plan
  Revision Banner placeholder (wired Slice 4.4); body: BentoBox grid
  of 16 `DomainStatusCard`s.
- `LandStateSummary.tsx` — "12 domains current · 2 ageing · 1 missing";
  freshness chips filter the grid.
- `DomainStatusCard.tsx` — domain name + freshness pill + last
  observation timestamp + status output badge + observation count;
  click → domain detail.
- `useDomainSnapshot.ts` — composed hook reading observeDataPointStore +
  observeFeedStore + domainCatalog; returns per-domain `{ freshness,
  latestStatus, observationCount, divergenceCount, lastObservedAt }`.
- `ObserveLayout.tsx` modified: branches on `observeShellMode` between
  the legacy 7-module shell (no internal changes) and
  `<ObserveDashboardLayout />`.

### Slice 4.3 — Domain Detail Views + supersession + legacy module embed (`0352045b`)

- `DomainDetailLayout.tsx` — three columns: left `DomainOverlayStrip` +
  checklist progress; center `DomainMapHost` + `DomainObservationList`;
  right `DomainEvidenceLibrary` + `DomainObservationNeeds` + cycle
  stamps.
- `DomainOverlayStrip.tsx` — reuses `OverlayBundleStrip` pattern;
  activates the domain's `defaultOverlayBundle` on the embedded
  DiagnoseMap.
- `DomainMapHost.tsx` — DiagnoseMap fitted to boundary with active
  overlays; data point markers (verified = green, diverged = amber,
  superseded = greyed).
- `DomainObservationList.tsx` — chronological observations (verified
  + diverged union of feed + dataPoint stores). Each row: status pill
  + capture date + capturer + proof thumbnails + supersession
  indicator (`Superseded by [link]` or `Supersedes [link]`).
- `SupersessionControl.tsx` — "Not a replacement" CTA on superseded
  rows. Calls `observeDataPointStore.restorePair`. Both points
  re-appear as active.
- `DomainEvidenceLibrary.tsx` — paginated grid of all proof items for
  the domain; filterable by type (photo/gps/measurement/note/document).
- `LegacyModuleEmbed.tsx` — when `domain.legacyModuleMapping` resolves,
  React.lazy + Suspense skeleton renders the existing module
  dashboard inline (`TopographyPanel`, `EarthWaterEcologyPanel`,
  `MacroclimateHazardsPanel`, `SectorsZonesPanel`,
  `HumanContextPanel`, `BuiltEnvironmentPanel`, `SwotSynthesisPanel`).
- `DomainObservationNeeds.tsx` — reads `useObservationNeed` (already
  exists); lists open needs with deep-link into the existing
  Observation Capture Workspace.
- Phase 3 substrate integration: `routeToDataPoint(observeFeedEntry,
  domainCatalog)` adapter projects existing `ObserveFeedEntry` rows
  into virtual `ObserveDataPoint` projections so consumers stay
  union-safe without a migration pass. `useDomainPoints(projectId,
  domainId)` returns union of real data points + virtual projections
  from feed entries.

### Slice 4.4 — Plan Revision Banner + cyclical-review wiring + Plan tier divergence indicator (`1a209d5f`)

- `PlanRevisionBanner.tsx` — top of Unified Land State + Domain
  Detail. Priority badge (Critical = red, High = amber, Informational
  = blue). Headline + supporting count ("3 divergences across Soil
  and Hydrology since last review"). Deep-link CTA "Review impacted
  objectives" → first impacted Plan tier objective. Dismissable;
  dismissal persists until the next observation event.
- `useRevisionEvents.ts` — composed hook: scans observeDataPointStore
  + observeFeedStore for events newer than `lastDismissedAt`; ranks
  via `computeRevisionPriority`; returns top priority + impacted
  objectives list.
- `usePlanRevisionFlagSync.ts` — mounted in `V3ProjectLayout`.
  Iterates `planTierObjectives` for the project; for each, computes
  `observeRevisionFlag` via `computeObserveRevisionFlag`; calls
  `cyclicalReviewStore.forceTrigger(projectId, objectiveId)` when
  true. Runs on store mutations (subscription) + on mount. NOT a
  timer.
- `DivergenceIndicator.tsx` — small chip on Plan tier `ObjectiveCard`
  showing combined divergence count from
  `observeFeedStore.countDivergencesByFeedKey` + diverged data points
  for the objective's mapped domain. Click → navigates to
  `/observe/dashboard/domain/$domainId`.
- `apps/web/src/v3/plan/tiers/ObjectiveCard.tsx` — additive render
  only, hidden when count = 0 (zero layout shift on no-divergence
  path).
- `cyclicalReviewTrigger.ts` (Phase 1) — JSDoc updated to point at
  the Phase 4 wiring; no behavioural change (predicate already
  accepts the flag as a function).

### Slice 4.5 — Temporal Layer + Presentation Mode + share links (`9251abd8`)

- `TemporalLayerSurface.tsx` — domain picker on top; chart fills body.
  Empty state when domain has <2 observations at the same location
  cluster: "Temporal trends appear after 2 observations at the same
  location" per spec §5.4.
- `TemporalChart.tsx` — inline SVG; x-axis = time, y-axis =
  measurement value (when numeric) or ordinal status track. Reuses
  `observe/components/measure/sparkline.ts` patterns.
- `temporalSeries.ts` — pure `buildSeries(points)` returning
  `{ mode, points, yMin, yMax, statusLabels? }`; numeric / status mode
  discrimination; locked under
  `apps/web/src/v3/observe/dashboard/temporal/__tests__/temporalSeries.test.ts`.
- `CycleAnnotations.tsx` — vertical lines on chart at cycle
  transitions (from `observeCycleStore`), labelled with cycle number
  + Plan revision link.
- `LocationFilter.tsx` + `locationClusters.ts` — filters chart by
  proximity cluster (≤10m groups) per spec §5.3 ("trends require
  same-location series").
- `PresentationModeOverlay.tsx` — full-screen takeover. Four sections
  per spec §6.1: `SiteOverviewSection`, `CurrentConditionsSection`,
  `EcologicalTrajectorySection`, `EvidenceLibrarySection`. Side rail
  nav with active-section tracking. One overlay component drives two
  surfaces: in-app preview (Exit + Share controls visible) and public
  share viewer (`mode='shared'` strips controls + respects
  `includedSections` filter + adds `frozenAt` chip).
- `PresentationShareDialog.tsx` — generate token (7/30/90/permanent
  options); section toggles (omit sections from share); copy URL +
  email link.
- `observeShareResolution.ts` — pure `resolveShare(token, resolver,
  now)` returning `'unknown' | 'expired' | 'ready'`; locked under
  `apps/web/src/pages/__tests__/observeShareResolution.test.ts`.
- `pdfExport.ts` — hand-rolled single-page PDF 1.4 Blob (catalog +
  Pages + one Page + Helvetica + content stream). No Puppeteer / no
  server round-trip; existing `apps/api/src/services/pdf/` is the
  Phase 6 upgrade path.
- `cycleAdvance.ts` — pure helper called when a Plan revision is
  acknowledged (`confirmDecision` / `acknowledgeRevise` in
  `cyclicalReviewStore`). Increments `observeCycleStore[projectId]
  [domainId]` for impacted domains. New observation captures stamp
  with current cycleId.

### Gap D — Stable empty cycles selector on TemporalLayerSurface (`a881cfed`)

Found during Phase 4 smoke step 9: the temporal route entered an
infinite re-render loop on any project with no cycle history. Root
cause: the inline Zustand selector
`(s) => s.byProject[projectId]?.[domainId]?.history ?? []` returned
a fresh `[]` literal on every snapshot, so React's
`useSyncExternalStore` saw a new array identity each tick and
re-rendered forever.

Fix in [`TemporalLayerSurface.tsx`](../../apps/web/src/v3/observe/dashboard/temporal/TemporalLayerSurface.tsx):

```typescript
// Stable empty reference so the inline Zustand selector below
// returns the same array identity on every snapshot — otherwise
// React's useSyncExternalStore re-renders forever when no cycle
// history exists.
const EMPTY_CYCLES: readonly ObserveCycleEntry[] = Object.freeze([]);

const cycles = useObserveCycleStore(
  (s) => s.byProject[projectId]?.[domainId]?.history ?? EMPTY_CYCLES,
);
```

Pattern mirrors prior `Object.freeze([])` shielding for `LocalProject`
collections — module-level constant, same identity across renders,
selector returns a stable reference. Smoke step 9 then passes
end-to-end (chart renders with 2 points + cycle annotation if a
revision occurred; <2 points shows spec empty state).

## Architecture pins

- **No deletion of legacy components** ([[feedback-no-deletion]]).
  The 7-module Observe shell (`ObserveLayout`, `ObserveModuleBar`,
  `ObserveHero`, `ObserveChecklistAside`, `ModuleSlideUp`) is intact
  and reachable via the toggle. All 7 domain dashboards
  (`TopographyPanel`, `EarthWaterEcologyPanel`,
  `MacroclimateHazardsPanel`, `SectorsZonesPanel`,
  `HumanContextPanel`, `BuiltEnvironmentPanel`, `SwotSynthesisPanel`)
  embed inside the new Domain Detail surface via React.lazy +
  Suspense skeleton.
- **3-item nav is the forward IA** ([[project-lifecycle-retirement]]).
  Three Observe surfaces are internal to the Observe stage; top-level
  nav remains Plan / Act / Observe.
- **CSRA model erased.** Presentation Mode's Evidence Library section
  reads from `proofItem` data already verified to carry no capital-flow
  language; share dialog copy reviewed for the "capital partners &
  allies" lexicon (no occurrences in Phase 4 surfaces).
- **Slice = commit on `feat/atlas-permaculture`**
  ([[feedback-commit-immediately-on-rebased-branches]]). Each slice
  committed the moment its gate verified; Gap D shipped as a
  follow-up fix the same session. Branch is rebased out-of-band.
- **Typecheck** per slice via `cd apps/web &&
  NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` (8GB Node,
  monorepo root prints help only).
- **`git diff --cached --name-only` before every commit** — foreign
  WIP exclusion list (capitalPartnerSummary, EconomicsPanel,
  financialStore, DesignMap, DiagnoseMap, OperateMap,
  MaterialSubstitutionsCard, substitutionCatalog, ZoneSomSidebar,
  graphify-out/*, evidence/selectors/capitalPartner, .superpowers/,
  tsc_*.txt, vitest_*.txt, _sweep_out.txt, _act_spec_dump.txt,
  _observe_spec_dump.txt, _dump_act_spec.py,
  slice3-auto-needs-display.*, tsc_errors.txt) — never staged.
- **ASCII-only user copy.** No non-Latin glyphs in any Observe
  Dashboard surface; PDF export `asciiSafe()` strips out-of-range
  bytes since the hand-rolled PDF uses WinAnsi single-byte encoding.
- **Stable selector identity for collection reads from Zustand**
  ([[feedback-stable-selector-identity]] established by Gap D) —
  inline `??` fallbacks to fresh array/object literals trigger
  infinite `useSyncExternalStore` re-renders; module-level
  `Object.freeze([])` / frozen-object constants are the contract.
- **Pre-flight protocol** ([[feedback-preflight-protocol]]) — read
  current mounted state of every legacy module dashboard touched
  before embedding via `LegacyModuleEmbed` (not just the manifest
  line).

## Consequences

- **Phase 1 cyclical-review trigger is live.** The optional
  `observeRevisionFlag` Phase 1 left as a function arg now resolves
  via Slice 4.4's `usePlanRevisionFlagSync`. A divergence captured in
  Phase 3 surfaces a cyclical-review banner on the impacted Plan tier
  objective without waiting 90 days.
- **Phase 3 substrate consumed without refactor.** `observeFeedStore`
  + `fieldActionStore.divergenceFlag` + verified-task observation
  routing feed both the Plan Revision Banner and the per-domain
  observation list via the `routeToDataPoint` adapter. Phase 3
  capture pathways unchanged.
- **Plan tier divergence is visible at every entry point.**
  Plan tier `ObjectiveCard` shows the `DivergenceIndicator` chip when
  count > 0; click navigates straight to the matching Domain Detail
  surface. Steward sees the revision pressure from the Plan stage
  without needing to context-switch.
- **Supersession is automatic + reversible.** New observations within
  10m on the same domain mark older ones `isSuperseded`; "Not a
  replacement" round-trips. Per-domain override available via
  `domainCatalog[domain].supersessionProximityMeters`.
- **Presentation share is self-contained.** Tokens persist in
  ProjectMetadata; viewer route resolves locally; expired / unknown
  / permanent branches locked under `observeShareResolution.test.ts`.
  Server endpoint is the Phase 6 upgrade path.
- **Migration path for 9 net-new domains is incremental.** Thin
  Domain Detail shells (overlay strip + observation list + needs +
  evidence library) already work; richer per-domain UI lands as data
  accumulates and steward feedback dictates priority.
- **Phase 5 RBAC unblocked.** Plan tier producer state + Act execution
  + Observe revision routing are all in place. Role scoping (Primary
  Steward / Team Member / Contractor / Landowner) becomes the next
  consumer of stable state.

## Verification

Each slice typechecked (apps/web tsc --noEmit, exit 0) and verified
via `preview_eval` + `preview_screenshot` against the spec acceptance
criteria. All 12 end-of-phase smoke-test steps PASS:

1. localStorage cleared (projects + data points + cycles + shares).
2. New project via wizard → ObserveShellToggle visible in header →
   default `Dashboard`.
3. `/observe/dashboard` → 16 domain cards render with freshness
   pills (all `missing` for empty project).
4. Verify Field Action from Act → observation count for the matching
   domain → 1; freshness → `current`.
5. Tap domain card → Domain Detail loads with map + observation
   list. Photo proof item thumbnail renders. Legacy module dashboard
   embeds for the 7 mapped domains.
6. Capture divergence on the same field action → `/observe/dashboard`
   → PlanRevisionBanner appears with correct priority. Dismiss →
   hidden; new divergence → banner returns.
7. Plan tier ObjectiveCard for the diverged objective shows
   DivergenceIndicator chip (count 1). Click → Domain Detail.
8. Open the same objective in Plan → cyclicalReview banner
   ("Reviewing your earlier decision") appears via the Phase 4 flag,
   even before 90 days.
9. `/observe/dashboard/temporal/$domainId` → empty state until 2nd
   observation; 2nd → chart renders with cycle annotation. **(Gap D
   close.)**
10. Presentation Mode → 4 sections render with frozen content.
    Generate share link (7-day expiry). Copy URL. Open in incognito
    → public viewer renders read-only with included sections. Set
    expiry to past → friendly empty state.
11. Second observation at same location on same domain → first
    observation shows "Superseded by [link]". Click "Not a
    replacement" → both re-appear as active.
12. Regression: MTC project still loads `module-bar` Observe shell;
    all legacy module dashboards intact; Plan/Act toggles unaffected
    (ActShellToggle confirmed at L198-201 of
    [`ActLayout.tsx`](../../apps/web/src/v3/act/ActLayout.tsx) —
    floating overlay inside DiagnoseMap canvas, not header text).

## Carry-over to Phase 5

- **Role backend** extends `apps/api/src/plugins/rbac.ts` for Primary
  Steward / Team Member / Contractor / Landowner; Phase 4's
  presentation-share tokens are the closest precedent for unscoped
  read-only access, but Phase 5 introduces real per-project + per-role
  ACLs. Phase 2 wizard Step 3 already writes `team.queuedInvites[]`
  into ProjectMetadata; Phase 5 promotes those to real `team_members`
  rows.
- **Portfolio + Per-Project Home** consume the same `usePlanRevisionFlagSync`
  signal Slice 4.4 mounts — Phase 5's Next Up card ranks projects
  partly by Observe revision pressure.
- **Urgency score engine** for portfolio ordering folds Phase 4
  freshness (`stale` foundation domains weight high) + revision
  priority (Critical = high urgency) + Phase 3 blocked/diverged
  field-action count.
- **Server-side supersession + presentation share endpoints**
  consolidate during Phase 6 notification architecture or Phase 7
  cleanup, not Phase 5.

Log: [[log/2026-05-28-observe-dashboard-phase4]].
