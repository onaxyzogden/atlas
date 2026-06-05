# Protocols Dashboard

**Type:** module (v3 Protocols surface) -- **Status:** active (thin slice; Active view only) -- **Surface:** Atlas web (`apps/web`)
**Path:** `apps/web/src/v3/protocols/` + `apps/web/src/v3/act/protocols/` -- **Branch:** `feat/atlas-permaculture`

The Protocol Dashboard is a **fourth peer surface** alongside Observe / Plan / Act,
routed at `/v3/project/$projectId/protocols`. It shipped as the first end-to-end
vertical slice of the OLOS Protocol System
([[decisions/2026-06-02-olos-protocol-tier-slice]]) -- a walking skeleton proving the
architecture across every layer (shared model -> store -> Act trigger recognition ->
dashboard display) while widening the model to carry all four **severity tiers**.

A protocol is a pre-authored conditional rule -- an observable **Trigger** -> a
response **Recipe** -- carrying a severity tier (Stop / Respond / Watch / Abundance).
Authored in Plan, recognised in Observe/Act, recorded as an immutable activation.
This slice wires **RESPOND** (the canonical "generates assignable work" tier) end to
end; the other three tiers are model-supported but behaviourally deferred.

## Severity tiers (the new model dimension)

`severityTier` describes a protocol's RESPONSE POSTURE -- orthogonal to the existing
`ProtocolType` (`threshold|judgment|cyclical|freeform`, an EVALUATION model). The two
are independent axes ([[decisions/2026-06-02-olos-protocol-tier-slice]]).

`packages/shared/src/schemas/protocol/protocol.schema.ts`:
- `SeverityTier = z.enum(['stop','respond','watch','abundance'])`.
- OPTIONAL `severityTier` on `StandardProtocolTemplateSchema` (append-only, so the
  existing 10 templates and their conformance tests are unbroken).
- `resolveSeverityTier(t) => t.severityTier ?? 'respond'` -- every template resolves to
  RESPOND unless authored otherwise.
- `ProtocolActivationSchema` -- the immutable record (see below).

`packages/shared/src/constants/protocol/severityTierStyle.ts` -- `TIER_VISUAL:
Record<SeverityTier, TierVisual>` with the spec's **literal hexes + Unicode glyphs**
(NOT spine CSS-vars; the spec pins exact values):

| Tier | bg | fg | glyph | label |
|---|---|---|---|---|
| stop | `#FDECEA` | `#A31515` | `✕` (`✕`) | Stop |
| respond | `#FFF8E1` | `#B05C00` | `▲` (`▲`) | Respond |
| watch | `#EAF4FF` | `#2E75B6` | `●` (`●`) | Watch |
| abundance | `#F0F9F0` | `#3A7D44` | `♥` (`♥`) | Abundance |
| (pending) | `#F5F0FF` | `#6B48C8` | `⧖` (`⧖`) | Pending |

## ProtocolActivation (immutable history)

An append-only record of a recognised + resolved trigger, written when the steward
acts on the Trigger Recognition sheet. Fields: `id`, `projectId`, `templateId`,
`severityTier`, `confirmationStatus` (`confirmed|false_positive|pending_review`), a
**frozen** `recipeSnapshot {name,condition,response}` (so later template edits never
rewrite history), `activatedAt`, reserved-unpopulated `season`/`cycleNumber`/
`weatherConditionAtActivation`, and `triggerContext` defaulting to
`'act_proof_capture'`. Distinct from the `ActivatedProtocolRecord` lifecycle (see
store below) -- the activation is history, the record is current state.

## Key files

- `apps/web/src/v3/protocols/TierBadge.tsx` -- shared tier chip; reads
  `TIER_VISUAL[tier]`, renders the bold Unicode glyph in `fg` on `bg` with a
  `1px solid ${fg}` border + the label. `data-testid="tier-badge"`.
- `apps/web/src/v3/protocols/ProtocolsDashboardPage.tsx` -- the **Active view**.
  Reads project type the same way `ProtocolApprovalOverlay` does
  (`useProjectStore` -> `metadata.projectTypeRecord` -> `primaryTypeId`/
  `secondaryTypeIds`); reuses `useProtocolLibrary(...)` for `templates`/
  `statusByTemplate`/`outputs` and `useProtocolActivations(projectId)` for the recent
  strip. Active = every template with `statusByTemplate[id] === 'active'`, each
  rendered with the existing `ProtocolLibraryCard` (testid `protocol-template-card`)
  PLUS a `<TierBadge tier={resolveSeverityTier(t)} />`. Below, a "Recent activations"
  list maps each activation to `TIER_VISUAL[a.severityTier].icon` +
  `a.recipeSnapshot.name` + `a.confirmationStatus` (row testid
  `protocol-activation-row`, with `data-activation-status`).
- `apps/web/src/v3/act/protocols/TriggerRecognitionSheet.tsx` -- the Act
  proof-capture recognition surface. Slide-up sheet
  (`data-testid="trigger-recognition-sheet"`): `<TierBadge>` + protocol name in
  Georgia serif (the spec pins Georgia here) + a <=12-word sub-line (truncated
  `rationale`) + a three-option action row (`Confirm` -> `onResolve('confirmed')`,
  `Dismiss` -> `'false_positive'`, `Flag for review` -> `'pending_review'`) + a "Why
  this protocol?" IF/THEN expand (reuses `AutoFilledCondition` + `outputs`) + an
  evidence thumbnail. WATCH 30s auto-confirm countdown deferred (RESPOND has none).

