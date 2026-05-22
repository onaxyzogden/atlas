# Atlas Showcase Observation Loop — Phase 5

**Date.** 2026-05-21
**Status.** Ratified — landed on `feat/atlas-permaculture` this session (Slice B of the combined Phase 2.5 / Phase 5 plan).
**Spec source.** Phase 5 (Slice B) section of the in-session plan file (`flickering-thacker`); closes the analytics/feedback Open Followup tracked on [[entities/showcase-portal]] and completes the program plan's final phase.

## Context

Phase 3 shipped the public `/showcase/three-streams` portal; Phase 3.5
made its bundle lean. What it never had was an **observation loop** — no
way to learn which audience tier cold visitors pick, whether they click
through to register, whether they instantiate a template, or what
confused them. A showcase that ships without a feedback channel is itself
off-pattern.

Two blockers sat between the portal and a working loop:

1. **The existing telemetry pipeline is auth-gated.** `POST
   /api/v1/telemetry/act-interactions` carries an `authenticate`
   preHandler and writes `act_interaction_events`, whose `user_id` +
   `project_id` are both NOT NULL. A cold showcase visitor is anonymous
   by definition — no token, no project — so neither the route nor the
   table can accept their events.
2. **No qualitative channel existed at all.** There was no table, route,
   or form anywhere for free-text visitor feedback.

## Decision

Add a **parallel, anonymous-first telemetry path** rather than relaxing
the existing authed one. Two new tables, two new public routes, a
bundle-lean client logger, and a feedback form. The authed
`act_interaction_events` pipeline is left completely untouched.

### Quantitative half — `showcase_visitor_events`

- **Migration `040_showcase_visitor_events.sql`** (numbering reality:
  039 = `client_error_events`, so the showcase pair is 040/041, not the
  042/043 the plan text guessed). New table with **nullable `user_id` and
  `project_id`** — the structural inversion of `act_interaction_events`.
  A cold visitor's `showcase_view` / `tier_selected` rows carry both
  NULL; only once they register/instantiate do later events stamp the
  keys. `session_id` (a `sessionStorage`-resident anonymous id) is the
  cross-event correlation handle, not the user id.
- **`event_type` CHECK** constrains the 7 lifecycle events:
  `showcase_view`, `tier_selected`, `scene_viewed`, `cta_primary_click`,
  `cta_secondary_click`, `visitor_registered`, `template_instantiated`.
- **`tier` CHECK** is NULL-or-`dreaming|transitioning|stewarding`.
- **`POST /api/v1/telemetry/showcase-events`** — PUBLIC (no
  `authenticate` preHandler), rate-limited `60/min` per the Fastify
  rate-limit plugin since it accepts unauthenticated writes. Best-effort
  `jwtVerify` stamps `user_id` *only if* a bearer token happens to be
  present (e.g. a `visitor_registered` event fired right after sign-up);
  never required. Bulk-insert, best-effort per event — one bad row never
  poisons the batch (mirrors the authed bulk route's try/per-event/warn
  shape).

### Qualitative half — `showcase_feedback`

- **Migration `041_showcase_feedback.sql`.** Single-row "what was
  confusing?" capture. `message` is the one REQUIRED column; `session_id`
  / `tier` / `rating` (1–5) / `contact` are all NULL-able and opt-in.
  Three CHECKs: tier enum-or-NULL, rating 1–5-or-NULL, and
  `length(btrim(message)) > 0` as the final empty-message backstop.
