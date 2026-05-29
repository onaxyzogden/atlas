# 2026-05-28 — Per-Project Home (Phase 5 Slice 5.4: Next Up + Attention Rail + Stage Status Row at `/v3/project/$id/home`)

**Status.** Implemented on `feat/atlas-permaculture` as a single explicit-path
slice commit `5b463ef0`. Phase 5 Slice 5.4 of the 7-phase OLOS UX spec
implementation plan
(`~/.claude/plans/c-users-my-own-axis-downloads-olos-proj-delightful-jellyfish.md`).
Continues [[decisions/2026-05-28-atlas-portfolio-home-slice53]] (Slice 5.3
shipped the composing `useProjectUrgency` hook + Portfolio Home grid; this
slice consumes the same hook in single-project mode for the canonical
per-project landing surface). Closes the three carry-overs the Slice 5.3
ADR explicitly handed off: (1) build Per-Project Home consuming the hook
with a 1-element array, (2) repoint Phase 2 wizard completion CTA from
`/plan` to `/home`, (3) repoint `ProjectUrgencyCard` complete-project route
from `/v3/project/$projectId` to `/v3/project/$projectId/home`.

## Context

The plan's Phase 5-7 outline anchor:

> Phase 5 — Role backend + Project Home (4 slices). [...] Portfolio Home
> (urgency-ordered project cards; **Phase 2 draft "Finish setup" badge
> surfaces here**) and Per-Project Home (Next Up card, Attention Rail,
> Stage Status Row; **Phase 2 "Go to my project" CTA repoints here**).
> Contractor + Landowner scoped views. Urgency score engine.

Slice 5.4 is the **Per-Project Home** half of that outline — the steward's
single-project landing surface, mounted at `/v3/project/$projectId/home`
**and** `/v3/project/$projectId/` (both routes resolve to the same
component so deep links and the default landing land together). The
existing `V3HomePage` is preserved on disk + import per the no-deletion
rule; this slice swaps which component the two routes mount, it does not
delete `V3HomePage`.

Three locked decisions framed Slice 5.4:

1. **Single composing hook, called with a 1-element array.** Per the
   Slice 5.3 docstring contract:
   `useProjectUrgency(projects: readonly LocalProject[]): ReadonlyMap<string, ProjectUrgencyResult>`.
   The hook's empty-input stability + per-project breakdown shape is
   already production-grade from Slice 5.3, so the page calls
   `useProjectUrgency(project ? [project] : [])` and reads
   `urgencyMap.get(project.id)`. No re-implementation of the 5-store
   assembly, no parallel hook for the single-project case.
2. **Score is a routing hint inside NextUpCard, never rendered.** The
   `ProjectUrgencyResult.score` field exists in Per-Project Home only as
   a tie-break the priority router inside NextUpCard *could* fall back
   on; in practice the router picks the highest-severity non-zero
   breakdown channel directly. The score is not displayed in the DOM —
   same load-bearing contract Slice 5.3 enforced for Portfolio Home.
   AttentionRail surfaces the underlying breakdown channels as a
   vertical chip list; StageStatusRow reads producer state (Plan tier
   progress, field-action counts, foundation freshness) without any
   urgency-score readback.
3. **AttentionRail and ProjectUrgencyCard share `buildUrgencyChips`.**
   Slice 5.3 inlined a `buildChips` helper inside `ProjectUrgencyCard`;
   Slice 5.4 extracts it to a new pure module
   `apps/web/src/v3/home/urgencyChips.ts` so the channel-to-tone
   mapping never drifts between Portfolio Home (one chip row per card)
   and Per-Project Home (vertical chip list in the rail). The helper
   intentionally excludes `draftWizard` from the chip list — both
   surfaces render that as a separate "Finish setup" badge, not a chip,
   because the affordance it offers ("resume wizard") is structurally
   different from the per-channel chips ("open the project").

## Decision

### Per-Project Home page — `PerProjectHomePage`

New files:
- `apps/web/src/v3/home/PerProjectHomePage.tsx` (86 lines)
- `apps/web/src/v3/home/PerProjectHomePage.module.css` (317 lines)

Reads `useParams({ strict: false })` for the `projectId` parameter,
looks up the project via `useProjectStore`, calls
`useProjectUrgency(project ? [project] : [])` and pulls
`urgency = urgencyMap.get(project.id)`. Renders:

- `PageHeader` (`eyebrow: 'Project'`, `title: project.name`,
  `subtitle: project.description ?? 'Your land at a glance. The next
  move, the open signals, and where each stage stands.'`, `actions:`
  a `Sprout` "Finish setup" pill when `metadata.wizardStatus ===
  'in_progress'` + an "All projects" link to `/v3/portfolio`).
