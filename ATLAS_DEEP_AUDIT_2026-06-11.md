# ATLAS DEEP AUDIT — 2026-06-11

**Scope:** Comprehensive pre-testing scan of OLOS for (1) workflow / architecture / UI friction points and (2) missing content, incomplete references, and inconsistencies.
**Mode:** Report-only (operator decision) — no source, config, or git-index changes were made in this session. Fixes are filed as a prioritized backlog below.
**Method:** Three parallel exploration passes (friction; content & cross-reference integrity; consistency & hygiene), followed by firsthand verification of every High/contested claim. Branch: `main` (6 commits ahead of origin, unpushed). Four uncommitted files are foreign WIP from a parallel session and were left untouched.

---

## 1. Executive Summary

The codebase is in substantially better shape than a cold audit would predict. **Zero High-severity unknown defects were found.** No broken imports, no web↔API contract drift, no shared-package duplication, catalogues complete for all 15 project types, tests hardened against the known Windows vitest hang, all 8 feature flags gated off-by-default, and 21 of 24 findings from the three prior audits (04-14, 04-19, 04-21) are resolved with no regressions.

The genuinely open items reduce to:
- **One documented pre-launch blocker** (public portal cache + rate-limit, already deferred by decision to the launch-readiness sprint).
- **Two real medium gaps**: `observeCycleStore` never bootstraps from the server (multi-device staleness), and the SocialFabric / InfraCondition captures planned for port from `claude/phase-3d` are still absent on main.
- **Repo hygiene debt**: 18 tracked files that match ignore patterns (≈400 KB of scholar caches, dump/scan scripts, tsc output).
- **One stale session memory** (the "plan gate unbound for typed projects" claim) — corrected this session; the gate is live.

---

## 2. Healthy Systems (verified, no action)

| System | Evidence |
|---|---|
| Import graph | No missing/broken imports in apps/ or packages/ source; all shared re-exports resolve. |
| Web↔API contract | Sampled client calls (projects, boundary, design-features, layers refresh, gaez/soilgrids catalogs, ai/enrich) all match registered Fastify routes; Zod + strict TS guard shapes on both sides. |
| Shared package | `@ogden/shared` is the single source of truth (scoring types, `Country`, `ADAPTER_REGISTRY`, `OBJECTIVE_ACT_TOOLS_OVERRIDE`); no diverged local copies in apps/web. |
| Objective catalogues | All 15 project types encoded (13 primary + residential/nursery secondary-only); index.ts registers every catalogue; no empty stubs. |
| Protocol catalogues | All 15 types present with ≥2 protocols (universal: 21); patch `targetTemplateId` refs resolve to real universal protocol ids. |
| Amanah encoding | CSA / meat-share / season-pass objectives (MGD-S1.4, MGD-S1.6, LVS-S7.7, AG-S4.8) carry verbatim refs + Amanah scopeNotes; no silent omissions. |
| Act tool chain | 63 catalogue entries all armable; `actToolCoverage.test.ts` ratchets objective→tool coverage across 11 wired types; map-tool ids verified against ObserveDrawHost/PlanDrawHost dispatch. |
| **Dependency gate** | **LIVE.** `packages/shared/src/constants/plan/catalogues/authoring.ts:198` applies `STRATUM_PREREQS[stratumId]` to every objective by default (explicit `[]` required to opt out); `buildActLockContext` in `apps/web/src/routes/index.tsx:155-180` enforces it with route-guard redirects. The earlier "typed projects never lock" finding is **obsolete** — see §6. |
| Act→Observe handoff | `fieldActionStore.appendObserveFeedFor` → `routeToObserveFeed` → `observeFeedStore` wired and tested; v1→v2 stratum-spine migration (`t→s`) idempotent. |
| Routing | Legacy 7-stage routes redirect cleanly via `beforeLoad` (no dead ends); legacy components preserved on disk per no-deletion policy; `ActFieldActionLayout` kept as reversible fallback. |
| Test health | Both vitest configs use `pool: 'forks'`, 15s test / 10s teardown timeouts, force-exit reporter; CI runs web tests with 10-min step / 15-min job backstops. ~880 tests across api/web/shared; no skipped suites. |
| Build config | `tsconfig.base.json` strict (+`noUncheckedIndexedAccess`, `noImplicitOverride`) inherited uniformly; TS 5.6 / React 18.3 / Vite 6 — no skew; tsc 0 errors. |
| Feature flags | All 8 (`FEATURE_TERRAIN_3D` … `FEATURE_PUBLIC_PORTAL`) off-by-default and guarded (`packages/shared/src/constants/flags.ts`). |
| Foreign WIP diff | The 4 uncommitted files form one coherent guild-tool feature: `actToolCatalog.ts` adds `guild` (→ `plan.plant-systems.guild`, pre-existing in PlanDrawHost/PlanTools); `objectiveActTools.ts` adds `'guild'` to `orch-s5-guild-plan` + `orch-sec-s5-guild-layout`; `DesignElementLayers.tsx` adds the `keepAbovePrefix` prop + re-stacking; `ActTierShell.tsx` passes `keepAbovePrefix="plan-data-"`. No missing counterpart edits. |

