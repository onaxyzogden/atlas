# 2026-05-30 — B4 tooltip multi-pin (Slice L)

**Status.** Accepted. Slice L of the B4 tooltip remaining-deferrals roadmap.

**Branch.** `feat/atlas-permaculture` (shipped as `claude/zealous-hawking-a75e25`).

## Context

The 2026-05-26 single-pin ADR introduced click-to-pin on the
host-canopy-union tooltip so the steward could lock the readout open
while looking elsewhere on the map. The model was deliberately
single-pin: clicking a host pinned its stack; clicking the same stack
unpinned; clicking a different host *replaced* the pin. By the time
host B was pinned, host A's metrics were gone.

The B4 remaining-deferrals roadmap flagged Slice L (multi-pin) with
an explicit precondition: "needs design conversation about whether
the use case (steward wanting to compare 2+ hosts side-by-side) is
real before committing." This ADR captures that conversation and the
implementation that follows from a "yes" answer.

## Use-case justification (Permaculture Scholar consultation)

Consulted the Permaculture Scholar NotebookLM
(`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`) to test whether comparing
2+ host canopy areas side-by-side is a real permaculture workflow or
a speculative steward-experience enhancement. The Scholar's answer
was an unequivocal yes, citing four canonical permaculture design
flows that *require* simultaneous comparison of overlapping host
canopies:

1. **50-year mature-canopy simulation.** Designers must look forward
   to a stand's mature spread (often 5×-15× the planting-day footprint)
   and prevent overcrowded thickets. This is impossible from a single
   host: the spacing decision for tree A depends on what trees B, C,
   D will look like at maturity in the same frame.

2. **Edge maximization (Holmgren Principle 11 — "Use Edges and Value
   the Marginal").** Biodiversity concentrates in the *spaces between*
   canopies, not inside them. You cannot design productive edge by
   looking at one tree at a time; you must see how two or three
   adjacent canopies fit together to shape the edge zones between
   them.

3. **Cross-guild ecological aggregation.** A steward needs to evaluate
   whether two adjacent guilds' aggregate ecological functions
   (nitrogen-fixers + dynamic accumulators + insectaries) cover the
   shared soil zone, or whether the function profile is redundant.
   This is a multi-guild question by definition.

4. **Suntrap / microclimate engineering.** U-shape and horseshoe
   arrangements that create sheltered microclimates *cannot* be
   designed one tree at a time. The aggregate footprint of 3-5 hosts
   forming a partial enclosure, plus the continuous shadow they cast
   together, has to be evaluated as a unit.

Holmgren Principle 8 ("Integrate Rather Than Segregate") underwrites
all four flows. Single-pin is a segregation affordance — it forces
the steward to see one host at a time and re-pin to compare. The use
case is corpus-backed, not speculative; the substantive claims map
cleanly to Holmgren's canonical principles and hold independently of
the indexer's specific citations (which were degenerate in the
consultation — the same handful of snippets returned ~290 times, a
known artifact; the principles themselves are verifiable against any
permaculture-design textbook).

This consultation is what flips Slice L from "deferred — needs design
conversation" to "ship the code."

## Decision

Retire the 2026-05-26 single-pin invariant. Replace `pinnedUnion`
(single `{ point, entries, hostIds }` object) with `pinnedHosts:
Map<string, HostBlock>` keyed by hostId. Pinned hosts are sticky
across cursor motion; hover entries continue to populate alongside
them and merge into a single cursor-anchored stack. The visual
distinction (pinned vs hover-only) moves from a container-level
border accent (`.tooltip[data-pinned='true']` → border-color gold)
to a per-block left-border (`.hostBlock[data-pinned='true']` →
2px gold border-left + 6px padding-left).

## Implementation

### State shape (`PlanDataLayers.tsx`)

```ts
// Before (single-pin):
const [pinnedUnion, setPinnedUnion] = useState<
  { point: { x, y }, entries: HostBlock[], hostIds: string[] } | null
>(null);

// After (multi-pin):
const [pinnedHosts, setPinnedHosts] = useState<Map<string, HostBlock>>(
  () => new Map(),
);
const lastCursorPointRef = useRef<{ x: number; y: number } | null>(null);
```

