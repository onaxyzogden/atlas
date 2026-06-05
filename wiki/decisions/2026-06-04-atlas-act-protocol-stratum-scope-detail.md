# ADR: Act tier-shell Protocol surface — stratum scope + clickable cards + right-rail detail

**Date:** 2026-06-04
**Status:** accepted
**Project:** Atlas / OLOS · branch `feat/atlas-permaculture`
**Commit:** `e15e04e9` (9 files, local-only, not pushed)
**Related:** [[entities/act-tier-shell]] · [[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]] · [[decisions/2026-06-02-olos-protocol-tier-slice]] · [[entities/protocols-dashboard]]

## Context

The Act tier shell's left rail toggles Objectives / Protocols mode
(`ActRailModeToggle`); its right rail toggles a Dashboard (`ActOpsDashboard`) /
Objective-detail (`ActTierExecutionPanel`) view. Two asymmetries in the Protocol
experience vs the Objective experience:

1. **The protocol list ignored the selected stratum.** In Protocols mode the rail
   mounted `ProtocolLayerPanel`, which renders all 7 strata (S1→S7). But the Act
   surface is navigated *by stratum* (`resolveActStratumId` yields a never-null
   `selectedStratumId`), so the steward should see only the open stratum's
   protocols — the same scoping Plan mode already does via `filterProtocolGroups`.
2. **Protocol cards were inert.** Selecting a card and seeing its detail in the
   right rail (where Objective detail appears) would make the Protocol surface
   symmetric with the Objective surface.

## Operator decisions (this session)

- **Q1 — triggered-protocol visibility.** Scope the left panel *strictly* to the
  selected stratum; triggered protocols (any stratum) remain visible in the
  **Dashboard tab**. *Finding:* already satisfied — `ActOpsDashboard` renders the
  project-scoped, all-strata `TriggeredProtocolsPanel`. No new surfacing code; we
  do NOT duplicate triggered items into `AlertsPanel` (would double-surface).
- **Q2 — right-rail detail depth.** "Card + activation controls": the detail pane
  renders the full `ProtocolLibraryCard` PLUS an activate/deactivate(/suspend)
  control row wired to `protocolStore`.

## Decision

- `ProtocolLayerPanel` gains three **optional** props: `activeStratumId`
  (scopes via `filterProtocolGroups`, header counts derived from the visible
  set), `onSelectProtocol`, `selectedProtocolId`. Omitted on the Plan rail →
  byte-identical behaviour (back-compat; no Plan test change).
- `ProtocolLibraryCard` gains optional `onSelect` + `selected` → `role="button"`,
  Enter/Space + click, `data-selected`, `C.blue` selected border; inert otherwise.
- `ActTierObjectiveRail` threads `activeStratumId` / `selectedProtocolId` /
  `onSelectProtocol` (made **required** there) shell→panel.
- New `ActProtocolDetailPane.tsx`: full card (not collapsed → verbatim Amanah
  `scopeNotes` preserved) + activation controls reusing existing `protocolStore`
  actions (no store change, no persist bump). Empty state for unknown templateId.
- `ActTierShell`: `selectedProtocolId` state + `handleSelectProtocol` (toggle-off
  on re-click); contextual right tab labelled "Protocols" (`ShieldCheck`,
  disabled until a protocol is selected) in protocols mode; right body branches
  to the detail pane; effects clear the selection on stratum change and reconcile
  `rightMode` on rail-mode change.

## Consequences

- **Positive:** Protocol surface is now symmetric with Objectives; the steward
  sees only the open stratum's protocols and can inspect + activate one in place.
  Reuse of `filterProtocolGroups` + `ProtocolLibraryCard` + `protocolStore` kept
  the change additive. Verbatim Amanah caution (bayʿ mā laysa ʿindak class)
  preserved in the full card.
- **Neutral / accepted:** the right "Protocols" tab is disabled until a card is
  selected (mirrors the Objective tab's `disabled={!objectiveId}`).
- **No regression to triggered visibility:** unchanged `TriggeredProtocolsPanel`
  remains the all-strata surface; it renders nothing only when zero protocols are
  status `'triggered'` (activation ≠ triggered).

## Verification

tsc clean (8GB heap); 42 bounded vitest green
(`--pool=forks --testTimeout=20000`). Live DOM proof on a compost project: (a)
single-stratum heading; (b) card click → detail pane + "Protocols" tab + Activate;
(c) Activate flips `data-protocol-status` to `active` + control to Deactivate/Suspend;
(d) stratum switch clears selection + disables the tab; (e) Dashboard mounts.

## Deferred

- Suspend/Resume affordance surfaced only in the detail pane; no bulk activation.
- No persistence of `selectedProtocolId` across reload (mirrors `RailMode`, which
  is also session-local).
