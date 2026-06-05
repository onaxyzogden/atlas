# 2026-06-04 — Act tier-shell Protocols: URL-persisted selection + bulk activation

**Project:** Atlas / OLOS · branch `feat/atlas-permaculture`
**Commit:** `2f2012a0` (9 files, +774/−33, local-only, not pushed)
**ADR:** [[decisions/2026-06-04-atlas-act-protocol-url-persist-bulk-activate]]
**Entity:** [[entities/act-tier-shell]]

## What

Closed the two items deferred from the stratum-scope/clickable-detail slice
([[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]], `e15e04e9`):
(F1) the selected protocol + Protocols mode now survive a reload and are
deep-linkable via URL search params; (F2) a Select/"Activate all"/"Activate
selected" toolbar bulk-activates the visible stratum's eligible protocols,
with Amanah-flagged protocols included only after a confirmation overlay shows
their verbatim `scopeNotes`. Operator decisions (AskUserQuestion): URL params /
Both / include-with-confirmation.

## Changes

### Feature 1 — URL-derived selection + mode
- `routes/index.tsx` — `validateSearch` on `v3ActTierShellStratumRoute`:
  `mode` → `'protocols'|undefined`, `protocol` → non-empty string | `undefined`.
- `ActTierShell.tsx` — `railMode` / `selectedProtocolId` derived from
  `useSearch({strict:false})` (no more `useState`); `rightMode` stays local.
  Nav helpers carry `search` explicitly (TanStack `navigate` replaces it):
  `handleSelectProtocol` (toggle-off preserved), `handleRailModeChange`
  (replaces `setRailMode`), `goToStratum` (keep `mode`, drop `protocol`),
  `goToObjective` (`search:{}`). Hygiene effect dropped `setSelectedProtocolId(null)`.

### Feature 2 — bulk activation
- `protocolStore.ts` — new `activateProtocols(projectId, templateIds[])` batch
  (folds internal `upsert` over ids in one `set`; empty-list no-op; no persist bump).
- **New** `ProtocolBulkConfirmOverlay.tsx` — presentational modal (reuses
  `ProtocolApprovalOverlay` shell); lists each flagged template with verbatim
  `scopeNotes`; testids `protocol-bulk-confirm-overlay`/`-amanah`/`-amanah-row`/
  `-cancel`/`-confirm`.
- `ProtocolLayerPanel.tsx` — optional `bulkActivation?`; local select-mode state
  + header toolbar (`protocol-bulk-toolbar`, gated `isAct && bulkActivation`):
  Select toggle → "Activate all (N)" / "Activate selected (M)". Eligible =
  visible group with status ≠ `'active'`. Card `onSelect`/`selected` branch on
  select-mode; overlay mounts on bulk action.
- `ActTierObjectiveRail.tsx` — threads optional `bulkActivation?` shell→panel.
- `ActTierShell.tsx` — passes `bulkActivation` to the rail (Both).
- Tests: **new** `ProtocolLayerPanel.bulk.test.tsx` (6), `ProtocolBulkConfirmOverlay.test.tsx`,
  `protocolStore.activateProtocols` unit.

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap).
- 28/28 bounded vitest green (`--pool=forks --testTimeout=20000`) across the new
  + untouched Plan/Act parity suites.
- Live DOM proof ([[project-screenshot-hang]]) on "Three Streams Farm"
  (regenerative_farm): entering Protocols mode set `?mode=protocols`; card click
  set `&protocol=u-s6-yield-shortfall` + `data-selected`; **hard reload restored
  both**; stratum S6→S5 dropped `protocol`, kept `mode=protocols`; Select →
  "Activate all (5)" → confirm overlay → Confirm wrote 5 active records to
  `protocolStore`.

## Notes

- Commit staged by explicit pathspec (9 files only); foreign WIP left unstaged.
- Branch 250 ahead / 0 behind `origin/feat/atlas-permaculture` at commit time;
  not pushed ([[project-branch-rebase]] — push only when asked).
- PowerShell here-string mangled the commit message (git read "Activate all (N)"
  fragments as pathspecs); fixed by `git commit -F COMMIT_MSG_protocol.tmp`.
- `wiki/*` files are LLM-owned and NOT in commit `2f2012a0` (code-only).

## Deferred

- No `ActTierShell` router-harness search test (skipped as heavy under
  `--pool=forks`; manual reload + leaf-suite coverage stand in).
- Bulk **deactivate**/suspend (only bulk activate shipped).
