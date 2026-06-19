# OLOS / Atlas — Deep Pre-Launch Audit

**Date:** 2026-06-19
**Project:** OLOS (atlas submodule — `onaxyzogden/atlas`)
**Trigger:** Operator request — before any live testing, a comprehensive read-only scan across two axes: **(A) friction** in workflow / architecture / UI, and **(B) missing content, incomplete references, inconsistencies.**
**Method:** Two adversarial sweeps (friction sweep `wd6by3hax`; content-integrity sweep `wxn4a8w8v`) + a completeness critic, followed by **firsthand source verification of every load-bearing claim**. Nothing in this report is taken on a sub-agent's word alone.
**Health baseline at audit time:** 222/222 targeted ceremony tests pass; web typecheck = 4 documented test-only baseline errors + 2 new test-only `TS2532` (in the uncommitted WIP, fixed in remediation Phase 7). No production-code type errors.

---

## How to read this report

Each finding carries a severity, a one-line statement, the **firsthand evidence** (file + line) that confirms it, and where relevant the **adversarial verdict** — because two of the highest-rated machine findings were *downgraded* once a human-grade read was applied. Severity is calibrated to **pre-launch impact**, not abstract code smell.

The companion remediation plan (`before-we-proceed-with-whimsical-pine.md`) turns F1–F15 + F17 into staged fixes; F16 is an accepted deferral (tracked, not fixed).

---

## Adversarial verdicts — the two HIGH claims, both downgraded

The completeness critic rated two findings **HIGH**. Both fell on firsthand inspection. Recording the disproof matters as much as the findings, because it shows where machine severity over-fired.

### C1 — "Hydration race in the route loader" → **downgraded HIGH → Low**
- **Claim:** the Threshold-3 route loader reads an async-IndexedDB store synchronously in `beforeLoad`, so a hard refresh on a locked objective could mis-route before hydration.
- **Firsthand check:** `apps/web/src/store/actMandateStore.ts`. The route-context read (`isObjectivePlanLocked`) is the **non-React route-loader seam** and is **deliberately not a redirect backstop** — its own comment says so. The *real* enforcement is the reactive hook `useObjectivePlanLock(projectId, objectiveId)`, which **self-corrects on hydration**: the Act loop never freezes on a cold read, and the lock re-asserts once IDB settles.
- **Residual (real, but Low):** a brief stale-flag flash window and a stale code comment. No mis-route, no data risk.

### C2 — "Multi-device sync clobbers the append-only concern log" → **downgraded HIGH → Medium/systemic**
- **Claim:** concurrent offline edits to the append-only `PlanConcern[]` governance log lose one device's writes on reconcile.
- **Firsthand check:** `apps/web/src/lib/syncManifest.ts:288-300`. The `byKey` applier does a **whole-bucket Last-Writer-Wins replace** (`rec[pid] = incoming ?? empty`) with **no id-union/merge**. So the clobber is **real**.
- **Why downgraded:** it is **not a Threshold-3 regression**. It is a **pre-existing property of the shared blob transport** that ~8 client-only stores already ride. The governance logs are simply the most *sensitive* riders. → tracked as **F8**, fixed proportionately (merge-by-id for the three governance riders only), not as an emergency.

**Lesson reinforced:** machine "HIGH" is a prompt to verify, not a verdict. Both HIGHs were structurally informed but missed a deliberate seam (C1) or mis-scoped the blast radius (C2).

---

## Findings

