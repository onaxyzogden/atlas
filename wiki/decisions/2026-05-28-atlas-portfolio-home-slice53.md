# 2026-05-28 — Portfolio Home (Phase 5 Slice 5.3: urgency-ordered project cards at `/v3/portfolio`)

**Status.** Implemented on `feat/atlas-permaculture` as a single explicit-path
slice commit `9f656d08`. Phase 5 Slice 5.3 of the 7-phase OLOS UX spec
implementation plan
(`~/.claude/plans/c-users-my-own-axis-downloads-olos-proj-delightful-jellyfish.md`).
Continues [[decisions/2026-05-28-atlas-observe-dashboard-phase4]] (Phase 4
gave Phase 5 a producer of `divergencesCritical / divergencesHigh /
staleFoundationDomains` urgency signals via the four pure helpers + 3
stores Phase 4 shipped). Slices 5.1 (RBAC backend) + 5.2 (urgency score
engine in `@ogden/shared`) shipped earlier in this session as substrate
for the visible Portfolio Home surface this slice mounts.

## Context

The plan's Phase 5-7 outline anchor:

> Phase 5 — Role backend + Project Home (4 slices). [...] Portfolio Home
> (urgency-ordered project cards; **Phase 2 draft "Finish setup" badge
> surfaces here**) and Per-Project Home (Next Up card, Attention Rail,
> Stage Status Row; **Phase 2 "Go to my project" CTA repoints here**).
> Contractor + Landowner scoped views. Urgency score engine.

Slice 5.3 is the **Portfolio Home** half of that outline — the steward's
multi-project landing surface, mounted at `/v3/portfolio` as a sibling
to the existing `/v3/project` Property Candidates landing per the
no-deletion rule. Per the urgency engine docstring contract:

> The number is an ordering signal only — the UI surfaces the underlying
> reasons (divergences, stale domains, drafts) directly rather than ever
> rendering the score.

Slice 5.2 already shipped `computeProjectUrgency` + `sortByUrgency` +
`URGENCY_WEIGHTS` in `@ogden/shared` with full breakdown decomposition
(8 signal channels). What was missing was the **composing hook + page +
card** that assembles inputs from the 5 backing Zustand stores
(`fieldActionStore`, `observeDataPointStore`, `observeFeedStore`,
`planTierProgressStore`, `cyclicalReviewStore`) and renders the ordered
grid.

Three locked decisions framed Slice 5.3:

1. **Sibling route, not replacement.** `/v3/portfolio` mounts as a new
   child route under `appShellRoute` between `v3ProjectsLandingRoute`
   (`/v3/project`) and `v3WizardCreateRoute` (`/v3/project/wizard`); the
   existing Property Candidates landing at `/v3/project` is untouched
   ([[feedback-no-deletion]]). Slice 5.4 will repoint the wizard
   completion CTA from `/v3/project/$id/plan` to `/v3/project/$id/home`,
   but Portfolio Home's per-card route is provisional until then —
   `draftWizard` projects route to `/v3/project/$projectId/wizard/$step`
   (resume-the-wizard intent), complete projects route to
   `/v3/project/$projectId`.
2. **Score never displayed.** The card surfaces non-zero
   breakdown reasons as tone-coloured chips (critical / high /
   foundation / cadence / info) + a `Sprout` "Finish setup" badge for
   draft projects + a fallback "No urgent signals. Land is steady." copy
   when all chips would be empty. The score is the sort key only, per
   the [[decisions/2026-05-28-atlas-observe-dashboard-phase4]] +
   shared-engine docstring contract.
