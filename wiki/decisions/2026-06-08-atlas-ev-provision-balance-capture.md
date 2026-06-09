# ADR: EvProvisionBalanceCapture (SP1 Group 3) -- 6-mode communal/private provision Tier-0 capture

**Date:** 2026-06-08
**Status:** accepted

**Context:**
Group 3 of the OLOS mockup-batch rollout (Ecovillage vertical, after
[[decisions/2026-06-07-atlas-ev-legal-governance-capture]]). The objective
`ev-s1-provision-balance` (EV-S1.5, 6 checklist items c1..c6) existed in
`ecovillage.ts` but rendered through the generic `VisionFormFields` fallback. The
operator mockup `olos_communal_private_provision.html` is the canonical 6-mode
source (the earlier `olos_communal_provision.html` is a superseded variant; the
finance-only `olos_financial_contribution_model.html` is a distinct Tier-6
`ev-s4-financial-model` surface, deferred to Phase 3f). This is the first Tier-0
capture whose subject matter is **communal economics** -- so it carries explicit
Amanah weight.

**Decision (additive, no deletion -- clones the canonical multi-mode pattern):**
1. **One self-routing `ProvisionBalanceCapture`, six modes.** ONE `isProvisionBalance`
   flag + ONE body-router arm in `DecisionWorkingPanel`; pure TOTAL
   `provisionBalanceModeFor(itemId)` drives the body: c1 `matrix`
   (communal/household/private responsibility grid), c2 `food`, c3 `financial`,
   c4 `entitlement`, c5 `tension`, c6 `ratify`. Mirrors
   `EvLegalGovernanceCapture` exactly (mapper + single component rendering one
   mode body; panel owns all chrome).
2. **Per-mode JSON-in-FormValue encoding.** Each mode persists its own keys in
   the flat per-item `FormValue` (`Record<string, string | string[]>`); model
   structure is JSON-encoded per entry. `decode` is TOTAL/defensive (non-array ->
   empty; per-entry `try/catch JSON.parse`; drop text-less/non-JSON entries;
   coerce to defaults; **NEVER fabricate seed data**); `encode` is the lossless
   inverse and is exported; round-trip unit-tested. `decode`/`encode` carry no
   `mode` param (dropped as dead in `53243580`).
3. **Stable member ids in event handlers only.** The c6 ratify member rows mint
   ids via `makeMemberId()` (module-scoped, pure, `crypto.randomUUID` with a
   `Math.random` fallback) **only in event handlers** -- never in decode/render;
   used as React keys (never array index).
4. **Two deliberate per-item simplifications** (a per-item capture cannot read
   sibling items, unlike the mockup which derives cross-item state): **tension**
   (c5) -- the mockup auto-derives 3 tensions from c1/c2/c3 selections; here they
   are a FIXED verbatim scaffold whose RESOLUTIONS persist. **ratify** (c6) -- the
   mockup shows seeded demo members; per "never fabricate seeds" this starts
   EMPTY with an "Add founding member" control. Both flagged for later revisit.
5. **Predicate widen only** -- `ev-s1-provision-balance` added to
   `TIER_ZERO_OBJECTIVE_IDS`; all 6 modes persist via the existing
   `actEvidenceStore.visionFormData[itemId]` path. No store/schema/migration.

**Amanah (load-bearing -- this is the fiqh-sensitive surface):**
The c3 `financial` mode renders a **verbatim** scope-note, transcribed exactly per
the 2026-05-29 encode-verbatim authorisation and never reworded:

> "These are communal cost-sharing models among members who collectively own the
> asset -- not advance sale of future yield. Recorded verbatim per the 2026-05-29
> encode-verbatim authorisation."

The provision models are **cost-sharing among co-owners who collectively own the
asset** -- musharaka-like, NOT advance sale of future yield. No riba, no
`bay' ma laysa 'indak` / CSRA / salam framing ([[fiqh-csra-erased-2026-05-04]],
[[feedback-csa-in-catalogues]]). This is consistent with the 2026-05-29 operator
authorisation governing ecovillage economic objectives.

**Verified:** web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks --testTimeout=15000`
([[feedback-vitest-bounded-runs]]) green across the capture + `DecisionWorkingPanel`
+ `ActTierZeroWorkbench` suites; ASCII-only (em-dash -> ` -- `, superscript-2 ->
`2`, lucide icons). Commits `181f7396` (build) -> `e7eed111` (verbatim t3 copy fix)
-> `53243580` (exhaustive decode default + drop dead mode param) -> `ad6dce78`
(MOCKUP_REGISTRY triage resolution) on `main` (the feature line was merged to
`main` out-of-band, [[project-structured-capture-on-main]]); explicit-pathspec,
not pushed.

**Consequences:**
- SP1 Group 4 (EvConflictFrameworkCapture, `ev-s1-conflict-framework`) remains the
  last unbuilt S1 ecovillage capture.
- The c5 tension fixed-scaffold and c6 ratify empty-start simplifications are
  recorded as deliberate deferrals to revisit when cross-item read is available.
- `olos_financial_contribution_model.html` -> `FinancialModelCapture`
  (`ev-s4-financial-model`) is deferred to Phase 3f with a fresh Amanah screen at
  kickoff.

Log: [[log/2026-06-08-atlas-tier0-provision-affordance-phase1-close]]; entity
[[entities/act-tier-shell]]. Clones [[decisions/2026-06-07-atlas-ev-legal-governance-capture]].
