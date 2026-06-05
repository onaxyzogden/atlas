# 2026-05-06 — `/cycle` page + CycleWheel (MaqasidComparisonWheel port to OLOS)


**Trigger.** User asked for a top-level OLOS page with a 3-segment progress wheel labelled Observe / Plan / Act and **Cycle** in the centre, then refined: clone the source from `onaxyzogden/ogden-ui-components` rather than build a fresh primitive, and replace band labels with icons.

**What landed.** New top-level route `/cycle` under `appShellRoute` in `apps/web/src/routes/index.tsx`; thin `CyclePage` host; new `apps/web/src/components/CycleWheel/` folder with three files ported from `MaqasidComparisonWheel`:

- [`CycleWheel.tsx`](apps/web/src/components/CycleWheel/CycleWheel.tsx) — annular-sector geometry (`polar`, `annularSector`), mount-entry choreography (`is-mounted` + 90 ms cascade), label-band ring with Lucide icons (`Eye` / `Compass` / `Zap`) at the band midpoint, breathing hub with `CYCLE` text. Stripped: mithaq stores, milestone watcher, wisdom tooltip, next-action card, dormant/converged/igniting states, navigation, progress fills, needle.
- [`CycleWheel.css`](apps/web/src/components/CycleWheel/CycleWheel.css) — port of `MaqasidComparisonWheel.css` reduced to the kept surfaces; class prefix `mcw-` → `cw-`; CSS custom props `--cw-level-*` driven by the OKLCH palette.
- [`wheelColor.ts`](apps/web/src/components/CycleWheel/wheelColor.ts) — TypeScript port of `wheelColor.js` (sRGB → linear → OKLab → OKLCH lightness retargeting at 0.65 / 0.72 / 0.10 / 0.78).
- [`index.ts`](apps/web/src/components/CycleWheel/index.ts) — barrel.

Static decorative segments (each fully filled), default level colour `#5a8a5a` (sage green) per the user's "static decorative" answer earlier in the session. Page at [`apps/web/src/pages/CyclePage.tsx`](apps/web/src/pages/CyclePage.tsx) + [`CyclePage.module.css`](apps/web/src/pages/CyclePage.module.css) (centred flex column, wheel sized `min(360px, 70vw, 60vh)`).

**Verification.** `npx pnpm --filter @ogden/web typecheck` clean (one false-start with a hand-rolled `IconComponent` type — fixed by typing the prop as `LucideIcon`). Vite preview at `http://localhost:5200/cycle` after stale-server restart (the existing dev server held a pre-edit module graph and served `Not Found` until stopped + restarted). DOM inspection: `svg.cw-svg` present, 3 `.cw-band-icon svg` children, `cw-hub-label` text `CYCLE`, aria-label `CYCLE cycle wheel`. Screenshot confirms layout: Eye top, Compass lower-right, Zap lower-left, breathing hub centred, sage palette.

**Notes.**

- Sidebar entry intentionally not wired — page is reachable by URL only. Adding a nav item touches `features/navigation/taxonomy.ts` + `IconSidebar.tsx` / `DashboardSidebar.tsx` and a `DashboardRouter.tsx` case; deferred until a consuming feature lands.
- `@ogden/ui-components` is **not** an `apps/web` dependency, so importing the upstream `MaqasidComparisonWheel` was not an option — the port is the dependency-free path. Future shared usage (e.g. by `apps/atlas-ui`) can either lift this to `packages/ui` or pull `@ogden/ui-components` into the monorepo.
- The original 7-segment wheel's progress / hover-wisdom / mithaq behaviours are intentionally absent in the port; if a future "iteration cycle" surface needs progress fills per stage, the dim → grad layering already in `CycleWheel.tsx` can be re-enabled by reading a `current` prop off `CycleSegment`.

### Deferred

- Sidebar / nav entry for `/cycle`.
- Per-segment routing (e.g. `/cycle/observe`) — current segments have no `route` prop and no click handler.
- Hub progress readout (avg %), mithaq covenant ring, wisdom tooltips — not ported.

### Recommended next session

- Either retire `/cycle` as a one-off demo or wire it into `taxonomy.ts` + give each segment a destination so the wheel becomes a real navigation surface.
- If the latter: re-introduce the `seg.route` + click-to-activate path from the original `MaqasidComparisonWheel` (it was stripped in the port; re-adding is ~15 LOC).