- Two-column body (`.body / .main / .sideRail` on desktop, single
  column with rail collapsing under main on narrow viewports):
  - **Main column:** `<NextUpCard project={project} urgency={urgency} />`
    + `<StageStatusRow project={project} />`.
  - **Side rail:** `<AttentionRail urgency={urgency} />`.
- Empty state: when no project resolves for the URL parameter, renders
  `<p className={css.empty}>No project loaded.</p>`.

The page does not wrap `useProjectUrgency` in `useMemo` — the hook is
already referentially stable when no store inputs changed (Slice 5.3
test gate), so wrapping would only delay it by one render.

### Next Up card — `NextUpCard`

New file: `apps/web/src/v3/home/NextUpCard.tsx` (218 lines).

Renders the single highest-priority "what to do next" tile for this
project. The priority router walks `urgency.breakdown` in descending
severity order:

1. `breakdown.draftWizard === true` -> "Resume the project wizard" /
   "Resume wizard" CTA -> `/v3/project/$id/wizard/$step` (where `$step`
   is `metadata.wizardLastStep` or `vision` fallback).
2. `breakdown.divergencesCritical > 0` -> "N critical divergence(s) to
   review" / "Open Act" CTA -> `/v3/project/$id/act/field-action`.
3. `breakdown.divergencesHigh > 0` -> "N field divergence(s) to review"
   / "Open Act" CTA -> same.
4. `fieldActionStore.getNextUpForProject(projectId)` returns a queued
   field action -> renders the task title + parent objective + "Open
   task" CTA.
5. No driving channels -> "Nothing urgent -- land is steady." copy
   only, no CTA.

The score (`urgency.score`) is never rendered. The router uses
breakdown-channel presence + severity to choose the headline; the score
is only a tie-break for "which divergence severity wins" — and in
practice the `divergencesCritical > 0` branch already runs before
`divergencesHigh > 0`, so the tie-break is structural, not numeric.

### Attention Rail — `AttentionRail`

New file: `apps/web/src/v3/home/AttentionRail.tsx` (62 lines).

Vertical chip list keyed off `buildUrgencyChips(urgency)` from the
shared helper. Renders one row per non-zero breakdown channel (excluding
`draftWizard`, which is handled by the header pill). Empty list -> "No
urgent signals. Land is steady." empty-state copy. Each chip carries
the same tone token as the Portfolio Home card chip — see Slice 5.3 ADR
for the channel-to-tone table; identical mapping.

### Stage Status Row — `StageStatusRow`

New file: `apps/web/src/v3/home/StageStatusRow.tsx` (214 lines).

Three bento cards (`BentoBox outer="default" padding="md"`)
summarising producer state for this one project:

- **Plan tier shell:** `computeAllObjectiveStatuses(PLAN_TIER_OBJECTIVES,
  toProgressMap(progress))` -> renders `complete / total` headline +
  three breakdown lines (`active`, `available`, `locked`). Source:
  `usePlanTierProgressStore`.
- **Field actions:** counts from `useFieldActionStore` keyed by status
  -> renders three counts (`in progress`, `submitted`, `blocked`).
- **Land state:** iterates `FOUNDATION_DOMAINS_FOR_REVISION`, calls
  `computeDomainFreshness(points, nowMs, OBSERVE_DOMAIN_CATALOG[d].freshnessThresholds)`
  per domain, surfaces `current / total foundation` headline +
  breakdown of (`current`, `ageing`, `stale`/`missing`). Source:
  `useObserveDataPointStore`.

StageStatusRow reads producer stores directly — it is not a consumer of
`useProjectUrgency`. The Per-Project Home composition is therefore:
**urgency hook -> NextUpCard + AttentionRail (signals);** **producer
stores -> StageStatusRow (state)**. Two roles, one page.

### Shared chip helper — `urgencyChips.ts`

New file: `apps/web/src/v3/home/urgencyChips.ts` (97 lines).

Pure module. Exports `buildUrgencyChips(urgency: ProjectUrgencyResult |
undefined): UrgencyChip[]` (extracted from Slice 5.3's inlined
`buildChips`) and the `UrgencyChip` / `UrgencyChipTone` types. The
helper handles the singular/plural copy variants (`'1 critical
divergence'` vs `'3 critical divergences'`) and the `inactivityDays`
'14+' clamp at the threshold matching Phase 4's urgency scoring window.
The exclusion of `draftWizard` is intentional and documented inline.

### Card refactor — `ProjectUrgencyCard`

Modified file: `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx`
(83 lines deleted / 83 lines remain — net wash with the helper
extraction).

