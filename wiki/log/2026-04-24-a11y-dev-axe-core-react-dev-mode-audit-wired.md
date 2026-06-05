# 2026-04-24 — a11y(dev): @axe-core/react dev-mode audit wired


Stands up the **deferred axe-core tooling task** from the WCAG 2.1 AA
audit so future a11y regressions surface in-band during dev instead of
requiring another manual audit pass.

### Shipped (commit `32cd407`)
- `apps/web/package.json` — `@axe-core/react@^4.11.2` added to
  `devDependencies` (not `dependencies` — prevents prod install).
- `apps/web/src/main.tsx` — DEV-gated dynamic import:
  ```ts
  if (import.meta.env.DEV) {
    void import('@axe-core/react').then(({ default: axe }) => {
      console.info('[axe] dev-mode a11y audit armed (1s debounce)');
      axe(React, ReactDOM, 1000);
    });
  }
  ```
  Violations log to the browser console with a 1s debounce. Banner line
  is a deliberate dev-session marker so the audit's presence is
  verifiable at a glance.

### Tree-shake guardrails
1. `import.meta.env.DEV` is replaced with the literal `false` by Vite
   in prod, making the `if` body statically dead — Rollup eliminates
   the dynamic `import()` and the module never enters the graph.
2. Package lives under `devDependencies`, so `npm install --prod` (or
   any prod-only install strategy) won't even fetch it.

Dist-grep check (`grep -rE "axe-core|@axe-core|axe\.run|AxeBuilder"
apps/web/dist`) **confirmed clean** after commits `511031d` +
`74ebbd8` resolved the upstream tsc/build breakage — zero matches in
prod bundles. (Generic substring "axe" still matches inside unrelated
words like `maxAxes`/`relaxation` across cesium/maplibre/turf —
expected noise, verified non-referential.) Tree-shake working as
designed.

### Verification
- `corepack pnpm --filter @ogden/web add -D @axe-core/react` → installed
  at `^4.11.2`, pnpm-lock.yaml updated.
- Preview dev server reloaded; Vite optimizeDeps rebuilt ("✨ new
  dependencies optimized: @axe-core/react").
- Browser console shows `[axe] dev-mode a11y audit armed (1s debounce)`
  on both `/` and `/project/<uuid>` surfaces.
- Zero violations logged on either surface — slices 1 & 2 left the
  app clean for axe's default ruleset.

### Still open
- Mobile `SlideUpPanel` ergonomics pass (deferred in main audit).
- Public-portal full a11y audit (deferred).

### CI a11y gate — decision deferred (not built this session)
Discussed `pnpm test:a11y` via `@axe-core/playwright` (best ruleset
depth, best DX vs. Lighthouse-CI / Pa11y-CI alternatives). **Not
implemented** — chose dev-mode console as the primary tripwire +
quarterly manual axe sweep as the cheaper-but-discipline-dependent
holding pattern. Empirically a clean codebase re-acquires 1–3 serious
violations per quarter without an automated gate; revisit if drift
shows up in the next manual sweep.
