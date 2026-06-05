# 2026-05-10 — Broiler module folded into Livestock as "Product Chain"


Plan Module 7 (`broiler-product-map`) eliminated as a peer top-level
module and absorbed into Livestock as a visually-separated *Product
Chain* sub-group. Driver: steward complaint that the "Broiler" framing
hard-codes a single enterprise type — the post-farm-gate value chain
(slaughter → cold chain → market) is species-agnostic.

Changes:

- `PlanModule` union: 12 → 11 members. `MODULE_CARDS` card shape gains
  optional `group?: string`. Livestock now carries 10 cards (7 +
  3 Product Chain).
- `PlanModuleSlideUp` renders a `.tabGroupLabel` divider in the tab
  row when consecutive cards' groups differ.
- Tool IDs renamed `plan.broiler-product-map.*` →
  `plan.livestock.*`. Livestock tools rail grows from 2 to 5.
- Section IDs renamed `plan-broiler-*` → `plan-product-*`.
- `agribusinessStore` and its interfaces (`SlaughterPoint`,
  `ColdChainUnit`, `MarketNode`) **unchanged** — the data layer is
  already species-neutral. Card files stay under
  `apps/web/src/features/agribusiness/`.
- ADR `2026-05-10-atlas-plan-module7-broiler-product-map.md` gains a
  same-day addendum recording the fold-in (not a new ADR — this is a
  refinement of the same decision).

Gates clean: `tsc --noEmit`, `npm run lint`, `npx vitest run` all
exit 0. Preview smoke via the accessibility tree confirms 11 module
tiles (no Broiler Map), Livestock slide-up exposes 10 tabs with the
Product Chain divider, all 3 cards mount, 5 livestock draw tools
render. `preview_screenshot` was unresponsive — no visual proof.
