# 2026-05-21 — Phase 5: Showcase observation loop (Slice B)

Branch `feat/atlas-permaculture`. Slice B of the combined Phase 2.5 + Phase 5
plan, and the **final phase of the Apricot-Lane-inspired Showcase Program**.
Phase 3 ([[log/2026-05-21-atlas-phase-3-showcase-portal]]) shipped the public
`/showcase/three-streams` portal; Phase 3.5
([[log/2026-05-21-atlas-phase-3.5-bundle-split]]) made its bundle lean. Neither
gave the portal a way to learn anything from its visitors. Phase 5 adds the
observation loop: an anonymous-first quantitative telemetry path plus a
qualitative free-text feedback channel. A showcase that ships without a
feedback channel is itself off-pattern.

Two blockers stood between the portal and a working loop, both rooted in the
existing authed telemetry pipeline (`POST /api/v1/telemetry/act-interactions`
+ `act_interaction_events`): the route is `authenticate`-gated, and the table's
`user_id` + `project_id` are both NOT NULL. A cold showcase visitor is
anonymous by definition — no token, no project — so neither the route nor the
table can accept their events. And no qualitative channel existed anywhere.

Design decision (full rationale in
[[decisions/2026-05-21-atlas-showcase-observation-loop]]): add a **parallel,
anonymous-first path** rather than relax the authed one. The authed
`act_interaction_events` pipeline is left completely untouched.

## Outcome

Two new tables, two new public routes, a bundle-lean client logger, a feedback
form, and a covenant-ratchet extension — across six commits.

### Quantitative half — `showcase_visitor_events` (B.1 + B.2)

- **Migration `040_showcase_visitor_events.sql`** — new table with **nullable
  `user_id` and `project_id`**, the structural inversion of
  `act_interaction_events`. A cold visitor's `showcase_view` / `tier_selected`
  rows carry both NULL; only once they register / instantiate do later events
  stamp the keys. `session_id` (a `sessionStorage`-resident anonymous id) is
  the cross-event correlation handle. `event_type` CHECK constrains the 7
  lifecycle events (`showcase_view`, `tier_selected`, `scene_viewed`,
  `cta_primary_click`, `cta_secondary_click`, `visitor_registered`,
  `template_instantiated`); `tier` CHECK is NULL-or-enum. Idempotent
  (`CREATE TABLE IF NOT EXISTS` + idempotent indexes).
  > Numbering reality: 039 = `client_error_events`, so the showcase pair is
  > 040/041 — not the 042/043 the plan text guessed.
