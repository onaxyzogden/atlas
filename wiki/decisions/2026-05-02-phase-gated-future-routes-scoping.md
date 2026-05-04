# ADR: Phase-Gated Future Routes (`MT`, `FUTURE`, `P4`) — Scoping

**Date:** 2026-05-02
**Status:** Proposed (scoping — not yet accepted)
**Scope:** `apps/api/src/routes/{moontrance-identity,future-geospatial,
public-portal}/index.ts`, the matching V3 surfaces, and the
`requirePhase()` gate that today returns the typed `not_ready` /
`not_implemented` envelope for all three.

---

## Context

Three section routes ship today behind phase gates that are not yet
enabled in any deployment:

| Section | Slug | Phase | Today's behaviour |
|---|---|---|---|
| 27 — Public Experience & Storytelling Portal | `public-portal` | `P4` | `requirePhase('P4')` → 403 if phase off; else `not_ready/not_implemented` |
| 28 — Advanced Geospatial / Future-Ready Features | `future-geospatial` | `FUTURE` | Same pattern, `FUTURE` gate |
| 29 — Moontrance-Specific Features | `moontrance-identity` | `MT` | Same pattern, `MT` gate |

All three were caught by the Phase 7.1 sweep — they now return the
shared `sectionResponse` envelope with `reason: 'not_implemented'`,
identical to the other 24 unimplemented sections. The phase gate is
the only thing distinguishing them from "we just haven't built it
yet" sections.

Phase 8.3 of `.claude/plans/few-concerns-shiny-quokka.md` flags
that each of the three needs its own ADR before implementation. They
are not interchangeable: each phase carries different product intent,
different audience, and different data-shape requirements. This ADR
scopes the three together so each accepted-ADR can pick up from a
shared baseline rather than re-deriving the gate semantics.

## Decision space

### D1. `MT` — Moontrance Identity

The Moontrance-specific surface already has a typed shape in
`apps/web/src/store/visionStore.ts` (`MoontranceIdentity` interface
with `prayerPavilionIntent`, `quietZoneDesignation`,
`hospitalitySequenceNotes`, `mensCohortZoneIntent`,
`waterLandWorshipIntegration` fields). The store-level shape is
locked; the route's job is to read/write that shape against
`project_data` rows.

**Sub-decisions for the accepted ADR:**
- Storage: extend `project_data` with a `moontrance_identity` jsonb
  column, or create a sibling `project_moontrance_identity` table?
  Sibling table is cleaner for future multi-row collaboration audit;
  jsonb is one migration vs. three. Recommendation: **sibling table**.
- Phase-gate semantics: does `MT` mean "Moontrance branch active"
  (per-deployment flag) or "this project opted into MT" (per-project
  flag)? Recommendation: **per-project**, gated at row-creation rather
  than at request-handler. `requirePhase('MT')` becomes a no-op if
  the per-project flag isn't set.
- Read-path: returns the typed envelope with the five fields lifted
  from store-level shape verbatim — no transformation.

### D2. `FUTURE` — Advanced Geospatial / Future-Ready

The least-defined of the three. "Future-ready geospatial" today
means: anticipated features that don't fit Sections 1-26 but might
in 2-3 years (BIM integration, IoT sensor ingest, photogrammetry-
to-DSM, drone-survey orthomosaics).

**The accepted ADR for `FUTURE` should not ship code.** It should:
1. Enumerate the candidate features under the `FUTURE` umbrella.
2. Pick one to graduate to a real phase tag (`P5`?) and demote the
   others back to "tracked-not-built" backlog entries.
3. Or rename the phase to something that doesn't bait the
   "scaffold suggests this is coming" expectation — e.g. `LATENT`.

Recommendation: **rename and trim**. Today's `FUTURE` is a junk
drawer. The shared envelope makes the route harmless; the section
slot is the cost. Either fill it with something concrete or release
the slot.

### D3. `P4` — Public Experience & Storytelling Portal

