# Offline-demo E2E smoke suite

Thin end-to-end Playwright coverage for the **offline-demo** path
(`FEATURE_DEMO_OFFLINE`) — pre-launch audit item **F4**. These are smoke tests,
not exhaustive coverage: three critical happy paths that must never silently
break before a launch.

## What it covers

| Spec | Happy path |
|---|---|
| [`_smoke.spec.ts`](./_smoke.spec.ts) | Phase-0 canary: the offline bundle builds, serves, and redirects `/` → portfolio. |
| [`offline-demo-boot.spec.ts`](./offline-demo-boot.spec.ts) | Boots client-only, shows the demo banner, seeds ≥3 sample projects, and the homestead sample's async seed actually runs. |
| [`header-project-selector.spec.ts`](./header-project-selector.spec.ts) | The header selector switches the active project, and degrades to a single-row listbox when only one project is left. |
| [`role-scope-never-hide.spec.ts`](./role-scope-never-hide.spec.ts) | An Operational Role scope de-emphasizes out-of-focus objectives **without hiding any** — the full objective set is identical across the My-focus / Full-view toggle. |

[`_helpers.ts`](./_helpers.ts) holds the shared boot + project-store helpers (it
is not a spec and is not collected as a test).

## Running

> **Windows:** pnpm is invoked via `corepack pnpm` (pnpm is not on PATH).

```bash
# One-time: install the Chromium browser Playwright drives.
corepack pnpm --filter @ogden/web run test:e2e:install

# Run the suite (builds the offline bundle, serves it, runs all specs).
corepack pnpm --filter @ogden/web run test:e2e

# A single spec:
corepack pnpm --filter @ogden/web exec node ../../node_modules/@playwright/test/cli.js test e2e/role-scope-never-hide.spec.ts
```

## How it runs

- **No live API.** The Playwright `webServer` first runs
  [`scripts/build-offline-demo.mjs`](../../../scripts/build-offline-demo.mjs),
  which sets `FEATURE_DEMO_OFFLINE=true` *before* Vite loads its config, then
  serves the static `dist/` with `vite preview` on port `4317`. The bundle has no
  API/auth/sync — a synthetic in-browser guest stands in.
- **Playwright invocation.** `@playwright/test`'s own CLI is called directly
  (`node ../../node_modules/@playwright/test/cli.js test`) from the repo-root
  `node_modules` (where it is hoisted). This avoids a dual-package hazard: two
  distinct `playwright` realpaths across registries otherwise trip
  *"test() did not expect to be called here."*
- **Service worker blocked.** The offline build ships a PWA service worker; the
  config blocks it (`serviceWorkers: 'block'`) so reloads are deterministic and
  no precached shell is served stale.
- **Serial, single worker.** `fullyParallel: false`, `workers: 1` — one preview
  server, and only one Cesium-loading context at a time.

## Test seams these specs rely on

- `window.__ogdenProjectStore` — the projectStore hook, exposed for reading the
  seeded project roster and archiving projects locally.
- `localStorage['demo-user-id']` — overridden before boot to become a specific
  demo member (Amina, `food_production`) so the role layer engages.
- The homestead seed sentinel (`localStorage` key prefixed
  `homestead-sample-seeded@v1:`) — confirms the async sample seed ran.
- Accessible roles / test ids already present in production:
  `listbox[aria-label="Switch project"]`, `view-focus-toggle`,
  `view-focus-role` / `view-focus-full`, `rail-outside-focus-toggle`, and the
  objective cards' `[role="button"][data-status]`.
