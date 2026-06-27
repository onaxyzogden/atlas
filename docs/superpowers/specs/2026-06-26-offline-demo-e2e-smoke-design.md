# Offline-demo E2E smoke suite — design

**Date:** 2026-06-26
**Status:** Implemented
**Audit item:** F4 (pre-launch deep audit, `scripts/audit-out/ATLAS_DEEP_AUDIT_2026-06-26.md`)

## Objective

Add a thin end-to-end Playwright smoke suite for the **offline-demo** path
(`FEATURE_DEMO_OFFLINE`). Smoke, not exhaustive: cover three critical happy
paths so they cannot silently break before launch.

1. **Boot & seed** — the offline bundle launches client-only and the homestead
   sample seed loads.
2. **Project switcher** — the header selector switches projects, across
   single- and multi-project states.
3. **Role-scope never-hide** — an Operational Role scope de-emphasizes the right
   domains *without ever hiding* an objective.

## Constraints

- **Windows:** pnpm is invoked through `corepack pnpm` (pnpm is not on PATH).
- **No live API:** the run builds and serves the `FEATURE_DEMO_OFFLINE` bundle;
  it must not depend on a running API/auth/sync.
- `lint` is `tsc --noEmit` (no ESLint). The `e2e/` folder is outside the app
  tsconfig `include`, so Playwright transpiles specs via esbuild at run time;
  lint is unaffected by them.
- Operator controls pushes (**do not push**) and commits use explicit pathspecs
  (operator WIP lives in the tree).

## Architecture

### Build & serve the offline bundle

The Playwright `webServer` chains two steps under the OS shell:

```
node ../../scripts/build-offline-demo.mjs && corepack pnpm exec vite preview --port 4317 --strictPort
```

`scripts/build-offline-demo.mjs` sets `process.env.FEATURE_DEMO_OFFLINE = 'true'`
*before* importing Vite, because `vite.config.ts` reads the flag through `define`
at config-evaluation time. `vite preview` then serves the static `dist/`. A
single `playwright test` invocation therefore produces and serves a faithful
offline build with no live backend. `reuseExistingServer: !CI` lets local reruns
reuse an already-running preview.

### Playwright invocation (dual-package hazard)

Specs are run via `@playwright/test`'s own CLI directly:

```
node ../../node_modules/@playwright/test/cli.js test
```

invoked from `apps/web` (the binary is hoisted to the repo-root `node_modules`).
Going through a workspace-local `playwright` binary crosses two distinct
`playwright` realpaths and trips *"test() did not expect to be called here."*
Calling `@playwright/test`'s CLI from the root install avoids it. Browsers are
installed via the same CLI (`... cli.js install chromium`). Both are wired as
`test:e2e` / `test:e2e:install` scripts in `apps/web/package.json`.

### Config choices (`apps/web/playwright.config.ts`)

- `port 4317`, `baseURL http://localhost:4317`.
- `fullyParallel: false`, `workers: 1` — one preview server, and only one
  Cesium-loading context at a time (resource contention otherwise).
- `serviceWorkers: 'block'` — the offline build ships a PWA service worker;
  blocking it keeps reloads deterministic and avoids a stale precached shell.
- `screenshot: 'only-on-failure'`, `trace: 'on-first-retry'`.

### Test seams

These already exist in production; the suite reads them rather than scraping the
DOM for data only the store holds:

- `window.__ogdenProjectStore` — the projectStore zustand hook. `getState()` to
  read the seeded roster; `setState()` to fabricate state a builtin can't reach
  (see P2).
- `localStorage['demo-user-id']` — the key the offline boot reads to mint the
  guest. Overriding it before boot lets a spec *be* a specific demo member.
- The homestead seed sentinel — a `localStorage` key prefixed
  `homestead-sample-seeded@v1:`, written when the async sample seed runs.
- Accessible roles / test ids: `listbox[aria-label="Switch project"]`,
  `view-focus-toggle`, `view-focus-role` / `view-focus-full`,
  `rail-outside-focus-toggle`, and the objective cards'
  `[role="button"][data-status]`.

Shared boot/store helpers live in `e2e/_helpers.ts` (not a spec; not collected).

## Per-spec design

### P1 — `offline-demo-boot.spec.ts`

- `bootDemo`: load `/`, assert it serves and redirects to `/v3/portfolio`, then
  wait until the store holds ≥3 non-archived projects (the builtin clones).
- Assert the demo banner is visible (`/exploring a free demo/i` — a plain
  substring that sidesteps the curly apostrophe / em-dash in the copy).
- Assert ≥3 sample projects and that one carries
  `metadata.instantiatedFromTemplate === 'homestead-sample'`.
- Poll for the homestead seed sentinel so we prove the **seed ran**, not merely
  that the clone exists (the seed fires asynchronously via `queueMicrotask`).

### P2 — `header-project-selector.spec.ts`

- **Multi-project switch:** land on a project, open the listbox, read the first
  `option[aria-selected="false"]` (a `<Link>` to `/v3/project/<id>/<stage>`),
  click it, and assert the URL now points at that project.
- **Single-project state:** the demo samples are `isBuiltin`, and `updateProject`
  drops non-allowlisted fields for builtins while `archiveProject` early-returns
  on them — so neither can archive a sample. Instead, after the selector has
  mounted (and with no further navigation, since a reload re-injects the samples
  fresh), fabricate the sole-project state via the raw `setState` writer, then
  assert the listbox shows exactly one `option`, none selectable to switch to,
  and the "All projects" escape-hatch link.

### P3 — `role-scope-never-hide.spec.ts`

**Surface.** The live default Plan shell is `PlanTierShell`, whose objectives
list is the shared `ActTierObjectiveRail`. That rail mounts `ViewFocusToggle`
and renders `ActTierObjectiveCard`s. (The legacy `stratum-spine` shell's
`ObjectiveColumn` is opt-in and mounts no toggle, so it is not the live surface.)
The rail implements never-hide as **collapse-not-drop**: in-focus cards in the
main list, out-of-focus cards in a one-click "Outside your focus (N)" group.

**Precondition (engage the layer).** The layer is active only for a non-solo
viewer who holds an operational role. The demo seeds a 2-member roster
(Yousef + Amina); `isSoloProject` is false at `memberCount === 2`. The spec
overrides `demo-user-id` to Amina's id **before boot** (via `addInitScript`), so
she boots as herself with `operationalRoles: ['food_production']` and the layer
engages. A loud guard asserts `view-focus-toggle` mounts, with a message that
points at the precondition (roster/role/identity) rather than the invariant.

**Invariant.** Objective cards are `[role="button"][data-status]` — the explicit
`role` attribute is unique to the cards (native `<button>`s have no literal
`role`). In **My focus**, expand the outside group (collapsed ≠ hidden) and count
cards; assert every card carries `data-scope ∈ {in, out, out-surfaced}` and that
at least one is out-of-focus (proving de-emphasis happened). In **Full view**,
count cards again; assert the count is **identical** and that **no** card carries
`data-scope`. Same non-empty objective set across the toggle, scope annotation
the only delta → never hidden, only de-emphasized.

## Out of scope (YAGNI)

- No live-API / online path — offline demo only.
- No visual-regression / screenshot baselines (screenshots only on failure).
- Not exhaustive per-route coverage — three happy paths.
- F1–F3 and F5 from the audit are separate deferrals, untouched here.

## Verification

`corepack pnpm --filter @ogden/web run test:e2e` → 6/6 green (the three specs
plus the Phase-0 `_smoke` canary). See `apps/web/e2e/README.md` for run
instructions.
