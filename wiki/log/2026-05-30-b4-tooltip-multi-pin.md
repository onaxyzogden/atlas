# 2026-05-30 — B4 tooltip multi-pin (Slice L)

**Branch.** `feat/atlas-permaculture` (shipped as
`claude/zealous-hawking-a75e25`). Closes Slice L of the [B4 tooltip
remaining-deferrals roadmap](2026-05-30-b4-tooltip-perblock-fade-and-reverse.md).
Full design context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-tooltip-multi-pin.md).

**What changed.**

- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — `pinnedUnion` (single `{ point, entries, hostIds }` object)
  replaced with `pinnedHosts: Map<string, HostBlock>` keyed by
  hostId; `lastCursorPointRef` added to freeze the anchor when the
  cursor leaves the canvas with pins active; click handler rewritten
  as per-host Map toggle; ESC + tap-outside now clear ALL pins
  (matches steward intent); `sameHostIdSet()` helper deleted;
  `activeUnion` becomes a useMemo merging pinned (insertion order,
  `pinned: true`) + hover (filtered by `!pinnedHosts.has`, `pinned:
  false`) into a single cursor-anchored stack; portal render no
  longer forwards a top-level `pinned` prop; `useRef` added to the
  React import.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  — `HostBlockEntry` gains `pinned: boolean` (kept off
  `HostBlockProps` so the raw-data interface stays narrow);
  `HostBlock` sub-component destructures `pinned` and writes
  `data-pinned='true'` on its root div conditionally; top-level
  `pinned?` prop dropped from `HostCanopyUnionTooltipProps`;
  scroll-cap derivation moves from `!!pinned` to `entries.some((e)
  => e.pinned)`.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — `.tooltip[data-pinned='true']` rule (container-level
  border-color gold) deleted; `.hostBlock[data-pinned='true']` rule
  added (`border-left: 2px solid #c4a265; padding-left: 6px;`).
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  — `entry()` helper gains `pinned: false` default; test #3
  migrated from container-level `pinned` prop to per-entry pinned;
  scroll-cap tests migrated to use `entry({ pinned: true })`; new
  `describe('multi-pin (Slice L)', ...)` block with four cases:
  mixed pinned + hover (only pinned blocks carry data-pinned;
  root never carries data-pinned), all-pinned stack (every block
  carries data-pinned; separators between), all-hover stack (no
  data-pinned anywhere), scrollable regression guard (1 pinned + 3
  hover = scrollable because `entries.some` predicate).

**Why multi-pin now.** The roadmap explicitly required design
input before committing: "needs design conversation about whether
the use case (steward wanting to compare 2+ hosts side-by-side) is
real before committing." Consulted the **Permaculture Scholar
NotebookLM (`5aa3dcf3-…`)** which returned an unequivocal yes,
citing four canonical permaculture design flows that require
simultaneous comparison of overlapping host canopies:

1. **50-year mature-canopy simulation** — preventing overcrowded
   thickets requires viewing adjacent hosts' mature spreads
   together; the spacing decision for tree A depends on what trees
   B, C, D look like at maturity in the same frame.
2. **Edge maximization (Holmgren P11 — "Use Edges and Value the
   Marginal")** — biodiversity concentrates in the spaces between
   canopies; productive edge cannot be designed one tree at a time.
3. **Cross-guild ecological aggregation** — evaluating whether
   adjacent guilds' N-fixers + dynamic accumulators + insectaries
   aggregate into coverage or redundancy is a multi-guild question
   by definition.
4. **Suntrap / microclimate engineering** — U-shape and horseshoe
   arrangements creating sheltered microclimates cannot be designed
   one tree at a time; the aggregate footprint + continuous shadow
   must be evaluated as a unit.

Holmgren Principle 8 ("Integrate Rather Than Segregate") underwrites
all four. Single-pin was a segregation affordance working against
P8. The Scholar's citations were degenerate (~290 references to the
same handful of snippets — known indexer artifact); the substantive
claims hold independently against any permaculture-design textbook.

**Key architectural choices.**

- **`Map<hostId, HostBlock>` for state.** O(1) per-host toggle;
  insertion order means newly-pinned blocks land at the top of the
  pinned section (consistent with 2026-05-27 "topmost MapLibre
  feature first" convention).
- **Per-block accent, not container-level.** A mixed pinned + hover
  stack needs to distinguish sticky blocks from hover-along ones at
  a glance; a single container border can't communicate that.
- **`pinned` on `HostBlockEntry`, not `HostBlockProps`.** Keeps the
  raw-data interface (`HostBlockProps`) narrow — pinning is a
  display-state concern owned by the parent, not part of the
  host-data payload that `unpackEntries` builds from MapLibre
  features.
- **Single cursor-anchored stack, not separate portals per pin.** A
  pinned host rides along with the stack as the cursor moves; the
  stack is sticky in its set-membership, transient in its anchor.
  This matches the steward's mental model ("these are the hosts
  I'm comparing") better than scattered floating cards would.
- **ESC + tap-outside clear ALL pins.** Per the roadmap's
  recommendation: steward intent "get this off my screen" is rarely
  scoped to one host. The single-host dismiss path is map-click on
  the same host (per-host toggle).
- **In-tooltip dismiss button OUT OF SCOPE.** Below Slice K's
  threshold=4 the tooltip is `pointer-events: none`, so in-tooltip
  buttons can't receive clicks without retiring the 2026-05-25
  invariant. Slice M's drill-down surface (interactive by design)
  can ship in-tooltip dismiss when it lands.

**Retired invariant.** The 2026-05-26 single-pin invariant is
explicitly rolled back. The earlier ADR's reasoning was correct at
the time (defensive against UI complexity); the design question it
deferred has now been answered by the Permaculture Scholar
consultation.

**Preserved invariants.** All Slice K invariants (scroll-cap
carve-out at threshold=4, tooltip-testid tap-outside exemption). All
Slice J / I / H invariants. 2026-05-25 `pointer-events: none` in
hover mode + pinned-small-stack. 2026-05-27 multi-feature fan-out
(each feature toggles independently). 2026-05-28 ESC + tap-outside
dismiss (semantics flip from "clear one" to "clear all").
2026-05-29 / 30 fade machinery (per-block `phase` + container
transition unchanged; `pinned` rides alongside `phase`).
2026-05-30 Slice N i18n seam (no new strings).

**Verification.**

- `npx vitest run src/v3/plan/layers` → 28/28 green (16 tooltip +
  6 memberDragMath + 6 tooltipStrings; +4 multi-pin over Slice N's
  24).
- `npx vitest run src/v3/plan src/features/agroforestry` →
  288/288 green (36 files; +4 over Slice N's 284).
- `npx tsc --noEmit` — zero errors on touched files; pre-existing
  unrelated errors elsewhere unchanged.
- Preview-server visual check not possible in this worktree (Vite
  resolves against worktree-root `node_modules` which doesn't
  exist) — stated explicitly per project CLAUDE.md "say so rather
  than assuming success."

**Roadmap status.** H + I + J + K + N + O + L shipped.
**Remaining: Slice M** (hover-card drill-down — per-block click
opens a richer surface listing per-guild breakdowns; depends on
L's per-block addressability, which now exists).

**Out of scope.** In-tooltip dismiss button (Slice M's space).
Pinned-count badge (defer to follow-up if needed). Per-guild
breakdown line inside a host block (Slice O's rejection deferred
this to Slice M). Persistence of pins across page reloads
(transient UI). Keyboard navigation between pinned blocks (defer to
accessibility pass). Integration tests for the click-toggle Map
logic (defer until a regression points at it).
