# 2026-05-25 — Compass progress fill: outside-in (rim → centre)

**Branch.** atlas `feat/atlas-permaculture`, commit `d181f223` (2 files: `package.json` + `pnpm-lock.yaml`). Cross-repo: `ogden-ui-components` `release/v0.1.1` branch + `v0.1.1` tag, commit `e71fcc3`.

## Why

The steward, looking at the **True North** compass, asked that a segment's progress fill **start at the outer rim and grow inward toward the centre** as it nears 100% — the reverse of the prior behaviour, where each wedge filled **centre → rim** (a thin ring hugging the hub at low %, reaching the outer ring at 100%).

## The cross-repo mechanic (the non-obvious part)

The compass wheel is **not** in the atlas repo. It is the shared `MaqasidComparisonWheel` in the separate repo `@ogden/ui-components` (remote `onaxyzogden/ogden-ui-components`), consumed by atlas as a **pinned GitHub tarball** in root `package.json`. That repo's `dist/` is **committed**, so a tarball ref ships prebuilt bundles (no install-time build) — meaning the fix required editing source **and** rebuilding+committing `dist/` in the component repo, then bumping atlas's pin. Source of truth = local clone `C:\Users\MY OWN AXIS\Documents\ogden-ui-components`.

**Steward decisions (AskUserQuestion):** (a) **Surgical patch v0.1.1** — branch from the `v0.1.0` tag atlas already used, apply only the wheel fix, tag `v0.1.1`, bump atlas's pin to it (avoids pulling intervening additive components — BBOS/educational — into atlas). (b) **All wheels** — flip the direction once in the shared component (no opt-in prop), so all **5** atlas compass surfaces change together.

## The change (3 lines, one file)

`src/components/MaqasidComparisonWheel/MaqasidComparisonWheel.jsx`, inside the segment map. The helper `annularSector(rInner, rOuter, startDeg, endDeg)` already takes both radii — only which radius is fixed vs. moving changed (`HUB_R=56`, `PROGRESS_MAX_R = LABEL_INNER_R = 142`):

- Moving **outer** radius → moving **inner** radius:
  - from `const currentR = HUB_R + (PROGRESS_MAX_R - HUB_R) * (pct / 100);`
  - to `const fillInnerR = PROGRESS_MAX_R - (PROGRESS_MAX_R - HUB_R) * (pct / 100);`
  (pct=100 → `fillInnerR = HUB_R` full wedge; pct→0 → `fillInnerR → PROGRESS_MAX_R` thin rim sliver.)
- The `mcw-seg-current` fill + `mcw-seg-pattern` overlay paths: `annularSector(HUB_R, currentR, …)` → `annularSector(fillInnerR, PROGRESS_MAX_R, …)`.

**Left untouched (correct as-is):** `mcw-seg-bg` dim track, `mcw-seg-empty` 0%-only inset dashed ring, `mcw-seg-complete` `outerArc(PROGRESS_MAX_R-2,…)`, the `mcw-progress-grad` radial gradient, and the `.mcw-seg-current` entrance animation (scales about centre — still valid). **No CSS change.**

## Blast radius — 5 atlas surfaces