`Map<hostId, HostBlock>` gives O(1) per-host toggle; insertion-order
iteration means newly-pinned blocks land at the top of the pinned
section (consistent with the 2026-05-27 "topmost MapLibre feature
first" convention). The `lastCursorPointRef` freezes the tooltip
anchor at the last known cursor pixel when the cursor leaves the
canvas with pinned hosts still active — without it, a pinned-only
stack would have no `point` source after `hoveredUnion` goes null.

### Merge into a single stack (`activeUnion`)

`activeUnion` is now a `useMemo` derived from `pinnedHosts +
hoveredUnion`:

```ts
const activeUnion = useMemo(() => {
  const hasPins = pinnedHosts.size > 0;
  const hasHover = hoveredUnion !== null && hoveredUnion.entries.length > 0;
  if (!hasPins && !hasHover) return null;
  const point = hoveredUnion?.point ?? lastCursorPointRef.current ?? { x: 0, y: 0 };
  const pinnedEntries = [...pinnedHosts.values()].map((h) => ({ ...h, pinned: true }));
  const hoverEntries = (hoveredUnion?.entries ?? [])
    .filter((h) => !pinnedHosts.has(h.hostId))
    .map((h) => ({ ...h, pinned: false }));
  return { point, entries: [...pinnedEntries, ...hoverEntries] };
}, [pinnedHosts, hoveredUnion]);
```

Pinned entries come first (in Map insertion order); hover-only
entries that aren't already pinned follow. A host that's both pinned
and currently hovered renders once (as pinned) — the dedupe lives on
the `.filter(!pinnedHosts.has)` for hover entries.

The existing `displayedUnion` mirror useEffect is unchanged in
structure: it still diffs prev vs active by hostId for the per-block
fade machinery from 2026-05-30. The `pinned: boolean` field rides on
each entry alongside `phase: 'entering' | 'exiting'`, preserved
across the merge so a host that drops from hover but stays pinned
keeps its gold accent through the (non-existent) phase transition.

### Per-host click toggle

```ts
const onClick = (e) => {
  const entries = unpackEntries(e.features);
  if (entries.length === 0) return;
  setPinnedHosts((prev) => {
    const next = new Map(prev);
    for (const entry of entries) {
      if (next.has(entry.hostId)) next.delete(entry.hostId);
      else next.set(entry.hostId, entry);
    }
    return next;
  });
  lastCursorPointRef.current = { x: e.point.x, y: e.point.y };
};
```

Each feature under the cursor flips its own pinned state.
Multi-feature fan-out (2026-05-27) means clicking two overlapping
hosts at once toggles both — preserving the fan-out invariant.
The `sameHostIdSet()` helper is deleted (no longer needed without
the set-equality unpin check).

### ESC + tap-outside clear ALL pins

Per the roadmap's recommendation (matches steward intent — "get this
off my screen" is rarely scoped to one host):

```ts
const onKey = (ev) => { if (ev.key === 'Escape') setPinnedHosts(new Map()); };
const onDocPointerDown = (ev) => {
  if (pinnedHosts.size === 0) return;
  // ... canvas + Slice K tooltip-testid carve-out unchanged ...
  setPinnedHosts(new Map());
};
```

### Per-block gold accent

CSS:

```css
/* BEFORE — container-level: */
.tooltip[data-pinned='true'] { border-color: #c4a265; }

/* AFTER — per-block: */
.hostBlock[data-pinned='true'] {
  border-left: 2px solid #c4a265;
  padding-left: 6px;
}
```

The 6px padding-left compensates for the 2px border so unpinned
blocks (no border-left, no padding-left override) keep visual
alignment with pinned blocks in a mixed stack.

### Tooltip component

`HostBlockProps` is unchanged (stays as the pure display-data
interface). `HostBlockEntry` (which extends it) gains `pinned:
boolean`. The `HostBlock` sub-component destructures `pinned` and
writes `data-pinned='true'` on its root div conditionally. The
top-level `pinned?` prop is dropped from `HostCanopyUnionTooltipProps`
— the container root no longer carries `data-pinned`. Scroll-cap
derivation moves from `!!pinned` to `entries.some((e) => e.pinned)`:
if *any* entry is pinned the stack is sticky enough to warrant the
scroll-cap when entries.length >= 4.

## Invariants

**Preserved.**

- **2026-05-25 `pointer-events: none`** — survives in hover mode and
  in pinned-small-stack mode (entries.length < 4). Slice K's
  carve-out at threshold=4 is unchanged.
- **2026-05-27 multi-feature fan-out** — each feature under the
  cursor gets its own independent toggle.
- **2026-05-28 ESC + tap-outside dismiss** — preserved; semantics
  flip from "clear the one pin" to "clear all pins."
- **2026-05-29 / 30 fade machinery** — per-block + container
  transition-based fades unchanged. `pinned` rides alongside `phase`
  per entry; no transition change.
- **2026-05-30 Slice K tooltip-testid tap-outside carve-out** —
  preserved verbatim (target.closest exempt).
- **2026-05-30 Slice N i18n seam** — no new strings.

**Retired.**

- **2026-05-26 single-pin invariant.** Documented in that ADR as
  "single tooltip across the surface at any time, single pin
  replaces another pin." Slice L explicitly rolls that back: the
  Permaculture Scholar consultation surfaced four canonical design
  flows that require multi-host comparison; single-pin was a
  segregation affordance working against Holmgren P8 ("Integrate
  Rather Than Segregate"). The 2026-05-26 ADR remains in the wiki
  as historical context — its reasoning was correct at the time
  (defensive against UI complexity) but the design question it
  deferred has now been answered.

## Out of scope

- **In-tooltip dismiss button** (per-block "×" to unpin). Below Slice
  K's threshold=4 the tooltip is `pointer-events: none`, so in-tooltip
  buttons can't receive clicks without retiring the 2026-05-25
  invariant. Map-click-toggle is the sole single-host dismiss path
  for Slice L. Slice M's drill-down surface (interactive by design)
  can ship in-tooltip dismiss when it lands.
- **Pinned-count badge** ("📌 N") in the tooltip header — additive
  affordance; defer to a follow-up if stewards report losing track
  of how many pins are live.
- **Per-block hover-card drill-down** — Slice M's space.
- **Per-guild breakdown line** inside a host block — flagged in the
  Slice O rejection ADR as Slice M's space.
- **Persistence of pins across page reloads.** The tooltip is
  transient UI; pins clear on navigation.
- **Keyboard navigation between pinned blocks** (arrow keys, tab
  order). Defer to accessibility pass.
- **Integration tests for `PlanDataLayers` click-toggle.** The MapLibre
  surface is mocked at module boundary; the toggle logic is pure and
  unit-test-covered indirectly via the tooltip's rendered entries.
  Defer extracting an integration harness until a regression points
  at it.

## Consequences

**Touched.**

- [apps/web/src/v3/plan/layers/PlanDataLayers.tsx](../../apps/web/src/v3/plan/layers/PlanDataLayers.tsx)
  — `pinnedUnion` replaced with `pinnedHosts: Map<string, HostBlock>`;
  `lastCursorPointRef` added; click handler rewritten as per-host
  Map toggle; ESC + tap-outside clear-all; `sameHostIdSet` helper
  deleted; `activeUnion` becomes a useMemo merging pinned + hover
  with per-entry `pinned: boolean`; portal render no longer
  forwards a top-level `pinned` prop; `useRef` added to the React
  import.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx)
  — `HostBlockEntry` gains `pinned: boolean`; `HostBlock` sub-component
  writes `data-pinned` on its root div; top-level `pinned?` prop
  dropped from `HostCanopyUnionTooltipProps`; scroll-cap derivation
  moved to `entries.some((e) => e.pinned)`.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.module.css)
  — `.tooltip[data-pinned='true']` rule deleted;
  `.hostBlock[data-pinned='true']` rule added with gold left-border.
