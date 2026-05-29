# 2026-05-28 — Portfolio Home (Phase 5 Slice 5.3)

**Branch.** `feat/atlas-permaculture`. Single explicit-path slice commit
`9f656d08` (6 files, +823/-0). Phase 5 Slice 5.3 of the OLOS UX spec
implementation plan. Continues
[[log/2026-05-28-observe-dashboard-phase4]] (Phase 4 closed Observe ->
Plan revision routing; Phase 5 starts the steward-facing portfolio +
project surfaces that consume that producer state). Slices 5.1 (RBAC
backend extension) + 5.2 (urgency score engine in `@ogden/shared`)
shipped earlier in this session as the substrate this slice mounts.

## Synthesis

Slice 5.3 shipped the Portfolio Home surface at `/v3/portfolio` — a
multi-project landing that surfaces every active (non-archived) project
as a card ordered by `computeProjectUrgency` score (descending), with
each card surfacing the underlying breakdown reasons (divergences,
stale foundation domains, blocked field actions, cyclical reviews due,
inactivity days, `draftWizard`) as tone-coloured chips. The score
itself is never displayed — per the engine docstring contract locked in
Slice 5.2 ("the number is an ordering signal only"). Draft projects
(wizard mid-stream) get a `Sprout` + "Finish setup" badge and route on
click to `/v3/project/$projectId/wizard/$step` to resume; complete
projects route to `/v3/project/$projectId` (provisional — Slice 5.4
will repoint to `/v3/project/$projectId/home`). Clean projects render
"No urgent signals. Land is steady." as the body copy.

The composing hook `useProjectUrgency(projects)` is the load-bearing
piece: it subscribes to all 5 backing Zustand stores
(`fieldActionStore`, `observeDataPointStore`, `observeFeedStore`,
`planTierProgressStore`, `cyclicalReviewStore`) via the same stable
`byProject` selector pattern Phase 4 used, assembles the `ProjectUrgencyInputs`
shape `computeProjectUrgency` expects, loops over the incoming projects
array, and returns a `Map<projectId, ProjectUrgencyResult>` that's
referentially stable across renders when no inputs changed. The empty-input
stability is exercised by the first vitest case (rerender with
`projects: []` returns the same Map reference). The composing hook is
the canonical urgency reader for any future surface (Per-Project Home,
Notifications, Daily Digest) — no surface re-implements the 5-store
assembly.

Portfolio Home is mounted as a sibling to the existing `/v3/project`
Property Candidates landing (`V3ProjectsLandingPage`), not a replacement
— per [[feedback-no-deletion]]. Route tree added a new
`v3PortfolioHomeRoute` child under `appShellRoute` between
`v3ProjectsLandingRoute` and `v3WizardCreateRoute`. No changes to any
existing route, no changes to the existing landing page.

The card uses the canonical [[decisions/2026-05-27-atlas-bento-box-canonical-surface]]
`BentoBox` primitive (`outer="elevated" padding="md"`) with `role="button"`
+ `tabIndex=0` + Enter/Space keydown for keyboard accessibility. Chip
tones use `color-mix(in srgb, #color ##%, var(--color-border))` so they
read consistently across dark/gold and neutral themes — rose
(`#e88aa4`) for critical, gold (`#e6c34a`) for high, sage (`#5dd39e`)
for foundation, estate-gold (`#c9a05a`) for cadence, neutral for info.

ADR [[decisions/2026-05-28-atlas-portfolio-home-slice53]] holds the
locked decisions + architecture pins + carry-over to Slice 5.4.

## Commits

- `9f656d08` — `feat(home): slice 5.3 — Portfolio Home with
  urgency-ordered project cards`

## Files of note

**New (5):**
- `apps/web/src/v3/home/useProjectUrgency.ts` — composing hook (5-store
  assembly + stable Map return)
- `apps/web/src/v3/home/__tests__/useProjectUrgency.test.ts` — 5 vitest
  specs (empty + multi-project + drafts + fresh + blocked-field-action),
  happy-dom, real stores via `setState`
