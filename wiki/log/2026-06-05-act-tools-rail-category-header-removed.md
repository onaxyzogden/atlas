# 2026-06-05 — Act tools rail category header row removed

**Closed.** Operator selected the "Climate & Sectors" category header in the
Act tier-shell bottom tools rail and asked to remove it — clarified to:
remove the entire category header row (chevron + label text + count badge)
for **all** categories, while keeping every tool tile unchanged.

Single-file change in
`apps/web/src/v3/act/tier-shell/ActTierCategorizedToolsRail.tsx`:

- Dropped the `<button className={styles.toolCatHeader}>` per-category header
  (chevron + `toolCatLabel` + `toolCatCount`) from the `visibleCats.map`
  render. The `<div className={styles.toolGrid}>` now renders unconditionally
  inside each `<section className={styles.toolCat}>`.
- Removed the collapse state (`const [collapsed, setCollapsed] = useState`)
  and the `toggle(categoryId)` handler (collapse-on-click behaviour gone —
  operator accepted this).
- Removed the now-unused `ChevronDown, ChevronRight` imports from
  `lucide-react`.

Unchanged: tool tiles (`catTile` icon + label), the dots navigator
(`toolsDots` / IntersectionObserver — still keyed off `category.label` for
aria-labels, which remain valid), the snap-target wiring, the no-objective
and empty-state branches, and `isToolArmed`. No catalog/data change — the
`climate-sectors` category and its 5 tools (sun/wind/fire sectors, frost
pockets, hazard zones) stay defined; only the visual header chrome is gone.

The unused `toolCatHeader` / `toolCatLabel` / `toolCatCount` CSS module
classes were intentionally left in `ActTierShell.module.css` (zero blast
radius; unused CSS-module classes do not fail lint).

**Verification:** `tsc --noEmit` — my file produced **0** errors (the removed
`ChevronDown`/`ChevronRight`/`collapsed`/`toggle` symbols would have surfaced
under `noUnusedLocals`; the only tsc error is in an untracked foreign-WIP test
`syncServiceOlosRecord.test.ts`, unrelated). Bounded vitest
(`--pool=forks --testTimeout=20000`) `actToolCoverage` 17/17 green. Preview
DOM proof on `/v3/project/mtc/act/tier-shell/stratum/s3-systems-reading` with
the "How water moves across the site" objective selected (2 categories):
`_toolCatHeader_` / `_toolCatLabel_` / `_toolCatCount_` / chevron counts all
**0**, `_catTile_` tiles **6** (tools intact), dots **2** (nav still works) —
`preview_screenshot` hangs on the WebGL map, [[project-screenshot-hang]].

One explicit-path commit (`5f81657e`, `feat/atlas-permaculture`, **not
pushed**); foreign WIP left untouched.