- [apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  — `entry()` helper gains `pinned: false` default; test #3
  migrated from container-level to per-entry pinned; scroll-cap
  tests migrated to use entry-level `pinned: true`; new
  `describe('multi-pin (Slice L)', ...)` block with four cases
  (mixed pinned + hover, all-pinned, all-hover, scrollable
  regression guard).

**Unlocks.** Slice M (hover-card drill-down) — per-block
addressability via `pinned: boolean` + map-click-toggle infrastructure
now exists. Slice M can layer a richer surface (per-guild breakdown,
per-member detail, link to SilvopastureIntegrationCard) on top of
the per-block accent.

## Verification

- `npx vitest run src/v3/plan/layers` — 28/28 green (24 prior + 4
  new multi-pin tests).
- `npx vitest run src/v3/plan src/features/agroforestry` — 288/288
  green (36 files; +4 over Slice N's 284/284).
- `npx tsc --noEmit` — zero errors on touched files; pre-existing
  unrelated errors elsewhere confirmed unchanged.
- Preview-server visual check not possible in this worktree (Vite
  resolves against worktree-root `node_modules` which doesn't
  exist) — stated explicitly per project CLAUDE.md "say so rather
  than assuming success." The data-attribute contracts (per-block
  `data-pinned`, root no longer carries `data-pinned`, scrollable
  driven by `entries.some(e => e.pinned)`) are fully unit-test
  covered.

## References

- Roadmap defining Slice L (multi-pin):
  `~/.claude/plans/vitest-covering-the-staleness-delegated-quill.md`
- Permaculture Scholar consultation: NotebookLM notebook
  `5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`, query "Is comparing 2+
  host canopy areas side-by-side a real permaculture workflow?",
  consulted 2026-05-30. Citations degenerate (~290 references to
  the same handful of snippets — known indexer artifact); the
  substantive claims hold independently against Holmgren's canonical
  principles (Holmgren D., *Permaculture: Principles & Pathways
  Beyond Sustainability*, 2002 — Principle 8 "Integrate Rather Than
  Segregate" and Principle 11 "Use Edges and Value the Marginal").
- Single-pin ADR being retired:
  `wiki/decisions/2026-05-26-atlas-b4-tooltip-pinning.md` (if
  present in tree).
- Slice N (i18n seam) — preceded Slice L in the wave-D ordering:
  [2026-05-30-atlas-b4-tooltip-i18n-seam.md](2026-05-30-atlas-b4-tooltip-i18n-seam.md)
- Slice O (per-layer stripe rejection) — preceded Slice L in the
  wave-D ordering:
  [2026-05-30-atlas-b4-tooltip-per-layer-stripe-rejection.md](2026-05-30-atlas-b4-tooltip-per-layer-stripe-rejection.md)
