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

## Follow-up (recommended, not blocking)

Forward-port the same 3-line flip onto `ogden-ui-components` `main`/HEAD so the fix isn't lost when atlas later bumps past v0.1.x. (The JSX is byte-identical between `v0.1.0` and HEAD for the wheel, so the patch applies cleanly; versions since v0.1.0 only **add** BBOS + educational components.)