- **`POST /api/v1/telemetry/showcase-feedback`** — PUBLIC, rate-limited
  `60/min`, co-located with `/showcase-events` under the telemetry prefix
  (NOT the schema docstring's aspirational `/api/v1/showcase/feedback`).
  The route trims + re-checks `message` and returns
  `400 EMPTY_MESSAGE` before the insert; the DB CHECK is the last line of
  defence. No best-effort `jwtVerify` — the table has no `user_id`
  column, feedback is fully anonymous.

### Client wiring (bundle-lean)

- **`showcaseEventLog.ts`** — a thin batcher mirroring
  `actInteractionLog.ts`'s shape but POSTing to `/showcase-events` via
  **plain `fetch` + `navigator.sendBeacon`**, never `apiClient`. Imports
  from `@ogden/shared` are **type-only**. This keeps the Phase 3.5 lean
  SSG bundle free of `authStore` / `projectStore` / Cesium — the same
  discipline the bundle-split ADR established
  ([[decisions/2026-05-21-atlas-showcase-bundle-split]]).
- The `sessionStorage` key `'ogden-showcase-session'` holds the anonymous
  session id. The event logger writes it; `FeedbackForm` only *reads* it
  (submits NULL when absent, e.g. private mode / SSR).
- Instrumented surfaces: `TierChooser` (`tier_selected`), `ContactCTA`
  (`cta_primary_click` / `cta_secondary_click`), showcase route mount
  (`showcase_view`), and the register / instantiate sites
  (`visitor_registered` / `template_instantiated`, which stamp the keys
  once known).
- **`FeedbackForm.tsx`** — mounted near each tier's end-of-scroll CTA on
  `showcase.$tier.tsx`, between `<ContactCTA>` and `<AttributionFooter>`.
  Posts to `/showcase-feedback` via plain `fetch` with `keepalive: true`.
  Required free-text `message` (client blocks empty/whitespace), optional
  1–5 star rating + optional contact handle. It deliberately does **not**
  gate on `VITE_ATLAS_TELEMETRY_ENABLED` — a typed-and-submitted form is
  an explicit opt-in act, not passive telemetry.

## Privacy Posture

- **Anonymous by default.** No cookie, no fingerprint, no PII required.
  The `session_id` is an ephemeral `sessionStorage` value scoped to one
  browser session; it dies with the tab.
- **The only PII channel is opt-in.** `showcase_feedback.contact` is the
  single column that can hold an email/handle, and only if the visitor
  chooses to type one for a reply.
- **Cross-link, not identity.** When a `session_id` is present it lets us
  thread a visitor's behavioural trail (`showcase_visitor_events`) to
  their written feedback (`showcase_feedback`) — correlation within a
  session, not identification of a person.
- No consent banner ships in v1; the posture (ephemeral id, no PII unless
  volunteered) is documented here. A full consent UX is a follow-up only
  if EU traffic warrants it.

## Covenant & Branch Discipline

- **Covenant ratchet extended automatically.** `covenant.test.ts` scans
  the entire `apps/web/src/showcase` subtree via a `git ls-files`
  wildcard, so `FeedbackForm.tsx` + `showcaseEventLog.ts` came into scope
  the moment they were committed — no test-logic change needed, only that
  their copy be clean. One catch-and-fix: the FeedbackForm docstring
  originally *enumerated* the forbidden tokens ("no CSRA / advance-
  purchase / yield-share / investor language") and tripped the ratchet on
  its own prose; reworded to "none of the forbidden capital-framing
  vocabulary appears anywhere in this surface" (commit `f3a5aeb8`). No
  capital framing, no Apricot Lane drift.
- **Amanah Gate.** Privacy-respecting product analytics + anonymous
  feedback are halal infrastructure — no riba, no gharar.
- `feat/atlas-permaculture` is rebased out-of-band; per-task explicit-path
  commits, fetch + divergence check after each, push gated on explicit
  user approval. No `git add -A`, no `--no-verify`.

## Out of Scope (Phase 5 v1)

- Analytics dashboard / read surface over the captured events (raw
  capture only; a reporting UI is a future slice).
- A/B testing infrastructure.
- Email delivery of feedback rows (capture only; notification deferred).
- Cookie-consent / GDPR banner (posture documented above).
- Merging `act_interaction_events` into the new table — kept separate by
  design (authed vs. anonymous have inverted NOT-NULL invariants).

## Verification

- **Migrations.** `040` + `041` apply clean on a fresh DB; re-run is a
  no-op (`CREATE TABLE IF NOT EXISTS` + idempotent indexes). The runner
  auto-discovers `.sql` by sorted filename.
- **tsc.** API `tsc --noEmit` exit 0; web `tsc` (8 GB heap) introduces 0
  NEW errors above the known 3-error foreign/test baseline
  (`StepBoundary`, two `HostUnion` test files).
- **vitest.** The showcase suite — including the covenant copy ratchet
  and the Apricot Lane exact-string assertion — is green; `FeedbackForm`
  + `showcaseEventLog` came in covenant-clean.

## Cross-links

- Entity: [[entities/showcase-portal]]
- Phase 5 session log: [[log/2026-05-21-atlas-phase-5-observation]]
- Phase 3 design ADR: [[decisions/2026-05-21-three-streams-showcase-design]]
- Phase 3.5 bundle-split ADR (bundle-leanness discipline reused):
  [[decisions/2026-05-21-atlas-showcase-bundle-split]]
- Phase 2.5 livestock seed (Slice A of the same combined plan):
  [[log/2026-05-21-atlas-phase-2.5-livestock-seed]]
- Covenant boundary: [[decisions/2026-05-09-atlas-csra-erasure]]
- Canon source: [[entities/three-streams-farm]]
