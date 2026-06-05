# 2026-05-04 — atlas-ui ← MILOS UI/UX lift (Phases 1–4)


Bottom-up phased lift of `apps/atlas-ui` against the MILOS reference SPA
(`C:\Users\MY OWN AXIS\Documents\MAQASID OS - V2.1\src\`). Decision recorded
at [2026-05-04 atlas-ui ← MILOS UI/UX Lift](decisions/2026-05-04-atlas-ui-milos-lift.md).

**Phase 1 — Foundation tokens.** Extended `apps/atlas-ui/src/styles.css`
with spacing/text/motion/elevation/radius scales mirroring MILOS, plus
global `prefers-reduced-motion` zeroing. Tokens additive — zero visual
diff on the 14 wired OBSERVE pages.

**Phase 2 — Primitives + a11y.** Built
`apps/atlas-ui/src/components/primitives/` (Button, IconButton, TextInput,
Textarea, Select, Modal, Tooltip, Toast, Skeleton). Hooks: `useFocusTrap`,
`useKeyboard`, `useReducedMotion`. Dev-only `/dev/primitives` route for
visual QA.

**Phase 3 — Unified AppShell + icon registry.** New `AppShellV2` with
3-column grid, 56px topbar with portal slot, `layout="contained"|"fullscreen"`
prop, `navConfig` driven sidebar with progressive disclosure, `mod+k`
SearchPalette. Migrated all 18 routes one shell at a time across 4
commits. Stripped four bespoke shell CSS blocks (~527 lines, 9659 chars)
via brace-balanced Python parser handling `@media` nesting. Renamed
`AppShellV2` → `AppShell`; deleted legacy `AppShell` + `SideRail`.

**Phase 4 — Feedback wired into real flows.** Added `EmptyState`
primitive. Rewrote `BuiltinProjectContext` to expose `{status, error,
retry}` and call `toast.error(...)` on fetch failure (was previously
silent). Flipped provider order in `main.jsx` so `ToastProvider` wraps
`BuiltinProjectProvider`. `ObserveDashboardPage` consumes the contract
fully (Skeleton + `EmptyState variant="error"`). For the other 13
data-bearing pages, audit showed pervasive `?? staticFallback` patterns
making full skeletons more churn than value — built reusable
`<ProjectDataStatus />` inline alert (renders only when `status ===
"error"`, with Retry button) and dropped it into all 14 pages.

**Files changed (high-level):**
- New: `src/hooks/useFocusTrap.js`, `useKeyboard.js`, `useReducedMotion.js`
- New: `src/components/primitives/{Button,IconButton,TextInput,Textarea,Select,Modal,Tooltip,Toast,Skeleton,EmptyState}.jsx` + index
- New: `src/components/AppShell.jsx` (was `AppShellV2`), `src/styles/appshell.css`, `src/icons.js`
- New: `src/components/ProjectDataStatus.jsx`, `src/routes/devPrimitives.jsx`
- Edited: `src/styles.css` (token block), `src/main.jsx` (provider order), `src/context/BuiltinProjectContext.jsx` (status/error/retry), `src/components/index.js`
- Edited: 18 page files (shell wrapper migration); 14 data-bearing pages (ProjectDataStatus drop-in)
- Deleted: legacy `AppShell.jsx`, `SideRail.jsx`, four bespoke shell CSS blocks

**Verified:** `pnpm --filter atlas-ui build` clean after each phase.

**Deferred:** grid-alignment audit (walking the 14 presentational
components with `preview_inspect` to snap internal margins to `--space-*`
tokens); light-mode elevation parity.

**Commits:** `e1ec94e` (Phase 1–3 tokens/primitives/shell) →
`33fa3cf` (page migration) → `d20cbb5` (legacy shell removal) →
`7951596` (rename + dead-CSS strip) → `05b14a8` (Phase 4 feedback) →
`5029ca3` (ProjectDataStatus 14-page wiring).