- **`POST /api/v1/telemetry/showcase-events`** — PUBLIC (no `authenticate`
  preHandler), rate-limited `60/min`. Best-effort `jwtVerify` stamps `user_id`
  *only if* a bearer token happens to be present (e.g. a `visitor_registered`
  event right after sign-up); never required. Bulk-insert, best-effort
  per-event — one bad row never poisons the batch (mirrors the authed bulk
  route's try/per-event/warn shape). Shared `PostShowcaseEventsBody` schema.

### Client wiring (B.3)

- **`showcaseEventLog.ts`** — a thin batcher mirroring `actInteractionLog.ts`'s
  shape but POSTing to `/showcase-events` via **plain `fetch` +
  `navigator.sendBeacon`**, never `apiClient`; `@ogden/shared` imports are
  **type-only**. This keeps the Phase 3.5 lean SSG bundle free of `authStore` /
  `projectStore` / Cesium — the same discipline the bundle-split ADR
  established. The `sessionStorage` key `'ogden-showcase-session'` holds the
  anonymous session id.
- Instrumented surfaces: `TierChooser` (`tier_selected`), `ContactCTA`
  (`cta_primary_click` / `cta_secondary_click`), showcase route mount
  (`showcase_view`), and the register / instantiate sites
  (`visitor_registered` / `template_instantiated`, which stamp the keys once
  known).

### Qualitative half — `showcase_feedback` (B.4)

- **Migration `041_showcase_feedback.sql`** — single-row "what was confusing?"
  capture. `message` is the one REQUIRED column; `session_id` / `tier` /
  `rating` (1–5) / `contact` are all NULL-able and opt-in. Three CHECKs: tier
  enum-or-NULL, rating 1–5-or-NULL, and `length(btrim(message)) > 0` as the
  empty-message backstop.
- **`POST /api/v1/telemetry/showcase-feedback`** — PUBLIC, rate-limited
  `60/min`, co-located with `/showcase-events` under the telemetry prefix (NOT
  the schema docstring's aspirational `/api/v1/showcase/feedback`). The route
  trims + re-checks `message` and returns `400 EMPTY_MESSAGE` before the
  insert; the DB CHECK is the last line of defence. No best-effort `jwtVerify`
  — the table has no `user_id` column, feedback is fully anonymous.
- **`FeedbackForm.tsx`** — mounted on `showcase.$tier.tsx` between
  `<ContactCTA>` and `<AttributionFooter>`. Posts to `/showcase-feedback` via
  plain `fetch` with `keepalive: true`. Required free-text `message` (client
  blocks empty/whitespace), optional 1–5 star rating + optional contact handle.
  Reads (does not create) the telemetry `session_id` so written feedback
  cross-links to the behavioural trail. It deliberately does **not** gate on
  `VITE_ATLAS_TELEMETRY_ENABLED` — a typed-and-submitted form is an explicit
  opt-in act, not passive telemetry.

### Covenant ratchet extension (B.5)

- `covenant.test.ts` already scans the entire `apps/web/src/showcase` subtree
  via a `git ls-files` wildcard, so `FeedbackForm.tsx` + `showcaseEventLog.ts`
  came into scope the moment they were committed — no test-logic change needed,
  only that their copy be clean. One catch-and-fix: the `FeedbackForm`
  docstring originally *enumerated* the forbidden tokens and tripped the
  ratchet on its own prose; reworded to "none of the forbidden capital-framing
  vocabulary appears anywhere in this surface" (commit `f3a5aeb8`). No capital
  framing, no Apricot Lane drift.

## Privacy posture

- **Anonymous by default.** No cookie, no fingerprint, no PII required. The
  `session_id` is an ephemeral `sessionStorage` value scoped to one browser
  session; it dies with the tab.
- **The only PII channel is opt-in.** `showcase_feedback.contact` is the single
  column that can hold an email/handle, and only if the visitor types one for a
  reply.
- **Cross-link, not identity.** A present `session_id` threads a visitor's
  behavioural trail (`showcase_visitor_events`) to their written feedback
  (`showcase_feedback`) — correlation within a session, not identification of a
  person.
- No consent banner ships in v1; the posture is documented in the ADR. Full
  consent UX is a follow-up only if EU traffic warrants it.

## Decisions fixed this slice

- **Parallel anonymous path, not a relaxed authed one.** Inverted NOT-NULL
  invariants make merging `act_interaction_events` into the new table wrong by
  design; kept separate.
- **Migration numbering 040 / 041** — actual next-free after 039
  (`client_error_events`). Plan text's 042/043 was a guess; reassigned at
  write-time.
- **Feedback route co-located under `/telemetry`**, not the docstring's
  aspirational `/api/v1/showcase/feedback`. One prefix, one rate-limit policy.
- **FeedbackForm does not gate on `VITE_ATLAS_TELEMETRY_ENABLED`** — explicit
  submission is opt-in, not passive telemetry.

## Reused, not built

- `actInteractionLog.ts` batcher shape — mirrored, not imported (the showcase
  logger must stay bundle-lean; the authed batcher pulls `apiClient`).
- The authed bulk-route's try/per-event/warn best-effort insert shape — copied
  into `/showcase-events`.
- Fastify rate-limit plugin — reused via per-route `config.rateLimit`.
- `covenant.test.ts` wildcard subtree scan — new files auto-in-scope, zero
  test-logic change.
- The Phase 3.5 bundle-leanness discipline (plain `fetch` + `sendBeacon` +
  type-only shared imports).

## Out of scope (deferred)

- Analytics dashboard / read surface over the captured events (raw capture
  only; a reporting UI is a future slice).
- A/B testing infrastructure.
- Email delivery of feedback rows (capture only; notification deferred).
- Cookie-consent / GDPR banner (posture documented in the ADR).
- Merging `act_interaction_events` into the new table (kept separate by
  design).

## Verification

- **Migrations.** `040` + `041` apply clean on a fresh DB; re-run is a no-op.
  Runner auto-discovers `.sql` by sorted filename.
- **tsc.** API `tsc --noEmit` exit 0; web `tsc` (8 GB heap) introduces 0 NEW
  errors above the known foreign/test baseline (`StepBoundary`, two `HostUnion`
  test files).
- **vitest.** The showcase suite — including the covenant copy ratchet and the
  Apricot Lane exact-string assertion — is green; `FeedbackForm` +
  `showcaseEventLog` came in covenant-clean.

## Commits

- `bb54a4fb` — `feat(api): Phase 5 migration 040 — showcase_visitor_events table`
- `cbe90535` — `feat(api): Phase 5 public showcase telemetry route + shared schema`
- `57de13f8` — `feat(web): Phase 5 showcase event instrumentation (tier/CTA/register/instantiate)`
- `051518e9` — `feat(api+web): Phase 5 visitor feedback table + route + form`
- `f3a5aeb8` — `test(showcase): Phase 5 covenant ratchet covers feedback surface`
- (this) — `docs(wiki): Phase 5 observation loop — ADR + log + entity update`

## Next

- **Program complete.** Phase 5 closes the final phase of the Apricot-Lane
  Showcase Program (Phase 0 → 1 → 2 → 2.5 → 3 → 3.5 → 4 → 4.5 → 5). Remaining
  forward work is no longer program-scoped: a post-launch read of the captured
  visitor signal (the "2-week observation" the program plan contemplated)
  would queue the next round of portal refinement when real traffic exists.

ADR back-links: [[decisions/2026-05-21-atlas-showcase-observation-loop]]
(this slice's ADR — table rationale, nullable-key design, privacy posture),
[[decisions/2026-05-21-atlas-showcase-bundle-split]] (bundle-leanness
discipline reused by the client logger),
[[entities/showcase-portal]] (portal entity — observation section added),
[[log/2026-05-21-atlas-phase-2.5-livestock-seed]] (Slice A of the same plan).
