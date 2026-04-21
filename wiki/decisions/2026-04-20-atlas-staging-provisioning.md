# 2026-04-20 -- Atlas Staging Environment Provisioning Plan

**Status:** Parked 2026-04-21 — no external trigger, revisit when one emerges
**Original status:** Proposed (no infrastructure provisioned yet)

> **Parked 2026-04-21.** Considered execution after Sprint BY landed. Declined
> on three grounds: (1) no concrete audience for a staging URL yet — dev loop
> is fine on localhost; (2) CC BY-NC-SA 3.0 IGO NC clause means any public URL
> needs auth/robots gating, so "staging-for-me" is just an expensive localhost;
> (3) $25/mo recurring commitment without a trigger is premature. **Revisit
> when:** (a) an external viewer (investor, CSRA prospect, collaborator) needs
> to click a URL, (b) a feature lands that requires non-local validation (CORS
> against real web domain, shared state across devices, multi-user auth), or
> (c) `atlas.ogden.ag` production launch is within 4 weeks and staging becomes
> a launch-rehearsal dependency. Until then, keep shipping against localhost
> and let the GAEZ manifest live in `apps/api/data/gaez/cog/` only.
**Context:** Sprint BV landed the GAEZ v4 self-hosting code. Shipping it
"to staging" is blocked because Atlas has no staging environment today --
no deploy target, no S3 bucket for COGs, no DNS entry, no CI deploy job.
This doc scopes what a minimum-viable staging env looks like so GAEZ (and
future data-layer work) can be exercised against something closer to prod
before `atlas.ogden.ag` goes live.

---

## Goals

1. A long-running URL where the full Atlas stack (web + API + Postgres +
   Redis + S3) runs against real data, reachable from the operator's
   browser for manual QA.
2. Real-data validation of the GAEZ pipeline: ingest 96 COGs once,
   upload to S3, point `GAEZ_S3_PREFIX` at it, confirm byte-range reads
   from the HTTPS backend work as designed.
3. Low-enough cost to leave running continuously ($20-60/mo ceiling).
4. Non-commercial posture preserved -- staging is internal, not a
   product surface, so CC BY-NC-SA 3.0 IGO remains unviolated until
   the separate launch-checklist legal review.

## Non-Goals

- Production traffic handling (autoscaling, multi-region, CDN tiers).
- Zero-downtime deploys.
- Full observability stack (basic logs + health checks are enough).

---

## Shape

```
              atlas-staging.ogden.ag (Cloudflare DNS)
                         |
                         v
              +----------+-----------+
              |  Fly.io app (api)    |
              |  - Fastify + Node 20 |
              |  - 1 shared-cpu-1x   |
              |  - 512 MB RAM        |
              +----------+-----------+
                         |
            +------------+--------------+
            |                           |
            v                           v
     +------+-------+           +-------+-------+
     | Fly Postgres |           |  Fly Redis    |
     | shared-1x   |           |  shared-1x     |
     | (managed)    |           |  (managed)    |
     +--------------+           +---------------+

              atlas-web-staging.ogden.ag
                         |
                         v
           +-------------+-------------+
           |  Cloudflare Pages         |
           |  - Vite SPA build          |
           |  - Env: VITE_API_BASE=...  |
           +----------------------------+

              gaez-staging.ogden.ag (CloudFront)
                         |
                         v
           +-------------+-------------+
           |  S3 bucket                |
           |  ogden-atlas-staging-geo  |
           |   gaez/v4/*.tif (96 COGs) |
           |  - Public read            |
           |  - Cache-Control immutable|
           +---------------------------+
```

## Key choices + why

- **Fly.io for API + DB + Redis.** Single-provider managed Postgres + Redis
  + Node app with a global-ish footprint. Roughly $15-25/mo at our scale.
  Alternative (Railway, Render) is fine; Fly picked for its `fly.toml`
  deploy-from-git simplicity and the fact that Postgres + Redis live in the
  same place as the API, minimizing egress.
- **Cloudflare Pages for web.** Free tier, trivial `npm run build` deploy
  from the monorepo. Works for SPA + custom domains.
- **AWS S3 + CloudFront for GAEZ COGs.** `geotiff.js` issues HTTP range
  requests; CloudFront handles those with no config. Staging bucket is
  deliberately separate from any eventual prod bucket so smoke data can't
  leak. Cost: ~$1/mo storage + near-zero bandwidth at our staging volume.
- **DNS via Cloudflare.** `ogden.ag` zone assumed already there. Three CNAME
  records added: `atlas-staging`, `atlas-web-staging`, `gaez-staging`.

---

## Phased plan

### Phase 1 -- Infrastructure (one-time, ~2-3 hours)

1. Create Fly app `ogden-atlas-api-staging`; attach `fly-postgres` + `fly-redis`.
2. Write `apps/api/fly.toml` + `apps/api/Dockerfile` (node 20, `pnpm install`,
   `pnpm run build`, run `dist/server.js`).
