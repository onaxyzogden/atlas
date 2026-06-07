# Implementation Plan - Protocol-Driven Downstream Objective Review Flags (Tier 1 + Tier 2)

> **For agentic workers:** Execute on `feat/atlas-permaculture` in `C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\atlas`. `git fetch` + confirm **0 behind** before each commit (branch is rebased out-of-band - uncommitted work gets wiped, so commit **immediately** on verify). **Push ONLY when the user asks.** Stage **only** the files each step names; never silently commit foreign WIP (confirm with steward if a named file is already dirty). Commit messages end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. `preview_screenshot` is unavailable on this Windows setup - verify via `preview_eval` DOM (port 5200) and **disclose** it. ASCII-only copy. TS strict + `noUncheckedIndexedAccess` (guard every indexed access; `!` only where provably safe). Windows / PowerShell only. shared tsc: `corepack pnpm --filter @ogden/shared exec tsc --noEmit`. web tsc: `$env:NODE_OPTIONS='--max-old-space-size=8192'; corepack pnpm --filter @ogden/web exec tsc --noEmit`. Tests (BOUNDED - default threads pool hangs on Windows): `corepack pnpm --filter @ogden/web exec vitest run --pool=forks <pattern>` (and `--filter @ogden/shared` for shared specs). **`v3/plan/spine/` and `ProtocolConfirmationFlow` are import-only - read as reference, NEVER edit.** No deletions - preserve legacy/unmounted components.

**Goal:** Close the protocol-to-design feedback loop: a confirmed protocol activation that deviates from the steward's stated expectation raises a non-destructive amber "Review" flag on the downstream Plan objective(s) it contradicts, which the steward acknowledges / resolves / dismisses - never auto-mutating `complete`.

**Architecture:** A flag fires on DEVIATION from a steward-authored `expectedRate`, not on firing-at-all (the v4 foundation). Shared layer holds the schemas + a pure deviation-policy function. The web `protocolStore` gains an `expectationsByProject` slice (mirrors `planStratumStore.valuesByProject`); a new `reviewFlagStore` holds the immutable-append flag records. The activation seam (`ActTierExecutionPanel.resolveTrigger`) stamps a temporal bucket (season + cycle) onto each activation and runs the policy, raising flags via the store. Objective cards surface flags additively; status derivation is untouched.

**Tech Stack:** React 18 + TS strict, Zustand 5 (stable-array-select + useMemo, never inline-filter selectors), zod schemas in `@ogden/shared`, Vitest + happy-dom.