Two changes in one slice:
1. **Adopt the shared helper.** The inlined `buildChips` function +
   chip type + tone tokens move out to `urgencyChips.ts`. The card
   now imports `buildUrgencyChips` and uses it directly. The rendered
   markup is byte-identical to Slice 5.3 by construction; only the
   sourcing module changes.
2. **Repoint `handleOpen` for complete projects.** Slice 5.3 routed
   complete projects to `/v3/project/$projectId` (provisional); this
   slice routes them to `/v3/project/$projectId/home` so Portfolio
   Home cards land the steward on Per-Project Home, not the legacy
   landing. Draft projects continue to route to
   `/v3/project/$projectId/wizard/$step` per Slice 5.3.

### Wizard completion repoint — `WizardCompletionScreen`

Modified file:
`apps/web/src/v3/project-wizard/WizardCompletionScreen.tsx` (4 lines
changed).

The "Go to my project" CTA's `goToProject` handler swaps
`to: '/v3/project/$projectId/plan'` for
`to: '/v3/project/$projectId/home'` so a fresh steward who just finished
the wizard lands on Per-Project Home — not the Plan tier shell. The
"Continue setup in Plan" CTA keeps its `/plan?highlightIncomplete=t0`
destination so the explicit "I want to do Tier 0 right now" path still
goes straight to Plan. The doc-comment header is updated to reflect the
new target with the parenthetical `(Slice 5.4 repoint)`.

### Route swap — `routes/index.tsx`

Both `v3IndexRoute` (path `/`, the default child of
`/v3/project/$projectId`) and `v3HomeRoute` (path `home`) now mount
`PerProjectHomePage` instead of `V3HomePage`. The import for
`V3HomePage` is retained per the no-deletion rule; future surfaces may
reuse its primitives. No other routes are touched.

## Architecture pins

- **No-deletion** ([[feedback-no-deletion]]): the legacy `V3HomePage`
  file + import stay on disk; only the route mount points swap. Any
  surface that wants the old composition can re-mount `V3HomePage` at
  a sibling route without restoring deleted code.
- **Score-as-routing-only**: the engine docstring contract from Slice
  5.2 + the load-bearing rendering rule from Slice 5.3 carry through.
  The score is now also a routing hint inside NextUpCard's priority
  router — but it is still never displayed in the DOM. Any future
  surface that wants to display the score is a re-litigation of the
  locked decision and must come with its own ADR.
- **Single canonical urgency reader** ([[decisions/2026-05-28-atlas-portfolio-home-slice53]]):
  Per-Project Home consumes `useProjectUrgency` in single-project mode
  (1-element array). No parallel hook, no inlined 5-store assembly.
  Any future Notifications / Daily Digest / push surface should follow
  the same rule.
- **Shared chip helper**: `buildUrgencyChips` is the canonical source
  of channel-to-tone + pluralisation. Portfolio Home and Per-Project
  Home must both consume it; any future urgency surface (e.g. a
  Slack-style notification) should consume it too rather than
  reinventing chip copy.