3. Create S3 bucket `ogden-atlas-staging-geodata` in us-east-1. Public read
   ACL on `gaez/v4/*`. Attach CloudFront distribution.
4. Create Cloudflare Pages project pointing at the repo, root `apps/web`,
   build command `pnpm --filter @ogden/web run build`, output `apps/web/dist`.
5. DNS:
   - `atlas-staging.ogden.ag` -> Fly app
   - `atlas-web-staging.ogden.ag` -> Cloudflare Pages
   - `gaez-staging.ogden.ag` -> CloudFront distribution
6. Secrets:
   - Fly: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`,
     `GAEZ_DATA_DIR=/app/data/gaez/cog`, `GAEZ_S3_PREFIX=https://gaez-staging.ogden.ag/v4/`.
   - Cloudflare Pages: `VITE_API_BASE=https://atlas-staging.ogden.ag`.

### Phase 2 -- GAEZ ingest + upload (one-time, ~30 min compute + ~1 hour download)

Driven locally on the operator machine:

1. Run Option B (single-raster smoke) first to validate the pipeline end-to-end.
2. Download the remaining 94 rasters from `gaez.fao.org/Gaez4/download`.
3. Run `gaez-ingest-preflight.ps1 -PrintChecklist` until all 96 present with
   valid names.
4. `pnpm --filter @ogden/api run ingest:gaez` -- produces 96 COGs + manifest.
5. `aws s3 sync apps/api/data/gaez/cog/ s3://ogden-atlas-staging-geodata/gaez/v4/`.
6. Invalidate CloudFront: `aws cloudfront create-invalidation ... --paths '/v4/*'`.

### Phase 3 -- Deploy + verify (~30 min)

1. `fly deploy --config apps/api/fly.toml` (or push to main if Fly has a
   GitHub Action wired).
2. `curl https://atlas-staging.ogden.ag/api/v1/health` -> 200.
3. `curl 'https://atlas-staging.ogden.ag/api/v1/gaez/query?lat=42&lng=-93.5'`
   -> `{ data: { fetch_status: 'complete', summary: { best_crop: ..., ... } } }`.
4. Load `https://atlas-web-staging.ogden.ag`, create a test project, drop a
   point on Iowa, confirm the GAEZ panel section renders real suitability
   data.

### Phase 4 -- Handback (~15 min)

1. Append a `wiki/entities/staging-environment.md` page documenting the
   provisioned resources + their endpoints (no secrets).
2. Update `wiki/entities/atlas-platform.md`'s "Launch Blockers" to reflect
   staging-live status.
3. Commit `fly.toml` + `Dockerfile` + GitHub Action (if any).

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CC BY-NC-SA 3.0 IGO violation via public staging URL | Med | High | Staging is password-protected (Cloudflare Access or basic auth) OR robots-excluded + not linked from any public surface until launch-checklist legal review completes. |
| Fly free tier hits resource ceiling on full Atlas stack | Med | Low | Upgrade to paid tier (~$5-10/mo delta); or cheaper: schedule Fly to `fly scale count 0` overnight. |
| GAEZ 96-COG upload exceeds free S3 PUT quota | Low | Low | One-time hit -- S3 PUT pricing is $0.005/1000 ops, 96 ops = negligible. |
| `geotiff.js` fromUrl behind CloudFront misbehaves due to range-request caching | Med | Med | Validated during Option B smoke. If broken: either disable CloudFront range-caching, or set `Cache-Control: public, max-age=31536000, immutable` + `Accept-Ranges: bytes` headers on S3 objects explicitly. |
| Staging domain pollution of ogden.ag SEO | Low | Low | `robots.txt` disallow-all on staging subdomains. |

---

## Decision deferred

This doc **scopes** the work but does not commit to executing it. The
operator should decide:

- **Commit now:** Allocate ~4-6 hours of operator time + ~$25/mo recurring
  to stand up staging. Gets GAEZ really live.
- **Defer:** Continue mock-validating new features; accept that real-data
  bugs surface only at prod launch. Fine while the codebase is still
  pre-launch + the feature velocity is high.
- **Partial (recommended):** Execute Option B (single-raster local smoke)
  first, which is zero-infrastructure + validates the highest-risk slice.
  Revisit this full plan once a second real-infrastructure need (prod DNS,
  production DB, Stripe integration, etc.) triggers the same need and can
  amortize the setup.

---

## Follow-ups once landed

- Wire a GitHub Action to `fly deploy` on every push to `main`.
- Add a staging smoke job to CI that hits `/api/v1/gaez/query?lat=42&lng=-93.5`
  post-deploy and fails the pipeline if `fetch_status !== 'complete'`.
- Extend `wiki/LAUNCH-CHECKLIST.md` with a "staging vs prod divergence
  audit" item so we don't silently drift.
