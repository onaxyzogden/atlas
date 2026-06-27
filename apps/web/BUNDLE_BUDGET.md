# Bundle budget — first-paint guard

A gzip ceiling on what the browser must download before the public showcase
portal can paint. It locks in the Phase 3.5 "Prong B" win and fails CI the
moment a heavy chunk leaks back into the showcase entry.

- **Guard script:** [`scripts/check-bundle-budget.mjs`](scripts/check-bundle-budget.mjs)
- **Budget data:** [`bundle-budget.json`](bundle-budget.json) (`maxGzipBytes` is machine-written — see below)
- **npm scripts:** `bundlesize` (check), `bundlesize:update` (re-lock)
- **Background:** ADR `2026-05-21-atlas-showcase-bundle-split`

---

## Why this exists

`showcase.html` is a **second Vite entry** (alongside the authed `index.html`).
Its whole reason for existing is to serve the public `/showcase/three-streams`
scrollytelling portal *without* dragging in the authed app's heavy graph:

| Chunk | ~gz | Belongs to |
|---|---|---|
| `maplibre-gl` | ~234 kB | live map renderer |
| `@turf/turf` | ~145 kB | geometry/analysis |
| `ecocrop-db` (FAO dataset) | ~109 kB | species suitability |
| `panel-sections` | ~66 kB | SiteIntelligencePanel UI |
| `panel-compute` | ~53 kB | SiteIntelligencePanel math |

Before the split, **all** of these sat in showcase's eager `<script>` closure —
roughly **~687 kB gz** of first paint for a marketing page that shows a static
map thumbnail until you click "explore."

The failure mode is sneaky: a single **static** `import` from any
`src/showcase/**` module into one of those chunks re-pulls the whole thing into
first paint. Rollup co-locates shared leaf modules into whichever chunk uses
them, so even an innocent shared constant (this actually happened with
`src/lib/tokens.ts` getting folded into the lazy `panel-sections` chunk) can
bridge `showcase-app -> panel-sections` and silently re-leak hundreds of kB. It
is invisible in code review and in a normal build log.

This guard turns that into a hard, loud CI failure.

---

## What's enforced

One budget today — **`showcase-initial`**: every eager asset the browser must
fetch for first paint of `showcase.html`, i.e. each `<script type="module">`
plus each `<link rel="stylesheet">`, gzipped and summed. (Dynamic
`import()`ed chunks — `showcase-map`, `showcase-vendor` — are **not** counted;
they load on demand after the click-to-explore gate.)

Current locked state (`corepack pnpm --filter @ogden/web build` then `bundlesize`):

```
showcase-initial  (dist/showcase.html)
    83.9 kB  assets/framework-*.js            React + Router + Zustand
    12.7 kB  assets/showcase-app-*.js         showcase entry + scenes
    10.6 kB  assets/showcase-app-*.css        showcase styles
     1.1 kB  assets/foundation-*.js           design tokens leaf
     0.4 kB  assets/modulepreload-polyfill-*.js
  ---------
   108.7 kB  total   ceiling 115.0 kB   ✔ 6.3 kB headroom
```

**~687 kB gz -> ~109 kB gz** for first paint. `framework` (React/Router/Zustand,
stable across builds) is the bulk; the showcase's own JS+CSS is ~23 kB.

---

## Running it

The guard reads the **built** `dist/`, so build first:

```powershell
corepack pnpm --filter @ogden/web build      # writes dist/showcase.html + assets
corepack pnpm --filter @ogden/web bundlesize # check against the locked ceiling
```

- **Pass:** prints the per-asset breakdown and `✔ bundle-budget guard OK` (exit 0).
- **Fail:** prints `✖ OVER by N kB` and exits 1. The likely cause is a new static
  import into the heavy graph — find it and make it a dynamic `import()`, or move
  the shared leaf to its own chunk in `vite.config.ts` `manualChunks` (see how
  `ShowcaseMap` / `foundation` are pinned there).

### Intentionally growing the budget

If the increase is real and justified (e.g. a deliberate framework upgrade),
re-lock the ceiling:

```powershell
corepack pnpm --filter @ogden/web build
corepack pnpm --filter @ogden/web bundlesize:update
```

`--update` recomputes the actual size and writes a fresh `maxGzipBytes` =
current + headroom. **Commit that `bundle-budget.json` diff and call it out in
review** — it is a ratchet, the same as updating a snapshot. Never hand-edit
`maxGzipBytes`; let `--update` set it.

---

## How it works

1. Parse the built entry HTML (`dist/showcase.html`) for eager assets:
   `<script type="module" src>` and `<link rel="stylesheet" href>` pointing at
   `/assets/`. (`<link rel="modulepreload">` is counted only for budgets that
   opt in via `"includeModulePreload": true` — used for entries like the authed
   `index.html` that preload their static closure that way. Showcase inlines its
   module scripts, so it does not need the opt-in.)
2. gzip each referenced file in `dist/` and sum the bytes.
3. Compare the total to `maxGzipBytes`. Over -> print and exit 1.

Parsing the HTML (instead of hardcoding chunk globs) means the guard tracks the
*actual* first-paint set even as content-hashed filenames change every build,
and it automatically notices a brand-new eager chunk appearing.

**Headroom policy:** `--update` locks at `current + max(5%, 2 KiB)`, rounded up
to a whole KiB. That sits far below the smallest heavy chunk (~53 kB gz), so any
re-leak still trips the guard, while routine ±few-kB churn (a minor dep bump)
does not cause a false alarm.

**Gzip note:** the script uses Node's `zlib.gzipSync` at its default level, so
its absolute numbers run a hair (~2%) under Vite's build-reporter gzip column.
That is fine — the ceiling is computed by the *same* function it is checked
against, so the budget is internally consistent. It is a relative ratchet, not
an authoritative wire-size measurement.

---

## Adding another budget

`bundle-budget.json` holds an array, so guarding another entry (e.g. the authed
`index.html`) is just another object:

```jsonc
{
  "name": "main-initial",
  "description": "...",
  "html": "dist/index.html",
  "includeModulePreload": true,   // index.html preloads its static closure
  "maxGzipBytes": 0               // then run bundlesize:update to lock it
}
```

Add it with `maxGzipBytes: 0`, build, then run `bundlesize:update` to set the
real ceiling.

---

## CI

Run after the build step, e.g.:

```yaml
- run: corepack pnpm --filter @ogden/web build
- run: corepack pnpm --filter @ogden/web bundlesize
```

A non-zero exit fails the job. The error message tells the next engineer exactly
how to re-lock if the growth was intentional.
