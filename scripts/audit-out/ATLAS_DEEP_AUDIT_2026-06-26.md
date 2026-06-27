# OLOS / Atlas — Pre-Launch Deep Audit & Remediation (Pass 2)

**Date:** 2026-06-26
**Project:** OLOS (atlas submodule — `onaxyzogden/atlas`)
**Branch:** `fix/operational-role-layer`
**Trigger:** Operator request — before any live testing, re-scan OLOS across two axes: **(A) friction** in workflow / architecture / UI, and **(B) missing content, incomplete references, inconsistencies** — then remediate everything (incl. low polish) for a robust foundation.
**Method:** Multi-agent read-only sweep (12 finder dimensions × 2 axes over web / API / data + the new role-layer work), adversarial refute pass on every candidate, a completeness critic, then **firsthand source verification of every load-bearing medium-and-up claim**. Nothing here rides on a sub-agent's word alone.
**Relationship to Pass 1:** a near-identical two-axis audit (**F1–F17**, `ATLAS_DEEP_AUDIT_2026-06-19.md`) ran 6 days earlier and was fully remediated. Pass 2 (1) re-verified F1–F17 hold, (2) deep-audited the un-audited work that landed since (Operational Role Layer, configurable zone rings, homestead seed, header project selector + app-shell, offline-demo merge), and (3) re-swept the whole stack with fresh adversarial eyes.

---

## How to read this report

The read-only sweep produced **40 candidate findings** across 11 live dimensions. The `copy` and `refs` dimensions returned **clean** (no dangling refs, dead imports, missing i18n keys, or ceremony-copy gaps); the F1–F17 regression re-check folded into `api-3` / `api-6`. The adversarial pass **refuted 13** and downgraded most survivors to low polish. Severity is calibrated to **pre-launch impact**, not abstract code smell.

Every finding below was **firsthand-read** at the cited file+line before being recorded. Disposition: ✅ fixed this pass · 📌 tracked deferral · ✋ refuted/no-action.

---

## Disposition summary

| Phase | Items | Status | Commit |
|---|---|---|---|
| A — Amanah / fiqh integrity | api-6, amanah-1, amanah-2 | ✅ fixed | `a13b9494` |
| B — Deploy / infra / ops | api-1, api-3, api-2, api-5 | ✅ fixed (B1/B3 in `render.yaml` left uncommitted for operator coordination) | `f248b163` (B2/B4) |
| C — Header selector + navigation | nav-1, nav-3, nav-5 | ✅ fixed | `cf1cbd52` |
| D — Role-layer + ceremony UX | roles-3, plan-1, act-2, act-3, plan-3 | ✅ fixed | `998eecec` |
| E — Doc / comment hygiene | state-5, state-6, state-2, catalogue-4, catalogue-3, roles-4 | ✅ fixed (state-3 + plan-4 already accurate) | `6fc1f272` |
| F — Test/coverage scaffolding | F1–F5 | 📌 deferred (operator decision) | spawn-task chips |

---

## Findings & remediation

### A. Amanah / fiqh integrity (highest priority) — fixed `a13b9494`

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| **api-6** | med-high | The break-even engine deliberately strips `tenYearROI` (covenant: cost-recovery timing only, with a test pinning its absence), but the stakeholder slide deck printed **"10-year ROI"** by reading the raw engine result directly — bypassing the covenant filter and framing the project as a return-on-investment vehicle. | `computeProjectBreakEven.ts` + its test drop it; `PresentationDeckCard.tsx` read `model.breakEven.tenYearROI.mid`. | ✅ Dropped the ROI KV from the deck; kept the covenant-clean cost-recovery fields (break-even year + peak negative cashflow). Pinned by a deck-level "never renders tenYearROI" test. |
| **amanah-1** | medium | Objective `scopeNotes` (verbatim Amanah cautions, e.g. *bayʿ mā laysa ʿindak* / CSA advance-sale) surfaced in **Act** (gold caution frame) but were **never rendered in Plan** — the steward saw the fiqh constraint only *after* recording, not *while deciding*. | `ObjectiveDetailPanel.tsx` had 0 `scopeNotes` refs; `WorkBulkConfirmOverlay.tsx` rendered them verbatim. | ✅ Rendered `scopeNotes` **verbatim** as a persistent gold caution block in `ObjectiveDetailPanel` (Plan decision time), mirroring the Act overlay styling (`whiteSpace: pre-wrap`). |
| **amanah-2** | medium | The same `scopeNotes` were not promoted by the always-surface engine, so an out-of-scope Amanah-flagged objective could sit in the collapsed "Outside your focus" section. | `alwaysSurface.ts` had 3 signals, none Amanah-aware. | ✅ Added a 4th always-surface signal `carries-scope-note` (extended `SurfaceReason` / `REASON_ORDER` / the add-loop). Any objective with non-empty `scopeNotes` is promoted out of the collapsed section regardless of role scope. Display-only, never gates. |
| amanah-3 | none | Amanah covenant **test suite comprehensive & passing** (advance-sale / CSA / CSRA / salam / yield-share bans pinned across all catalogues). | `catalogues.test.ts` | ✋ no action — confirms guardrails hold. |

