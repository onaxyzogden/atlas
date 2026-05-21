# 2026-05-20 — Atlas Phase C: Agent workforce + rotation→revenue bridge

**Status:** Accepted
**Branch:** `feat/atlas-permaculture`
**Phase:** Apricot Lane Validation Protocol — Phase C (multi-role agent
registry + rotational-grazing engine wired into the cashflow stream).
**Commits:** `8418062a` (C.6 — agent registry + `/ai/agent-chat` route +
tests), `6a61d6cf` (C.7 — `rotationEngine` + `livestockRevenue` +
`RotationScheduleCard` engine block + tests).

## Context

Phase B / B.5 shipped a generative Design Map orchestrator. Phase C closes
two remaining capability gaps the protocol flagged: (1) the single "Atlas"
voice can't honour the protocol's "agent workforce" expectation (specialist
roles that hand off when a question is out of their lane), and (2) the
financial cashflow engine had no way to ingest paddock-rotation AU-day
output as a revenue stream — livestock revenue was effectively absent from
the J-curve inputs that Phase D will assemble.

Per [[plan-apricot-lane-restart-2026-05-20]] both sub-phases land as
independent commits on `feat/atlas-permaculture`, with covenant + IA
constraints preserved: no CSRA / *bayʿ mā laysa ʿindak* / salam framing;
"capital partners & allies" language only; 3-item Observe/Plan/Act IA
unchanged; no deletion in revamps; mobile Overview stack stays flat.

## Decisions

### C.6 — Agent registry + `POST /api/v1/ai/agent-chat`

- **Internal API widening** in `apps/api/src/services/ai/ClaudeClient.ts`:
  private `callAnthropic(apiKey, systemPrompt, userMessage)` now accepts
  `systemPrompt: string | SystemBlock[]` so callers can pass a multi-block
  cached system array; the three existing public callers
  (`generateSiteNarrative`, `generateDesignRecommendation`,
  `enrichAssessmentFlags`) are unchanged — a `string` is wrapped into a
  single ephemeral-cached block exactly as before. Return shape widened
  to `{ text, model, inputTokens, outputTokens }`; the three existing
  callers ignore the new token fields.
- **`SYSTEM_PROMPT` exported** so `agentRegistry.ts` can compose without
  duplicating the Atlas identity string.
- **New public method `ClaudeClient.chatWithRole({ roleSystemAddendum,
  userMessage })`** builds the canonical 2-block array — `[0]` is the
  cached Atlas base prompt with `cache_control: { type: 'ephemeral' }`,
  `[1]` is the role addendum — and delegates to `callAnthropic`. Pure
  pass-through; no parsing.
- **New file `apps/api/src/services/ai/agentRegistry.ts`** exports the
  `AgentRole` type (`'agro-designer' | 'hydro-engineer' | 'general'`),
  a static role-prompt table, pure `routeIntent(text): AgentRole`
  (case-insensitive word-boundary keyword tally — hydro keywords:
  `swale`, `keyline`, `pond`, `water`, `hydro`, `runoff`, `infiltration`,
  `drainage`, `riparian`, `aquifer`, `cistern`, `dam`, `creek`, `flood`;
  agro keywords: `orchard`, `paddock`, `tree`, `plant`, `species`,
  `crop`, `pasture`, `grazing`, `livestock`, `rotation`, `cover crop`,
  `compost`, `silvopasture`; ties or zero → `'general'`), `resolveRole`,
  and `runAgent(input)` which composes the role addendum, calls
  `chatWithRole`, and parses any trailing `HANDOFF: <role> — <reason>`
  line off the model output into `handoff: { to, reason } | null`
  (en-dash `—` or ASCII `--` separator). Handoff parsing strips the line
  from `content`; malformed roles surface as `handoff: null`. **Server
  does not auto-chain** to the handoff target — caller decides.
