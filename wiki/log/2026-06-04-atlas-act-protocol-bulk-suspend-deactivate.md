# 2026-06-04 — Act tier-shell Protocols: bulk suspend / deactivate verbs

**Project:** Atlas / OLOS · branch `feat/atlas-permaculture`
**Commit:** `35275a3c` (6 files, +453/−67, local-only, not pushed)
**ADR:** [[decisions/2026-06-04-atlas-act-protocol-bulk-suspend-deactivate]]
**Entity:** [[entities/act-tier-shell]]

## What

Rounded out the activate-only bulk toolbar
([[decisions/2026-06-04-atlas-act-protocol-url-persist-bulk-activate]], `2f2012a0`)
so a steward can also bulk **suspend** and **deactivate** the visible stratum's
protocols. Operator decisions (AskUserQuestion): toolbar layout = verb selector
+ Apply all/selected; confirmation = all three confirm (Amanah block on activate
only — disengaging carries no fiqh risk).

## Changes

- `protocolStore.ts` — new `suspendProtocols(projectId, ids[])` (maps existing
  active/triggered records to `'suspended'` in one `set`; never creates) and
  `deactivateProtocols(projectId, ids[])` (filters out matching records). Both
  empty-list no-op, project-scoped, no persist bump (record shape unchanged).
- `ProtocolBulkConfirmOverlay.tsx` — added `action?: 'activate'|'suspend'|
  'deactivate'` (default `'activate'`); `ACTION_META` per-verb title/subtitle/
  confirm styling (green/amber/red — `CA` has no `red` triplet, so deactivate is
  `C.red` on `transparent`). Amanah block gated `action === 'activate' &&
  flagged.length > 0`.
- `ProtocolLayerPanel.tsx` — `bulkAction` state + `BULK_VERBS` segmented toggle
  (`protocol-bulk-verb-{activate|suspend|deactivate}`, `aria-pressed`); per-verb
  `eligibleTemplates` memo (activate: `!== 'active'`; suspend: `active`/
  `triggered`; deactivate: `!== undefined`). Renamed buttons to
  `protocol-bulk-apply-all` / `-apply-selected`; `onConfirm` dispatches the
  matching batch action by verb. Plan + default Act rails byte-identical.
- Tests: **new** `protocolStore.bulkSuspendDeactivate.test.ts` (9); extended
  `ProtocolBulkConfirmOverlay.test.tsx` (Amanah absent for suspend/deactivate
  even when `flagged` non-empty; present for explicit activate); evolved
  `ProtocolLayerPanel.bulk.test.tsx` (new testids + suspend/deactivate verb flows).

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap).
- 76/76 bounded vitest green (`--pool=forks --testTimeout=20000`): touched
  protocol suites (36) + regression Plan/Act parity + leaf suites (40).
- Live DOM proof ([[project-screenshot-hang]]) on MTC S6 (8 cards): verb toggle
  drove per-verb eligibility (Activate=8 / Suspend=0 / Deactivate=0 with no
  records); full **activate → suspend → deactivate** lifecycle — Apply-all
  activated 8; Suspend recomputed to 8 + flipped all to
  `data-protocol-status="suspended"` (no Amanah); Deactivate removed all 8
  (status `none`); store net-zero. `preview_screenshot` hung (transient — dead
  API + open modal), DOM-asserted via `preview_eval`.

## Notes

- Commit staged by explicit pathspec (6 files only); foreign WIP
  (`wiki/...snapping.md`, `_tsc_review.txt`, other wiki files) left unstaged.
- Branch 261 ahead / 0 behind `origin/feat/atlas-permaculture` at fetch time;
  not pushed ([[project-branch-rebase]] — push only when asked).
- Commit message written to `_commitmsg.txt` then `git commit -F` (PowerShell
  has no heredoc; parenthesised "(N)" fragments otherwise mis-parse).
- `wiki/*` files are LLM-owned and NOT in commit `35275a3c` (code-only).

## Deferred

- No new screenshot (preview hang); `preview_eval` DOM assertions stand in.
- Per-verb keyboard affordances / bulk undo not in scope.
