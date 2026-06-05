# 2026-06-02 -- OLOS Protocol System: thin end-to-end vertical slice (evolve-in-place, severity tiers + immutable activations)

**Date:** 2026-06-02
**Status:** Accepted (slice shipped; breadth deferred)
**Branch:** `feat/atlas-permaculture` (10 explicit-path commits; **not pushed** -- [[project-branch-rebase]])

## Context

The operator handed off the complete OLOS Protocol System UX spec suite (Object
Model v1.1, Dashboard v1.0, Authoring Guide v1.3, Trigger Recognition v1.1) plus
a working prototype (`olos_protocol_prototype.jsx`). A protocol is a pre-authored
conditional rule: an observable **Trigger** -> a response **Recipe**, carrying one
of four **severity tiers** (Stop / Respond / Watch / Abundance), authored in Plan,
recognised in Observe/Act, executed as assignable field actions.

The atlas app already carried a **partial, divergent** protocol slice: 10
enterprise-scoped templates, a Design<->Protocol Plan mode, `protocolStore`, the
Act `ProtocolLayerPanel` / `TriggeredProtocolsPanel`
([[log/2026-05-31-protocol-layer-act-stage-surface]],
[[log/2026-05-31-plan-spine-reskin-protocol-trigger]],
[[log/2026-05-31-act-protocol-rail-plan-header]]) -- whose model had **no severity
tiers** (`ProtocolType = threshold|judgment|cyclical|freeform`, an evaluation model,
not a response posture). The full spec suite spans build phases 2.5-4 and is far
too large for one plan.

**Two operator scope decisions (this session):**
1. **Scope = thin end-to-end vertical slice** -- a walking skeleton proving the
   architecture across every layer with the minimum surface; defer breadth.
2. **Reconciliation = evolve in place** -- extend the existing schema / store /
   components to carry the tier dimension; do NOT fork a parallel model and do NOT
   delete working components ([[feedback-no-deletion]]).

**Amanah gate:** agronomic protocol tooling (livestock / land stewardship); benign,
halal. No riba/gharar, no CSRA / advance-purchase framing ([[fiqh-csra-erased-2026-05-04]]),
ASCII-only -- cleared.

## Decision

Prove a single path end to end: **a RESPOND-tier protocol, displayed in a Protocol
Dashboard *Active* view, recognised via a Trigger Recognition bottom sheet mounted
on the Act proof-capture surface (`ActTierExecutionPanel`), writing an immutable
`ProtocolActivation` with `confirmationStatus: 'confirmed'`** -- while widening the
shared model to support all four tiers backward-compatibly.

- **RESPOND** is the canonical tier that "generates assignable work"; it exercises
  the full Trigger -> Recipe -> activation -> confirmation chain. STOP / WATCH /
  ABUNDANCE are behavioural variants of the same machinery, so proving RESPOND
  proves the spine.
- Authoring ships as a **tier display (badge)** sourced from the model on owned
  surfaces -- NOT the full Option C 5-component editor (deferred).

**Phase A -- shared model (append-only, backward compatible):**
- `SeverityTier = z.enum(['stop','respond','watch','abundance'])` + an OPTIONAL
  `severityTier` on `StandardProtocolTemplateSchema` + `resolveSeverityTier(t)`
  defaulting to `'respond'` -- so the existing 10 templates and their conformance
  tests keep passing (commit `6703f195`).
- `severityTierStyle.ts` `TIER_VISUAL: Record<SeverityTier, TierVisual>` with the
  spec's **literal hexes + Unicode glyphs** (NOT spine CSS-vars; the spec pins exact
  values): stop `#FDECEA`/`#A31515` `✕`; respond `#FFF8E1`/`#B05C00` `▲`;
  watch `#EAF4FF`/`#2E75B6` `●`; abundance `#F0F9F0`/`#3A7D44` `♥`; plus
  `PENDING_VISUAL` `#F5F0FF`/`#6B48C8` `⧖` (commit `04214b0b`).
- `ProtocolActivationSchema` -- an immutable record: `id`, `projectId`, `templateId`,
  `severityTier`, `confirmationStatus` (`confirmed|false_positive|pending_review`),
  a frozen `recipeSnapshot {name,condition,response}` (so later template edits never
  rewrite history), `activatedAt`, reserved-unpopulated `season`/`cycleNumber`/
  `weatherConditionAtActivation`, and `triggerContext` defaulting to
  `'act_proof_capture'` (commit `946051ca`).

**Phase B -- store (immutable activations slice; persist v1 -> v2):** a NEW
`activations: ProtocolActivation[]` array ALONGSIDE the existing `records`
lifecycle array in `protocolStore` (the `ActivatedProtocolRecord` lifecycle/actions
are untouched). `recordActivation` is append-only (never mutates prior entries or
`records`); `useProtocolActivations(projectId)` mirrors `useTriggeredProtocols`
(stable-array select + `useMemo`, NEVER an inline `.filter()` selector -- that drives
a Zustand-v5 infinite re-render loop). Persist bumped to `version: 2` with a
version-aware `migrate` returning `{ records: p.records ?? [], activations: [] }`
for `fromVersion < 2` (existing v1 users keep `records`, gain empty `activations`)
(commit `23feb82a`).

