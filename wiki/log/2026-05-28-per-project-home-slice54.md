# 2026-05-28 — Per-Project Home (Phase 5 Slice 5.4)

**Branch.** `feat/atlas-permaculture`. Single explicit-path slice commit
`5b463ef0` (10 files, +1267/-82). Phase 5 Slice 5.4 of the OLOS UX spec
implementation plan. Continues
[[log/2026-05-28-portfolio-home-slice53]] (Slice 5.3 shipped the
composing `useProjectUrgency` hook + Portfolio Home grid; this slice
consumes the same hook in single-project mode for the canonical
per-project landing surface). Closes all three carry-overs the Slice
5.3 ADR explicitly handed off.

## Synthesis

Slice 5.4 shipped Per-Project Home at `/v3/project/$id/home` **and**
`/v3/project/$id/` (both routes mount the same `PerProjectHomePage`
component so deep links and the default landing converge). The page is
composed of three regions per the Slice 5.3 ADR contract: **NextUpCard**
(priority router that walks `urgency.breakdown` in descending severity
to pick a single highest-priority "what to do next" tile), **AttentionRail**
(vertical chip list keyed off the shared `buildUrgencyChips` helper,
empty -> "No urgent signals. Land is steady."), and **StageStatusRow**
(three BentoBox cards summarising Plan tier objective status, field
action counts, and foundation domain freshness for this one project).

The composing hook `useProjectUrgency([project])` is consumed in
single-project mode — Slice 5.3 already established the hook handles
arbitrary array lengths with referentially-stable Map returns, so the
one-element case requires zero new substrate. The page reads
`urgencyMap.get(project.id)` and threads `urgency` into NextUpCard +
AttentionRail. StageStatusRow reads producer stores directly
(`usePlanTierProgressStore`, `useFieldActionStore`,
`useObserveDataPointStore`) — it is not an urgency consumer.

The urgency score is never rendered. NextUpCard uses it only as a
structural tie-break inside its priority router (and even then, the
router orders branches by severity first, so the score rarely
load-bears). AttentionRail surfaces breakdown channels as chips.
StageStatusRow surfaces producer state directly. Three roles, one
canonical urgency reader, one canonical chip helper.

The shared `buildUrgencyChips` helper was extracted from Slice 5.3's
inlined `buildChips` into `apps/web/src/v3/home/urgencyChips.ts` so
Portfolio Home and Per-Project Home cannot drift in copy or tone
assignment as the urgency breakdown shape evolves. `ProjectUrgencyCard`
imports the helper (deletes 83 lines of inlined chip logic, adds the
import + same rendering); markup is byte-identical to Slice 5.3 by
construction.

Two route-target repoints closed Slice 5.3's explicit carry-overs:

1. **WizardCompletionScreen "Go to my project" CTA** now navigates to
   `/v3/project/$id/home` instead of `/v3/project/$id/plan`. The
   doc-comment header was updated to reflect the new target with the
   parenthetical `(Slice 5.4 repoint)`. The "Continue setup in Plan"
   secondary CTA keeps its `/plan?highlightIncomplete=t0` destination —
   the explicit "I want to do Tier 0 right now" path still goes
   straight to Plan.
2. **`ProjectUrgencyCard.handleOpen`** now routes complete projects to
   `/v3/project/$projectId/home` instead of `/v3/project/$projectId`.
   Draft projects continue to route to
   `/v3/project/$projectId/wizard/$step` for wizard resume per Slice
   5.3 — that path is intentionally different.

The legacy `V3HomePage` is preserved on disk + import per
[[feedback-no-deletion]]. Only the route mounts swap.

ADR [[decisions/2026-05-28-atlas-per-project-home-slice54]] holds the
locked decisions + architecture pins + carry-over to Slice 5.5 and
Phase 6.

## Commits

- `5b463ef0` — `feat(home): slice 5.4 — Per-Project Home with Next Up
  + Attention Rail + Stage Status Row`

## Files of note

**New (7):**
- `apps/web/src/v3/home/PerProjectHomePage.tsx` — page (header +
  empty state + two-column body composing NextUpCard / StageStatusRow /
  AttentionRail)
- `apps/web/src/v3/home/PerProjectHomePage.module.css` — page +
  shared region styles (`.scrollHost`, `.body`, `.main`, `.sideRail`,
  `.headerActions`, `.finishSetupPill`, `.empty`, chip tones)
- `apps/web/src/v3/home/NextUpCard.tsx` — priority router on
  `urgency.breakdown` channels + field-action fallback
- `apps/web/src/v3/home/AttentionRail.tsx` — vertical chip list keyed
  off `buildUrgencyChips`, empty-state copy
- `apps/web/src/v3/home/StageStatusRow.tsx` — three BentoBox cards
  (Plan tier shell / Field actions / Land state)
- `apps/web/src/v3/home/urgencyChips.ts` — shared pure helper exporting
  `buildUrgencyChips(urgency)` + `UrgencyChip` / `UrgencyChipTone`
  types; explicitly excludes `draftWizard` (rendered as a separate
  badge by both surfaces)
