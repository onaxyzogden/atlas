# 2026-05-27 — BentoBox as the canonical OLOS/Atlas surface primitive

**Status.** Implemented on `feat/atlas-permaculture` across six explicit-path
commits (`BentoBox primitive` → `5a12b627` Phase 2 docs → `000db313` Card
deprecation → `9b42b904` Slice 4a → `185f3a81` 4b → `e1b2163a` 4c →
`1f640c8f` 4d → `eaec4a27` 4e audit).

## Context

The "bento box" treatment — outer chrome panel containing recessed inner
cards — existed in **three byte-identical clones** across the codebase:

- [`apps/web/src/v3/observe/tools/ObserveTools.module.css`](../../apps/web/src/v3/observe/tools/ObserveTools.module.css)
  `.toolbox` / `.group`
- [`apps/web/src/v3/plan/PlanTools.module.css`](../../apps/web/src/v3/plan/PlanTools.module.css)
  `.toolbox` / `.group`
- [`apps/web/src/v3/command/shell/CommandCentreShell.module.css`](../../apps/web/src/v3/command/shell/CommandCentreShell.module.css)
  `.tabs` / `.sidebar` / `.rail` / `.bottomTray`

Read-verified byte-identical on outer
(`color-mix(in srgb, var(--color-surface) 96%, #fff)` background,
`1px solid color-mix(in srgb, var(--color-border) 88%, #fff)` border,
`--radius-lg`, `0 1px 2px rgba(0,0,0,0.1)` shadow, 12px padding, 10px gap)
and inner (`var(--color-bg)`, `1px solid var(--color-border)`, `--radius-md`,
10px padding, 8px gap). Zero token drift.

The codebase also carried a deprecated-in-spirit
[`Card.tsx`](../../apps/web/src/components/ui/Card.tsx) primitive with its
own surface contract — two primitives where one would do — plus ~19 plain-
stack pages (Plan workspace, True North, Fit Gate, Stage Zero, compass
pages) with no bento treatment at all.

Steward direction (2026-05-27, in response to the Observe Command Centre
nested-box pass): promote bento to **the standard for all of OLOS/Atlas
UI**, including a sweep of the plain-stack pages, and **fold the existing
`Card.tsx` into BentoBox** so the codebase has one canonical surface
primitive instead of two.

## Decision

1. **Extract `<BentoBox>` as the canonical surface primitive.**
   - New compound at
     [`apps/web/src/components/ui/BentoBox.tsx`](../../apps/web/src/components/ui/BentoBox.tsx)
     with `<BentoBox>` (outer "toolbox"), `<BentoBox.Group>` (inner card),
     `<BentoBox.Header>` / `<BentoBox.Body>` / `<BentoBox.Footer>` slots.
   - CSS at
     [`apps/web/src/components/ui/BentoBox.module.css`](../../apps/web/src/components/ui/BentoBox.module.css)
     lifted verbatim from `PlanTools.module.css` `.toolbox`/`.group`.
   - Variant axes: `outer = default | flat | elevated`,
     `padding = none | sm | md | lg`, `accent = none | gold | sage |
     warning | danger`.
   - Re-exported from
     [`apps/web/src/components/ui/index.ts`](../../apps/web/src/components/ui/index.ts).
   - Test contract:
     [`BentoBox.test.tsx`](../../apps/web/src/components/ui/BentoBox.test.tsx).

2. **Document the three existing clones as canonicalised.**
   The originally planned `composes: bento-shell from
   '../../components/ui/BentoBox.module.css'` rewire failed at build time:
   vite-plugin-pwa's postcss config rejects relative `composes:` paths.
   Phase 2 was reframed as documentation-only — each of the three clones
   now carries a header comment pinning BentoBox.module.css as canonical
   and explaining the build-config blocker. The byte-identical rules stay
   on disk per [[feedback-no-deletion]].

3. **Absorb `Card.tsx` into `<BentoBox>` as deprecated forwarding wrappers.**
   - `Card`, `Card.Header`, `Card.Body`, `Card.Footer` are now thin
     wrappers that forward to `<BentoBox>`/`<BentoBox.Header>`/`Body`/
     `Footer`. `Card.module.css` is no longer imported by `Card.tsx`.
   - Variant mapping: `variant="default" → outer="default"`,
     `"outlined" → "flat"`, `"elevated" → "elevated"`.
   - Both files stay on disk with `@deprecated Use BentoBox` JSDoc per
     [[feedback-no-deletion]].