- **Route extension `POST /api/v1/ai/agent-chat`** appended to
  `apps/api/src/routes/ai/index.ts` with `authenticate +
  resolveProjectRole` preHandlers (project-membership gate; any role
  suffices). Body schema:
  `{ projectId: uuid, role?: AgentRole, autoRoute?: boolean = true,
  contextText: string (1..64000) }`. Returns `{ data: AgentResponse,
  meta: undefined, error: null }`. Existing `/chat` +
  `/enrich-assessment` untouched.
- **Tests — `apps/api/src/tests/aiAgents.test.ts`** (24 cases). Pattern
  mirrors `ClaudeClient.test.ts` (global `fetch` stub via
  `vi.stubGlobal`). Coverage: `routeIntent` purity (hydro / agro /
  general / tie / case / word-boundary), `parseHandoff` (positive /
  no-handoff / malformed role / `--` ASCII separator), `resolveRole`
  (explicit > autoRoute > general), `runAgent` (composes 2-block system
  array with the cached base prompt verbatim, autoRoutes, defaults to
  general, parses handoff, forwards usage tokens), and a direct
  `ClaudeClient.chatWithRole` unit test that asserts the multi-block
  system array is constructed and forwarded.

### C.7 — Rotational grazing engine + livestock revenue bridge

- **New file `apps/web/src/features/livestock/engine/rotationEngine.ts`**
  exports `computeRotationCalendar({ paddocks, herdSize,
  animalUnitMonths?, parasiteBreakDays = 60, grazeDaysPerPaddock = 3 }):
  RotationCalendar`. Math: `cycleDays = grazeDaysPerPaddock ×
  paddocks.length`; `recoveryDays = cycleDays − grazeDaysPerPaddock` per
  paddock; `annualAuDays = herdSize × 365`; `cyclesPerYear = floor(365 /
  cycleDays)`; `parasiteBreakCompliant = every entry's recoveryDays ≥
  parasiteBreakDays`. The engine **wraps** the canonical
  `computeRotationCarryingCapacity` via a synthetic single-mob
  `RotationPlan` (every paddock in one cell group, `targetGrazeDays =
  grazeDaysPerPaddock`, `targetRestDays = parasiteBreakDays`) and a
  mob-grazed paddock list (per-paddock `stockingDensity = herdSize /
  areaHa`) so the AU math is never forked. Degenerate input (no
  paddocks, or `grazeDaysPerPaddock ≤ 0`) returns a well-formed zero
  calendar (`entries: []`, `cycleDays: 0`, `cyclesPerYear: 0`,
  `parasiteBreakCompliant: true` vacuously, `status: 'ok'`). Output
  carries `inputs` (paddockCount, herdSize, parasiteBreakDays,
  grazeDaysPerPaddock) for downstream observability.
