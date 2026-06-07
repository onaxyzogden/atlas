# ADR: Act tier-shell Protocols — URL-persisted selection + bulk activation

**Date:** 2026-06-04
**Status:** accepted
**Project:** Atlas / OLOS · branch `feat/atlas-permaculture`
**Commit:** `2f2012a0` (9 files, +774/-33, local-only, not pushed)
**Related:** [[entities/act-tier-shell]] · [[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]] · [[decisions/2026-05-31-atlas-act-protocol-rail-plan-header]] · [[entities/protocols-dashboard]] · [[fiqh-csra-erased-2026-05-04]]

## Context

The stratum-scope/clickable-detail slice ([[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]], commit `e15e04e9`) explicitly deferred two items:

1. **No persistence.** `railMode`, `rightMode`, and `selectedProtocolId` were session-local `useState` in `ActTierShell`; a reload dropped the steward back to Objectives mode with no selection. Persisting `selectedProtocolId` alone is incoherent unless `railMode='protocols'` survives too.
2. **No bulk activation.** Protocols could only be activated one at a time via the detail pane; no way to activate a whole stratum's protocols at once.

## Operator decisions (this session, AskUserQuestion)

- **Persistence mechanism → URL search params.** `?mode=protocols&protocol=<templateId>` on the stratum route; deep-linkable; mirrors the `?section=` URL-derived pattern in `ObserveLayout`. **No new store.**
- **Bulk UX → Both.** Per-card multi-select AND one-click "Activate all in stratum", in a panel header toolbar.
- **Amanah → Include with confirmation.** Bulk includes Amanah-flagged protocols (`scopeNotes` truthy) but first shows a confirmation overlay listing each flagged protocol with its **verbatim** `scopeNotes`.

## Decision

### Feature 1 — URL-derived state (not write-back effect)
- `v3ActTierShellStratumRoute` gains `validateSearch`: `mode` → `'protocols'|undefined`, `protocol` → non-empty string | `undefined`. Default mode = absence (no `?mode=objectives`). Bare / `$objectiveId` routes untouched (`useSearch({strict:false})` returns `undefined` → defaults apply, no crash).
- `ActTierShell` derives `railMode = search.mode === 'protocols' ? 'protocols' : 'objectives'` and `selectedProtocolId = search.protocol ?? null` — single source of truth, no hydration race. `rightMode` stays local `useState` (the Dashboard-tab toggle is ephemeral and must not pollute the URL).
- **Load-bearing change:** TanStack `navigate` REPLACES `search`, so every nav helper passes `search` explicitly — `handleSelectProtocol` (toggle-off preserved via `prev?.protocol === id ? undefined : id`), `handleRailModeChange` (replaces `setRailMode`), `goToStratum` (preserves `mode`, **drops** `protocol` — a selection may belong to a now-hidden stratum), `goToObjective` (`search:{}`). The stratum-change hygiene effect drops its `setSelectedProtocolId(null)` (no setter survives).

### Feature 2 — bulk activation
- `protocolStore.activateProtocols(projectId, templateIds[])` — folds the existing internal `upsert` helper over the ids in **one `set`** (one re-render; empty-list no-op; **no persist version bump** — record shape unchanged; idempotent/resumes suspended/triggered).
- `ProtocolLayerPanel` gains optional `bulkActivation?: boolean` (Act-only). Local state `selectMode`/`selectedIds`/`confirmOpen`/`pending` lives in the panel (drives nothing outside it; single-select `selectedProtocolId` stays owned by the shell). Header toolbar gated on `isAct && bulkActivation`: "Select" toggle (`aria-pressed`) → "Activate all (N)" / "Activate selected (M)". Eligible set = visible `filterProtocolGroups`-scoped group with status ≠ `'active'`. In select-mode the card `onSelect` toggles `selectedIds` and `selected` reflects membership; otherwise the existing single-click→detail wiring is preserved.
- `ActTierObjectiveRail` threads optional `bulkActivation?` shell→panel; `ActTierShell` passes `bulkActivation` (operator chose Both).

### Amanah — include with confirmation
- New presentational `ProtocolBulkConfirmOverlay.tsx` reuses `ProtocolApprovalOverlay`'s shell (`role="dialog"`, `aria-modal`, backdrop-click→cancel). When `flagged.length>0` it renders an Amanah section (`protocol-bulk-amanah`) with one row per flagged template showing its **verbatim** `scopeNotes` (gold, matching the card's `protocol-amanah-caution`). Confirm calls `activateProtocols` then exits select-mode; Cancel activates nothing. Flagged content is never collapsed or reworded.

## Consequences

- **Positive:** Protocol selection + mode survive reload and are deep-linkable; the steward can bulk-activate a stratum's eligible protocols in one gesture; Amanah-flagged protocols surface their verbatim caution before any activation. All additive — Plan rail, default Act rail, and all existing tests unchanged.
- **Neutral / accepted:** `protocol` clears on stratum switch by design (a selection may belong to a hidden stratum); `mode` is preserved. A stale `?protocol=` id degrades to the detail pane's existing empty state.
- **No persist bump:** the batch action reuses the existing record shape, so persisted `ogden-protocols` state stays compatible.

## Verification

web `tsc` EXIT 0 (8GB heap); bounded `--pool=forks --testTimeout=20000` 28/28 — new `ProtocolLayerPanel.bulk.test.tsx` (6), `ProtocolBulkConfirmOverlay.test.tsx`, `protocolStore.activateProtocols` unit, plus untouched Plan/Act parity suites. Live DOM proof ([[project-screenshot-hang]]) on "Three Streams Farm" (regenerative_farm): Protocols mode set `?mode=protocols`; card click set `&protocol=u-s6-yield-shortfall` + `data-selected`; hard reload restored both; stratum S6→S5 dropped `protocol`, kept `mode=protocols`; Select → "Activate all (5)" → confirm overlay → Confirm wrote 5 active records.

## Deferred

- No `ActTierShell` router-harness search test (manual reload check + leaf-suite coverage stand in; the optional `ActTierShell.search.test.tsx` was skipped as heavy under `--pool=forks`).
- Bulk **deactivate**/suspend (only bulk activate shipped).
