# 2026-05-04 — atlas-ui ← MILOS UI/UX lift (Phases 1–4)

## Context

`apps/atlas-ui` was lifted from the OGDEN prototype on 2026-05-03 and hosts
all 11 OBSERVE pages plus the M6 SWOT trio. The shell worked but a static
audit against MILOS (`C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\src\`)
exposed maturity gaps that would compound as PLAN/ACT modules land:

- ~37 `--olos-*` palette tokens, no spacing/typography/motion/elevation scales.
- Four hand-rolled per-page shells (`olos-shell`, `terralens-shell`,
  `swot-suite-shell`, `verdean-shell`) drifting visually.
- Zero interactive primitives (no Button, Modal, Toast, Tooltip, Skeleton).
- A11y limited to `aria-hidden` on icons — no focus rings, no
  reduced-motion, no keyboard shortcuts, no focus management.
- Live-data fetches in `BuiltinProjectContext` swallowed errors silently.

Design Scholar (NotebookLM `9ae706af-cf36-428c-8155-e6a49cde804f`) flagged
pitfalls for the shell consolidation: rigid `main` containers trap fluid
content (map view), strict 8px shells misalign existing components, dumping
all four sidebars into one creates clutter, static topbars lose context,
and inner-radius math has to be respected for premium feel.

## Decision

Bottom-up, phase-gated lift. Each phase shipped independently. No
big-bang rewrite, no regression of the 14 already-wired OBSERVE pages.

### Phase 1 — Foundation tokens
Extended `apps/atlas-ui/src/styles.css` token block under the existing
`--olos-*` palette:
- 4px **spacing** scale `--space-0..12` + `--space-16` (mirrors MILOS).
- 8-step **text** scale `--text-2xs..2xl` + 7-step **display** scale.
- **Motion** scale `--motion-fast..slower` + `--ease-out`/`--ease-in-out`/
  `--ease-spring` cubic-beziers.
- Dark-mode-adapted **elevation** scale: lighter surface fills + faint
  border instead of box-shadows (shadows disappear on `#030807`).
- **Radius** scale `--radius-xs..2xl` with inner-radius rule documented.
- Global `@media (prefers-reduced-motion: reduce)` zeroes all `--motion-*`.

Tokens are additive; the 14 wired OBSERVE pages saw zero visual change.

### Phase 2 — Primitives + a11y hooks
Built `apps/atlas-ui/src/components/primitives/`:
- `Button`, `IconButton` (variants × sizes × all 4 states, `:focus-visible`
  rings using `--olos-accent` at 2px offset).
- `TextInput`, `Textarea`, `Select` (focus + error states).
- `Modal` — focus-trapped, ESC closes, restores focus to trigger,
  `role="dialog"` + `aria-modal="true"`.
- `Tooltip` — controlled or hover/focus, 800ms default delay.
- `Toast` + `ToastProvider` — portal-based, top-right, auto-dismiss,
  `role="status"`. `toast.success/error/warning/info`.
- `Skeleton` — shimmer gated on `useReducedMotion` (freezes when OS
  prefers reduced motion).

Hooks in `src/hooks/`: `useFocusTrap.js`, `useKeyboard.js`,
`useReducedMotion.js`. Dev-only `/dev/primitives` route added for visual
QA across all states.

### Phase 3 — Unified AppShell + icon registry
Built `AppShellV2` (renamed to `AppShell` after cutover):
- 3-column CSS grid: sidebar (248/64 collapsed) / main / optional
  right-panel (320).
- 56px topbar slot with `topbarChildren` prop **and** a portal target
  (`TopbarSlot`) so pages inject contextual actions — fixes the
  static-topbar pitfall.
- `layout="contained" | "fullscreen"` prop — fullscreen removes main
  padding for future MapboxGL views (fixes map-trap pitfall).
- Sidebar driven by `navConfig` array supporting nested groups for
  **progressive disclosure** rather than a flat dump of all four old
  shells' nav.
- `mod+k` opens `<SearchPalette>` on every route.

Icon registry at `src/icons.js` — single import surface. Migration ran
one shell at a time over four commits; the four bespoke shell CSS blocks
(~527 lines) were stripped via brace-balanced Python parser handling
`@media` nesting; legacy `AppShell` + `SideRail` deleted; `AppShellV2`
renamed to `AppShell`.

### Phase 4 — Feedback patterns wired into real flows
- `EmptyState` primitive added (default + error variants, optional CTA,
  freezes float animation under reduced-motion).
- `BuiltinProjectContext` rewritten to expose `{status, error, retry}`;
  fetch failures now call `toast.error(...)` instead of swallowing.
- `<ToastProvider>` mounted at root **outside** `<BuiltinProjectProvider>`
  so the context can call `useToast`.
- `ObserveDashboardPage` consumes the new contract fully — Skeleton
  during initial load, `<EmptyState variant="error">` with Retry on
  failure.
- Audit of the other 13 data-bearing pages showed they already use
  `?? staticFallback` patterns extensively (e.g.
  `parseFloat(terrain?.slope?.meanDeg ?? vm.metrics[0][2])`). Full
  skeletons would have been more churn than value. Built reusable
  `<ProjectDataStatus />` inline alert that consumes context and renders
  only when `status === "error"` — banner appears with Retry, existing
  static-fallback rendering continues underneath. Dropped into all 14
  data-bearing pages with a single line.

## Consequences

**Gained:**
- MILOS-grade primitive coverage (Button/Modal/Tooltip/Toast/Skeleton/
  EmptyState) addressable from `components/primitives/index.js`.
- Single AppShell across 18 routes; four bespoke shells deleted.
- A11y baseline: focus rings, focus traps, ESC-closes-modal,
  reduced-motion, ARIA roles, `mod+k` palette.
- Feedback layer: live-data failures surface to the user rather than
  silently degrading; retry available without page reload.

**Deferred:**
- Grid-alignment audit (Design Scholar pitfall fix #2) — the 14
  presentational components have not yet been walked with
  `preview_inspect` to snap internal margins to `--space-*` tokens.
  Phase 1's hardcoded-px baseline log is still un-burned.
- Light-mode parity for elevation (`box-shadow` slot reserved but
  unused).
- `apps/web` is untouched — the lift was scoped to atlas-ui only.

## Pitfall-fix map

| Design Scholar pitfall | Phase | Fix |
|---|---|---|
| Map view trapped in rigid main | 3 | `layout="fullscreen"` prop on AppShell |
| Grid misalignment | 3+ | Audit deferred; baseline log captured Phase 1 |
| Sidebar clutter | 3 | `navConfig` array supports nested groups |
| Static topbar loses context | 3 | `TopbarSlot` portal for per-page injection |
| Inner-radius math | 1 | Documented as comment in token block |
| Box-shadows invisible on `#030807` | 1 | Elevation as surface fill + border |

## Commits

```
e1ec94e feat(atlas-ui): MILOS-style design lift Phase 1-3 (tokens, primitives, shell)
33fa3cf refactor(atlas-ui): migrate 17 OBSERVE+SWOT pages to AppShellV2
d20cbb5 chore(atlas-ui): remove legacy AppShell, SideRail, and dead inline rails
7951596 refactor(atlas-ui): rename AppShellV2 to AppShell; strip dead shell CSS
05b14a8 feat(atlas-ui): Phase 4 — wire feedback patterns into project data
5029ca3 feat(atlas-ui): wire ProjectDataStatus banner into 14 data-bearing pages
```

## References

- Plan: `C:\Users\MY OWN AXIS\.claude\plans\i-have-concept-images-mossy-kurzweil.md`
- MILOS canonical sources: `MAQASID OS - V2.1/src/styles/tokens.css`,
  `src/components/layout/AppShell.jsx`, `src/hooks/`, `src/components/shared/`
- Predecessor: [2026-05-03 atlas-ui Prototype Lift](2026-05-03-atlas-ui-prototype-lift.md)
- Tooltip pattern: [2026-04-23 Delayed Tooltip Primitive](2026-04-23-delayed-tooltip-primitive.md)