### B. Deploy / infra / ops — fixed `f248b163` (+ uncommitted `render.yaml`)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| **api-1** | medium | `FEATURE_DEMO_MODE="true"` auto-registers throwaway guest DB accounts and bypasses login; the inline comment still claimed a "(currently broken) login wall" — stale (LoginPage works). | ✅ **Operator decision: keep the flag for the test-launch.** Value unchanged. Fixed the stale comment → accurate "explorable-without-login test-launch" description; documented the throwaway-account cleanup deferral inline; added a **REVISIT BEFORE REAL LAUNCH** note. *(in `render.yaml`, uncommitted — see coordination note.)* |
| **api-3** | med-high | The TRUST_PROXY two-IP rate-limit verification lived only in `render.yaml` comments, not the deploy runbook — likely to be skipped; a wrong hop count makes every visitor share one bucket (self-DoS). | ✅ Added a post-deploy verification step to `infrastructure/DEPLOY-RENDER.md` (hit the portal from two distinct client IPs, confirm two independent buckets, adjust `TRUST_PROXY` if masked). |
| api-2 | low-med | Four rate-limit knobs fell back to code defaults, invisible/un-tunable from the dashboard. | ✅ Added explicit `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` / `PORTAL_PUBLIC_RATE_LIMIT_MAX` / `PORTAL_PDF_RATE_LIMIT_MAX` envVars (at current defaults) to the `atlas-api` block. *(in `render.yaml`, uncommitted.)* |
| api-5 | low | Migration `055_operational_roles.sql` depends on `projects.metadata` (012) but carried no dependency header. | ✅ Added a `-- DEPENDS ON migration 012 (projects.metadata)` header. |

**`render.yaml` coordination note:** B1 (comment fix) + B3 (rate-limit envVars) edit `render.yaml`, which carries concurrent operator WIP. Both edits are **applied in the working tree but deliberately left uncommitted** so the operator commits `render.yaml` themselves and resolves any overlap with their in-flight changes. B2 + B4 (separate files) are committed in `f248b163`.

### C. Header project selector + navigation — fixed `cf1cbd52`

| ID | Sev | Finding | Fix |
|---|---|---|---|
| **nav-1** | medium | Single-project popover rendered an **orphaned footer divider** (always rendered even when `others.length === 0`). | ✅ Gated the divider on `{others.length > 0 && …}`. |
| nav-3 | low-med | Selector showed identical placeholder + `aria-label="Loading"` for both *loading* and *project-not-found/deleted* states (indistinguishable). | ✅ `isLoading = projects.length === 0`; loaded-but-missing id now shows a neutral "Project unavailable" label + a 3-way trigger aria-label. |
| nav-5 | low | `V3_PROJ_RE` matched only `observe\|plan\|act\|report`, so the switcher was absent on `/home`, `/protocols`, `/wizard` (reachable by deep link / back-button). | ✅ Extracted `matchV3ProjectRoute` (new `v3ProjectRoute.ts` + 6-case test) broadening the match; wired into `AppShell`. |

### D. Role-layer + ceremony UX polish — fixed `998eecec`

| ID | Sev | Finding | Fix |
|---|---|---|---|
| roles-3 / act-3 | low-med | When **zero** objectives fell in a member's focus, the rail collapsed by default + showed tautological copy, forcing a click to see anything; and the outside-"open" state could leak across stratum switches. | ✅ Derived open state (`outsideOverride ?? auto-expand-when-mainList-empty`); the override resets on stratum change. Copy rewritten to directive "None of the N objectives in this stratum fall in your focus — they are expanded below so you can still act on them." Regression test added. |
| plan-1 | low-med | While a Threshold is active the switcher gets `activeStratumId=''`, so **no stratum highlighted** (lost "where am I"). | ✅ Switcher anchors `data-active` on the threshold's originating stratum (`activeThreshold.afterStratumId`) while keeping `aria-current="step"` on the threshold row. Switcher-only; `PlanTierShell` untouched. Regression test added. |
| act-2 | low | `UNIVERSAL_DOMAIN_LABELS[feeds]` indexed with no fallback → blank if `feeds` were undefined. | ✅ Both monitoring panels (Act live + Plan design) render through a widened lookup + `??` fallback. Defensive only — `feeds` is type- and Zod-constrained. |
| plan-3 | low | Threshold-1 empty-intent copy was permissive/descriptive rather than directive. | ✅ Made directive (go back to Tier 0 and declare intent) while preserving the test-pinned opening sentence. |

### E. Store / catalogue doc & comment hygiene — fixed `6fc1f272`