- `apps/web/src/v3/home/__tests__/PerProjectHomePage.test.tsx` — 10
  vitest specs (empty + name + pill on/off + draft / divergence / clear
  branches + rail empty + rail populated + StageStatusRow presence),
  happy-dom

**Modified (3):**
- `apps/web/src/routes/index.tsx` — swap `V3HomePage` ->
  `PerProjectHomePage` mount on both `v3IndexRoute` (path `/`) and
  `v3HomeRoute` (path `home`); `V3HomePage` import retained per
  no-deletion
- `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx` — adopt shared
  `buildUrgencyChips` helper (delete inlined `buildChips` + types) +
  repoint complete-project route from `/v3/project/$projectId` to
  `/v3/project/$projectId/home`; rendered markup byte-identical to
  Slice 5.3
- `apps/web/src/v3/project-wizard/WizardCompletionScreen.tsx` — repoint
  "Go to my project" CTA from `/v3/project/$projectId/plan` to
  `/v3/project/$projectId/home`; "Continue setup in Plan" unchanged;
  doc-comment header updated

## Verification

1. `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
   -> **exit 0**. Pre-existing 3-error foreign-WIP baseline unchanged;
   no new errors from any Slice 5.4 file.
2. `cd apps/web && npx vitest run src/v3/home/__tests__/PerProjectHomePage.test.tsx`
   -> **10/10 pass** (102ms).
3. Live preview at `/v3/project/<id>/home` via Claude Preview MCP tools
   on the Phase 4 Smoke project:
   - NextUpCard renders the REALITY DIVERGED branch (one critical + one
     high divergence captured during the Phase 4 smoke test fed
     `breakdown.divergencesCritical = 1` + `breakdown.divergencesHigh = 1`).
   - AttentionRail renders 1 critical + 1 high chip (no other channels
     non-zero on the smoke project).
   - StageStatusRow renders the three cards: Plan tier shell (0/8
     complete, 0 active, 2 available, 6 locked), Field actions (all
     zeros), Land state (2/3 foundation current, 0 ageing, 1
     stale/missing).
   - The urgency score is not visible in the DOM at any point —
     verified by reading rendered card text + chip text + breakdown
     count text.
4. Pre-commit hygiene: `git diff --cached --name-only` returned exactly
   10 Slice 5.4 files (7 new under `v3/home/`, 1 modified route, 1
   modified `ProjectUrgencyCard`, 1 modified `WizardCompletionScreen`).
   No foreign WIP from the exclusion list staged.
5. Commit `5b463ef0`, divergence-checked via
   `git fetch origin feat/atlas-permaculture` +
   `git log --left-right HEAD...origin/feat/atlas-permaculture` (no
   upstream-only commits) before push. Pushed as fast-forward
   `7d503748..5b463ef0`.

## Smoke test (Slice 5.4 acceptance gate)

- `/v3/project/$id/home` renders for any project resolved by the URL
  parameter.
- `/v3/project/$id/` (no `home` suffix) also renders Per-Project Home
  -- both routes mount the same component.
- "Finish setup" pill appears in the header iff
  `metadata.wizardStatus === 'in_progress'`.
- NextUpCard branches correctly on the highest-severity non-zero
  breakdown channel (draftWizard -> Resume wizard; critical/high
  divergence -> Open Act; otherwise field-action fallback or "Nothing
  urgent" copy).
- AttentionRail surfaces one chip per non-zero breakdown channel
  (excluding `draftWizard`); empty -> "No urgent signals. Land is
  steady."
- StageStatusRow renders three cards with computed Plan tier + field
  action + foundation freshness counts for this single project.
- Score is never displayed.
- Wizard "Go to my project" CTA lands the steward on Per-Project Home
  (not Plan tier shell).
- Portfolio Home -> click a complete project card -> Per-Project Home
  (not legacy `/v3/project/$id` landing).
- Empty state ("No project loaded.") when `projectId` does not resolve.

## Carry-over

- **Slice 5.5 — Contractor / Landowner scoped views**: pre-filter the
  projects array upstream of `useProjectUrgency`; Per-Project Home
  becomes an access check on the single project (403 empty state if
  the viewer lacks access). Hook signature unchanged.
- **Phase 6 Notifications**: should import `buildUrgencyChips` from
  `apps/web/src/v3/home/urgencyChips.ts` for any per-project signal
  copy. Channel-to-tone + pluralisation lives in one place.
- **Phase 7 cleanup**: retire `V3HomePage.tsx` (currently retained per
  no-deletion). Deferred to Phase 7's audit of unused legacy surfaces.

## Branch state at session close

- HEAD: `5b463ef0 feat(home): slice 5.4 — Per-Project Home with Next
  Up + Attention Rail + Stage Status Row`
- Branch: `feat/atlas-permaculture` (rebased out-of-band per
  [[project-branch-rebase]]; divergence-checked before push;
  fast-forward push from `7d503748..5b463ef0`).
- Foreign WIP exclusion list unchanged; nothing from the known-foreign
  set staged into this slice.
- Phase 5 progress: Slices 5.1 / 5.2 / 5.3 / 5.4 shipped. Slice 5.5
  (Contractor / Landowner scoped views) deferred to next session.