3. **Composing hook reads real stores, not mocks.** `useProjectUrgency`
   subscribes to all 5 `byProject` Zustand maps via stable selectors,
   loops over the incoming projects array, calls `computeProjectUrgency`
   per project, returns a `Map<projectId, ProjectUrgencyResult>` that's
   referentially stable when no inputs change (closes a re-render hazard
   the Portfolio Home grid's `useMemo` sort dep would otherwise hit).

## Decision

### Composing hook — `useProjectUrgency`

New file: `apps/web/src/v3/home/useProjectUrgency.ts`. Signature:

```ts
useProjectUrgency(projects: readonly LocalProject[]): ReadonlyMap<string, ProjectUrgencyResult>
```

Subscribes to `useFieldActionStore`, `useObserveDataPointStore`,
`useObserveFeedStore`, `usePlanTierProgressStore`, `useCyclicalReviewStore`
via the same stable `byProject` selector pattern used by Phase 4's
`useDomainSnapshot`. Per project, assembles the shape
`computeProjectUrgency` expects (`fieldActions`, `observeDataPoints`,
`observeFeedEntries`, `planTierProgress`, `cyclicalReviews`,
`projectMetadata`, `nowIso`), calls the pure helper, accumulates results
into a fresh `Map`. Returns the same `Map` reference across renders when
none of the dependencies changed — exercised by the test
`returns a stable empty Map when no projects are passed`.

5 vitest specs in `apps/web/src/v3/home/__tests__/useProjectUrgency.test.ts`
(happy-dom, real stores via `setState`, `vi.useFakeTimers` pinning
`now = 2026-05-28T12:00:00Z`):
- empty projects → stable empty Map (referentially stable across rerender)
- 2 projects → Map keyed by both ids
- `wizardStatus: 'in_progress'` → `breakdown.draftWizard === true`, score ≥ `URGENCY_WEIGHTS.draftWizard`
- fresh project, no signals, no inactivity → score 0
- `fieldActionStore.byProject[id]` with one `status: 'blocked'` row → `breakdown.blockedFieldActions === 1`, score ≥ `URGENCY_WEIGHTS.blockedFieldAction`

### Portfolio Home page — `PortfolioHomePage`

New file: `apps/web/src/v3/portfolio/PortfolioHomePage.tsx`.

Reads `useProjectStore((s) => s.projects)` → filters non-archived → passes
through `useProjectUrgency` → orders via `sortByUrgency(activeProjects,
(p) => urgencyMap.get(p.id)?.score ?? 0)` (stable descending,
deterministic tie-break on `id`). Renders `PageHeader` (eyebrow:
"Portfolio", title: "Your land at a glance", subtitle: "Projects ordered
by what needs attention. Tap a card to dive in.") + an explicit "+ New
project" button that navigates to `/v3/project/wizard`. Empty state
(`activeProjects.length === 0`) renders a centered help link prompting
"Create your first project". Otherwise renders a CSS grid of
`ProjectUrgencyCard`s, one per ordered project.

### Card — `ProjectUrgencyCard`

New file: `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx`.

Wraps the [[decisions/2026-05-27-atlas-bento-box-canonical-surface]]
`BentoBox` primitive with `outer="elevated" padding="md"`,
`role="button"`, `tabIndex={0}`, Enter/Space keydown handler. The header
slot renders the project name + optional description + a `Sprout` +
"Finish setup" badge when `breakdown.draftWizard === true`. The body
slot renders an unordered chip list built by a pure `buildChips`
function that maps each non-zero breakdown channel to a labelled chip
with the right tone:

| Breakdown channel | Tone |
|---|---|
| `divergencesCritical` | `critical` (rose tint) |
| `divergencesHigh` | `high` (gold tint) |
| `staleFoundationDomains` | `foundation` (sage tint) |
| `ageingFoundationDomains` | `cadence` (estate-gold tint) |
| `cyclicalReviewsDue` | `cadence` |
| `blockedFieldActions` | `high` |
| `pendingVerifications` | `info` (neutral) |
| `inactivityDays` | `info` |

When no chip would render and the project is not a draft, the body
shows `"No urgent signals. Land is steady."` per the engine's "ordering
signal only" contract. Card click handler routes to
`/v3/project/$projectId/wizard/$step` for drafts (resume the wizard at
the step the user left off, defaulting to `vision`) or
`/v3/project/$projectId` for complete projects.

### Module CSS — `PortfolioHomePage.module.css`

New file: `apps/web/src/v3/portfolio/PortfolioHomePage.module.css`. CSS
grid `repeat(auto-fill, minmax(320px, 1fr))` with `gap: var(--space-3)`,
hover `translateY(-1px)` + `box-shadow-lg`, focus-visible 2px gold
outline. Chip tones use `color-mix(in srgb, #color ##%, var(--color-border))`
for border + `color-mix(in srgb, #color 15%, var(--color-bg))` for
background so the chips read consistently across the dark/gold and
neutral themes; semantic palette matches the
[[concepts/design-system]] estate (rose / gold / sage / cadence-gold /
neutral). `.finishSetupBadge` reuses the estate-gold accent tokens with
a `color-mix(in srgb, #c9a05a 18%, transparent)` background +
`color-mix(in srgb, #c9a05a 35%, transparent)` border.

### Route mount — `routes/index.tsx`

Added `v3PortfolioHomeRoute = createRoute({ getParentRoute: () =>
appShellRoute, path: '/v3/portfolio', component: PortfolioHomePage })`
to the route tree's `appShellRoute.addChildren([...])` children list,
between `v3ProjectsLandingRoute` (the existing `/v3/project` Property
Candidates landing) and `v3WizardCreateRoute` (`/v3/project/wizard`).
No changes to any existing route.

## Architecture pins

- **No-deletion** ([[feedback-no-deletion]]): the existing `/v3/project`
  Property Candidates landing (`apps/web/src/v3/project/V3ProjectsLandingPage.tsx`)
  is untouched. Portfolio Home is a sibling surface; Slice 7's eventual
  cleanup may consolidate or retire one in favour of the other, but not
  this slice.
- **Score-as-ordering-only**: the engine docstring contract from Slice
  5.2 is now load-bearing on this UI — the card surfaces breakdown
  reasons, never the number. Any future surface that wants to display
  the score is a re-litigation of the locked decision and must come
  with its own ADR.
- **3-item nav forward IA** ([[project-lifecycle-retirement]]): the
  card-click destination for a complete project is `/v3/project/$id`
  (the legacy module-bar / tier-spine entry), not a 7-stage lifecycle
  view. Slice 5.4 will swap that to `/v3/project/$id/home` once
  Per-Project Home ships.
- **Slice = commit on `feat/atlas-permaculture`**
  ([[feedback-commit-immediately-on-rebased-branches]]): Slice 5.3 is
  one commit `9f656d08`. The branch is rebased out-of-band; the slice
  was staged with explicit paths and divergence-checked before push.
- **ASCII-only user copy.** All visible strings (`"Your land at a glance"`,
  `"Tap a card to dive in."`, `"Finish setup"`, `"No urgent signals.
  Land is steady."`, `"+ New project"`, chip labels) are plain ASCII.
- **CSRA model erased** ([[../CLAUDE-style.md]] / global instructions):
  no investment / advance-purchase / yield-share framing on any card
  copy. Public-facing label for capital contributors remains "capital
  partners & allies" elsewhere in the app and is untouched by this
  slice.

## Consequences

- **Phase 5 Slice 5.4 unblocked.** Per-Project Home (Next Up card +
  Attention Rail + Stage Status Row at `/v3/project/$id/home`) can now
  consume the same `useProjectUrgency` hook + `ProjectUrgencyResult`
  shape for its per-project breakdown rendering, and the wizard
  completion CTA repoint becomes a one-line change (`/v3/project/$id/plan`
  → `/v3/project/$id/home`).
- **Phase 5 RBAC contractor/landowner scoped views** ride on top of the
  same composing hook by filtering the input projects list to the ones
  the current viewer has visibility into — the hook's signature does not
  need to change.
- **`useProjectUrgency` becomes the canonical urgency reader.** Any
  future surface (Notifications, Daily Digest, push notifications)
  that wants per-project urgency should consume this hook rather than
  re-implementing the 5-store assembly.

## Verification

Per-slice verification protocol followed
([[feedback-commit-immediately-on-rebased-branches]]):

1. `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
   → **exit 0** (full repo typecheck, baseline at pre-existing 3-error
   foreign-WIP set, no new errors from Slice 5.3 files).
2. `cd apps/web && npx vitest run src/v3/home/__tests__/useProjectUrgency.test.ts`
   → **5/5 pass** (29ms).
3. Live preview via `preview_*` MCP tools at `/v3/portfolio`:
   - 5 cards render in correct urgency-descending order: Phase 4 Smoke
     (critical + high divergence chips) → Moontrance Creek (`14+ days
     inactive`) → 3 clear projects with "No urgent signals. Land is
     steady."
   - Score is never displayed; only breakdown chips and the `Sprout`
     "Finish setup" badge surface on the card face.
   - Click on a clear project routes to `/v3/project/$projectId`; click
     on a draft project (when present) would route to
     `/v3/project/$projectId/wizard/$step`.
4. `git diff --cached --name-only` before commit: exactly 6 Slice 5.3
   files (3 new under `v3/home/`, `v3/portfolio/` + 1 new test +
   `routes/index.tsx` modification). No foreign WIP staged.
5. Commit `9f656d08`: `feat(home): slice 5.3 — Portfolio Home with
   urgency-ordered project cards`. Branch divergence-checked before push.

## Carry-over

- **Slice 5.4 — Per-Project Home** at `/v3/project/$id/home`: build
  Next Up card + Attention Rail + Stage Status Row consuming the same
  `useProjectUrgency` hook (single-project mode just passes a 1-element
  array). Repoint the Phase 2 wizard completion CTA from
  `/v3/project/$id/plan` to `/v3/project/$id/home`. Repoint
  `ProjectUrgencyCard.handleOpen` complete-project route from
  `/v3/project/$projectId` to `/v3/project/$projectId/home` in the same
  slice.
- **Slice 5.5 (or fold into 5.4) — Contractor + Landowner scoped views**:
  pre-filter the projects array passed into `useProjectUrgency` so the
  hook does not need to re-shape per viewer role.
- **Phase 7 cleanup**: decide whether `/v3/project` Property Candidates
  landing retires in favour of `/v3/portfolio`, or whether the two
  landing surfaces serve distinct flows and both stay.
- **No new `feedback-*` memory.** Slice 5.3 obeyed every existing
  feedback-memory rule (no-deletion, score-as-ordering, ASCII-only,
  commit-immediately-on-rebased-branches, foreign-WIP exclusion).

Log: [[log/2026-05-28-portfolio-home-slice53]].
