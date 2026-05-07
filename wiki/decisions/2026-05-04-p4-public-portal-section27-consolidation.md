# ADR: P4 Public Portal — Section 27 Consolidation onto `portal/*`

**Date:** 2026-05-04
**Status:** Accepted
**Scope:** `apps/api/src/routes/{portal,public-portal}/`,
`apps/web/src/features/public-portal/`,
`apps/api/src/app.ts` route registration.
**Supersedes the 8.3-A slice of:** [`2026-05-02-phase-gated-future-routes-scoping.md`](2026-05-02-phase-gated-future-routes-scoping.md) (D3).

---

## Context

The Phase 8.3 scoping ADR called out three deferred routes (`MT`,
`LATENT`, `P4`) that ship as `requirePhase('…')` stubs returning empty
envelopes. 8.3-B (MT) and 8.3-C (LATENT/FUTURE rename) landed
2026-05-04. 8.3-A was deferred as the largest surface — the scoping
ADR anticipated a fresh build covering auth boundary, cache layer,
and a new `PublicPortalContent` schema.

**That fresh build is unnecessary.** The product intent of P4 (a
public-facing project page with hero, story scenes, before/after
media, share-token visitor flow, and a published/draft auth
boundary) is *already implemented* under a different route prefix:

| Concern | 8.3-A scoping ADR proposed | Reality on disk today |
|---|---|---|
| Auth boundary | New `project.published_at` column + visitor token | [`project_portals`](../../apps/api/src/db/migrations/004_project_portals.sql) carries `is_published` + `published_at` + per-portal `share_token` UUID |
| Public read route | New `/api/v1/public-portal/:slug` | Existing [`/api/v1/portal/:shareToken`](../../apps/api/src/routes/portal/public.ts) — unauthenticated, filters on `is_published = true` |
| Steward write route | (not specified) | [`/api/v1/portal`](../../apps/api/src/routes/portal/index.ts) — full CRUD, RBAC-gated |
| Content schema | New `PublicPortalContent` zod | [`PortalRecord`](../../packages/shared/src/schemas/portal.schema.ts) — `CreatePortalInput` covers hero, mission, sections enum, story scenes, before/after pairs, donation CTA, inquiry email, brand colour, data masking level |
| Front-end | New page | [`PublicPortalShell`](../../apps/web/src/features/portal/PublicPortalShell.tsx) renders the portal at [`/pages/PortalPage`](../../apps/web/src/pages/PortalPage.tsx) |

The Section 27 scaffold (`apps/api/src/routes/public-portal/index.ts`
+ `apps/web/src/features/public-portal/PublicPortalPage.tsx`) is a
no-op stub created by `scaffold-section.ts` against the manifest
slot. It does not call into the working portal stack — it just
returns `{ data: [], meta: { total: 0 } }` and a placeholder div.

## Decision space

### D1. What to do with the Section 27 stub

1. **Delete the stub route + page.** Section 27 in `featureManifest`
   stays (status remains `partial`) and points readers at the
   `portal/*` implementation via the manifest's feature keys. The
   manifest is the catalogue; Section 27 was never the
   implementation surface.
2. **Alias the stub.** Have `/api/v1/public-portal` 308-redirect to
   `/api/v1/portal/:shareToken` once a token resolves. Adds a code
   path that needs slug→token translation we don't otherwise need.
3. **Keep the stub as-is.** Costs a bytes-of-payload-per-request and
   a spot in the route table; communicates nothing.

**Recommendation: D1 / delete.** The stub is dead code and the
route prefix `/api/v1/public-portal` doesn't carry any clients. The
working surface is `/api/v1/portal` and that's where docs + clients
already point.

### D2. Cache layer (carried open from scoping ADR)

`portal/public.ts` hits PostgreSQL on every visitor request. A
single Hacker News spike would saturate the API connection pool.
The scoping ADR proposed CDN-cached static render (Next-style ISR
or rendered-to-blob).

This is a **real production concern but out of scope for this
consolidation ADR.** No public portal URL is live today; the
performance gap doesn't bite until first launch. Filing as an open
question for the launch-readiness ADR.

**Recommendation: defer to launch-readiness sprint.** Add an open
question + a TODO in `portal/public.ts` so the next eyes on it see
the gap. Don't ship caching infra speculatively.

### D3. Storage open question (carried open from scoping ADR)

