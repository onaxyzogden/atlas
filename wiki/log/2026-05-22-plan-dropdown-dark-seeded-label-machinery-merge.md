# 2026-05-22 — Three Plan-stage UI fixes (dark dropdowns · zone-name seeded label · single Machinery group)

**Branch:** `feat/atlas-permaculture`
**Commit:** `90229540`
**Plan:** `~/.claude/plans/fix-the-white-background-crispy-mccarthy.md`

## What & why

Three small, independent cosmetic / information-architecture corrections in
the web app (`apps/web/`), all surfaced from a single steward screenshot of
the Plan-stage map editor. No data-model, store, schema, or registry impact.

## Slices (single commit `90229540`)

- **Global dark `<select>` dropdown popups** (`apps/web/src/app/index.css`).
  Every dropdown in the app is a native HTML `<select>`; the open option list
  rendered with the browser-default **white background + dark text**, clashing
  with the dark UI (visible on the Z-Level selector). Only a couple of CSS
  modules styled `<option>`, so the white popup leaked through almost
  everywhere. **Root-cause fix is one global, token-driven element rule** —
  not per-component edits: `select option { background: var(--color-surface-raised);
  color: var(--color-panel-text) }` plus `option:checked, option:hover`
  → `var(--color-gold-brand)` on `#1a1a1a`. Because the tokens flip per theme
  (`tokens.css` light / `dark-mode.css` dark) the single rule stays correct in
  both. Additive and global; existing per-module `option` rules win where
  present by equal/higher specificity, and the scattered inline-styled selects
  (e.g. `ZoneLevelLayer.tsx`) are reached by the element-level rule with no
  edit. Appended beside the file's other global element rules (`.spine-btn`,
  scrollbars, focus).

- **Seeded-zones map-overlay label** (`apps/web/src/v3/plan/canvas/BaseMapCard.tsx:42`).
  The legend row read the opaque "Seeded zones (ring-seed provisional drafts)",
  which told the steward nothing about which zones. Changed **only the `label`**
  (left `key: 'seededZones'` and `swatch: '#7a9a4a'` untouched — they drive the
  store toggle + layer gating) to the steward-confirmed full Mollison zone list:
  **"Home centre / Daily touch / Weekly touch / Main crops / Forage /
  Wilderness"** (dropping the word "Seeded").

- **Merged the two "Machinery" rail groups** (`apps/web/src/v3/plan/PlanTools.tsx`).
  The Plan left rail rendered **two** Machinery cards: a module-level group
  holding only *Turnaround*, and a Built-Environment category card holding
  *Machinery Shed / Fuel Station / Equipment Yard*. Both route to the same Plan
  module (`BE_CATEGORY_TO_PLAN_MODULE.machinery === 'machinery'`). Merged by
  **folding the BE machinery tools into the module-level `machinery` group** and
  suppressing the duplicate BE category card: new helper `beCategoryToolItems()`
  converts a `BE_TOOL_GROUPS` category's items into rail `ToolItem`s
  (`plan.structures-subsystems.be.<kind>` toolIds, so the BE draw pipeline still
  handles them), spread after Turnaround in `TOOL_GROUPS.machinery`; an early
  `if (group.category === 'machinery') return null;` in the `BE_TOOL_GROUPS.map`
  render loop (mirroring the existing `vegetation` / `earthworks` skips) drops
  the duplicate card. **Turnaround keeps its Plan-only draw toolId**
  (`plan.machinery.turnaround`) — deliberately *not* moved into the BE registry,
  which would change its dispatch path. Result: one Machinery card holding
  Turnaround + Machinery Shed + Fuel Station + Equipment Yard.

## Incident — external rebase wiped the PlanTools edit mid-verification

While the (slow, 8 GB) `typecheck` was running, the branch was **rebased /
force-pushed out-of-band** (HEAD advanced `97182e38` → `cf6fcbfc` "promote
access paths to typed design_features"), silently **reverting the PlanTools.tsx
edits**. Detected via a file-state reminder + the browser still showing two
Machinery groups + re-reading the file on disk. Re-applied all three PlanTools
hunks, re-verified live, and **committed immediately** per the
`feat/atlas-permaculture` rule (uncommitted work gets wiped). The `index.css`
and `BaseMapCard.tsx` edits survived — different files, untouched by the
external work.

## Verification

- **typecheck** (`npm run typecheck`, the 8 GB node script — plain `npm run
  lint`/`tsc --noEmit` OOMs) at the **3-error pre-existing baseline**
  (`StepBoundary.tsx`, two `HostUnion*` tests) — none in the edited files.
- **Live (Claude Preview, port 5200):** Machinery rail group count = **1**;
  new seeded label present + old string gone; the checked `<option>` computed
  style returns gold `rgb(212,175,95)` = `#d4af5f` on the dark surface (the
  OS-rendered popup itself can't be screenshotted, so computed style is the
  authoritative confirmation). Screenshots captured of the legend label and the
  single "MACHINERY & EQUIPMENT" group.

## Scope guards

- Staged **only** the 3 edited files by explicit path — the working tree
  carried concurrent-session foreign WIP (EconomicsPanel, syncService,
  utilityStore, SectorCompassOverlay, capitalPartner, ZoneSomSidebar, …) left
  untouched for its owners.
- No store / schema / registry change; Turnaround stays a Plan draw tool.

## Follow-ups

- When a live preview env without the auth + WebGL wall is available, capture
  the open dropdown itself (the popup is OS-rendered and currently
  unscreenshottable) to fully close the visual confirmation.