- **New file
  `apps/web/src/features/financial/engine/livestockRevenue.ts`** exports
  `buildLivestockRevenueStream(calendar, { pricePerAuDay, startYear = 1,
  maturityYear?, confidence = 'medium', assumptions?, id?, name? }):
  RevenueStream`. `annualRevenue.{low,mid,high} = pricePerAuDay.{...} ×
  annualAuDays` (rounded). Default 5-year build-up ramp `[0.2, 0.4,
  0.65, 0.85, 1.0]` plateauing at 1.0 through year 10; `startYear`
  shifts the ramp. `assumptions[]` always surfaces: herd × 365 AU-days,
  rotation cycle + paddock count, parasite-break compliance line (✓
  "Parasite-break floor met (Xd minimum rest)" vs ✗ "WARNING:
  parasite-break floor NOT met — recovery Yd < Xd"), utilization +
  status, plus any caller-supplied lines. Default id
  `'revenue-livestock-rotation'`, enterprise `'livestock'`. The
  returned stream slots into `computeCashflow([], [stream], phases,
  horizon)` with **zero engine change** — the cashflow consumer already
  iterates `stream.rampSchedule[y] × stream.annualRevenue.{...}`.
- **UI integration — `RotationScheduleCard.tsx`** gains a "Cycle engine"
  summary block between the status pills row and the per-group
  timelines. Renders `cyclesPerYear`, `annualAuDays` (locale-formatted),
  a parasite-break compliance badge (green if compliant ≥ 60d, amber
  otherwise), and utilization % with status pill (`ok` / `tight` /
  `over`). Card doesn't track herd size today, so the block uses an
  **implied mob** heuristic of ~1 AU/ha (`Math.max(1, round(totalHa))`)
  — clearly labelled in the header hint so stewards know it's a
  placeholder until herd-size capture lands. **Additive only**: the
  existing ad-hoc moves table below is untouched per
  [[feedback-no-deletion]]. The plan-driven `RotationSequenceCard.tsx`
  is left alone — the new engine is decoupled from `RotationPlan` and
  doesn't compete with the canonical sequencer.
- **Tests** colocated under
  `apps/web/src/features/livestock/engine/__tests__/rotationEngine.test.ts`
  (8 cases) and
  `apps/web/src/features/financial/engine/__tests__/livestockRevenue.test.ts`
  (8 cases). Coverage: 11 paddocks × 3-day graze → `cycleDays 33`,
  `recoveryDays 30`, parasite-break NOT met; 11 × 6-day graze →
  `cycleDays 66`, `recoveryDays 60`, compliant; 50 AU × 365 = 18,250
  AU-days; 200-acre fixture at 1 AU / 2 acres → 36,500 AU-days;
  contiguous startDay sequence; degenerate empty + zero-herd paths;
  utilization roll-up. Revenue suite covers `annualRevenue.mid =
  pricePerAuDay.mid × annualAuDays`, enterprise tag, ramp 0 before
  startYear + monotone non-decreasing through plateau, startYear shift,
  WARNING / Parasite-break-floor-met assumptions, and end-to-end
  `computeCashflow` integration (year-0 = 0, year-1 > 0, year-10 ≥
  year-1).

## Consequences

- The protocol's "agent workforce" row is materially satisfied:
  steward UI can call `/api/v1/ai/agent-chat` with project context and
  receive a role-tagged answer, with optional autoRoute and a parseable
  handoff signal. Atlas keeps its single-voice identity via the cached
  base prompt while the addendum varies per role (caching the largest
  string across all role calls).
- The rotation→revenue pipeline is closed end-to-end. Phase D's J-curve
  composer can pull a real livestock stream off the rotation calendar
  instead of a constant placeholder; the engine's ramp schedule already
  produces the early-years dip the protocol's Phase 3 J-curve expects.
- Card-level engine output gives stewards an immediate "is this
  rotation actually working?" pill before any move is logged — without
  disturbing the existing ad-hoc moves workflow.
- The implied-mob heuristic is a known shortcut. When herd-size capture
  lands (steward-authored AU count per project), the heuristic falls
  away by a one-line `useMemo` change in the card; no engine signature
  changes.

## Verification

- `pnpm --filter @ogden/api run lint` → tsc clean.
- `pnpm --filter @ogden/api run test` → **653 passed / 3 skipped (656)**
  across 60 files.
- `pnpm --filter @ogden/web run lint` (`NODE_OPTIONS=--max-old-space-size=8192`)
  → only the pre-existing unrelated `StepBoundary.tsx(365,7)` error
  remains; C.6/C.7 contribute zero new tsc diagnostics (verified via
  stash-baseline comparison).
- `pnpm --filter @ogden/web run test` → **1620 passed (1620)** across 157
  files, including the 16 new C.7 cases.
- Manual 200-acre fixture smoke deferred per Assumption A2 — fixture has
  not been built yet; the in-test synthetic fixtures (`paddockSet(11)`,
  `200 × 4046.86 m²` 10-paddock spread) are the current proxy.

## Links

- Phase A ADR: [[2026-05-20-atlas-phase-a-apricot-lane-decision-layer]]
- Phase B ADR: [[2026-05-20-atlas-phase-b-design-map-generator]]
- Phase B.5 ADR: [[2026-05-20-atlas-phase-b5-design-map-wiring]]
- Restart plan: [[plan-apricot-lane-restart-2026-05-20]]
- Covenant: [[fiqh-csra-erased-2026-05-04]]
- No deletion in revamps: [[feedback-no-deletion]]