---

## 3. Prioritized Backlog

### P1 — Pre-launch blockers / quick wins

| # | Finding | Location | Consequence | Fix |
|---|---|---|---|---|
| 1 | Public portal lacks cache + rate-limit (documented deferral: wiki decision 2026-05-04 §27, D2+D4 → launch-readiness sprint) | `apps/api/src/routes/portal/public.ts:7` | Every visitor request hits PostgreSQL; one traffic spike saturates the pool; leaked share token has unbounded blast radius | CDN/ISR-style cached render + `@fastify/rate-limit` **before any public URL** |
| 2 | 18 tracked junk files matching ignore patterns (7 `.scholar-*`, 7 root `_dump_*`/`_scan_*` scripts, 4 `apps/web/tsc_stratum*.txt`; ≈400 KB) | repo root + apps/web | Bloats clones, confuses contributors; `.gitignore` rules exist but files predate them | `git rm --cached` the 18 + commit |
| 3 | fast-jwt CVE-2023-48223 (algo confusion) unverified — `@fastify/jwt ^9.0.1` relies on transitive resolution to fast-jwt ≥6.2.1 | `apps/api/package.json` | Potential auth-bypass class if an old version resolves | Run `pnpm audit`; wire into CI |
| 4 | `@scalar/fastify-api-reference` declared but never registered — no docs endpoint exists | `apps/api/package.json` / `app.ts` | Dead dep; misleads that OpenAPI docs are available | **Operator decision 2026-06-11: WIRE the docs endpoint** (~3-5 lines in app.ts) in a later session — do not remove the dep |

### P2 — Real gaps, medium effort

| # | Finding | Location | Consequence |
|---|---|---|---|
| 5 | `observeCycleStore` never bootstraps from server — localStorage-only hydration | `apps/web/src/store/observeCycleStore.ts:87-112` | Multi-device editing stamps stale cycle ids onto observations; Temporal layer misaligns. Fix: fetch cycle state in `useV3Project` project-load path |
| 6 | wsService project-switch re-fetch TODO | `apps/web/src/lib/wsService.ts:302` | Switching active project mid-session may leave stale site data from the previous project |
| 7 | SocialFabric / InfraCondition captures unported from `claude/phase-3d` (planned per 2026-06-10 line decision) | absent on main; no dangling refs | Planned Act capture coverage missing; port is a clean add (nothing references them yet) |
| 8 | ClaudeClient `generateSiteNarrative` / `generateDesignRecommendation` implemented + tested but uncalled | `apps/api/src/services/ai/ClaudeClient.ts` | AtlasAI panel can't produce narratives/design recs server-side; needs a route or BullMQ job |

### P3 — Known / deferred, keep visible

