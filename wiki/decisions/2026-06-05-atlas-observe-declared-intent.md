# ADR: The Observe Human-Systems lens surfaces a project's declared vision as a read-side "Declared" Vision & Project Intent entry, without inflating any observation count

**Date:** 2026-06-05
**Status:** accepted + live verified (Phases 1-2 complete + committed; pure logic + honesty
invariant pinned by 29 bounded unit tests over the real builder; tsc EXIT 0; live
render-DOM confirmed via Chrome browser MCP -- see Verification section below)
**Branch:** `merge/atlas-permaculture-to-main-2026-06-05` (formerly
`feat/atlas-permaculture`; commits `4d55419d`, `c05bdcf5`; **not pushed**)
Plan: `C:\Users\MY OWN AXIS\.claude\plans\c-users-my-own-axis-downloads-olos-obse-sunny-mitten.md`.

## Context

In the live Observe lens the top-left identity tile shows the project type/intent
(e.g. "Human Systems" plus a composed project-type string), because
`bundle.project.type` is composed read-side from `metadata.projectTypeRecord`
(`resolveProjectTypeLabel`, `liveBundle.ts`). But the **Vision & Project Intent**
domain inside the **Human Systems** lens rendered "Not yet observed / 0 points / No
observations recorded for this domain yet" -- because that domain is populated ONLY
from persisted `ObserveDataPoint` records, and real (non-builtin) projects get zero
seeded observe points. The project's already-declared vision lives in
`metadata.visionProfile` (the Phase-2 Project Creation Wizard writes `landIdentity[0]`
free-text statement, `primaryOutcomes`, `budgetRange`, `timelineProgress`,
`resourceConstraints`) but was never projected into Observe. The declaration and the
domain were disconnected by design, so a steward saw the intent up top yet an empty
domain below.

**Operator decisions (locked via AskUserQuestion):**
1. **Goal -- surface declared intent.** The declared vision should appear as a Vision
   & Project Intent entry so the domain is no longer "Not yet observed" when a vision
   exists.
2. **Mechanism -- read-only derived entry.** Build a synthetic "declared intent" entry
   read-side in `liveBundle.ts`, framed as a **declaration, NOT a field observation**.
   No writes to the observe-data store; no migration; honest and reversible.
3. **Source -- structured vision profile.** Compose the entry from the structured
   `metadata.visionProfile` fields (vision statement, outcomes, budget, timeline,
   labour).