- **3-item nav forward IA** ([[project-lifecycle-retirement]]): the
  Per-Project Home composition is Plan / Act / Observe-grounded
  (StageStatusRow's three cards). No 7-stage-lifecycle widgets,
  no stage-progression visualisation; the 3-item nav remains the
  forward IA.
- **Slice = commit on `feat/atlas-permaculture`**
  ([[feedback-commit-immediately-on-rebased-branches]]): Slice 5.4 is
  one commit `5b463ef0`. The branch is rebased out-of-band; the slice
  was staged with explicit paths and divergence-checked before push.
- **ASCII-only user copy.** All visible strings (`'Your land at a
  glance. The next move, the open signals, and where each stage
  stands.'`, `'Finish setup'`, `'All projects'`, `'No project
  loaded.'`, `'Resume the project wizard'`, `'Resume wizard'`,
  `'Nothing urgent -- land is steady.'`, `'No urgent signals. Land is
  steady.'`, `'Plan tier shell'`, `'Field actions'`, `'Land state'`,
  chip labels) are plain ASCII.
- **CSRA model erased** (global instructions): no investment /
  advance-purchase / yield-share framing on any rendered copy. Public-
  facing label for capital contributors remains "capital partners &
  allies" elsewhere in the app and is untouched by this slice.

## Consequences

- **Phase 2 wizard completion repoint closed.** Stewards finishing the
  wizard land on Per-Project Home, which surfaces NextUpCard +
  AttentionRail + StageStatusRow rather than the Plan tier shell. The
  "go straight to Plan" affordance remains via the "Continue setup in
  Plan" secondary CTA.
- **Portfolio Home -> Per-Project Home navigation closed.** Clicking a
  ProjectUrgencyCard for a complete project lands the steward on
  Per-Project Home, not the legacy default. Draft cards still route to
  the wizard for resume — that path is intentionally different.
- **Per-Project Home is now the canonical project landing surface.**
  Both `/v3/project/$id/home` and `/v3/project/$id/` mount it, so deep
  links from external clients (email, push notifications planned in
  Phase 6) can use either form interchangeably.
- **Slice 5.5 (Contractor + Landowner scoped views) unblocked.** RBAC
  filtering happens upstream of `useProjectUrgency` — the hook signature
  is unchanged. Per-Project Home is single-project so the filter just
  controls whether the project is visible at all (404 / "no project
  loaded" empty state if the viewer lacks access).
- **`urgencyChips.ts` is now load-bearing for any future urgency
  surface.** Phase 6 Notifications, Daily Digest, push channels should
  import `buildUrgencyChips` rather than reinventing the chip copy.

## Verification

Per-slice verification protocol followed
([[feedback-commit-immediately-on-rebased-branches]]):

1. `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
   -> **exit 0**. Pre-existing 3-error foreign-WIP baseline unchanged;
   no new errors from any Slice 5.4 file.
2. `cd apps/web && npx vitest run src/v3/home/__tests__/PerProjectHomePage.test.tsx`
   -> **10/10 pass** (102ms). Cases:
   - Empty state when `projectId` does not match any project ->
     `'No project loaded.'`
   - PageHeader renders the project name (`'Acme Homestead'`).
   - Hide "Finish setup" pill when `metadata.wizardStatus === 'complete'`.
   - Show "Finish setup" pill when `metadata.wizardStatus === 'in_progress'`.
   - NextUpCard draft-wizard branch: `breakdown.draftWizard === true`
     -> `'Resume the project wizard'` + `'Resume wizard'` CTA.
   - NextUpCard divergence branch: `breakdown.divergencesHigh === 2`
     -> `'2 field divergences to review'`.
   - NextUpCard clear branch: empty `breakdown` -> `'Nothing urgent --
     land is steady.'` with no CTA.
   - AttentionRail empty state: `urgency === null` -> `'No urgent
     signals. Land is steady.'`
   - AttentionRail populated: 3 non-zero channels -> 3 chips matched by
     `[class*="railChip-"]` selector.
   - StageStatusRow renders the three card headers (`'Plan tier
     shell'`, `'Field actions'`, `'Land state'`).
3. Live preview at `/v3/project/<id>/home` via Claude Preview MCP tools
   on the Phase 4 Smoke project:
   - NextUpCard surfaces the REALITY DIVERGED branch (one critical +
     one high divergence captured during the Phase 4 smoke test).
   - AttentionRail renders 1 critical + 1 high chip (no other channels
     non-zero).
   - StageStatusRow renders the three cards: Plan tier shell (0/8
     complete, 0 active, 2 available, 6 locked), Field actions (all
     zeros), Land state (2/3 foundation current, 0 ageing, 1
     stale/missing).
   - The urgency score is never visible in the DOM (verified by reading
     the rendered card text — only chip labels + "Finish setup" badge
     + breakdown counts appear).
4. Pre-commit hygiene: `git diff --cached --name-only` returned exactly
   10 Slice 5.4 files (7 new under `v3/home/`, 1 modified route, 1
   modified `ProjectUrgencyCard`, 1 modified `WizardCompletionScreen`).
   No foreign WIP from the exclusion list staged.
5. Commit `5b463ef0`, divergence-checked via
   `git fetch origin feat/atlas-permaculture` +
   `git log --left-right HEAD...origin/feat/atlas-permaculture` before
   push. Pushed as fast-forward `7d503748..5b463ef0`.

## Carry-over

- **Slice 5.5 — Contractor + Landowner scoped views**: pre-filter the
  projects array passed into `useProjectUrgency` so the hook does not
  need to re-shape per viewer role. For Per-Project Home this becomes
  an upstream visibility check on the single project — if the viewer
  lacks access the page should render a 403-style empty state instead
  of the "No project loaded." copy.
- **Phase 6 Notifications**: should import `buildUrgencyChips` from
  `apps/web/src/v3/home/urgencyChips.ts` for any per-project signal
  copy rather than reinventing the chip mapping.
- **Phase 7 cleanup**: `V3HomePage.tsx` retired (currently retained per
  no-deletion). Decision deferred until Phase 7's audit of unused
  legacy surfaces.
- **No new `feedback-*` memory.** Slice 5.4 obeyed every existing
  feedback-memory rule (no-deletion, score-as-routing-only, ASCII-only,
  commit-immediately-on-rebased-branches, foreign-WIP exclusion).

Log: [[log/2026-05-28-per-project-home-slice54]].
