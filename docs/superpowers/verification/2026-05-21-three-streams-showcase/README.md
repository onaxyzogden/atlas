# Three Streams Showcase Portal — Phase 3 Task 16 verification

Date: 2026-05-21
Branch: `feat/atlas-permaculture`
Plan: `docs/superpowers/plans/2026-05-21-three-streams-showcase-portal.md`
(Task 16, lines 1291–1333).

## Artefacts in this directory

| File | What it covers |
|---|---|
| `tsc-summary.md` | `tsc --noEmit` baseline vs new-error analysis. 6 baseline (unrelated), 0 new from Phase 3. Two showcase TS errors introduced by Task 15 were caught and fixed here. |
| `vitest-summary.md` | Showcase suite (14/14 pass) + full web (1772/1772) + full api (669 pass, 3 skip). No new regressions. |
| `cold-visitor-flow.md` | Manual 6-step flow walk via Claude Preview MCP against `vite preview --port 4173`. Pre-flight regression in body overflow caught + fixed; flow then completed cleanly. SEO `curl -A Slackbot` proved prerendered hero copy is served. |
| `lighthouse-three-streams.json` | Stripped Lighthouse summary (FCP, LCP, byte-weight, unused-JS, bootup, speed-index, TBT, performance score). |

## Headline metrics

- **Type check**: 0 new errors. 6 baseline carry-over.
- **Showcase tests**: 14 / 14 pass.
- **Web tests**: 178 files / 1772 tests — all pass.
- **API tests**: 61 files / 669 tests — all pass (+ 1 file / 3 tests skipped, pre-existing).
- **FCP**: 11.2 s (budget 1.5 s) — **exceeded**.
- **LCP**: 11.5 s (budget 2.5 s) — **exceeded**.
- **Performance score**: 0.55.
- **Total byte weight**: 1495 KiB. **Unused JS**: 884 KiB est savings.
- **SEO smoke** (`Slackbot` UA): hero copy + Sixteen Mile Creek + Apricot
  Lane attribution all present in prerendered HTML for `/showcase/three-streams/`
  and `/showcase/three-streams/dreaming/`.

## Fixes applied during this verification (NOT pre-existing)

1. **Showcase TS errors** in `apps/web/src/showcase/__tests__/covenant.test.ts`
   — added `?? ''` fallback for `lines[i]` to satisfy
   `noUncheckedIndexedAccess`.
2. **Body overflow lock on showcase routes** — added `showcase-scroll` body
   class (set by `useEffect` in both showcase routes) plus matching CSS rule
   in `apps/web/src/app/index.css`. Without this, the showcase pages would
   not scroll and only the hero would be visible.

Both fixes are included in the same commit as these artefacts.

## Open followups (NOT blockers)

1. **Lighthouse budget** — FCP / LCP grossly exceed targets because the
   showcase route currently loads the full app bundle (`index-*.js` 2.2 MB,
   `cesium-*.js` 4 MB). Phase 3 followup: split the showcase entry from the
   authed-app bundle (separate Vite entry or aggressive route-level dynamic
   imports) and re-run Lighthouse.
2. **Build script** — `tsc && vite build` is blocked by the 6 baseline tsc
   errors carried over from external rebases. Either clear the baseline or
   demote the `tsc` gate to a separate `lint` script.
3. **Vite preview no-trailing-slash redirect** — `/showcase/three-streams`
   falls back to SPA shell under preview; production needs nginx /
   Cloudflare rewrite or trailing slash discipline.

## Apricot Lane attribution

The exact string verified across the prerendered HTML, the hero scene, the
attribution footer, and the showcase covenant test:

> Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown
> in The Biggest Little Farm; Three Streams Farm is a fictional Ontario
> operation.

## Verdict

**STATUS: DONE_WITH_CONCERNS** — All 6 steps run, artefacts committed, 0 new
test failures, 0 new tsc errors after fix, cold-visitor flow walked with
screenshots. Concerns: Lighthouse FCP/LCP miss budget; documented as Phase 3
followup #1.
