# 2026-06-02 -- Act Protocol Layer: triggered-emphasis + bento framing (consumer slice)

**Branch.** `feat/atlas-permaculture` (rebases out-of-band; explicit-path commit
`971bc898`, 7 files +219/-16; **not pushed**). Amanah gate clean (internal
land-stewardship UI; no riba/gharar, no capital-channel or Islamic-framing strings).

## Scope

Completed the **half-landed** Act variant of the Protocol Layer. The two dependency
halves had already converged into HEAD via the out-of-band rebase -- `ProtocolLibraryCard`
gained its `emphasis` / `collapsed` props (peer `c7d58ca2`) and `ActTierShell` gained
the `useTriggeredProtocols` -> `triggeredIds` wiring that it passes to the objective rail
(HEAD `ActTierShell.tsx:232`/`:423`). But HEAD passed `triggeredIds` to a rail that did
not yet **declare** the prop, so HEAD sat in a likely non-compiling state. This slice is
the consumer side that adds the prop and uses the card affordances, closing the feature.

This is the Act-stage rendering of the protocol panel: triggered protocols are
**emphasized, never hidden** -- the "emphasize, don't hide" posture from the protocol
work -- so a steward sees what fired without losing the rest of the library.

## What shipped (7 files)

- `ProtocolLayerPanel.tsx` (+70) -- new props `variant?: 'plan' | 'act'`,
  `triggeredIds?: readonly string[]`, `framed?: boolean`. The Act variant marks triggered
  cards (`emphasis="triggered"`), dims the rest (`emphasis="dimmed"`, nothing hidden),
  floats triggered cards to the top of their tier (stable sort), collapses non-triggered
  card bodies (`collapsed`), and switches the header count to "N triggered". The Plan path
  is byte-identical (`variant` defaults to `'plan'` -> `emphasis="normal"`, no collapse,
  no reorder). A module-level `EMPTY_IDS` + `useMemo`-wrapped `Set(triggeredIds)` keeps the
  membership test off the render hot path. Imports `../spine/spine-theme.css` so the
  `--spine-*` tokens resolve when the panel mounts on an Act-only page.
- `ActTierObjectiveRail.tsx` (+19) -- module-level `EMPTY_TRIGGERED_IDS`; new optional
  `triggeredIds` prop; the protocol branch now wraps the panel in
  `olos-spine-root <styles.railProtocolBody> <styles.railProtocolFramed>` and passes
  `variant="act" framed triggeredIds={triggeredIds}` so the shared cards get their spine
  tokens + the bento inset.
- `ActTierShell.module.css` (+8) -- `.railProtocolFramed { padding: 8px 10px 10px; }`,
  the bento inset for the framed panel (the outer 1px-border + radius + overflow:hidden
  frame is already on `.railPanel`).
- `spine-theme.css` (+22) -- lifts the box-sizing + thin-scrollbar reset
  (`.olos-spine-root *`, `::-webkit-scrollbar` width 3px, thumb `var(--spine-border)`) out
  of PlanStratumShell's inline `<style>` into the shared sheet, so EVERY `.olos-spine-root`
  surface (incl. the Act protocol rail) inherits it without each mount re-declaring it.
- `PlanStratumShell.tsx` (~10) -- drops the now-redundant inline `<style>` block, replaced
  with an explanatory comment. This is a **refactor, not a deletion** ([[feedback-no-deletion]]):
  the rules moved to spine-theme.css (imported above), not removed.
- `__tests__/ActTierObjectiveRail.test.tsx` (+9) -- asserts the protocol-panel wrapper
  className contains `olos-spine-root`.
- `__tests__/ProtocolLayerPanel.act.test.tsx` (NEW, +97) -- 5 Act-variant cases: triggered
  card `data-emphasis="triggered"` while the rest are `dimmed` (nothing hidden; full count
  preserved); triggered card floats to top; dimmed cards collapse (one visible `IF`);
  header reads "1 triggered"; single tier heading.

## Verification

- **Typecheck:** `corepack pnpm -C "apps/web" run typecheck` EXIT 0 on the full working
  tree (TASK-3 slice applied), which is the gate that proves the consumer side now satisfies
  HEAD's `triggeredIds` pass-down.
- HEAD dependency re-confirmed **post-rebase** before staging: `ProtocolLibraryCard`
  retains both `emphasis?:`/`collapsed?:` props; `ActTierShell` retains the
  `useMemo` `triggeredIds` (L232) + the `triggeredIds={triggeredIds}` rail pass (L423).
- Each of the 7 diffs was spot-checked for rebase contamination before staging
  (diffstats matched the recorded slice exactly; `ActTierShell.module.css` is the lone
  `.railProtocolFramed` hunk; `PlanStratumShell.tsx` is the inline-style->comment move).

## Commit shape (honest record)

The branch rebased out-of-band again mid-task (HEAD `ff0bbd9f`/`1ead7ce7` era -> `0063b316`
at stage time), leaving the working tree heavily co-mingled with foreign multi-session WIP
(financial engine, plan cards, several wiki pages). The 7 slice files were staged
**explicitly by name** and the staged set verified to be exactly those 7 -- no foreign WIP
swept in ([[feedback-no-deletion]], [[feedback-commit-immediately-on-rebased-branches]]).
Committed locally as `971bc898`; **not pushed** ([[project-branch-rebase]]) -- the operator
asked to commit, not push. Message ends `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

CSRA model untouched ([[fiqh-csra-erased-2026-05-04]]); ASCII-only copy. Entity
[[entities/act-tier-shell]] (entity-page fold-in deferred -- that page is mid-edit by a
parallel session). Pairs with [[log/2026-06-02-atlas-act-spine-project-identity-tile]]
(same session, same rail) and the protocol-system slice
[[log/2026-06-02-olos-protocol-tier-slice]].