| # | Severity | Finding | Primary evidence |
|---|---|---|---|
| F1 | **Med-High** (pre-launch) | `trustProxy` unset → per-IP portal rate-limit collapses to **one shared bucket** behind nginx — ineffective *and* a self-DoS vector. Already self-documented as a "pre-launch follow-up." | `apps/api/src/routes/portal/public.ts:17-18`; rate-limit registrations at `:56`, `:117` |
| F2 | **Medium** | `apps/api/.env.example` **bidirectional drift**: documents 8 dead `FEATURE_*` flags (0 reads); omits the 4 real flags `featureGate.ts` reads + many real `config.ts` vars. | `apps/api/.env.example:27-35`; `apps/api/src/plugins/featureGate.ts:35,41,48`; `apps/api/src/lib/config.ts` |
| F3 | **Low-Med** | `apps/web/.env.example` omits `VITE_ATLAS_TELEMETRY_ENABLED` (~9 readers, privacy-relevant) + `VITE_OLOS_FORMAL_PROOF_ENABLED`. | `apps/web/.env.example`; `olosFlags.ts:31`; `actInteractionLog.ts:50`, `clientErrorLog.ts:45`, et al. |
| F4 | **Low-Med** | **"Checkpoint" terminology collision**: switcher eyebrow renders bare "Checkpoint" directly above a "Threshold N — …" title, while `checkpoint` *already* means the cyclical-review reopened objective in `ObjectiveCard`. Same word, two meanings. | `ActTierStratumSwitcher.tsx:89-93`, test pin `:147` |
| F5 | **Medium** | Switcher dropdown has **no Escape / no outside-click dismissal** + a11y focus/ARIA gaps; inconsistent with `StratumLockedPopover`, which has both. | `ActTierStratumSwitcher.tsx:77,98-110` vs `StratumLockedPopover.tsx:70-84` |
| F6 | **Medium** | Threshold-2 reachable before Tier 3/4 design is complete → "wall of open gaps"; `COHERENCE_COPY.intro` **falsely** asserts design "has been completed across Tiers 3 and 4"; `coherenceProgress` is computed but **never consumed**. | `CoherenceCheckSurface.tsx`; `realityCheckModel.ts`/coherence copy; `routes/index.tsx:753-766` |
| F7 | **Medium** | No breadcrumb from "Raise a concern" to where review happens; from the Act stage, no pointer to the locked-objective escape path. | `ObjectiveDetailPanel.tsx:399-403`; `ActMandateSurface.tsx:352`; `ActTierShell.tsx` |
| F8 | **Medium / systemic** | Append-only governance logs (`ogden-plan-concerns`, coherence `amendments`, mandate `objectiveOverrides`) ride **whole-bucket LWW** blob sync; concurrent offline edits across devices lose one side. Pre-existing, recoverable. | `syncManifest.ts:288-300, :1016-1027` |
| F9 | **Low-Med** | T1 Phase-2 **zero-element** state shows "0 of 0 elements classified. Classify every element…" with nothing to classify. | `ThresholdDirectionPhase.tsx:180-184` |
| F10 | **Low** | `REALITY_CHECK_COPY.notList` defined but **never rendered** on T1, while T2/T3 render their equivalents. | `realityCheckModel.ts:150-156` |
| F11 | **Low-Med** | Reception **Save disabled with no required-field signal**; required/min never visually marked. | `VisionFormsTabsModal.tsx:327-349,399-407`; `VisionFormFields.tsx:182-262` |
| F12 | **Low** | `ActMandateReferenceRail` has **no test** (T1 + T2 rails do); untested load-bearing Amanah-advisory rail. | `apps/web/src/v3/plan/threshold/ActMandateReferenceRail.tsx` |
| F13 | **Low-Med** | `progressTracking` has **no presence ratchet** in `catalogues.test` (`monitoringProtocol` is fully ratcheted). | `packages/shared/src/constants/plan/__tests__/catalogues.test.ts` |
| F14 | **Low** (latent) | Ceremony stores pin `version:1` with no `migrate` — a trip-wire for the next persisted-shape change. | `realityCheckStore.ts`, `coherenceCheckStore.ts`, `actMandateStore.ts` |
| F15 | **Low** | No route `errorComponent`/`pendingComponent` on ceremony routes. | `apps/web/src/routes/index.tsx` |
| F16 | **Low** | Boundary doc-attach is a **metadata stub** (honestly labeled "coming soon"). **Accepted deferral — tracked only.** | `BoundaryCaptureLegacy.tsx:330-338` |
| F17 | **Low** | Two scratch files git-tracked at repo root. | `_find_catalogue_paths.py`, `_peek_blocks.py` |

---

## F1 — `trustProxy` and the reverse-proxy chain (expanded)

This is the one finding with genuine pre-launch teeth, so it gets the detail.