| # | Finding | Location / Note |
|---|---|---|
| 9 | ProtocolModePanel renders `mockProtocols.js`, not `resolveProjectProtocols()` — intentional Phase D1; the real resolver IS wired into the standalone Protocols Dashboard (`useProtocolLibrary`). **Do not re-unify** Act trigger sources with protocol catalogues — divergence is by design | `apps/web/src/v3/plan/spine/ProtocolModePanel.tsx:28-29` |
| 10 | `FEEDS_TO_OBJECTIVE` reverse routing (protocol breach → sourcing objective) not implemented; deferred to T2.1 | `packages/shared/src/constants/protocol/deviationPolicy.ts:48` |
| 11 | `RegenerationMonitorCard` references future `/api/v1/projects/<id>/regeneration-events` endpoint — comment-only, not a live fetch path | `apps/web/src/features/plan/RegenerationMonitorCard.tsx:25` |
| 12 | Old H5 backlog still open: US county zoning mocked (Ontario municipal done), fuzzy MCDM (`fuzzyMCDM.ts`) unintegrated into shared scorer, placeholder `costDatabase.ts` feeding investor PDFs | `apps/web/src/lib/` |
| 13 | `stratum-web-codemod.mjs` (2026-05-30 stratum rename utility) — status unclear; document or archive | repo root |
| 14 | Solar sector southern-hemisphere gap; GuildTool bounds-derived UV projection TODO | `apps/web/src/lib/sectors/solar.ts:7,61`; `apps/web/src/v3/plan/draw/tools/GuildTool.tsx:77` |
| 15 | ~23 labeled "coming soon" UI placeholders (21 in `apps/atlas-ui/src/pages/`, 2 in v3 Act BoundaryCapture) — intentional deferred features, no error paths | various |
| 16 | ProtocolModePanel "Open in Act →" / "derived from Tier 5 ▸" affordances are presentational stubs (labeled prototype surface) | `ProtocolModePanel.tsx:8-12` |
| 17 | `_wt_prerender/`, `.scholar-rings-*`, `_t_regenstore.txt`, dev logs — correctly ignored working-tree clutter; periodic manual sweep only | repo root |

---

## 4. Prior-Audit Follow-Through

| Audit | Findings | Resolved | Still open |
|---|---|---|---|
| ATLAS_DEEP_AUDIT.md (04-14) | 11 | 9 | fuzzy MCDM integration (P3.12), cost DB (P3.12) |
| 2026-04-19 | 6 | 5 | Scalar docs dep (P1.4) |
| 2026-04-21 | 7 | 6 | AI methods uncalled (P2.8) |

No regressions detected against any previously-resolved item. The zoning item is partially resolved (Ontario live 2026-04-22; US county still mocked → P3.12).

---

## 5. Friction Assessment (UX / workflow)

- **No invisible dead ends found.** Empty states have paths forward; disabled affordances are labeled prototype.
- **Navigation**: v3 intentionally drops the legacy left sidebar; Plan/Act/Observe switching is header/URL-driven ("self-railed" stages, `V3ProjectLayout.tsx` + `DecisionRail.tsx`). By design — monitor steward discoverability feedback rather than re-adding chrome.
- **Mock-vs-live**: production surfaces (Plan canvas, Act tier-shell, Observe lens) are all live-store-backed; mock bundles confined to debug routes (`/v3/prototype/observe-lens`) and the labeled ProtocolModePanel prototype.
- **Stores**: clean single-domain separation across `observeFeedStore` / `observeDataPointStore` / `fieldActionStore` / `planStratumProgressStore` / `designElementsStore`; the only persistence gap is P2.5 (cycle store).

---

## 6. Correction of Record

The session memory **"Plan gate unbound for typed projects"** (claim: `authoring.ts:139` hardcodes empty prereqs; typed projects like MTC never hard-lock) is **obsolete**. Current `authoring.ts` (`obj()`, line 198) defaults every catalogue objective to `[...STRATUM_PREREQS[input.stratumId]]`; only an explicit `prerequisiteObjectiveIds: []` opts out, and the `STRATUM_PREREQS` invariant (universal-ids-only, enforced by `spineGate.conformance.test.ts`) prevents silent forever-locks. The Act route guard enforces the gate with redirects. Memory corrected 2026-06-11.

---

## 7. Post-audit corrections & resolution log (2026-06-11 fix session)

The same-day fix session executed the P1–P2 backlog and re-verified each finding firsthand before acting. Three findings turned out to be stale or false; they are corrected here so the backlog above is read against this log, not at face value.

### P1