The scoping ADR flagged: "Where do hero images live, and at what
tier?" Answer on disk: **portal config stores image URLs as
strings**. `BeforeAfterPair.beforeUrl/afterUrl` and (implicitly)
hero image URLs are externally hosted by the steward. The schema
makes no claim about storage tier.

**Recommendation: leave external-URL storage as the contract.**
First-party object storage (S3/blob) can land later if stewards
demand it; the schema doesn't need to change to support it
(`https://our-bucket/...` is a valid string). Punting cleanly.

### D4. Authn rate-limiting (mentioned in scoping ADR)

The scoping ADR mentioned "visitor-token rate-limit." The current
`portal/public.ts` has no rate limit; relies on the share-token
secret being non-guessable (UUIDv4) and `is_published` filter to
limit blast radius if a token leaks. Same trade-off the
launch-readiness sprint should revisit.

**Recommendation: not in this ADR.** Rate-limiting is a Fastify
plugin concern (`@fastify/rate-limit`) and applies to many routes,
not just portal. Out of scope.

## Consequences

**Positive.**
- Removes ~20 LOC of dead stub code from the API and web surfaces.
- Eliminates the misleading "P4 not implemented yet" signal — P4
  has been on disk since migration 004 (April).
- Clears the 8.3-A item from the Phase 8 backlog without ambiguity.

**Negative.**
- Section 27's stub URL `/api/v1/public-portal` is removed. Anyone
  who was going to call it (no one) needs to use `/api/v1/portal/:shareToken`.
- The scoping ADR's open questions (cache, rate-limit) remain open
  but now sit in `portal/public.ts` TODOs and the launch-readiness
  backlog rather than the 8.3-A slot.

**Neutral.**
- `featureManifest` Section 27 unchanged. The manifest already
  marks `public-landing-page` as `done` — accurate.
- The `LATENT`/`MT` per-project gate work from 8.3-B/C does not
  apply here. Portal sharing is per-portal (per-project, since
  `project_portals` has a unique-on-project constraint), via
  `share_token` + `is_published`, not via the phase-gate plugin.

## Implementation slicing

Single PR (this commit):
1. Delete `apps/api/src/routes/public-portal/` and its registration
   in `apps/api/src/app.ts`.
2. Delete `apps/web/src/features/public-portal/PublicPortalPage.tsx`,
   `index.ts`, and any route mounting them.
3. Add a TODO in `apps/api/src/routes/portal/public.ts` calling out
   the cache + rate-limit gaps for the launch-readiness sprint.
4. Update [`2026-05-02-phase-gated-future-routes-scoping.md`](2026-05-02-phase-gated-future-routes-scoping.md)
   status: D3 (8.3-A) accepted via this ADR.

## Open questions (carried forward)

- **Cache layer.** First public URL launch needs a caching strategy
  (CDN, ISR, or rendered-to-blob). Track in launch-readiness
  backlog. Not gating this ADR.
- **Visitor rate-limit.** Same — gate at launch-readiness, not here.
- **Steward-side editor surface.** The `portal/index.ts` write
  routes exist; whether the steward UI's `PortalConfigPanel`
  exposes every `CreatePortalInput` field is a separate audit. Out
  of scope for this consolidation.

## References

- Existing portal stack:
  - [`apps/api/src/routes/portal/public.ts`](../../apps/api/src/routes/portal/public.ts)
  - [`apps/api/src/routes/portal/index.ts`](../../apps/api/src/routes/portal/index.ts)
  - [`apps/api/src/db/migrations/004_project_portals.sql`](../../apps/api/src/db/migrations/004_project_portals.sql)
  - [`packages/shared/src/schemas/portal.schema.ts`](../../packages/shared/src/schemas/portal.schema.ts)
  - [`apps/web/src/features/portal/PublicPortalShell.tsx`](../../apps/web/src/features/portal/PublicPortalShell.tsx)
- Dead stub being removed:
  - `apps/api/src/routes/public-portal/index.ts`
  - `apps/web/src/features/public-portal/`
- Related ADRs:
  - [`2026-05-02-phase-gated-future-routes-scoping.md`](2026-05-02-phase-gated-future-routes-scoping.md) (D3)
  - [`2026-05-02-section-response-envelope.md`](2026-05-02-section-response-envelope.md) — envelope pattern the stub used; `portal/public.ts` doesn't need it because it returns a domain object directly.