## Store: the activations slice

`apps/web/src/store/protocolStore.ts` (persist key `ogden-protocols`, **version 2**)
gained a NEW `activations: ProtocolActivation[]` array ALONGSIDE the existing
`records: ActivatedProtocolRecord[]` lifecycle array -- the lifecycle actions
(`activateProtocol`/`markTriggered`/`logResponse`/`defer`/`suspendProtocol`/
`deactivateProtocol`) are untouched.

- `recordActivation(input)` -- append-only; defaults `id` (`crypto.randomUUID()`),
  `activatedAt` (`new Date().toISOString()`), `triggerContext`
  (`'act_proof_capture'`); accepts caller-pinned `id`/`activatedAt` for deterministic
  tests; NEVER mutates prior activations or `records`.
- `getActivations(projectId)` -- imperative read, newest-first.
- `useProtocolActivations(projectId)` -- reactive hook; selects the stable
  `activations` array and `useMemo`-filters newest-first. **Mirrors
  `useTriggeredProtocols`: never an inline `.filter()` selector** -- under Zustand v5
  a fresh array each render drives an infinite re-render loop ("Maximum update depth
  exceeded").
- Persist `version: 2` with a version-aware `migrate` returning
  `{ records: p.records ?? [], activations: [] }` for `fromVersion < 2` (v1 users keep
  `records`, gain empty `activations`); `partialize` includes both arrays.

`ActivatedProtocolRecord` lifecycle (unchanged): `activateProtocol` -> `active`;
`markTriggered` -> `triggered`; `logResponse` -> back to `active` + `lastLoggedAt`. A
protocol can legitimately be `active` AND carry a confirmed activation in history (the
post-response state).

## Mount + routing

- `ActTierExecutionPanel.tsx` (Act tier shell, see [[entities/act-tier-shell]]) mounts
  `TriggerRecognitionSheet` conditionally after `handleRecord()` records the
  observation, choosing the highest-priority **active RESPOND** template relevant to
  the objective's domain (via `useProtocolLibrary` + `FEEDS_TO_MODULE`). `onResolve`
  calls `recordActivation(...)` and, on `'confirmed'`, also `markTriggered(...)` --
  bridging the new activation history to the legacy lifecycle / Act badge.
- Route `v3ProtocolsRoute` (`path: 'protocols'`, `?view=active` reserved) under
  `v3ProjectLayoutRoute` in `apps/web/src/routes/index.tsx`; `DecisionRail` extended
  with `'protocols'` (`STAGE_TITLE.protocols = 'Protocols'`); `V3ProjectLayout`
  resolves the segment and adds `'protocols'` to `SELF_RAILED_STAGES` (the dashboard
  owns its own layout, like plan/act).
- **Nav entry point:** a thin always-reachable `Protocols` `<Link>` on
  `ProjectBundleBar` (project-frame chrome; omitted off-project) -- the smallest mount
  that reaches the peer route without threading a link through the header stage-spine
  (which does not enumerate Protocols). See the nav-link scope decision in the ADR.

## Current state (2026-06-02)

Thin slice shipped: 10 explicit-path commits (`6703f195` A1 -> `04214b0b` A2 ->
`946051ca` A3 -> `23feb82a` B1 -> `a4d031c2` C1 -> `8bd1a644` C2 -> `0f3ab43f` C3 ->
`70a2c82f` D1 -> `1a06813a` D2 -> `b3e99e0e` nav link; not pushed). shared + web tsc
clean (foreign errors excepted); all new specs green; ProjectBundleBar 5/5.
Live-verified via `preview_eval` DOM ([[project-screenshot-hang]]). A live-demo
RESPOND protocol was seeded on project `mtc` through the protocolStore's genuine
actions (`activateProtocol` -> `recordActivation` -> `markTriggered` -> `logResponse`,
the exact functions the Approve button + Trigger sheet call) using a temporary
in-pattern DEV `window.__ogdenProtocolStore` handle that was then REVERTED -- so the
repo is clean while the seed persists from localStorage; the dashboard then showed
card=1 + tier badge `▲ Respond` + activation row `▲ Paddock Rotation -- Cover Trigger
confirmed`. See [[log/2026-06-02-olos-protocol-tier-slice]].

## Deferred

See the ADR for the full deferral list: other 3 dashboard views, other 2 trigger
contexts, the Option C 5-component authoring editor, full STOP/WATCH/ABUNDANCE tier
behaviours, the `ProtocolLog` surface, offline activation queue + sync, the
auto-evaluation engine + normalized trigger/recipe/task objects, catalogue expansion,
and the biodynamic/seasonal calendar driving the reserved activation fields.

## Notes

- `v3/plan/spine/` files and `ProtocolConfirmationFlow` are **import-only** (read as
  reference, never edited). No deletions ([[feedback-no-deletion]]).
- ASCII-only copy; tier glyphs written as `\uXXXX` escapes in source. CSRA model
  untouched ([[fiqh-csra-erased-2026-05-04]]). Not pushed ([[project-branch-rebase]]).
- Predecessor protocol work: [[log/2026-05-31-protocol-layer-act-stage-surface]]
  (the divergent no-tier slice this evolved in place),
  [[decisions/2026-05-31-atlas-plan-spine-live-reskin]] (§10.1 parameter/approval flow),
  [[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]] (Act rail toggle).
