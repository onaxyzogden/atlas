# 2026-06-02 -- OLOS Protocol System: thin end-to-end vertical slice (severity tiers + immutable activations + Protocol Dashboard peer route)

**Branch.** `feat/atlas-permaculture` (10 explicit-path commits `6703f195` A1 ->
`04214b0b` A2 -> `946051ca` A3 -> `23feb82a` B1 -> `a4d031c2` C1 -> `8bd1a644` C2 ->
`0f3ab43f` C3 -> `70a2c82f` D1 -> `1a06813a` D2 -> `b3e99e0e` nav link; **not
pushed**). First end-to-end vertical slice of the OLOS Protocol System, evolving the
existing partial/divergent protocol slice in place rather than forking a parallel
model ([[decisions/2026-06-02-olos-protocol-tier-slice]]). Operator scope: **thin
end-to-end slice** + **evolve in place** (no fork, no deletion). One path proven:
author/display a tier-bearing protocol -> see it in a Protocol Dashboard Active view
-> recognise its trigger on Act proof capture -> write an immutable `ProtocolActivation`
(`confirmed`); meanwhile the model is widened to all four severity tiers
backward-compatibly.

**Phase A -- shared model (append-only, backward compatible).** `6703f195` A1:
`SeverityTier = z.enum(['stop','respond','watch','abundance'])` + OPTIONAL
`severityTier` on `StandardProtocolTemplateSchema` + `resolveSeverityTier(t) =>
t.severityTier ?? 'respond'` (describes RESPONSE POSTURE; orthogonal to the existing
`ProtocolType` evaluation model). `04214b0b` A2: `severityTierStyle.ts` `TIER_VISUAL`
with the spec's literal hexes + Unicode glyphs (NOT spine CSS-vars; spec pins exact
values) -- stop `#FDECEA`/`#A31515` `✕`; respond `#FFF8E1`/`#B05C00` `▲`;
watch `#EAF4FF`/`#2E75B6` `●`; abundance `#F0F9F0`/`#3A7D44` `♥`; plus
`PENDING_VISUAL` `#F5F0FF`/`#6B48C8` `⧖`. `946051ca` A3: immutable
`ProtocolActivationSchema` (`id`, `projectId`, `templateId`, `severityTier`,
`confirmationStatus` `confirmed|false_positive|pending_review`, FROZEN
`recipeSnapshot {name,condition,response}` so later template edits never rewrite
history, `activatedAt`, reserved-unpopulated `season`/`cycleNumber`/
`weatherConditionAtActivation`, `triggerContext` defaulting `'act_proof_capture'`).
All optional/defaulted -> the existing 10 templates + prior conformance specs parse
unchanged (A1 parses all 10).

**Phase B -- store (immutable activations slice; persist v1 -> v2).** `23feb82a` B1:
a NEW `activations: ProtocolActivation[]` array ALONGSIDE the existing `records`
lifecycle array in `protocolStore` (the `ActivatedProtocolRecord` lifecycle/actions
untouched). `recordActivation(input)` append-only (defaults `id` via
`crypto.randomUUID()`, `activatedAt`, `triggerContext`; accepts caller-pinned
`id`/`activatedAt` for determinism; never mutates prior entries or `records`);
`getActivations` imperative newest-first; `useProtocolActivations(projectId)` mirrors
`useTriggeredProtocols` -- stable-array select + `useMemo`, NEVER an inline `.filter()`
selector (that drives a Zustand-v5 infinite re-render loop). Persist `version: 2` with
a version-aware `migrate` returning `{ records: p.records ?? [], activations: [] }`
for `fromVersion < 2` (v1 users keep `records`, gain empty `activations`);
`partialize` extended.

**Phase C -- Trigger Recognition bottom sheet (Act proof capture).** `a4d031c2` C1:
`TierBadge.tsx` (reads `TIER_VISUAL[tier]`, bold Unicode glyph in `fg` on `bg`,
`1px solid ${fg}` border + label, `data-testid="tier-badge"`). `8bd1a644` C2:
`TriggerRecognitionSheet.tsx` -- slide-up sheet
(`data-testid="trigger-recognition-sheet"`) with `<TierBadge>`, protocol name in
Georgia serif (spec-pinned), a <=12-word truncated `rationale` sub-line, a
three-option action row (`Confirm` -> `onResolve('confirmed')`, `Dismiss` ->
`'false_positive'`, `Flag for review` -> `'pending_review'`), a "Why this protocol?"
IF/THEN expand (reuses `AutoFilledCondition` + `outputs`), an evidence thumbnail;
WATCH 30s auto-confirm deferred (RESPOND has none). `0f3ab43f` C3: mounted in
`ActTierExecutionPanel.tsx` after `handleRecord()` -- picks the highest-priority active
RESPOND template relevant to the objective's domain (via `useProtocolLibrary` +
`FEEDS_TO_MODULE`); `onResolve(status)` -> `recordActivation({... recipeSnapshot
captured now, triggerContext:'act_proof_capture'})`, and on `'confirmed'` also calls
the existing `markTriggered(...)` to bridge the legacy lifecycle / Act badge; existing
panel behaviour intact (additive only).

