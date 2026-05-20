# 2026-05-04 — Phase 8.3-A: P4 public-portal Section 27 consolidation


Picked up the deferred 8.3-A item from this morning's Phase 8 batch. The
Phase 8.3 scoping ADR proposed a fresh P4 build (new `project.published_at`
column, visitor token, `PublicPortalContent` schema, cache layer). Survey of
the actual code surface showed all of that intent is already implemented under
a different prefix:

- `apps/api/src/routes/portal/public.ts` — share-token-keyed unauthenticated read, filters on `is_published = true`
- `apps/api/src/routes/portal/index.ts` — RBAC-gated steward CRUD
- `apps/api/src/db/migrations/004_project_portals.sql` — `is_published` + `published_at` + per-portal `share_token` UUID
- `packages/shared/src/schemas/portal.schema.ts` — `PortalRecord` covers hero, mission, sections, story scenes, before/after pairs, donation CTA, brand colour, data masking level
- `apps/web/src/features/portal/PublicPortalShell.tsx` — front-end render

Section 27's `apps/api/src/routes/public-portal/index.ts` and
`apps/web/src/features/public-portal/PublicPortalPage.tsx` were the no-op
scaffold-section stubs returning `{ data: [], meta: { total: 0 } }` and a
placeholder div — dead duplication of the working stack.

**Action.** Deleted both stub directories; removed the import + `app.register`
line at `apps/api/src/app.ts` (renamed Batch 7 comment to §§24, 28, 29 with a
pointer to portal/*); added a TODO block at the top of
`apps/api/src/routes/portal/public.ts` capturing the cache + rate-limit gaps
(D2 + D4) for the launch-readiness sprint.

ADRs:
- [`wiki/decisions/2026-05-04-p4-public-portal-section27-consolidation.md`](decisions/2026-05-04-p4-public-portal-section27-consolidation.md) — Accepted
- [`wiki/decisions/2026-05-02-phase-gated-future-routes-scoping.md`](decisions/2026-05-02-phase-gated-future-routes-scoping.md) — Status promoted to Accepted (D3 closed via the consolidation ADR above)

**Build verify.** `apps/api` tsc clean except the pre-existing
`projects/index.ts:117` spread error documented this morning. `apps/web` shows
no errors involving public-portal — clean delete.

**Deferred to launch-readiness sprint:**
- Cache layer in front of `portal/public.ts` (CDN/ISR/blob render).
- Visitor rate-limit (`@fastify/rate-limit` plugin scope, not portal-specific).
- Steward UI audit: whether `PortalConfigPanel` exposes every `CreatePortalInput` field.