| ID | Sev | Finding | Fix |
|---|---|---|---|
| state-5 | low-med | `homesteadStore` docstring said "localStorage" but uses **IndexedDB**. | ✅ Corrected to durable IndexedDB; noted intentional non-registration in syncManifest. |
| state-2 | low | `homesteadStore` pass-through `migrate` had no documented versioning contract. | ✅ Documented the identity-migrate contract + a TRIP-WIRE (future shape change must bump version + supply a reshaping migrate). |
| state-6 | low | `launchMilestoneStore` lacked the TRIP-WIRE comment its sibling ceremony stores carry. | ✅ Added the TRIP-WIRE migrate warning. |
| catalogue-4 | low | `operationalRolesApplyTo` accepted legacy `owner`/`designer` aliases with no back-compat comment. | ✅ Documented WHY (pre-rename persisted memberships) + the safe-degradation default (unknown/null → `false`). |
| catalogue-3 | low | Livestock **secondary** preamble lacked the source-doc/version attribution the primary + silvopasture secondary carry. | ✅ Added attribution → ratified `docs/catalogues/livestock-operation-secondary-draft.md` (Rev 3 final, 2026-06-03). |
| roles-4 | low | Legacy `PlanStratumShell` engaged the role layer implicitly via `ObjectiveColumn`→`useViewScope` with no comment flagging it. | ✅ Flagged the implicit engagement at the call site (verified `ObjectiveColumn.tsx:25,267`). |
| state-3 | low | uiStore v4 idempotent-migrate rationale "undocumented". | ✋ **already documented** (uiStore.ts:145-150) — no edit. |
| plan-4 | low | "Stale error-boundary comment referencing a hydration race." | ✋ **already accurate** — the `ThresholdRouteErrorComponent` comment now describes the malformed-persisted-record fallback, no hydration-race text. No edit. |

### F. Refuted / no-action (recorded so they are not re-reported)

`roles-1` (ViewFocusToggle absent from Observe — by design), `roles-2`, `plan-2`, `plan-5`, `act-1` (CSA advisory "flash" — not real), `maps-3`, `nav-2` (404 link auth-gated/correct), `nav-4`, `state-1` (launchMilestone reconcile intentionally excluded — adding it breaks a pinning test), `catalogue-1` (zone-ring types fully typed), `catalogue-2` (MGD CSA flags correct & verbatim), `catalogue-5` (demo-seed architecture resilient), `api-4` (primary_steward op-roles path architecturally impossible). `maps-1`/`maps-2` fold into the a11y coverage gap (Phase F).

---

## Verification

- **Typecheck (0 errors):** `apps/web` and `packages/shared` both clean (`tsc --noEmit`, `--max-old-space-size=8192`). No production-code type errors introduced.
- **Targeted vitest (bounded, `pool:'forks'`):**
  - Phase A — financial covenant + `alwaysSurface` (`carries-scope-note` case) + `ObjectiveDetailPanel` scopeNotes render — green.
  - Phase C — `v3ProjectRoute` route-match (6 cases) + `HeaderProjectSelector` states — green.
  - Phase D — `ActTierObjectiveRail` (15, +1 new auto-expand), `ActTierStratumSwitcher` (11, +1 new origin-highlight), `ThresholdReviewPhase` (7), `Mode4DesignChrome` (6) — **39/39**.
  - Phase E — `catalogues` (139) + `operationalRoles` (28) — **167/167** (comment-only; confirms no accidental breakage).
- **Static confirmation** for `render.yaml`, `DEPLOY-RENDER.md`, migration header, catalogue preamble (no runtime path; diff review).
- **Preview:** the v3 ceremony shell resists preview automation (documented prior-session hang on Observe lens mounts). UI changes (scopeNotes block, single-project selector, rail auto-expand) are pinned by unit tests + static review rather than screenshots — disclosed as such.
- **Amanah self-check:** no advance-sale / CSA / CSRA / salam / yield-share framing authored; api-6 *removes* an ROI exposure; amanah-1/-2 *increase* fiqh-caution visibility; all guardrail copy rendered verbatim.

---

## Tracked deferrals (no code change this pass)

- **Phase F — test/coverage scaffolding (operator decision 2026-06-26):** **F1** migration-055 + operational-roles authorization integration tests · **F2** `RingRadiiFields` unit tests · **F3** axe a11y vitest integration · **F4** E2E smoke (offline-demo launch/seed, header switcher, role-scope) · **F5** bundle-size regression guard for the showcase split. Surfaced as spawn-task follow-up chips at session close.
- **state-4** — `zoneRingConfigStore` parked in `DEVICE_GLOBAL`/localStorage awaiting server transport (documented deferral by design). Track only.
- **`render.yaml` B1+B3** — applied in working tree, left uncommitted for operator coordination (see Phase B note).

---

## Commit ledger (this pass, on `fix/operational-role-layer`)

| Commit | Phase |
|---|---|
| `a13b9494` | A — surface scope/fiqh cautions in Plan + drop deck ROI exposure |
| `f248b163` | B — document two-IP rate-limit check + migration 012 dependency (B2/B4) |
| `cf1cbd52` | C — project switcher on all project routes + clearer selector states |
| `998eecec` | D — role-layer + ceremony UX polish |
| `6fc1f272` | E — store/catalogue comment hygiene |

*(Operator out-of-band commits `4262a0dc` / `35e33ad3` / `e79db081` interleaved during the session; my uncommitted `AppShell` wiring was swept into `e79db081` — verified no work lost.)*
