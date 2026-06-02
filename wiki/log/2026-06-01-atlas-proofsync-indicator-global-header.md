# 2026-06-01 -- Relocate ProofSyncIndicator to the global header; remove the search bar

**Branch.** `feat/atlas-permaculture` (one explicit-path commit `0a69798d`, 5 files,
+14/-69; rebased out-of-band; **not pushed**, commit-only). UI chrome change.
Amanah gate: land-stewardship app chrome, no riba / gharar. Clean.

## Request

The operator selected the ProofSyncIndicator pill (the "All synced" badge,
`data-testid="proof-sync-indicator"`) in the Act right rail and asked to (1)
remove the search bar from the header and (2) relocate the indicator to where the
search bar used to be. Clarified via AskUserQuestion: **Global (all stages)** mount
and **true relocate** (remove all in-page copies so it appears only once).

## What the "search bar" actually was

Not an Act element -- the global command-palette trigger button in the persistent
app header (`apps/web/src/app/AppShell.tsx`), a `<button>` reading "Search... /
Ctrl+K" that called `openCommandPalette`. The header renders on every v3 stage
(the `isProjectPage = pathname.startsWith('/project/')` gate does NOT match the
`/v3/project/...` routes), so a header mount is automatically global.

## What shipped

1. `apps/web/src/app/AppShell.tsx` -- removed the search `<button>` and the now-
   unused `openCommandPalette` selector; mounted `<ProofSyncIndicator />` in that
   header slot; added the import. The command palette stays reachable via the
   untouched global Ctrl+K / "?" shortcuts (`useKeyboardShortcuts.ts`) and the
   still-mounted `<CommandPalette />`.
2. `apps/web/src/v3/act/tier-shell/ActTierShell.tsx`,
   `apps/web/src/v3/act/field-action/ActMapFirstLayout.tsx`,
   `apps/web/src/v3/act/field-action/ActFieldActionLayout.tsx` -- removed the three
   in-page `ProofSyncIndicator` mounts + imports (true relocate, one copy only) and
   the now-empty `.panelTop` / `.topBar` wrapper divs.
3. `apps/web/src/app/AppShell.module.css` -- removed the dead `.searchTrigger` /
   `.searchPlaceholder` / `.searchKbd` rules and their responsive overrides.

`ProofSyncIndicator.tsx` itself is unchanged -- stateless, prop-less, reads
`useConnectivityStore` (All synced / Syncing / pending / Offline / Sync error).

## Verification

- `apps/web` `tsc --noEmit`: exit 0 (clean -- confirms the removed `openCommandPalette`
  local had no other consumer and no dangling imports remain).
- Grep: zero `ProofSyncIndicator` references outside `AppShell.tsx` and the
  component's own file (one stale CSS comment in `ActMapFirstLayout.module.css`
  remains, harmless).
- **Live (localhost:5200, real evidence).** Portfolio (`/v3/portfolio`): header
  contains exactly ONE indicator reading "All synced", and the search button is
  gone. Act (`/v3/project/mtc/act`): exactly ONE indicator, in the header, NO
  in-page duplicate. Ctrl+K still opens the command palette (its "Search commands,
  projects..." input appears on a single dispatch; a double dispatch toggles it
  shut -- expected). Screenshot confirms the header layout: logo -> stage spine ->
  "All synced" pill -> theme -> account -> Portfolio.

## Discipline

Explicit-path commit (`git add --` per file), `Compare-Object` confirmed staged ==
intended (5-file set, empty diff). The working tree carries heavy foreign WIP
(financial files, DesignMap/DiagnoseMap/OperateMap, plan/strata CSS, graphify-out,
ActTierShell.module.css, etc.) -- none staged; never-edit list untouched. Committed
immediately on the rebased branch, commit-only (no push). ASCII-only; no legacy
component deleted (the three in-page mounts removed but ProofSyncIndicator.tsx
stays on disk).

## Deferred idea -- DONE (same day, commit `b08208c5`)

ProofSyncIndicator lived under `src/v3/act/field-action/proof/` but is now generic
global chrome. A cleaner long-term home is `src/components/`. **Resolved:** moved
via `git mv` to `apps/web/src/components/ProofSyncIndicator.tsx` (rename detected at
79% -- the docstring + import retargets account for the delta), with a co-located
`ProofSyncIndicator.module.css` carrying the `.syncIndicator` pill rules and its
pending/syncing/error variants (the legacy `.syncIndicatorDot` rules were dropped --
the component renders a lucide icon, not the dot span). The single importer
(`AppShell.tsx`) now points at `../components/ProofSyncIndicator.js`; the dead
`.syncIndicator*` rules were removed from `ProofCapture.module.css` and the dead
`.panelTop` rule + stale comment from `ActMapFirstLayout.module.css`. Typecheck
exit 0; live-verified one "All synced" pill in the global header. Commit-only
(rebased branch), not pushed.