The P4 phase has the clearest product intent: public-facing
project pages with story, before/after media, and a permission-
gated visitor flow. The accepted ADR should cover:

- **Auth boundary.** Public-portal pages serve unauthenticated
  visitors; the route gate must distinguish "draft (steward-only)"
  from "published (public)" project rows. New `project.published_at`
  column + visitor-token rate-limit.
- **Cache layer.** Public pages take traffic the rest of the API
  doesn't — PostGIS reads on every visitor request will not survive
  even modest Hacker News traffic. CDN-cached static render
  (Next-style ISR or rendered-to-blob-storage) recommended.
- **Storytelling content shape.** Distinct from
  `MoontranceIdentity` — public portal needs hero copy, photo
  grid, milestone timeline, and visit-arrangement contact form.
  New schema: `PublicPortalContent` (carry into accepted ADR).

## Consequences

**Positive.**
- Three accepted ADRs land independently; no inter-dependency
  beyond the shared envelope (already in production).
- `FUTURE` rename clears the "scaffold suggests this is coming"
  ambiguity that's been carrying since the original
  scaffold-section pass.
- `P4` cache-layer requirement is captured up-front, before the
  first public visitor URL goes live.

**Negative.**
- Three more ADRs in the queue (one each for D1/D2/D3) before any
  of the three routes ships real code.
- `FUTURE` rename touches the phase-gate enum
  (`apps/api/src/plugins/phaseGate.ts`) and every CI run that
  enumerates phases. Cheap migration but it's a coordinated
  rename, not a no-op.

**Neutral.**
- The `not_ready` / `not_implemented` envelope returned today is
  contract-stable. None of these accepted ADRs require changing
  the read-path before processor work lands — just the storage
  shape and the gate semantics.

## Implementation slicing

Each phase gets its own accepted ADR, sequenced by clearest intent:

1. **8.3-A** — D3 / `P4`: Public-portal accepted ADR.
   Highest product clarity, biggest surface (auth + cache).
2. **8.3-B** — D1 / `MT`: Moontrance accepted ADR.
   Storage shape locked; shortest path from ADR to ship.
3. **8.3-C** — D2 / `FUTURE`: rename + trim. May produce zero new
   routes; the deliverable is the renamed phase tag and a
   trimmed candidate list moved to backlog.

## Open questions

- **Per-deployment vs. per-project phase gating.** The current
  `requirePhase()` is per-deployment (env-var or feature-flag).
  D1 recommends per-project for `MT`. Should `P4` follow the same
  per-project pattern (one project published, another not), or
  is `P4` per-deployment (publishing is enabled for the whole
  instance)?
- **`FUTURE` slot retention.** If we rename and trim, do we keep
  Section 28 as a numbered slot (rename only) or remove the
  number entirely and renumber 29 → 28? Renumbering ripples
  through `featureManifest.ts`, every section schema, every test
  fixture — not worth it. Recommendation: keep the numbering.
- **Public-portal media storage.** Out of scope for the gate
  decision but blocks 8.3-A's accepted ADR — where do the hero
  images live, and at what tier (S3 vs. blob vs. tile-server)?

## References

- Existing routes:
  - `apps/api/src/routes/moontrance-identity/index.ts`
  - `apps/api/src/routes/future-geospatial/index.ts`
  - `apps/api/src/routes/public-portal/index.ts`
- Phase gate plugin: `apps/api/src/plugins/phaseGate.ts`
- Moontrance store shape: `apps/web/src/store/visionStore.ts`
  (MoontranceIdentity interface, lines 89-95)
- Plan entry: `.claude/plans/few-concerns-shiny-quokka.md` Phase 8.3
- Related ADRs:
  - `2026-05-02-section-response-envelope.md` — shared envelope
    these three routes already adopt.
  - `2026-04-22-feature-manifest-scaffolding-pass.md` — original
    section-numbering pass that allocated the three phase slots.