**The defect:** `@fastify/rate-limit` keys per `req.ip`. With `trustProxy` unset, Fastify reports the **socket peer** as `req.ip`. In production the socket peer of `atlas-api` is **nginx** (one private address). So every public visitor lands in **one shared bucket** — the per-IP portal limits (`PORTAL_PUBLIC_RATE_LIMIT_MAX=60`, `PORTAL_PDF_RATE_LIMIT_MAX=10`) are simultaneously **useless** (one abuser exhausts everyone's budget — self-DoS) and **non-isolating** (no real per-visitor protection).

**The topology (verified from the repo):**
```
client → Render edge → atlas-web (nginx) → atlas-api (Fastify)
```
- `infrastructure/nginx/conf.d/default.conf:37` — the `/api/` location sets `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (appends nginx's own `$remote_addr` to whatever arrived).
- `render.yaml` — `atlas-api` is a private `pserv`; its only inbound peer is `atlas-web` (nginx). The Render edge sits in front of nginx.

So at `atlas-api`, the `X-Forwarded-For` chain is `client, <render-edge>` and the socket peer is nginx. Recovering the real client means trusting **2 hops** (nginx + Render edge), not 1.

**Why a hard-coded number is wrong, and the fix is a knob:** the exact Render-edge contribution can't be proven from the repo alone — only confirmed against live traffic. Trusting **too few** hops → rate limit groups everyone under the proxy (safe, but ineffective). Trusting **too many** → a client can spoof `X-Forwarded-For` and forge their bucket (a security hole). Because the safe-by-default and the effective value differ, the remediation introduces a **configurable `TRUST_PROXY`** (zod-validated; default **off** = no spoofing risk introduced), sets a best-estimate value in `render.yaml`, and flags the one thing requiring live verification: hit the portal from two IPs and confirm **independent** buckets. This is honest — the mechanism ships safe and effective-once-tuned, and the single unverifiable number is a one-env-var flip, no redeploy.

---

## Negative confirmation — lenses that returned CLEAN

Equally important: the axes that were swept and found **healthy**. These are not "not checked"; they were checked and passed.

- **Dangling refs / dead imports** — zero. No broken relative paths, no orphaned CSS imports in the ceremony surfaces.
- **Ceremony-content completeness** — zero gaps. Every ceremony rail/surface that renders copy has its copy defined; no `undefined`-label renders.
- **i18n / missing keys** — zero. (The app is single-locale; no key-lookup misses.)
- **Wiki-anchor breakage** — N/A: the ceremony rails carry **no** `wiki/` deep-links to rot (a MILOS-imported worry that does not apply to Atlas).
- **Ceremony store versioning** — correct: all three pin `version:1` intentionally (F14 is the *latent* migrate trip-wire, not a present bug).
- **Temporal-scrub atoms** — correctly **unpersisted** (ephemeral by design).
- **Structured-grounding `sources[]` drift** — N/A here: the Atlas ceremony rails are not the MILOS seed-task grounding surface; no `sources[]` array to validate.
- **Cross-app enum drift** — none found between `packages/shared` catalogues and the web/api consumers sampled.

The codebase is **structurally healthy** on the content-integrity axis. The real findings cluster in **(a) one pre-launch ops gap (F1)**, **(b) env-doc drift (F2/F3)**, **(c) UX consistency/discoverability (F4–F7)**, and **(d) a systemic sync property (F8)** — the rest is low polish and safety-net ratcheting.

---

## F8 — resolution and residual assumption (sync reconcile)

**Fix shipped (proportionate).** A new optional `reconcileForProject` applier was added to the versioned-blob descriptor and wired into the **multi-device sync hydrate path only** (`hydrateProjectStateBlobs`, `syncService.ts`). The three Threshold governance logs now carry it:

| Store | Bucket | Reconcile semantics |
|---|---|---|
| `ogden-plan-concerns` | `PlanConcern[]` | union by `id`; on an id collision the **more-advanced lifecycle** copy wins (`raised < under-review < terminal`), so a remote resolution is never overwritten by a local still-raised copy; deterministic `timestamp` order |
| `ogden-coherence-check` | `{ itemResolutions, amendments[], sealedAt? }` | `amendments` union by `itemId`; `itemResolutions` shallow-merge; **earliest** `sealedAt` stands |
| `ogden-act-mandate` | `{ mandatedAt?, planReadOnly, objectiveOverrides }` | **earliest** `mandatedAt` stands; `planReadOnly` is OR (once armed, stays armed); `objectiveOverrides` lift-windows union |

**Why the REPLACE applier (`applyForProject`) was deliberately left untouched.** Two contracts depend on whole-bucket replace and must keep holding:
- the **P0-1 `select`↔`apply` round-trip** (`syncManifestRoundTrip.test.ts`, 105 cases) — applying a selected slice must reproduce it exactly;
- **`restorePlanSnapshot`** — documented *destructive OVERWRITE* of a project's plan state for a point-in-time version restore.

Routing the merge through a separate, opt-in `reconcileForProject` (sync-hydrate only) fixes the cross-device clobber **without** silently turning snapshot-restore into a union or breaking the round-trip. Covered by `syncManifest.reconcile.test.ts` (10 cases: union/no-loss, lifecycle-collision, sibling isolation, and an explicit assertion that `applyForProject` still replaces).

**Residual single-active-device assumption (accepted, documented).** Only the three governance logs reconcile. **Every other versioned-blob store (~60) still rides whole-bucket LWW** on hydrate. For those stores LWW is the *intended* semantic — they hold last-edit-wins design state (geometry, survey polygons, UI cursors, evidence captures) where a later edit legitimately supersedes an earlier one, and snapshot-restore is *meant* to overwrite. The platform therefore still assumes a **single active device per project** for non-governance blob state; concurrent offline edits to the *same* design slice on two devices will keep last-writer-wins. Promoting any of those to per-record typed-record transport (the `synced_records` path) is the durable fix if true multi-device concurrency on design state is ever required — out of scope here, tracked as a known limitation.

---

## Remediation status

Tracked in `before-we-proceed-with-whimsical-pine.md` (operator-approved 2026-06-19). Scope: **everything incl. low polish** — F1–F15 + F17 remediated and verified; F16 accepted as a labeled deferral; the 3 uncommitted WIP change-sets confirmed intentional and folded in (Phase 7) with the 2 new `TS2532` fixed so typecheck returns to the 4-error baseline.

### Phase 5 remediation log (F9–F15)

| # | Disposition | What shipped |
|---|---|---|
| F9 | Fixed | `ThresholdDirectionPhase.tsx` — zero-element Phase-2 now renders a dedicated empty state instead of "0 of 0 elements classified. Classify every element…". |
| F10 | Fixed | `REALITY_CHECK_COPY.notList` now rendered on the T1 surface (parity with T2/T3). |
| F11 | Fixed | Required-field signal on the reception Save path: `missingRequirements`/`isFormValueValid` single-source the disabled-Save reason; required leaves get a `*` + `aria-required`; repeatables show an "at least N" legend hint. (Introduced one TS2367 on an always-true narrowed guard; fixed same pass — typecheck back to baseline.) |
| F12 | Fixed | New `ActMandateReferenceRail.test.tsx` (6 tests) mirroring the T1/T2 rail suites — presence/tally/verdict against `useRealityCheckStore.approve` + `useCoherenceCheckStore.seal`. Note: the rail renders **no free-text input**, so there is no `detectCsaLikeText` branch to exercise (the plan's parenthetical was inapplicable). |
| F13 | **Already satisfied (false negative)** | The `progressTracking` presence ratchet **already exists** — `catalogues.test.ts:441-511`, `describe('catalogue conformance - Mode-5 progressTracking sweep (Tier 6 / Launch Preparation)')`, added 2026-06-18 (a day before this audit). It asserts per-objective `progressTracking` presence, `>=2 {metric,cadence}` shape, absence of `feeds`, and a covenant-clean scan over the 48-objective s7 census. Missed at audit time because the block is named after the feature ("Mode-5 sweep"), not the mechanism ("ratchet"). **Authored nothing** — verified the existing suite green (139 tests). |
| F14 | Fixed (in-code trip-wire) | Implemented as durable code-comment trip-wires at each ceremony store's `version: 1` line (`realityCheckStore.ts`, `coherenceCheckStore.ts`, `actMandateStore.ts`) rather than only an ADR note: "the next change to the persisted shape MUST bump `version` AND add a `migrate(persisted, from)`" — placed where the next editor will see it. No logic change. |
| F15 | Fixed (errorComponent only) | Added `ThresholdRouteErrorComponent` (`errorComponent`) to the ceremony route in `routes/index.tsx`, mirroring the 404 catch-all's inline style; offers "Try again" (`reset`) + "Return to the plan". `pendingComponent` **deliberately omitted** and documented in-code: no route in the app uses an async `loader:`, so a pending component would be dead code. |