True North, Observe compass, Plan compass, Act compass, OPA dashboard wheel all consume `MaqasidComparisonWheel`, so the single component flip changes all five. (atlas's separate non-progress `CycleWheel` has its own geometry — out of scope.)

## Release + pin

1. `ogden-ui-components`: `git checkout -b release/v0.1.1 v0.1.0`, applied the 3-line edit, `npm run build` to regenerate `dist/` (es.js/cjs.js/maps/css), committed **source + dist** (`e71fcc3`), tagged `v0.1.1`, pushed branch + tag.
2. atlas: pin `github:onaxyzogden/ogden-ui-components#v0.1.0` → `#v0.1.1` (root `package.json` line 16 — the only atlas package.json pinning it; `apps/web` doesn't pin directly); `corepack pnpm install` refetched the tarball, lockfile now resolves to `…/tar.gz/e71fcc3905050926f32bdd0e9e27057c65791dd4`.

## Verification

Per project rules, `preview_screenshot` times out in this env (known MapLibre/WebGL issue — **stated, not claimed**). Verified instead by a **deterministic geometry probe of the actual installed minified bundle** (`node_modules/@ogden/ui-components/dist/ogden-ui-components.es.js`): the fill formula resolves to `a = H - (H - B) * (i / 100)` with `H = V = 142` (PROGRESS_MAX_R), `B = 56` (HUB_R), and the path call is `annularSector(a, H, …)` — i.e. **outer radius pinned at 142, inner radius tracks completion**:
- pct=0 → inner 142, outer 142 = zero sliver at rim ✓
- pct=50 → inner 99, outer 142 = half-depth band from rim
- pct=100 → inner 56, outer 142 = full wedge to hub ✓

Geometry is a pure function of `pct`, so the bundle-formula proof is conclusive for every segment. The component-repo dist diff was likewise confirmed to carry `H - (H - B) * (i/100)` vs the old `B + (V - B) * (i/100)`.

## Discipline notes

Atlas change staged by **explicit path** (`package.json` + `pnpm-lock.yaml` only) per [[feedback-commit-immediately-on-rebased-branches]]; all foreign WIP (`EconomicsPanel*`, `CapitalPartnerSummary*`/`capitalPartner*`, `MapCanvas`, the `*Map.tsx` trio, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `launch.json`, `.superpowers/`, etc.) left untouched per [[feedback-no-deletion]]. `git fetch` + divergence check (0 behind) before push (`aa64ee89..d181f223`).

## Addendum (2026-05-25) — "wheel looks unchanged" root cause + forward-port to main

After the v0.1.1 pin bump, the steward reported the True North wheel **looked exactly the same**. Read-only investigation showed the **code was correct but the running app served a stale copy** — and surfaced a real release defect.

### Root cause — stale serve (two compounding causes)

1. **The v0.1.1 release never bumped `package.json` `version`** — it still read `"0.1.0"` (the installed package reported `0.1.0`). The lockfile pins by commit so the *file content* was correct, but the package **identity** was unchanged, so npm/vite/browser caches had no signal to invalidate. **This is the real defect.**
2. **atlas excludes the dep from vite's optimizer** — `apps/web/vite.config.ts` `optimizeDeps.exclude: ['@ogden/ui-components']`, so it is served **raw from `node_modules`**. Vite does **not** watch `node_modules` for an excluded dep, so a dev server started *before* the `pnpm install` keeps serving the **old in-memory transform** until restarted. (For a built/preview view, `vite-plugin-pwa` `generateSW`/`autoUpdate` — prod-build only — would precache the old JS until the SW updates.)

### Proof (DOM probe — `preview_screenshot` times out on the WebGL canvas, stated not claimed)

Probed `path.mcw-seg-current` `d` attrs on the live `:5200/v3/project/mtc/compass`:
- **Before restart:** all 4 segments had **inner radius pinned at 56** (hub), moving outer radius = the **old** centre→rim geometry (confirming the stale serve).
- **Fix:** stopped the web dev server, removed `apps/web/node_modules/.vite`, restarted (`corepack pnpm`), reloaded.
- **After restart:** segments show **outer arc fixed at 142**, **inner arc tracking pct** (e.g. inner 84.38/99/113.62/120.5 → ≈67/50/33/25%) = the **new** rim→centre geometry. ✓

### Lesson

> **A release must bump `package.json` `version`, not just move a tag** — otherwise consumer/build/browser caches never bust. And for an `optimizeDeps.exclude`d dep, **restart the dev server** (clear `node_modules/.vite`) after refetching; vite does not watch `node_modules`.

### Forward-port to `main` (`v0.3.1`)

Applied the **same 3-line flip** to `MaqasidComparisonWheel.jsx` on `ogden-ui-components` `main` (wheel JSX was byte-identical to the `v0.1.0` base), **bumped `version` 0.3.0 → 0.3.1** (defect not repeated), `npm run build` (multi-entry dist — `index.es/cjs.js` carry the geometry; bbos bundles are data-only and unchanged), committed source + `package.json` + the `index` bundles/maps by **explicit path** (restored EOL-only churn on CSS/bbos so the diff is limited to the geometry), tagged `v0.3.1`, fetch + divergence check (1 ahead/0 behind), pushed branch + tag (`46a1815..90aa7c6`). The minified `index.es.js` diff confirms `a = V + (H-V)*(i/100)` / `ue(V,a,…)` → `a = H - (H-V)*(i/100)` / `ue(a,H,…)`.

**v0.1.1 left intact** (its file is correct; rewriting a published tag is riskier than the cosmetic version gain). Recommended (non-blocking): atlas eventually bump its pin to `v0.3.1`, which carries the fix **and** the correct version field.

## Addendum (2026-05-25) — atlas pin bumped v0.1.1 → v0.3.1 (the recommended follow-up, now done)

Closed the non-blocking recommendation above: atlas's `@ogden/ui-components` pin moved `#v0.1.1` → `#v0.3.1`. The wheel geometry is identical in both; the win is that **v0.3.1 carries the correct `package.json` `version` field** (0.3.1) so consumer/build/browser caches invalidate properly on future bumps — closing the cache-busting defect from the root-cause section above. v0.3.1 also brings the additive BBOS + educational components (v0.2.0/v0.3.0); atlas only imports `MaqasidComparisonWheel`/`useWheelHoverStore`/`LevelNavigator` (API-unchanged), so the additive components are zero bundle impact (BBOS is a separate dist entry never imported).

### The one real gotcha — dist layout changed between the two tags

v0.1.x shipped a **single-file** dist (`dist/ogden-ui-components.es.js` + `.css`); v0.3.x ships a **multi-entry** dist (`dist/index.es.js`/`index.cjs.js` main + `dist/bbos.es.js`/`.cjs.js` + `ogden-ui-components.css` + `ogden-ui-components-bbos.css`). atlas does **not** resolve the package through its `exports` map — `apps/web/vite.config.ts` hardcodes a vite **alias** straight at the dist file (the dep is installed at the monorepo root; the web dev-server can't traverse up). That alias pointed at `dist/ogden-ui-components.es.js`, **which no longer exists in v0.3.x** → the bump would break `apps/web` unless the alias is repointed. **Fix:** repoint the bare-package alias to `dist/index.es.js`. The CSS alias (`dist/ogden-ui-components.css`) filename is **unchanged** across both tags, so it was left as-is.

### The change (2 file edits + reinstall)

1. Root `package.json` line 16: `…ogden-ui-components#v0.1.1` → `#v0.3.1` (atlas's only pin; `apps/web` doesn't declare the dep, `apps/atlas-ui` is archived/out-of-workspace — left untouched).
2. `apps/web/vite.config.ts`: bare-package alias target `dist/ogden-ui-components.es.js` → `dist/index.es.js` (CSS alias untouched).
3. `corepack pnpm install` — refetched the tarball, lockfile now resolves the v0.3.1 commit `90aa7c6`.

### Verification

Per project rules, `preview_screenshot` times out on the WebGL canvas — **stated, not claimed**; verified by probe.
- **Static install probes:** `node_modules/@ogden/ui-components/package.json` `version` = **`0.3.1`** (the cache-busting fix landed); `dist/index.es.js` carries `a = H - (H - V) * (i / 100)` drawn `ue(a, H, …)`; `dist/ogden-ui-components.css` has 220 `mcw-` styles; lockfile root importer specifier = `#v0.3.1`.
- **Live wheel (after the mandatory dev-server restart + `.vite` clear):** DOM-probed `path.mcw-seg-current` on `:5200/v3/project/mtc/compass` — all 4 segments have **outer arc fixed at 142**, **inner arc tracking pct** (inner 84.38/113.62/99/120.5 → ≈67/33/50/25%) = rim→centre. ✓
- **Build sanity (the alias is the risk):** the combined `tsc && vite build` script fails at `tsc` on the **known 3-error pre-existing baseline** (foreign WIP: `StepBoundary.tsx`, two `HostUnion*` plan/layers tests — unrelated to this JS-only dep change). Ran `vite build` directly: **succeeded in 39.54s**, repointed alias resolved, PWA SW generated. ✓

### Commit

atlas: `package.json` + `apps/web/vite.config.ts` + `pnpm-lock.yaml` by **explicit path** (commit `77fe24af`), excluding all foreign WIP (`EconomicsPanel*`, `CapitalPartnerSummary*`/`capitalPartner*`, `MapCanvas`, `*Map.tsx` trio, `ZoneSomSidebar*`, `MapCoordinateReadout*`, `launch.json`, `.superpowers/`, etc.).