**Phase C -- Trigger Recognition bottom sheet (Act proof capture):** `TierBadge`
shared component (reads `TIER_VISUAL[tier]`, `data-testid="tier-badge"`, commit
`a4d031c2`); `TriggerRecognitionSheet` (slide-up, tier badge + Georgia-serif name +
<=12-word sub-line + three-option action row Confirm/Dismiss/Flag, "Why this
protocol?" IF/THEN expand, evidence thumb; WATCH 30s auto-confirm deferred, commit
`8bd1a644`); mounted in `ActTierExecutionPanel` after `handleRecord()` -- on Confirm
it `recordActivation(...)` AND calls the existing `markTriggered(...)` to bridge the
legacy lifecycle / Act badge (commit `0f3ab43f`).

**Phase D -- Protocol Dashboard route + peer nav:** `ProtocolsDashboardPage` Active
view (every template with `statusByTemplate[id] === 'active'`, each via the existing
`ProtocolLibraryCard` + a `<TierBadge tier={resolveSeverityTier(t)} />`, plus a Recent
activations strip, commit `70a2c82f`); the `/v3/project/$projectId/protocols` route as
a peer of Plan/Act/Observe, registered in `DecisionRail` + `V3ProjectLayout`
(`SELF_RAILED_STAGES`) with `?view=active` reserved (commit `1a06813a`). **Nav-link
scope decision:** rather than threading a new link through the header stage-spine
(which does not enumerate Protocols), the entry point was surfaced as a thin,
always-reachable `Protocols` `<Link>` on the existing `ProjectBundleBar` (project-frame
chrome, omitted off-project) -- the smallest mount that reaches the new peer route
without touching the spine (commit `b3e99e0e`).

## Consequences

- The model now carries the four severity tiers (`SeverityTier` + `TIER_VISUAL`) and
  an immutable `ProtocolActivation` type, all backward compatible -- the existing 10
  templates and prior protocol specs are unbroken (A1 parses all 10).
- `protocolStore` has an `activations` slice (persist v2; the migration preserves v1
  `records`). A protocol can legitimately be `active` AND carry a confirmed activation
  in history -- the post-response lifecycle state.
- A new `/v3/project/$projectId/protocols` route renders the Active view with tier
  badges + a recent-activations strip. In the Act proof-capture flow, recording an
  observation surfaces the Trigger Recognition sheet for a relevant active RESPOND
  protocol; Confirm writes one `ProtocolActivation` (`confirmed`) and lights the
  existing triggered lifecycle.
- **Verified:** shared + web tsc clean (pre-existing foreign errors excepted); all new
  specs green (A1-A3 shared; `protocolStore.activations`, `TierBadge`,
  `TriggerRecognitionSheet`, `ActTierExecutionPanel`, `ProtocolsDashboardPage` web);
  ProjectBundleBar 5/5. Live-verified via `preview_eval` DOM ([[project-screenshot-hang]]
  -- `preview_screenshot` unavailable on this Windows setup) -- see the live-demo seed
  note in the log.
- **`v3/plan/spine/` files and `ProtocolConfirmationFlow` were import-only** (read as
  reference, never edited); no deletions; ASCII-only copy (tier glyphs as `\uXXXX`
  escapes in source). Not pushed ([[project-branch-rebase]]); foreign WIP untouched
  ([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]); CSRA
  model untouched ([[fiqh-csra-erased-2026-05-04]]).

## Deferred (explicit)

Other 3 dashboard views (Overview default, History, Authoring sub-mode); other 2
trigger contexts (Observe domain detail, Act map); the full Option C dual-context
5-component authoring editor + interactive tier selector; full STOP (project-wide
halt + banner), WATCH (log-only + 30s auto-confirm countdown), ABUNDANCE (begin
observation cycle) tier behaviours (model supports all four; only RESPOND wired end
to end); the `ProtocolLog` surface; offline-first activation queue + sync; multi-device
Stop propagation; the 6 first-class trigger types + auto-evaluation engine; normalized
`ProtocolTrigger`/`ProtocolRecipe`/`ProtocolTask` objects (slice keeps the recipe inline
via `recipeSnapshot` + template `condition`/`response`); catalogue expansion beyond the
10 templates; the biodynamic/seasonal calendar that would populate the reserved
`season`/`cycleNumber`/`weatherConditionAtActivation` fields.

Entity [[entities/protocols-dashboard]]; entity [[entities/act-tier-shell]];
Log: [[log/2026-06-02-olos-protocol-tier-slice]];
builds on [[decisions/2026-05-31-atlas-plan-spine-live-reskin]] and
[[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]].
