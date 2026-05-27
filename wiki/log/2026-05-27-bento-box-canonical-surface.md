# 2026-05-27 — BentoBox canonical surface (6 phases, 7 commits)

Promoted the nested-box treatment from three byte-identical clones to a
shared `<BentoBox>` primitive ([[decisions/2026-05-27-atlas-bento-box-canonical-surface]]),
absorbed `Card.tsx` as a deprecated forwarding wrapper, re-skinned the 7
Plan workspace pages, pinned the full-bleed and themed-canvas exceptions
(compass, true-north, fit-gate, stage-zero), and audited 194
`features/**` `.card` surfaces for a deferred Phase 6 lint pass.

## Commits on `feat/atlas-permaculture`

- **Phase 1 — BentoBox primitive.** New
  `apps/web/src/components/ui/{BentoBox.tsx,BentoBox.module.css,BentoBox.test.tsx}` +
  `index.ts` re-export.
- **Phase 2 — `5a12b627`.** ObserveTools / PlanTools / CommandCentreShell
  module.css files annotated as canonical clones. (The planned
  `composes:` rewire failed at build — vite-plugin-pwa postcss rejects
  relative `composes:` paths. Documented as a follow-up; CSS stays
  byte-identical.)
- **Phase 3 — `000db313`.** `Card.tsx` rewritten as deprecated forwarding
  wrapper to `<BentoBox>`. Variant mapping `default → default`,
  `outlined → flat`, `elevated → elevated`. Files stay on disk per
  [[feedback-no-deletion]].
- **Slice 4a — `9b42b904`.** 7 Plan workspace pages
  (PlanDecisionLogPage, PlanConflictsPage, PlanSynthesisPage,
  PlanVersionsPage, PlanWorkPackagesPage, PlanReviewsPage,
  PlanningWorkspacePage). Outer `.page` rule gains the canonical bento
  surface treatment + `margin: var(--space-4) auto`. Internal sections
  untouched.
- **Slice 4b — `185f3a81`.** Compass pages pinned as full-bleed
  exception; `GuidanceCard.module.css` `.group` recognised as the
  canonical inner-bento clone.
- **Slice 4c — `e1b2163a`.** True North + Fit Gate pinned as full-bleed
  exception; inner panels recognised as the **chrome-surface bento**
  variant (`--color-panel-bg` instead of `--color-bg`).
- **Slice 4d — `1f640c8f`.** Stage Zero Vision Builder pinned as the
  **themed-canvas bento** variant (`--vb-*` dark/gold palette
  preserved).
- **Slice 4e — `eaec4a27`.** 194 `features/**` `.card` surfaces audited;
  catalog recorded in `BentoBox.module.css`. Mass migration deferred to
  Phase 6 lint pass — palette difference would make it a visual change.

## Verification per commit

`vite build --mode development` green; `git fetch origin
feat/atlas-permaculture` + ahead/behind probe before each push; no
`--force`, no `--no-verify`; every commit staged by explicit path.

## Phase 6 — `893a56fb`

Ratchet linter at `scripts/lint-bento-surfaces.mjs` (Node ESM, no deps).
Scans `apps/web/src/**/*.module.css`, strips comments, walks rule blocks
(recursing into at-rules), counts class-led rules whose body declares
all three of `background:`, `border:`, `border-radius:`. Baseline pinned
at **1889** in `scripts/lint-bento-surfaces.baseline.json` — covers the
canonical primitive, the deprecated forwarding shell, three Phase-2
clones, the four documented exception categories (full-bleed /
chrome-surface / themed-canvas / GuidanceCard inner-bento), and the 194
legacy-palette `features/**` `.card` surfaces from the 4e audit. Exit
codes: 0 ok, 1 regression (new raw surface — consume `<BentoBox>`),
2 improvement without `--update`. Flags `--list` and `--update`.

## Carry-over

- **postcss `composes:`.** Resolve the vite-plugin-pwa block so the three
  Phase-2 clones can actually consume the primitive instead of just
  documenting it.
- **194 legacy-palette feature cards.** Token-migrate or accept as a
  documented "legacy-feature-card" variant; either way the ratchet
  re-tightens via `--update` once they're resolved.