**Honesty invariant (the design's spine).** A declaration is not a field observation.
The derived entry MUST NOT increment any observation count: the lens "N observations"
badge, `project.totalDataPoints`, the project-level "Not yet observed" domain tally,
and per-lens `summary`/freshness all stay sourced from real `ObserveDataPoint`s. The
derived entry only changes the **presentation of the `vision-intent` domain**: its
`keyData` value and its slide-up subdomain row. Projects with no vision content keep
"Not yet observed" (correct -- they truly have no declared vision).

## Decision

**1. One pure, store-free composer.** `buildDeclaredIntentPoint(project)` in
`liveBundle.ts` (next to the `resolveProjectTypeLabel` precedent, same read-from-
metadata idiom) returns `null` unless `metadata.visionProfile` carries surfaceable
content; otherwise it composes a single `DataPoint` of a new `type: 'declaration'`,
`id: 'declared-intent'`, `label: 'Declared project intent'`, `confidence: 'low'`
(a stated intent, not a measurement). `value` is the free-text statement when present,
else the joined outcome labels, else "Declared". `notes` is a composed ASCII multi-line
digest (`Vision:`, `Goals:`, `Budget:`, `Timeline:`, `Labour:`) omitting absent fields.
`observedAt`/`recordedAt` use the existing `calendarDate` helper over
`visionProfile.updatedAt ?? completedAt` when present.

**2. id -> label reuse, no reinvention.** A flat `id -> label` lookup is built from the
authoritative `VISION_QUESTIONS` option vocabulary
(`v3/stage-zero/data/visionBuilderQuestions.ts`), covering `primaryOutcomes`,
`budgetRange`, `timelineProgress`. Ids absent from that vocabulary (wizard-local labour
`resourceConstraints`) fall back to a `humanizeOptionId` (`snake_case`/`kebab-case` ->
"Snake case"). All copy ASCII.

**3. Threaded into the pure builder without coupling to LocalProject.**
`LiveBundleInput` gains one optional field `declaredIntent?: DataPoint | null`;
`buildLiveLensBundle` stays pure. The hook `useLiveLensBundle` calls
`buildDeclaredIntentPoint(project)` (memoised on the project ref so the derived point
keeps a stable identity and does not force the bundle to rebuild) and passes the result
in -- mirroring exactly how `projectTypeLabel` is resolved in the hook.

**4. Injected into the `vision-intent` domain ONLY (two surfaces).** Inside the per-lens
loop, when the current domain is `vision-intent` and `declaredIntent` is non-null:
- **keyData**: the row `value` becomes "Declared" and `confidence` 'low', but ONLY when
  that domain has zero real observations. If real observations exist they win the
  headline -- the declaration never overrides observed status.
- **subdomains**: the declared-intent point is prepended to that domain's `points` and
  `emptyNote` is cleared, so the slide-up shows the declaration (ahead of any real
  observations) instead of the empty note.
Everything count-based is left untouched: `obsCount`, `lens.observations`,
`domainsWithData`, `summary`, `totalPoints`, project rollups, and freshness all continue
to reflect real observations only.

**5. Live-only row glyph.** A live-only `LIVE_TYPE_ICON = { ...TYPE_ICON, declaration:
<filled-diamond glyph> }` is returned as the bundle `typeIcon` so `DataPointRow` can
resolve the declared-intent row; `mockData.ts` (the source of `TYPE_ICON`) stays
byte-untouched and mock mode is unaffected. The filled diamond pairs with the Human
lens outline-diamond icon.

## Consequences

- For a project with a `metadata.visionProfile`, the live Observe Human Systems lens
  shows a "Declared" Vision & Project Intent keyData row and a declared-intent entry in
  the domain slide-up (composed from the structured vision profile); the domain no
  longer reads "Not yet observed".
- Projects without a vision keep the honest empty state -- `buildDeclaredIntentPoint`
  returning `null` is the single signal.
- No store write, no migration, and provably no observation-count change. A real
  observation in the domain always wins the keyData headline while the declaration still
  appears as context in the slide-up.
- `mockData.ts` and mock mode are untouched; `types.ts`/`components.tsx`/`mockBundle.ts`
  needed no change (the `DataPoint`/`Subdomain`/`KeyDatum` shapes and the generic
  renderers already fit).

## Verification

- `apps/web` `tsc --noEmit` (`NODE_OPTIONS=--max-old-space-size=8192`) -> **EXIT 0**,
  zero errors (empty output + exit 0 confirmed explicitly).
- Bounded `--pool=forks` vitest (`--testTimeout=20000`) -> **29/29 green** in
  `liveBundle.test.ts`: 5 composer cases (null when no visionProfile / no surfaceable
  content; full/statement-only/outcomes-only composition; known-id label mapping +
  humanize fallback) plus 5 wiring cases over the REAL `buildLiveLensBundle` -- the
  exact reported scenario (a zero-observation project's vision-intent keyData reads
  "Declared" not "Not yet observed", the declared-intent row is prepended to the
  slide-up and the empty note is cleared, the typeIcon exposes the declaration glyph),
  the observed-wins headline (a real MTC vision observation keeps its status while the
  declaration still appears in the slide-up), AND the **honesty invariant** pinned
  explicitly: `project.totalDataPoints`, `domainsMissingCount`/`CurrentCount`/
  `AgeingCount`, and every lens `observations`/`freshness`/`summary` are byte-identical
  to the same build with `declaredIntent: null`.
- **Live data fact (DOM-confirmed between renderer hangs).** A real wizard-created
  project ("Phase 4 Smoke") in the preview store carries `metadata.visionProfile` with
  exactly the fields the composer reads (`landIdentity`, `primaryOutcomes`,
  `budgetRange`, `timelineProgress`, `resourceConstraints`) -- validating the core plan
  assumption against real persisted state. A synthetic zero-observation clone was
  injected and its `/v3/project/.../observe` route URL resolved.
- **Live render-DOM proof confirmed via Chrome browser MCP (2026-06-06).** The
  previously-blocked live render was completed in a follow-up session using the Chrome
  browser MCP tool against port 5200. Procedure: (1) completed Stage Zero for "351 House
  -- Atlas Sample" (6-question vision builder, autosaved `visionProfile` via
  `useVisionBuilder.ts`); (2) navigated to Observe -> Module bar -> Human Systems lens;
  (3) opened the "Vision & Project Intent" slide-up. Screenshot + DOM eval confirmed:
  -- Slide-up header: "Vision & Project Intent -- 2 points"
  -- First entry: "Declared project intent" with filled-diamond glyph (the
     `LIVE_TYPE_ICON.declaration` character), outcomes composed as "Household
     self-sufficiency, Food for family / community, Soil regeneration", date 5 Jun 2026
  -- Second entry: "Carolinian homestead vision set" (real observation, 29 Feb 2024)
  -- Filter tabs: "All types | Declaration | Observation Note | Divergence" (new
     Declaration chip confirmed live)
  -- Honesty invariant held: Human Systems badge stayed "3 OBS"; total project counts
     (10 obs, 2 current, 7 ageing, 7 not yet observed) unchanged
  Note: initial orientation revealed that the Project Creation Wizard does NOT write
  `visionProfile` (`WizardStep2Vision.tsx` writes `projectTypeRecord` only); Stage Zero
  is the sole writer. This is the activation prerequisite for the feature.

## Process / covenant

Explicit-path commits (`git reset -q`; staged exactly `liveBundle.ts` + its test;
`git diff --cached` audited against a working tree full of foreign "epitaxy" WIP, left
untouched). Branch divergence-checked, **not pushed** ([[project-branch-rebase]],
[[feedback-commit-immediately-on-rebased-branches]] -- each phase committed the moment it
verified). `mockData.ts` byte-untouched; `PseudoMap`/`ObservationPin` stay exported
([[feedback-no-deletion]]). ASCII-only copy; apostrophe-free JS strings. CSRA model
untouched ([[fiqh-csra-erased-2026-05-04]]). Amanah: a read-only projection of the
steward's own declared vision into a read-only lens -- no sales/finance instrument,
clean.

## Deferred

- ~~Live render-DOM re-verification~~ -- COMPLETED 2026-06-06 via Chrome browser MCP
  (see Verification above).
- Optional: when a vision-intent domain has zero observations but a declaration exists,
  set the Human lens `summary` to "Intent declared; no field observations yet." so the
  card copy reads coherently (still zero count change). Not implemented.
- Wizard does not write `visionProfile` -- `WizardStep2Vision.tsx` writes
  `projectTypeRecord` only; Stage Zero is the sole writer. The Stage Zero banner claiming
  "This setup has moved to the Project Creation Wizard" is inaccurate. Tracked separately.

Entity: [[entities/observe-dashboard]]. Log: [[log/2026-06-05-atlas-observe-declared-intent]].
