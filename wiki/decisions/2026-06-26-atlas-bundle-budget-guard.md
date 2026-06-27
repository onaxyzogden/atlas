# ADR: Bundle-budget guard — first-paint gzip ratchet

**Date.** 2026-06-26
**Status.** accepted
**Spec source.** Operator scope "Full fix + create guard" on the showcase
first-paint regression; follows Open Followup #1 of
[[decisions/2026-05-21-atlas-showcase-bundle-split]].

## Context

The public showcase ships as a second Vite entry (`apps/web/showcase.html`)
whose entire purpose is to keep the authed app's heavy graph out of first
paint. That isolation is **silently reversible**: a single static `import`
from any `src/showcase/**` module into the heavy graph — or even an
*unassigned shared leaf* that Rollup co-locates into a heavy chunk — re-pulls
hundreds of kB into the showcase entry's eager `<script>` / `<link>` closure.
This exact regression class had already happened: a shared `src/lib/tokens.ts`
leaf folded into the lazy `panel-sections` chunk, bridging `showcase-app →
panel-sections → @turf/turf + ecocrop-db` (full narrative in
[[log/2026-06-26-atlas-showcase-bundle-budget-guard]]). It is invisible in code
review and in a normal build log, and the cost is an order of magnitude — the
smallest heavy chunk is ~53 kB gz, the largest (`maplibre`) ~234 kB. Phase
3.5's isolation win needed a tripwire, not only a one-time fix.

## Decision

Adopt a committed **bundle-budget ratchet** — the bundle analog of the
completion-path audit ratchet
([[decisions/2026-06-11-atlas-completion-path-audit-ratchet]]):

- **`apps/web/scripts/check-bundle-budget.mjs`** — zero dependencies
  (`node:` builtins only, so it runs in any worktree with no install, exactly
  like `check-react-resolution.mjs`). It parses the **built** entry HTML for
  eager first-paint assets — `<script type="module" src>` and
  `<link rel="stylesheet" href>` under `/assets/` (`rel="modulepreload"` only
  when a budget opts in via `includeModulePreload`) — gzip-sums them, prints a
  per-asset table, and exits 1 if the total exceeds the budget's
  `maxGzipBytes`. Parsing the *actual* built HTML (not hardcoded chunk globs)
  means the guard tracks content-hashed filenames across builds and notices any
  brand-new eager chunk automatically.
- **`apps/web/bundle-budget.json`** — an array of budgets; today one,
  `showcase-initial` (`dist/showcase.html`), ceiling **117760 B (115.0 kB)**.
  `maxGzipBytes` is machine-written by `--update` and never hand-edited.
- **npm scripts** `bundlesize` (check) / `bundlesize:update` (re-lock to
  current + headroom). `--update` is the deliberate "I grew it on purpose"
  escape hatch; its diff is a reviewable ratchet, the same as updating a
  snapshot.
- **`apps/web/BUNDLE_BUDGET.md`** — why it exists, the heavy-chunk table,
  run / CI instructions, the headroom policy, and the gzip-level caveat.

**Headroom policy.** `--update` locks at `current + max(5%, 2 KiB)`, rounded up
to a whole KiB. That sits far below the smallest heavy chunk (~53 kB gz), so
any re-leak still trips the guard, while routine ±few-kB churn (a minor dep
bump) does not raise a false alarm.

## Consequences

- A re-leak of `maplibre` / `turf` / `ecocrop-db` / `panel-compute` /
  `panel-sections` into showcase first paint is now a **hard, loud CI failure**
  with an actionable message: find the static import and make it dynamic, or
  pin the shared leaf to its own chunk in `vite.config.ts` `manualChunks` (the
  `foundation` / `showcase-map` rules are the worked examples).
- The guard runs **after** the build (`dist/` must exist); CI order is
  `build` → `bundlesize`.
- **Gzip-level caveat:** the script uses Node's `zlib.gzipSync` at default
  level, ~2% under Vite's build-reporter gzip column. The ceiling is computed
  by the *same* function it is checked against, so the budget is internally
  consistent — a relative ratchet, not an authoritative wire-size measurement.
- Guarding the authed `index.html` later is just another array object with
  `"includeModulePreload": true` (it preloads its static closure that way),
  `maxGzipBytes: 0`, then `bundlesize:update`. Stub documented in
  `BUNDLE_BUDGET.md`.

## Verification

Landed in commit `04cd3489` alongside the chunk-split fix. `bundlesize`
reports `showcase-initial 108.7 kB < 115.0 kB ✔ (6.3 kB headroom)`, exit 0; a
deliberately lowered ceiling produced `✖ OVER`, exit 1, and `bundlesize:update`
restored it — both bite and pass proven. `apps/web` tsc unchanged (0 new over
the 6-error foreign baseline).

## Covenant & branch discipline

Build-tooling only — no capital/sale/financing surface, no CSRA/salam
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Commit
`04cd3489` on the local-only `claude/compassionate-burnell-d27343`, **not
pushed** (operator controls pushes); explicit pathspecs.

## Cross-links

- Bundle-split (Prong B) ADR this guards:
  [[decisions/2026-05-21-atlas-showcase-bundle-split]]
- Session log: [[log/2026-06-26-atlas-showcase-bundle-budget-guard]]
- Sibling ratchet precedent:
  [[decisions/2026-06-11-atlas-completion-path-audit-ratchet]]
- Entities: [[entities/showcase-portal]], [[entities/web-app]]