4. **Re-skin the plain-stack pages in staged slices.**
   - **4a — Plan workspace pages.** Seven `.module.css` files
     (PlanDecisionLogPage, PlanConflictsPage, PlanSynthesisPage,
     PlanVersionsPage, PlanWorkPackagesPage, PlanReviewsPage,
     PlanningWorkspacePage) — each outer `.page` rule gains the canonical
     bento surface treatment (background color-mix + 1px color-mix border
     + `--radius-lg` + `0 1px 2px` box-shadow + `margin: var(--space-4)
     auto`). Padding, gap, max-width, and all internal sections are
     untouched — information density preserved. Pure presentation.
   - **4b — Compass pages.** Stage Compass pages
     (Observe/Plan/Act + the shared `StageCompassView`) are full-bleed by
     design — `V3ProjectLayout` renders them edge-to-edge with no
     `LandOsShell` chrome — so they fall under the documented full-bleed
     exception alongside the working map pages. Inner bento is already in
     place at the per-objective level: `GuidanceCard.module.css` `.group`
     is byte-identical to the canonical inner-bento. Slice 4b is a
     documentation pass pinning both files to the canonical contract.
   - **4c — True North / Fit Gate.** Same shape as the compass: both
     pages are full-bleed by design. Inner panels
     (`SegmentIntakePanel.panel`, `fit-gate.proceed/lockedCard/banner/
     finding/unknowns`) are already bento-aligned but use
     `--color-panel-bg` / `--color-panel-card` because they sit on
     **chrome** rather than a document. Recognised here as the
     **chrome-surface bento** variant.
   - **4d — Stage Zero Vision Builder.** Themed-canvas exception — its
     `--vb-*` dark/gold palette is intentional (the steward's mockup
     matches regardless of the app theme). Inner question card +
     activation strip are recognised as the **themed-canvas bento**
     variant.
   - **4e — features/** .card audit.** 194 surfaces carry a `.card`
     class on a separate legacy palette (literal `rgba(232, 220, 200, …)`,
     not tokens). A mass token migration would be a visual change and is
     therefore out of scope for the pure-presentation canonicalisation.
     Catalog recorded in `BentoBox.module.css`; mechanical sweep deferred
     to Phase 6 (lint rule that can either token-migrate them or accept
     the literal palette as a documented "legacy-feature-card" variant).
     New surfaces under `features/**` should consume the primitive
     directly.

## Consequences

- One canonical surface primitive (`<BentoBox>`). `Card` lives on as a
  deprecated forwarding wrapper for back-compat.
- Three implementation sites document but do not yet *consume* the
  primitive — the CSS Modules `composes:` path is blocked by
  vite-plugin-pwa's postcss config. Resolving this is a follow-up.
- 7 Plan workspace pages now read as nested bento; the rest of the v3 IA
  (compass / true-north / fit-gate / stage-zero) is recognised under one
  of three documented exceptions: **full-bleed**, **chrome-surface
  bento**, or **themed-canvas bento**.
- 194 `features/**` `.card` surfaces remain on the legacy palette pending
  a Phase 6 lint pass.

### Deferred

- **Phase 6 — lint rule.** A future
  `scripts/lint-surface-usage.mjs` (or ESLint custom rule) could forbid
  hardcoded surface colors and raw `.card`/`.panel` declarations outside
  the `BentoBox` primitive — making bento the *enforced* standard.
- **postcss `composes:` resolution.** Once vite-plugin-pwa's PWA pipeline
  is patched (or replaced) the three Phase-2 documentation-only files can
  be re-rewired to `composes: bento-shell from
  '../../components/ui/BentoBox.module.css'`, deleting the canonical CSS
  duplication.

## Verification

- **Build.** `vite build --mode development` green after each slice.
- **Type.** No new TypeScript errors at the existing foreign-WIP baseline.
- **Visual.** Live `preview_screenshot` skipped on slices that touch
  MapLibre WebGL routes (known timeout); CSS-only rules verified by
  inspection. Slice 4a `.page` enrichment is mechanically identical
  across all 7 files and was build-validated.
- **Covenant.** Zero deletions (`Card.tsx` / `Card.module.css` stay on
  disk; the three Phase-2 clones stay on disk). Every commit staged by
  explicit path; `git fetch` + ahead/behind probe before every push;
  never `--force`, never `--no-verify`.

## Log

[[log/2026-05-27-bento-box-canonical-surface]]