**Phase D -- Protocol Dashboard route + peer nav (Active view).** `70a2c82f` D1:
`ProtocolsDashboardPage.tsx` -- reads project type like `ProtocolApprovalOverlay`
(`useProjectStore` -> `metadata.projectTypeRecord` -> `primaryTypeId`/
`secondaryTypeIds`), reuses `useProtocolLibrary(...)` (`templates`/`statusByTemplate`/
`outputs`) + `useProtocolActivations(projectId)`. Active = every template with
`statusByTemplate[id] === 'active'`, each via the existing `ProtocolLibraryCard`
(testid `protocol-template-card`) + `<TierBadge tier={resolveSeverityTier(t)} />`; a
"Recent activations" strip maps rows to `TIER_VISUAL[a.severityTier].icon` +
`a.recipeSnapshot.name` + `a.confirmationStatus` (row testid
`protocol-activation-row`). `1a06813a` D2: `v3ProtocolsRoute` (`path: 'protocols'`,
`?view=active` reserved) under `v3ProjectLayoutRoute`; `DecisionRail` extended with
`'protocols'` + `STAGE_TITLE.protocols = 'Protocols'`; `V3ProjectLayout` resolves the
segment and adds `'protocols'` to `SELF_RAILED_STAGES` (dashboard owns its own layout,
like plan/act). `b3e99e0e` nav link: rather than thread a link through the header
stage-spine (which does not enumerate Protocols), surfaced a thin always-reachable
`Protocols` `<Link>` on `ProjectBundleBar` (project-frame chrome; `projectId &&`
guarded so it is omitted off-project) -- the smallest mount reaching the peer route.

**Verified.** shared + web tsc clean (pre-existing FOREIGN errors in
`src/v3/act/asBuilt/ActAsBuiltPopover.tsx` / `src/lib/syncService.ts` excepted; none in
my files); all new specs green -- shared `severityTier`/`severityTierStyle`/
`protocolActivation`; web `protocolStore.activations`/`TierBadge`/
`TriggerRecognitionSheet`/`ActTierExecutionPanel`/`ProtocolsDashboardPage`;
ProjectBundleBar 5/5. **DOM/preview** ([[project-screenshot-hang]] --
`preview_screenshot` unavailable on this Windows setup, so `preview_eval` on port
5200, disclosed): the dashboard rendered `protocol-template-card` nodes + a `▲`
tier-glyph node; after satisfying evidence + Record on the Act tier-shell the
`trigger-recognition-sheet` mounted, Confirm appended exactly one
`protocol-activation-row` (read in a separate `preview_eval` after the React flush).

**Live-demo seed (closing the one disclosed verification gap).** The plan's
preview check exercised the sheet, but a persisted dashboard artifact had not been
shown. Investigated the genuine Plan-UI activation path: the center Plan
`ProtocolColumn` rows only toggle SELECTION (detail stack), not activation; the only
real activation path is the S6-gated `ProtocolApprovalOverlay` (`handleActivate` ->
`activateProtocol`), which would require completing an S6 objective + mutating real
project state -- heavy and fragile. Chose instead to confine the mutation to the
protocol store via its GENUINE actions (the exact functions the Approve button + the
Trigger sheet's `onResolve` call), NOT hand-written JSON. `protocolStore` was the odd
store out -- the 5 sibling stores expose a DEV `window.__ogden<Name>Store` handle
(`typeof window !== 'undefined'` guarded) but it did not; added the handle
in-pattern, seeded, then REVERTED it -- so `git status`/`git diff` are clean while the
seed persists from localStorage. Seeded on project `mtc`: `activateProtocol` ->
`recordActivation` (template `paddock-rotation-cover-trigger` "Paddock Rotation --
Cover Trigger", `severityTier:'respond'`, `confirmationStatus:'confirmed'`) ->
`markTriggered` -> `logResponse` (returns the record to `active` with `lastLoggedAt`,
so the Active view -- which filters `status==='active'` -- shows the card WHILE the
confirmed activation sits in history). Final live state (handle gone,
`typeof window.__ogdenProtocolStore === 'undefined'`): card=1, tier badge=1
(`▲ Respond`), activation row=1 (`▲ Paddock Rotation -- Cover Trigger
confirmed`) -- all from persisted localStorage. Genuine, data-driven artifact; gap
closed.

**Constraints.** `v3/plan/spine/` files + `ProtocolConfirmationFlow` import-only (read
as reference, never edited); no deletions ([[feedback-no-deletion]]); explicit-path
commits, foreign WIP untouched ([[feedback-commit-immediately-on-rebased-branches]]);
not pushed -- push was NOT requested this session ([[project-branch-rebase]]);
ASCII-only copy (tier glyphs as `\uXXXX` escapes in source); CSRA model untouched
([[fiqh-csra-erased-2026-05-04]]). Amanah gate cleared (agronomic stewardship tooling;
no riba/gharar).

Entity [[entities/protocols-dashboard]] (NEW); entity [[entities/act-tier-shell]];
ADR [[decisions/2026-06-02-olos-protocol-tier-slice]]; evolves in place the divergent
no-tier slice [[log/2026-05-31-protocol-layer-act-stage-surface]]; builds on
[[decisions/2026-05-31-atlas-plan-spine-live-reskin]] +
[[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]].
