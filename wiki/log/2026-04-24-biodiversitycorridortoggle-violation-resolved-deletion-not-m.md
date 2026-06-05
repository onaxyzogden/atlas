# 2026-04-24 — BiodiversityCorridorToggle violation resolved (deletion, not migration)


**Motive.** The IA conventions doc (commit `f16d0c1`) flagged `BiodiversityCorridorOverlay.tsx:265-287` as a §3 known violation: a hand-rolled `backdropFilter` toggle button parallel to a correct spine-btn. The recommended-next-session line said "migrate to `MapControlPopover`". Spent the orientation pass auditing the call sites before agreeing.

**Critical finding — dead code.** `BiodiversityCorridorToggle` had a `compact?: boolean` prop with two return branches: a spine-btn for `compact === true` and the hand-rolled chrome for the default. The only consumer in the codebase is [`MapView.tsx:362`](../../apps/web/src/features/map/MapView.tsx) — `<BiodiversityCorridorToggle compact />`. The non-compact branch was unreachable. `MapControlPopover` is also the wrong shape for a label-only toggle (it's a chrome container for legends/pickers, not a single button).

**Resolution.** Resolution = delete, not migrate.

- [BiodiversityCorridorOverlay.tsx](apps/web/src/features/map/BiodiversityCorridorOverlay.tsx): dropped the `compact` prop, the `if (compact) { return ... }` wrapper, and the 23-line non-compact `return` block. The spine-btn return is now the unconditional return.
- [MapView.tsx:362](apps/web/src/features/map/MapView.tsx): dropped the now-redundant `compact />` prop on the `<BiodiversityCorridorToggle />` JSX call.

**Doc updates.** [`design-system/ogden-atlas/ia-and-panel-conventions.md`](design-system/ogden-atlas/ia-and-panel-conventions.md):
- §3 Known violations bullet struck through and marked "Resolved 2026-04-24" with a note that resolution was deletion (the dead branch had only one unused call shape).
- §4 Paint-only overlays line for `BiodiversityCorridorOverlay` updated — no longer carrying a violation note; now reads as a clean paint overlay with a co-located spine-btn export.
- Revision history footer gained a third bullet recording this resolution.

**Verification.** `tsc --noEmit` on `apps/web` clean. Live preview at `localhost:5200` shows the spine-btn rendering as the connectivity-Waypoints SVG (38×40px, `class="spine-btn"`, `aria-pressed="false"`). Map a11y / `getLayer` errors in the console are pre-existing and unrelated to this change.

### Recommended next session

- **Map-overlay chrome migration completion** (the broader §3 backlog item): grep `backdropFilter` in `apps/web/src/features/map/**` and audit the 5 remaining files (`AgroforestryOverlay`, `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`, `MulchCompostCovercropOverlay`) for popover-vs-spine-btn-vs-no-chrome classification before migrating opportunistically. Or `MASTER.md` palette refresh as a doc-only alternative.