> **Spec:** `atlas/stages/design-protocol-downstream-objective-flags-review.md` (v4). This plan implements its recommended scope (open Q#4 = Tier 1 + Tier 2, sequenced).

> **DECISION (settled by steward 2026-06-02):** establishment-guard age source = **option (b), a new `commencementDate` field**. Source check (verified): `startDate` is NOT in the zod `project.schema.ts` nor any API/Postgres column - it is a client-only optional field on `LocalProject` (`apps/web/src/store/projectStore.ts:~98`, persist `name: 'ogden-projects'`, `version: 8`), edited in `DevelopPlanTab.tsx`. Therefore `commencementDate` is a **sibling client-only field** (`commencementDate?: string | null` on `LocalProject`): NO API/DB/zod-schema change, and NO persist migration required (it is optional - old persisted state simply lacks it, which parses fine; do NOT bump the store version for it). It is captured next to `startDate` in `DevelopPlanTab.tsx` and consumed by the T1.9 establishment guard. The "establishment = effective year <= 2" threshold convention comes from `apps/api/src/services/terrain/algorithms/soilRegeneration.ts` `stageFor` (`effectiveYear <= 2 -> 'establishment'`) - NOT `somAppreciation.ts`; T1.9 computes years-since-`commencementDate` inline (no cross-package import of API code). The guard only RE-FRAMES a flag's reason text - it never suppresses the flag.

---

## Verified seams (from source - do not re-investigate, but confirm current line numbers before editing)

- **`protocolStore.ts`** (`apps/web/src/store/protocolStore.ts`): owns `records` + `activations` only (persist `name: 'ogden-protocols'`, `version: 2`, version-aware `migrate`, `partialize`). `recordActivation` already persists optional `cycleNumber`/`season` if passed (`...(input.cycleNumber !== undefined ? {cycleNumber} : {})`). Stable-array selector template: `useTriggeredProtocols` / `useProtocolActivations` (select `s.activations`, `useMemo`-filter; EMPTY stable constant).
- **`planStratumStore.ts`** (`apps/web/src/store/planStratumStore.ts`): `valuesByProject: Record<projectId, Record<objectiveId, Record<itemId, string>>>`, action `setParameterValue(projectId, objectiveId, itemId, value)`, selector `selectParameterValues(state, projectId, objectiveId)`, persist `name: 'ogden-plan-tier-progress'`, `version: 5` (v4->v5 added `valuesByProject`). **Pattern to mirror for `expectationsByProject`** (but that slice goes in `protocolStore`, see T1.3 rationale).
- **Season util:** `deriveClimateContext(lat, date)` in `packages/shared/src/climate/climateContext.ts` -> `{ hemisphere, latitudeBand, season }`, `season: 'spring'|'summer'|'fall'|'winter'`. **Vocab mismatch:** returns `'fall'`; `ProtocolActivationSchema.season` (`SeasonName`) expects `'autumn'`. Map at the seam.
- **Cycle source:** `useObserveCycleStore.getCurrentCycle(projectId, domainId)` (`apps/web/src/store/observeCycleStore.ts`) -> integer (0 baseline). Not imported in the panel yet.
- **Activation seam:** `ActTierExecutionPanel.resolveTrigger` (`apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx`, ~lines 296-315). In scope: `projectId`, `objective`, `metadata` (has `centerLat`), `domainId`. NOT in scope: season, cycleNumber (must derive).
- **Objective card:** `ObjectiveCard.tsx` (`apps/web/src/v3/plan/strata/`) `.trail` span - additive chips mount after `divergencePill`, before `reviewBadge`/status `pill`. Amber token (match `css.divergencePill`): bg `rgba(232,169,88,0.16)`, fg `#e8a958`, border `rgba(232,169,88,0.45)`. `status` is a pure prop; `computeAllObjectiveStatuses` (in `PlanStratumShell.tsx`) is upstream and untouched.
- **Objective column:** `ObjectiveColumn.tsx` - mirror the `divergenceByObjective` memo (~lines 181-202) for `reviewFlagByObjective`.
- **Objective ids:** `s6-yield-flows` (stratumId `s6-integration-design`), `s7-phasing` (`s7-phasing-resourcing`). `feedsInto` from s6 checklist items -> `s7-phasing`. Objectives carry NO domain tag.
- **buildProtocolOutputs:** `packages/shared/src/constants/protocol/protocolOutputs.ts` - `(parameterGroup, valuesById) -> Record<token, value>`; bridge is `item.id -> item.token`.

---

# TIER 1 - deviation flags for the 5 s6-bound protocols (working milestone)

A confirmed s6 protocol activation that deviates from its `expectedRate` (or a single Emergency-Destocking activation) raises a review flag on `s6-yield-flows`, cascades one hop to `s7-phasing`, surfaces an amber chip on both objective cards, and is resolvable by the steward. Auto-dormancy + verify-loop shapes are present in the schema; their COMPUTATION is a Tier-1 tail sub-phase.

## Phase 1A - Shared: schemas + pure deviation policy

### Task T1.1 - `ExpectedRate` + `ObjectiveReviewFlag` schemas (TDD)
**Files:** Create `packages/shared/src/schemas/protocol/reviewFlag.schema.ts`; Modify `packages/shared/src/index.ts` (barrel export); Test `packages/shared/src/schemas/protocol/__tests__/reviewFlag.test.ts`.

- `ExpectedRateSchema = z.object({ count: z.number().nonnegative(), per: z.enum(['season','cycle']) })`.
- `FlagDirection = z.enum(['tighten','loosen'])`, `FlagDepth = z.enum(['threshold','soil','water','zones','structural'])` (rendering weight; threshold = shallowest).
- `ObjectiveReviewFlagSchema = z.object({ id, projectId, objectiveId, sourceTemplateId, sourceActivationIds: z.array(z.string()).default([]), observedCount: z.number().int().nonnegative(), expectedRate: ExpectedRateSchema.optional(), window: z.object({ season: SeasonName.optional(), cycleNumber: z.number().int().nonnegative().optional() }).default({}), deviationSign: z.enum(['over','under','existential']), depth: FlagDepth, direction: FlagDirection, reason: z.string().min(1), raisedAt: z.string().min(1), acknowledgedAt: z.string().optional(), resolvedAt: z.string().optional(), dismissedAt: z.string().optional(), dismissedAtCount: z.number().int().nonnegative().optional(), dormantSince: z.string().optional(), resolutionParameterDelta: z.object({ itemId: z.string(), from: z.string(), to: z.string() }).optional(), firingsSinceResolution: z.number().int().nonnegative().optional() })`.
  - **`dismissedAt` vs `resolvedAt` are distinct** (a self-review fix): `resolveFlag` = the steward acted on it; `dismissFlag` = the steward judged it noise. They must be separable because T1.9's dismissed-but-worsening escalation re-surfaces only *dismissed* flags whose pattern later exceeds `dismissedAtCount` (the `observedCount` captured at dismissal). A resolved flag does not re-surface that way.
- Reuse existing `SeasonName` from `protocol.schema.ts` (import, don't redefine).
- **Test:** parses a minimal existential flag (`deviationSign: 'existential'`, `direction: 'tighten'`, `depth: 'threshold'`); parses an over-deviation flag with `expectedRate`; rejects an unknown `deviationSign`.
- **Verify:** `... --filter @ogden/shared exec vitest run --pool=forks reviewFlag`; shared tsc.
- **Commit:** `feat(shared): add ObjectiveReviewFlag + ExpectedRate schemas`.

### Task T1.2 - pure deviation policy + temporal-bucket helper (TDD)
**Files:** Create `packages/shared/src/constants/protocol/deviationPolicy.ts`; Modify `packages/shared/src/index.ts`; Test `.../__tests__/deviationPolicy.test.ts`.

- `temporalBucketKey(season?: SeasonName, cycleNumber?: number): string` - stable key e.g. `${season ?? 'unknown'}:${cycleNumber ?? 0}` (the shared bucket stamped on activations for windowing + future co-occurrence).
- `EXISTENTIAL_TEMPLATE_IDS = new Set(['emergency-destocking'])`.
- `S6_BOUND_TEMPLATE_IDS = new Set(['paddock-rotation-cover-trigger','paddock-rotation-grazing-day-limit','rest-period-re-entry-gate','livestock-health-check-prompt','emergency-destocking'])` - the 5 Tier-1 protocols hard-bound to `s6-yield-flows` (the OTHER 5 of the 10 `STANDARD_PROTOCOL_TEMPLATES` are the event-driven set routed via `FEEDS_TO_OBJECTIVE` in Tier 2). This named set is the single source of truth for the "5 s6-token protocols" membership test referenced by T1.6 (hard-code to s6+s7) and T2.2 (`!has -> table lookup`); `TEMPLATE_DEPTH` cannot serve that role because Tier 2 extends it to all 10. Source: `packages/shared/src/constants/protocol/standardTemplates.ts` (all 10 are `tierAuthored: 'Stratum 6 - Integration'`; the split is by trigger nature, not protocol `type`).
- `evaluateDeviation(input: { templateId: string; activationsInWindow: number; expectedRate?: ExpectedRate; }): { shouldFlag: boolean; deviationSign?: 'over'|'under'|'existential'; direction?: FlagDirection; observedCount: number }`:
  - If `EXISTENTIAL_TEMPLATE_IDS.has(templateId)` and `activationsInWindow >= 1`: `{ shouldFlag: true, deviationSign: 'existential', direction: 'tighten', observedCount }`.
  - Else if no `expectedRate`: `{ shouldFlag: false, observedCount }` (no baseline -> no deviation flag).
  - Else if `observedCount > expectedRate.count`: `over`/`tighten`; if `observedCount < expectedRate.count`: `under`/`loosen` (only after the window is complete - the caller decides window completeness; this fn is pure on the count it is given); equal -> no flag.
- `TEMPLATE_DEPTH: Record<string, FlagDepth>` - the 5 `S6_BOUND_TEMPLATE_IDS` entries all map to `'threshold'` (FlagDepth = rendering weight, NOT protocol `type`; `livestock-health-check-prompt` is protocol-type `judgment` but still FlagDepth `threshold`). Tier 2 (T2.1) adds the deeper soil/water/zones entries for the event-driven templates.
- **Test:** existential fires on count 1 with no expectedRate; over-count yields tighten; under-count yields loosen; equal yields no flag; missing expectedRate (non-existential) yields no flag; `temporalBucketKey` is stable for same inputs and distinct across season/cycle.
- **Verify:** `... --filter @ogden/shared exec vitest run --pool=forks deviationPolicy`; shared tsc.
- **Commit:** `feat(shared): add pure protocol deviation policy + temporal bucket`.

**Gate 1A:** shared tsc clean; T1.1-T1.2 specs green; existing shared protocol specs still green.

## Phase 1B - Web store: expectations slice + review-flag store

### Task T1.3 - `expectationsByProject` slice in protocolStore (persist v3) (TDD)
**Rationale for home:** `expectedRate` is template-keyed `(projectId, templateId)` metadata read by the deviation policy alongside `activations` - both live in `protocolStore`, so co-locate. (NOT `planStratumStore`, which is objective-keyed.)
**Files:** Modify `apps/web/src/store/protocolStore.ts`; Test `apps/web/src/store/__tests__/protocolStore.expectations.test.ts`.

- Add state `expectationsByProject: Record<string, Record<string, ExpectedRate>>` (projectId -> templateId -> ExpectedRate).
- Action `setExpectation(projectId, templateId, rate: ExpectedRate)` (immutable nested spread, mirror `setParameterValue`).
- Selector `selectExpectation(state, projectId, templateId): ExpectedRate | undefined` + stable hook `useExpectation(projectId, templateId)`.
- Bump persist `version: 3`; extend `migrate`: `fromVersion < 3` -> add `expectationsByProject: {}` (preserve `records`/`activations`); extend `partialize` to include `expectationsByProject`.
- **Test:** `setExpectation` writes + reads back; migration from a v2 blob preserves `records`/`activations` and adds empty `expectationsByProject`; setting one template's rate doesn't disturb another's.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks protocolStore.expectations`; web tsc.
- **Commit:** `feat(web): add protocol expectations slice (persist v3)`.

### Task T1.4 - `reviewFlagStore` immutable-append + lifecycle (TDD)
**Files:** Create `apps/web/src/store/reviewFlagStore.ts`; Test `apps/web/src/store/__tests__/reviewFlagStore.test.ts`.

- State `byProject: Record<string, ObjectiveReviewFlag[]>`; persist `name: 'ogden-review-flags'`, `version: 1`, `partialize` byProject.
- `raiseFlag(input)` - **dedup**: if an OPEN (not resolved, not dormant) flag exists for `(objectiveId, sourceTemplateId, direction)`, increment its `observedCount` + append `sourceActivationIds` + refresh `window` instead of adding a new row; else append a new flag (default `id` via `crypto.randomUUID()`, `raisedAt` via `new Date().toISOString()`; accept caller overrides for deterministic tests).
- `acknowledgeFlag(projectId, flagId)` -> stamp `acknowledgedAt`. `resolveFlag(projectId, flagId, parameterDelta?)` -> stamp `resolvedAt` + optional `resolutionParameterDelta`. `dismissFlag(projectId, flagId)` -> stamp `dismissedAt` AND `dismissedAtCount = flag.observedCount` (distinct from resolve; powers T1.9 escalation).
- **"Open" = no `resolvedAt`, no `dismissedAt`, no `dormantSince`.** Dedup + count hooks treat only open flags as live.
- **Dismissed-but-worsening escalation** + **auto-dormancy COMPUTATION** are T1.9 (kept out of the raw store actions; store just holds the fields).
- Read hook `useReviewFlagsForObjective(projectId, objectiveId)` and count hook `useReviewFlagCountsByObjective(projectId)` - **stable-array select + useMemo** (mirror `useProtocolActivations`; EMPTY stable constant; NEVER inline-filter selector). The count hook counts only OPEN flags (excludes resolved/dismissed/dormant).
- **Test:** `raiseFlag` appends; second raise with same `(objectiveId, templateId, direction)` dedups (increments `observedCount`, no new row); different direction adds a new row; `resolveFlag` stamps `resolvedAt`; `dismissFlag` stamps `dismissedAt` + `dismissedAtCount`; `useReviewFlagsForObjective` filters by objective; the count hook excludes a resolved flag.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks reviewFlagStore`; web tsc.
- **Commit:** `feat(web): add review-flag store (immutable append + dedup + lifecycle)`.

**Gate 1B:** web tsc clean; T1.3-T1.4 specs green; legacy `protocolStore` specs still green.

## Phase 1C - Activation seam: stamp temporal bucket + run policy

### Task T1.5 - stamp season + cycleNumber at `resolveTrigger` (TDD integration)
**Files:** Modify `apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx`; Test `apps/web/src/v3/act/tier-shell/__tests__/ActTierExecutionPanel.bucket.test.tsx` (or extend existing protocols spec).

- Import `deriveClimateContext` from `@ogden/shared` and `useObserveCycleStore`.
- Add a `'fall' -> 'autumn'` map helper (`toSeasonName(season): SeasonName`).
- In `resolveTrigger`, before `recordActivation`: derive `const season = metadata?.centerLat != null ? toSeasonName(deriveClimateContext(metadata.centerLat, new Date()).season) : undefined;` and `const cycleNumber = domainId ? getCurrentCycle(projectId, domainId) : undefined;` (read `getCurrentCycle` via the stable store selector hook at component top, NOT inside the callback). Pass both into `recordActivation`.
- **Guard:** `centerLat` undefined -> `season` stays `undefined` (schema allows it). `noUncheckedIndexedAccess`-safe.
- **Note on `new Date()`:** allowed in app runtime (the workflow-script restriction does not apply here); tests inject a fixed clock by mocking or by asserting only that season is one of the four valid values.
- **Test:** with `metadata.centerLat` set, a confirmed activation persists a `season` in the four-value enum and a numeric `cycleNumber`; with `centerLat` undefined, `season` is omitted and the activation still records. Mock router + lucide per the established `vi.hoisted` pattern.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks ActTierExecutionPanel`; web tsc.
- **Commit:** `feat(web): stamp season + cycle temporal bucket on protocol activations`.

### Task T1.6 - evaluate deviation + raise flags on confirmed activation (TDD)
**Files:** Create `apps/web/src/v3/act/protocols/evaluateAndRaiseFlags.ts` (web orchestration helper, pure-ish: takes stores' current values as args); Modify `ActTierExecutionPanel.tsx` (call it on `confirmed`); Test `apps/web/src/v3/act/protocols/__tests__/evaluateAndRaiseFlags.test.ts`.

- `evaluateAndRaiseFlags({ projectId, templateId, activations, expectedRate, raiseFlag })`:
  - **Window dimension follows `expectedRate.per`** (self-review fix - do NOT count by the combined `temporalBucketKey`, which is finer than either dimension and would undercount): from the latest confirmed activation take its `(season, cycleNumber)`; if `per === 'season'` count this template's confirmed activations matching that `season`; if `per === 'cycle'` count those matching that `cycleNumber`. (`temporalBucketKey` remains stamped on the activation for co-occurrence, but is NOT the windowing key.) For the existential path (no `expectedRate`), window is irrelevant - one activation suffices.
  - Call `evaluateDeviation({ templateId, activationsInWindow: count, expectedRate })`.
  - This Tier-1 path applies to templates in `S6_BOUND_TEMPLATE_IDS` (hard-bound to s6+s7). T2.2 handles the complement via the table.
  - If `shouldFlag`: `raiseFlag` on `s6-yield-flows` (depth from `TEMPLATE_DEPTH`, direction/deviationSign/observedCount from the policy, `window`, `sourceActivationIds`, `reason` built by a small `buildReason()` -> e.g. `"emergency-destocking fired (carrying-capacity assumption contradicted)"` for existential, or `"fired ${observed}x vs expected ${expected} this ${per}"`), then **cascade one hop**: raise a parallel flag on `s7-phasing` (same direction/depth, reason prefixed `"downstream of s6-yield-flows: "`). NO transitive cascade.
- In the panel, on `confirmationStatus === 'confirmed'`, after `recordActivation` + `markTriggered`, call `evaluateAndRaiseFlags` reading the **fresh** store snapshots via `useProtocolStore.getState().activations` and `getState().expectationsByProject[projectId]?.[templateId]` (self-review fix - the component's hook values are closed over the pre-`recordActivation` render and will NOT include the activation just appended; `getState()` returns the post-write snapshot). Pass `raiseFlag` from `useReviewFlagStore.getState().raiseFlag`.
- **Test:** existential template (`emergency-destocking`) with 1 confirmed activation raises exactly 2 flags (s6 + s7), `deviationSign: 'existential'`; an over-expected count raises tighten flags; equal-to-expected raises none; missing expectedRate (non-existential) raises none.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks evaluateAndRaiseFlags ActTierExecutionPanel`; web tsc.
- **Commit:** `feat(web): raise downstream review flags on deviating activations`.

**Gate 1C:** web tsc clean; T1.5-T1.6 specs green; a confirmed Emergency-Destocking activation raises s6 + s7 flags end to end.

## Phase 1D - Surface + resolve on objective cards

### Task T1.7 - amber Review chip + resolution affordance (TDD)
**Files:** Modify `apps/web/src/v3/plan/strata/ObjectiveCard.tsx` + `ObjectiveCard.module.css`; Modify `apps/web/src/v3/plan/strata/ObjectiveColumn.tsx`; Modify `ObjectiveDetailPanel.tsx` (flag list + resolve buttons); Tests: `ObjectiveCard.test.tsx` (chip), `ObjectiveColumn.test.tsx` (wiring), `ObjectiveDetailPanel.review.test.tsx` (resolve).

- `ObjectiveCard`: add prop `reviewFlagCount?: number`; render `{reviewFlagCount ? <span className={css.reviewFlagChip} title="Downstream review flag">Review</span> : null}` in `.trail`, AFTER the divergence pill, styled with the amber `divergencePill` token (new `.reviewFlagChip` class). Default-omitted prop keeps every existing render byte-identical.
- `ObjectiveColumn`: add a `reviewFlagByObjective` memo from `useReviewFlagCountsByObjective(projectId)` (stable-array select + useMemo, mirror `divergenceByObjective`); pass `reviewFlagCount={reviewFlagByObjective[obj.id] ?? 0}` into each card.
- `ObjectiveDetailPanel`: when open flags exist for the objective, render a "Review flags" section listing each flag's `reason` + `Acknowledge` / `Resolve` / `Dismiss` buttons wired to `reviewFlagStore`. Resolve with `resolutionParameterDelta` is deferred to T1.8; skeleton resolve just stamps `resolvedAt`.
- **Test:** card shows the chip when `reviewFlagCount > 0`, omits it at 0, and the chip is absent in the default (no-prop) render; column passes counts through; detail panel lists a raised flag and `Resolve` removes it from the open set.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks ObjectiveCard ObjectiveColumn ObjectiveDetailPanel`; web tsc.
- **Commit:** `feat(web): surface + resolve downstream review flags on objective cards`.

### Task T1.8 - expectedRate authoring at approval (TDD)
**Files:** Modify `apps/web/src/v3/plan/strata/ProtocolApprovalOverlay.tsx` (editable seam; NOT `ProtocolConfirmationFlow` - import-only); Test `ProtocolApprovalOverlay.expectations.test.tsx`.

- In the approval overlay, per protocol being approved, render a small "Expected firing rate" control: a numeric `<input inputMode="decimal">` for `count` + a `per` select (`season` / `cycle`), committing via `setExpectation(projectId, templateId, { count, per })` on activate/commit. Pre-fill from `useExpectation` if present. ASCII labels only.
- **Test:** entering a rate + approving calls `setExpectation` with the parsed `{count, per}`; re-opening shows the stored value.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks ProtocolApprovalOverlay`; web tsc.
- **Commit:** `feat(web): author protocol expected firing rate at approval`.

**Gate 1D:** web tsc clean; T1.7-T1.8 specs green; full pipe authorable + visible + resolvable.

## Phase 1E - Tail: auto-dormancy, verify-loop copy, establishment re-frame, preview gate

### Task T1.9 - `commencementDate` field + auto-dormancy + dismissed-but-worsening + verify copy + establishment re-frame (TDD)
**Files:** Modify `apps/web/src/store/projectStore.ts` (`LocalProject.commencementDate?: string | null` - sibling of `startDate`; NO persist version bump, NO migration: optional field), `apps/web/src/v3/plan/cards/goal-compass/DevelopPlanTab.tsx` (intake control next to the `startDate` input, writing via `updateProject(project.id, { commencementDate: e.target.value || null })`), `reviewFlagStore.ts` (dormancy + escalation computation), `evaluateAndRaiseFlags.ts` (verify-loop reason + establishment annotation), `ObjectiveDetailPanel.tsx` (verify-line copy); Tests extend the respective specs + add `projectStore.commencement.test.ts` and `DevelopPlanTab.commencement.test.tsx`.

- **`commencementDate` field + intake (do FIRST):** add `commencementDate?: string | null` to the `LocalProject` interface immediately below `startDate` (`projectStore.ts:~98`), with a doc comment: "ISO YYYY-MM-DD. Date land establishment/planting began; drives the establishment-dip (years 1-2) re-frame on review flags. Distinct from `startDate` (Goal Compass scheduling anchor)." No new store action needed - the generic `updateProject(id, updates)` already spreads arbitrary `LocalProject` fields. In `DevelopPlanTab.tsx`, add a sibling `<input type="date" id="gc-project-commencement-date">` (ASCII label e.g. "Establishment start (land)") directly after the `startDate` input (lines ~82-88), value `project.commencementDate ?? ''`, onChange `updateProject(project.id, { commencementDate: e.target.value || null })`. Match the existing label/markup pattern exactly.
- **Field test:** `updateProject(id, { commencementDate })` reads back; a project loaded from a v8 persist blob WITHOUT the field parses (undefined) and is editable. **Intake test:** changing the date input calls `updateProject` with `{ commencementDate }`; clearing it sends `null`.

- **Auto-dormancy (computed on read, not a background job):** the dormancy decision is derived inside the count/read hooks from the flag's `window` vs the project's current bucket - an open flag whose pattern did NOT recur within one comparable later window (next season if `per:'season'`, next cycle if `per:'cycle'`) is treated as dormant and excluded from `reviewFlagCount`; if a later activation re-raises it (dedup path bumps `observedCount` + refreshes `window`), it is live again. `dormantSince` is an OPTIONAL cached stamp written lazily on the next mutation - the read hooks must not depend on it being populated (self-review fix: avoids needing a write-trigger when no user action occurs). Current bucket source: latest activation's `(season, cycleNumber)`, or `deriveClimateContext` if no activation this window.
- **Dismissed-but-worsening:** a dismissed flag whose `observedCount` later exceeds its dismissal count re-surfaces (clear `resolvedAt`, bump `depth` one step).
- **Verify-loop copy (no causation laundering):** when a flag was resolved with a `resolutionParameterDelta`, the detail panel shows `"Since you changed ${itemId} ${from}->${to}: fired ${firingsSince}x vs expected ${expected}x. Note: seasonal conditions also vary."` Compute `firingsSinceResolution` from activations after `resolvedAt`.
- **Establishment re-frame (option (b), `commencementDate`):** compute `effectiveYear` inline as whole years elapsed from `project.commencementDate` to now (e.g. `Math.floor((Date.now() - Date.parse(commencementDate)) / (365.25*24*3600*1000))`); if `commencementDate` is present AND `effectiveYear <= 2` (the `stageFor` establishment threshold from `soilRegeneration.ts`), PREFIX the flag reason with `"[Establishment - expected; interpret, don't conclude design failure] "`. Never suppress the flag/action. If `commencementDate` is absent OR `effectiveYear > 2`, skip the annotation (no guard). Read the project via `useProjectStore.getState().projects.find(p => p.id === projectId)` at emission (fresh snapshot, consistent with T1.6). Do NOT import API-side code; the `<= 2` threshold is hardcoded with a comment citing `soilRegeneration.ts stageFor`.
- **Test:** dormancy stamps + clears correctly; dismissed-but-worsening re-surfaces with bumped depth; verify copy names the confound; establishment prefix appears only when `commencementDate` is set AND within the effectiveYear<=2 window (and is absent when the field is unset or the project is older than 2 years).
- **Verify:** all Tier-1 specs green; web tsc.
- **Commit:** `feat(web): add commencementDate + flag dormancy, verify copy, establishment re-frame`.

### Task T1.10 - shared + web verification + preview gate
- **tsc:** shared then web (foreign errors in `ActAsBuiltPopover.tsx` / `syncService.ts` excepted).
- **Tests (bounded, forks):** all shared (`reviewFlag deviationPolicy`) + all web (`protocolStore.expectations reviewFlagStore ActTierExecutionPanel evaluateAndRaiseFlags ObjectiveCard ObjectiveColumn ObjectiveDetailPanel ProtocolApprovalOverlay`).
- **Preview (port 5200; `preview_screenshot` unavailable -> `preview_eval`, disclose):** approve a protocol with an expected rate; in Act proof-capture, confirm an Emergency-Destocking trigger; assert (separate `preview_eval` after the click, state flushes async) the s6 + s7 objective cards each show a `.reviewFlagChip` (`textContent === 'Review'`); open the detail panel and assert the flag + resolve buttons render; resolve and assert the chip count drops.
- **Commit** any preview-driven fixes (scoped).

**Gate 1E (Tier 1 DONE):** All gates above met; Tier 1 is a working, shippable milestone - the 5 s6 protocols raise/surface/resolve deviation flags with auto-dormancy and honest verify copy. **Stop here for steward review before Tier 2.**

---

# TIER 2 - extend flagging to event-driven protocols + deep objectives (layered on Tier 1)

> Tier 2 reuses the entire Tier 1 engine (schemas, deviation policy, both stores, the card chip, resolution UI). It adds ONLY: a protocol->objective mapping table for the 5 event-driven protocols, deeper `TEMPLATE_DEPTH` entries, and emission wiring that consults the table. Build only after Gate 1E.

### Task T2.1 - `FEEDS_TO_OBJECTIVE` table + deeper depths (TDD, shared)
**Files:** Create `packages/shared/src/constants/protocol/feedsToObjective.ts`; Modify `deviationPolicy.ts` (`TEMPLATE_DEPTH` adds soil/water/zones entries); Modify barrel; Test `.../__tests__/feedsToObjective.test.ts`.

- `FEEDS_TO_OBJECTIVE: Record<string, string[]>` mapping each event-driven template to the deep objective(s) it contradicts, grounded in the spec's agronomy:
  - `post-rotation-impact-assessment` -> `['s2-land-baseline']` (soil/ecology contradicted) depth `soil`.
  - `pre-rotation-paddock-assessment` -> `['s6-yield-flows']` depth `threshold` (operational).
  - `water-trough-inspection` -> `['s5-water-strategy']` depth `water`.
  - `seasonal-stocking-rate-review` -> `['s6-yield-flows','s7-phasing']` depth `threshold`.
  - `silvopasture-pest-diversion` -> `['s4-zones-sectors']` depth `zones`.
  - (Exact target set + depths are a steward-reviewable design choice - present in the table with a comment block citing the `feedsInto` rationale; adjust on review.)
- **Test:** every event-driven template id has an entry; every target id is a real objective id; depths resolve in `FlagDepth`.
- **Verify:** `... --filter @ogden/shared exec vitest run --pool=forks feedsToObjective`; shared tsc.
- **Commit:** `feat(shared): add FEEDS_TO_OBJECTIVE map for event-driven protocols`.

### Task T2.2 - emission consults the table for non-s6 protocols (TDD, web)
**Files:** Modify `evaluateAndRaiseFlags.ts`; Test extend `evaluateAndRaiseFlags.test.ts`.

- When the template is NOT in `S6_BOUND_TEMPLATE_IDS` (i.e. `!S6_BOUND_TEMPLATE_IDS.has(templateId)`), resolve targets from `FEEDS_TO_OBJECTIVE[templateId]` (default `[]` -> no flag) instead of the hard-coded `s6`+cascade. Depth from `TEMPLATE_DEPTH`. Same deviation policy (expectedRate authored per protocol at approval, T1.8 already generic over templateId). NO transitive cascade beyond the table's listed targets.
- **Test:** `water-trough-inspection` over-deviation raises a `water`-depth flag on `s5-water-strategy`; a template absent from the table raises nothing.
- **Verify:** `... --filter @ogden/web exec vitest run --pool=forks evaluateAndRaiseFlags`; web tsc.
- **Commit:** `feat(web): raise deep-objective flags for event-driven protocols`.

### Task T2.3 - Tier 2 verification + preview gate
- tsc shared + web; all Tier-1 + Tier-2 specs green (bounded forks).
- Preview: confirm a `water-trough-inspection` deviation surfaces a Review chip on the `s5-water-strategy` card; resolve it.
- **Commit** scoped fixes.

**Gate T2 (DONE):** event-driven protocols flag their deep objectives via the table; the full Tier 1 + Tier 2 loop is live and resolvable.

---

## Cross-cutting verification (every commit)
- `git fetch` + confirm 0 behind before commit; commit immediately on green.
- shared tsc before web tsc; bounded `--pool=forks` vitest only.
- Stage only the named files; ProtocolConfirmationFlow + `v3/plan/spine/` never touched; no deletions; ASCII-only; not pushed unless asked.

## Risks (build-specific; agronomy risks live in the spec)
| Risk | L | I | Mitigation |
|---|---|---|---|
| persist v2->v3 migration drops records/activations | Low | High | Version-aware migrate preserves both; T1.3 spec asserts survival. |
| Inline-filter Zustand v5 selector -> infinite re-render | Med | High | All hooks mirror `useProtocolActivations` (stable select + useMemo). |
| `centerLat` undefined -> no season -> windowing degraded | Med | Med | Season optional; bucket falls back to `unknown:cycle`; flags still raise on cycle alone. |
| Flag emission fires inside render / double-raises | Med | Med | Emission only in `resolveTrigger` on `confirmed` (an event), dedup in store; never in a selector/effect. |
| Editing import-only `ProtocolConfirmationFlow` for authoring | Low | Med | Authoring routed through `ProtocolApprovalOverlay` (T1.8). |
| `ActTierExecutionPanel` rebased / foreign WIP | Med | Med | `git status -s` the file first; stop + confirm if dirty with unrelated changes. |
| `commencementDate` unset on most projects -> no establishment guard | High | Low | By design: guard skips when absent (no false establishment claims); only re-frames reason text when set; never blocks a flag. |
| Tier 2 target/depth choices are judgment calls | Med | Low | Table ships with rationale comments; steward-reviewable; no behavior outside listed targets. |

## Definition of Done
**Tier 1:** the 5 s6-bound protocols raise deviation-or-existential review flags (against steward-authored `expectedRate`) on `s6-yield-flows` + one-hop `s7-phasing`; flags surface as additive amber chips, are acknowledge/resolve/dismiss-able, auto-dormant when the land stops producing the signal, re-escalate when a dismissed pattern worsens, and show verify-loop copy that names the seasonal confound; activations stamp a season+cycle temporal bucket; `complete` derivation untouched. **Tier 2:** event-driven protocols flag their deep objectives via `FEEDS_TO_OBJECTIVE`. shared + web tsc clean (foreign errors excepted); all specs green (bounded forks); verified via `preview_eval`; ProtocolConfirmationFlow + spine untouched; no deletions; ASCII-only; not pushed unless asked.

## Deferred (explicit)
- Numeric field-measurement enrichment (`ObserveDataPoint.measurementValue` populate + join) - quantitative reason strings; count-vs-expected is the shipping core.
- Cross-protocol co-occurrence DETECTION (the shared temporal bucket data hook ships in Tier 1; detection is a later slice).
- Phenological-phase window weighting (same count, different season-phase meaning).
- Per-zone establishment granularity (silvopasture tree-rows vs inter-row); Tier 1 uses project-level `commencementDate`.
- `weatherConditionAtActivation` population (no source in codebase).
