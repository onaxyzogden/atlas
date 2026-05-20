# 2026-05-03 — TanStack Router migration (atlas-ui)


Replaced the 12-way `window.location.pathname` switch in `apps/atlas-ui/src/main.jsx`
with TanStack Router v1.79.0.

**Files changed:**
- `apps/atlas-ui/package.json` — added `@tanstack/react-router: ^1.79.0`
- `apps/atlas-ui/src/routes/index.jsx` (new) — full route tree: `rootRoute`,
  `indexRoute` (/ → /observe redirect via `beforeLoad`), 11 leaf routes,
  `notFoundComponent` on the root for 404 handling
- `apps/atlas-ui/src/main.jsx` — replaced pathname switch with `<RouterProvider router={router} />`
- `apps/atlas-ui/vite.config.js` — added `resolve.dedupe: ["react", "react-dom"]`

**Duplicate React fix** — workspace root `node_modules` contains React 18.3.1 (used by
`apps/web`); `apps/atlas-ui/node_modules` has React 19.2.5. TanStack Router was
resolving React 18, causing "Invalid hook call" errors. `resolve.dedupe` in Vite pins
all React imports to the atlas-ui local copy (React 19).

**404 handling** — TanStack Router v1 does not match `path: "*"` the same way other
routers do. Custom 404 uses `notFoundComponent` on `createRootRoute` instead.

**Smoke test** — all 12 routes return HTTP 200 from Vite dev server; no console errors;
custom 404 renders correctly for unknown paths.