- `apps/web/src/v3/portfolio/PortfolioHomePage.tsx` — page (header +
  empty state + ordered grid)
- `apps/web/src/v3/portfolio/PortfolioHomePage.module.css` — grid +
  card + chip-tone CSS (estate-aligned, `color-mix` based)
- `apps/web/src/v3/portfolio/ProjectUrgencyCard.tsx` — BentoBox-wrapped
  card with `buildChips` + handleOpen routing

**Modified (1):**
- `apps/web/src/routes/index.tsx` — added `v3PortfolioHomeRoute` child
  + import; route inserted between `v3ProjectsLandingRoute` and
  `v3WizardCreateRoute` (no other routes touched)

## Verification

1. `cd apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
   — **exit 0**. Pre-existing 3-error foreign-WIP baseline unchanged;
   no new errors from any Slice 5.3 file.
2. `cd apps/web && npx vitest run src/v3/home/__tests__/useProjectUrgency.test.ts`
   — **5/5 pass** (29ms).
3. Live preview at `/v3/portfolio` via Claude Preview MCP tools:
   - `preview_snapshot` confirms 5 cards rendered in correct
     descending-urgency order on a dev session with mtc + 4 dev
     projects + 1 Phase 4 smoke project:
     1. Phase 4 Smoke — critical + high divergence chips
     2. Moontrance Creek — `14+ days inactive` chip
     3-5. Three clear projects — body shows `"No urgent signals. Land is
        steady."`
   - Score is never visible anywhere on the page (verified by
     `preview_eval` reading the card DOM — only the breakdown chips +
     the optional "Finish setup" badge are surfaced).
   - Empty state: clearing `ogden-projects` + reload → "+ Create your
     first project" centered help link only.
4. Pre-commit hygiene: `git diff --cached --name-only` returned exactly
   6 files (`apps/web/src/routes/index.tsx`, the 4 new
   `v3/home`+`v3/portfolio` files, the 1 new test). No foreign WIP from
   the exclusion list staged.
5. Commit `9f656d08`, divergence-checked before push per
   [[feedback-commit-immediately-on-rebased-branches]].

## Smoke test (Slice 5.3 acceptance gate)

- `/v3/portfolio` renders on a fresh-storage browser with the empty
  state when no projects exist.
- After creating a project via the wizard and pausing at Step 2, the
  draft project surfaces on Portfolio Home with the "Finish setup"
  badge and routes to `/v3/project/$id/wizard/vision` on click.
- After completing the wizard and capturing a divergence on a field
  action, the project gains a divergence chip and routes to
  `/v3/project/$id` on click.
- Score is never displayed; chips alone communicate why a project is
  ordered where it is.
- The existing `/v3/project` Property Candidates landing is untouched
  and still routes correctly.

## Carry-over

- **Slice 5.4 — Per-Project Home** at `/v3/project/$id/home`: build
  Next Up card + Attention Rail + Stage Status Row using the same
  `useProjectUrgency` hook in single-project mode. Repoint the Phase 2
  wizard completion CTA + Portfolio Home complete-project route from
  `/v3/project/$id` to `/v3/project/$id/home` in the same slice.
- **Slice 5.5 (or fold into 5.4) — Contractor / Landowner scoped views**:
  filter projects upstream of the hook based on viewer RBAC role; no
  hook-signature change.
- **Phase 7 cleanup**: decide whether `/v3/project` Property Candidates
  landing retires in favour of `/v3/portfolio` or both stay.

## Branch state at session close

- HEAD: `9f656d08 feat(home): slice 5.3 — Portfolio Home with
  urgency-ordered project cards`
- Branch: `feat/atlas-permaculture` (rebased out-of-band per
  [[project-branch-rebase]]; divergence-checked before push).
- Foreign WIP exclusion list unchanged; nothing from the known-foreign
  set staged into this slice.
- Phase 5 progress: Slices 5.1 / 5.2 / 5.3 shipped. Slice 5.4 deferred
  to next session.