| # | Status | Detail |
|---|---|---|
| 1 | **RESOLVED** (commit `34919805`) | Per-route `@fastify/rate-limit` overrides (60/min public JSON, 10/min PDF — env-tunable via `PORTAL_PUBLIC_RATE_LIMIT_MAX` / `PORTAL_PDF_RATE_LIMIT_MAX`) + best-effort Redis cache (`portal:v1:<token>`, 5-min TTL, 200 ms timeout, silent failure, **no negative caching**) with explicit awaited invalidation from all three portal mutations. PDF route deliberately uncached (`no-store`; unpublish stays immediate). 24/24 portal + portalCache tests green. **Still open from D2:** the CDN/ISR half remains a separate launch item; `trustProxy` is unset — behind a reverse proxy all visitors share one IP bucket (pre-launch follow-up, affects the global limiter equally). |
| 2 | **RESOLVED** (commit `c861bf08`, out-of-band task session) | 18 junk files untracked. |
| 3 | **RESOLVED** (commits `da54f252`, `aebb284f`) — **and the finding's CVE claim corrected** | The audit cited CVE-2023-48223 (affects fast-jwt <3.3.2 — did **not** apply). The actual `pnpm audit` showed `@fastify/jwt ^9.0.1` resolving fast-jwt **5.0.6**, vulnerable to **three criticals**: GHSA-mvf2-f6gm-w987, GHSA-rp9m-7r4c-75qg, GHSA-gmvf-9v4p-v8jc. Fixed by `@fastify/jwt ^10.1.0` → fast-jwt 6.2.4; full API suite 722 passed. CI gate added: `pnpm audit --prod --audit-level high`. Deferred residue (documented, not red in CI): vitest v2→v3 major, serialize-javascript dev-chain high, 3 pinned prod moderates (maplibre-gl→protocol-buffers-schema, bullmq→uuid, @aws-sdk→fast-xml-parser). |
| 4 | **FINDING WAS FALSE** — real bug fixed (commit `c2f12f08`) | Scalar has been registered since 04-11 (`app.ts:419-427`, dev-only, `/api/docs`). The dep was never dead; the actual defect was the spec path (`'../../openapi.yaml'` resolved outside the package). Fixed to `'../openapi.yaml'`. |

### P2

| # | Status | Detail |
|---|---|---|
| 5 | **FINDING WAS FALSE** — nothing to build | `observeCycleStore` **is** server-synced: registered for typed-record sync at `syncManifest.ts:870` (`recordKeyedMap('currentCycleId')`); `hydrateTypedRecords` bootstraps it per-project on load; WS `record_upserted` applies multi-device updates. localStorage is the offline-first layer, not the only hydration. Flag-gated (`MULTI_USER`) by design. No stale-cycle-id corruption path exists when sync is on. |
| 6 | **RESOLVED** (commit `911059ec`) | `layer_complete` WS bursts now coalesce via a per-project 2 s trailing debounce into one `siteDataStore.refreshProject` call for the connected project; pending refreshes cancel on connect/disconnect. Centroid/bbox derivation extracted to a shared pure helper (`siteFetchArgs.ts`). 6/6 unit tests green. |
| 7 | **DEFERRED** (operator decision this session) | SocialFabric / InfraCondition port gets its own session (phase-3d archaeology + fiqh content decisions). |
| 8 | **FINDING WAS PARTIALLY STALE** — residual gap resolved (commit `a9adc990`) | Since commit `96f69390` both methods ARE called by the `narrative-generation` BullMQ worker (post-Tier-3 hook → `ai_outputs` → GET route). The residual on-demand gap is now closed: `POST /ai/project/:projectId/generate-outputs` (auth + RBAC, 503 unconfigured, 5-min freshness debounce unless `force`); web `aiEnrichment` narrative/recommendation rewired to it, deleting the duplicated client-side prompts (the drift `NarrativeContextBuilder.ts` warns about). 8/8 route tests green. |

### P3 (document-only, operator decision: all are intentional phase deferrals — no phase-jumping)

- **#13 closed:** `stratum-web-codemod.mjs` is the **completed one-shot** 2026-05-30 `t→s` stratum-rename codemod; it already ran across apps/web (the rename is long merged). Retained at repo root for history per no-deletion policy. Not pending work.
- #9–12, #14–17 stand as written: phased deferrals with owners in their respective backlogs (T2.1, Phase D2, launch-readiness, H5).

---

*Audit conducted 2026-06-11 (Claude Code). Predecessors: ATLAS_DEEP_AUDIT.md (04-14), ATLAS_DEEP_AUDIT_2026-04-19.md, ATLAS_DEEP_AUDIT_2026-04-21.md. Resolution log appended same-day by the fix session.*
