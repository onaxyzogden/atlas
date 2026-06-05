# 2026-06-04 — Act tier-shell Protocol surface: stratum scope + clickable cards + right-rail detail

**Project:** Atlas / OLOS · branch `feat/atlas-permaculture`
**Commit:** `e15e04e9` (9 files, +673/−24, local-only, not pushed)
**ADR:** [[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]]
**Entity:** [[entities/act-tier-shell]]

## What

Made the Act Protocol surface symmetric with the Objective surface, per two
operator decisions: (Q1) scope the left protocol list *strictly* to the selected
stratum, triggered protocols surface in the Dashboard tab; (Q2) clicking a card
opens a right-rail detail = full card + activate/deactivate(/suspend) controls,
with the right tab relabelled "Protocols" in protocols mode.

## Changes

- `ProtocolLayerPanel.tsx` — optional `activeStratumId` (maps
  `filterProtocolGroups(groups, activeStratumId)`, header counts from the visible
  set), `onSelectProtocol`, `selectedProtocolId`. All optional → Plan rail
  byte-identical.
- `ProtocolLibraryCard.tsx` — optional `onSelect` + `selected` → `role="button"`,
  `tabIndex={0}`, click + Enter/Space, `data-selected`, `C.blue` selected border;
  inert when `onSelect` absent.
- `ActTierObjectiveRail.tsx` — threads the 3 new props (required here) shell→panel.
- `ActTierShell.tsx` — `selectedProtocolId` state + `handleSelectProtocol`
  (toggle-off on re-click); contextual right tab "Protocols" (`ShieldCheck`,
  disabled until selected) vs "Objective"; right body branches to
  `ActProtocolDetailPane`; effects clear selection on stratum change + reconcile
  `rightMode` on rail-mode change.
- **New** `ActProtocolDetailPane.tsx` — full `ProtocolLibraryCard`
  (`emphasis="normal"`, verbatim Amanah `scopeNotes`) + activation controls wired
  to `protocolStore` (`activateProtocol`/`deactivateProtocol`/`suspendProtocol`);
  empty state for unknown templateId. No store change.
- Tests: `ProtocolLayerPanel.act.test.tsx` (+stratum scope / click / selected),
  `ProtocolLibraryCard.test.tsx` (+onSelect button semantics), **new**
  `ActProtocolDetailPane.test.tsx` (4), `ActTierObjectiveRail.test.tsx`
  (renderRail + inline rerender now supply the 3 new props; +3 protocols-mode
  threading tests).

## Q1 — no code needed

`TriggeredProtocolsPanel` (in `ActOpsDashboard`) is already project-scoped /
all-strata and unchanged. It returns `null` only when zero protocols are status
`'triggered'` (activation ≠ triggered) — an empty render is correct, not a
scoping regression. Strict left-rail scoping hides nothing.

## Verification

- `tsc --noEmit` clean (8GB heap) — twice, before and after the test-file edits.
- 42 bounded vitest green across the four touched suites
  (`--pool=forks --testTimeout=20000`).
- Live DOM proof on a compost project's Act tier shell (rate-limited initial sync
  cleared on retry): (a) only S6 heading renders (9 templates); (b) card click →
  detail pane (full card + IF body + Activate) + right tab "Protocols" + card
  `data-selected`; (c) Activate → card `data-protocol-status="active"` + control
  flips to Deactivate/Suspend; (d) spine S5 click → selection cleared, pane gone,
  right "Protocols" tab disabled, heading now S5; (e) Dashboard tab mounts
  (Alerts / Today's Priorities / Upcoming Events).

## Notes

- Commit staged by explicit pathspec (9 files only); foreign WIP
  (`syncService.ts`, `projectStore.ts`, `ActTierCategorizedToolsRail.tsx`,
  `snapPoint.ts`, scratch `*.txt`/`*.out`, foreign wiki files) left unstaged.
- Branch 242 ahead / 0 behind `origin/feat/atlas-permaculture` at commit time;
  not pushed ([[project-branch-rebase]] — push only when asked).
- Live proof left one protocol (`u-s6-yield-shortfall`) `active` in the compost
  project's local `protocolStore` (dev preview, local-only state).

## Deferred

- Persist `selectedProtocolId` across reload (currently session-local, mirrors
  `RailMode`).
- No bulk activation; suspend/resume only via the detail pane.
