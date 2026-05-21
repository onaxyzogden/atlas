# 2026-05-30 — B4 per-layer tinted accent stripe (Slice O — rejected, second pass)

**Status.** Rejected. Documentation-only slice. No code change.
Slice O of the B4 tooltip remaining-deferrals roadmap.

**Branch.** `feat/atlas-permaculture` (shipped as `claude/zealous-hawking-a75e25`).

## Context

The B4 remaining-deferrals roadmap lists a "per-layer tinted accent
stripe matching the dominant canopy layer of the host" as Slice O.
The slice was deferred twice already — in the
[2026-05-24 host canopy union viz ADR](2026-05-24-atlas-b4-host-canopy-union-viz.md)
on the halo itself, and in the
[2026-05-25 hover tooltip ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
on the tooltip surface. The user listing it in the
remaining-deferrals roadmap suggests a revisit is wanted, not just
a re-execute. The roadmap is explicit: "this slice's plan must
start with a **research/decision step** … decide whether the stripe
is genuinely distinguishable (different surface) or re-introduces
the same problem (same concept, different shape)." This ADR is
that decision.

## What "per-layer tinted accent stripe" would mean

Each `HostBlock` in the multi-host tooltip stack would carry a
small vertical color stripe (or top-edge accent line, or row-side
gutter) painted in the dominant canopy layer's tint — drawing from
the existing `LAYER_TINT` palette already used by the per-layer
guild members on the map (`overstory` = forest green, `midstory` =
warmer green, `understory` = lighter, etc). "Dominant" would be
defined by some reduction across the guilds the host carries —
biggest area, most members, alphabetical first, etc.

## The 2026-05-24 / 25 reasoning, re-stated

The 2026-05-24 ADR colored the union halo itself **neutral grey**,
explicitly rejecting `LAYER_TINT`:

> Neutral grey (not `LAYER_TINT`) because the union is a per-host
> aggregate, not a per-layer geometry; layer-tinting would mislead
> the eye into reading the halo as canopy-layer-specific.

The 2026-05-25 ADR carried that reasoning forward to the tooltip
stripe:

> Per-layer tinted accent stripe matching the dominant canopy layer
> of the host — the union is a per-host aggregate; layer-tinting
> would reintroduce the misleading-hue concern 2026-05-24 called
> out for the halo itself.

Both refer to the same underlying concern: **a host is a
polyculture by construction.** Reducing it to a single "dominant"
layer for the purposes of UI color is information loss, and the
specific information lost is the very thing the silvopasture model
is supposed to surface (multi-layer integration).

## The "different surface" counter-argument

The natural way to revisit the rejection is to argue:

> The halo is on the *map*, where color is layer-data. The tooltip
> is a *separate UI surface* with its own visual conventions —
> it already has a gold accent on the saved-overlap row, a
> non-data color. A stripe on the tooltip would be read as
> "category metadata about this row," not as "this geometry is
> green-layer." Map UIs do this all the time — sidebar lists
> with color swatches indicating which layer a feature belongs to.

This counter-argument has two failure modes:

### Failure 1 — visual contiguity

The tooltip is **cursor-anchored**, positioned directly adjacent to
the halo it describes. Stewards see them simultaneously. A green
stripe next to a grey halo invites the eye to bind "this host =
green" — the *visual contiguity* propagates the layer-tint
association from the tooltip onto the halo it labels. The
surface boundary doesn't exist for the eye when the surfaces are
positionally adjacent. The 2026-05-24 reasoning ("layer-tinting
would mislead the eye into reading the halo as canopy-layer-
specific") survives unchanged: the stripe doesn't tint the halo
directly, but it tints the halo's *label*, which is the same
problem one frame downstream.

### Failure 2 — "dominant" is the wrong reduction

A host is in the silvopasture data because it carries *multiple*
canopy layers. Defining "dominant" requires a flattening choice:

- **Biggest area** — biases toward fast-spreading shrub layers or
  large overstory specimens. Misrepresents an integrated
  overstory + understory pairing as "an overstory host."
- **Most members** — biases toward layers with many small members
  (e.g. groundcovers). Misrepresents the host's structural role.
- **Alphabetical first** — arbitrary; defensible only as a tie-
  breaker, never as a primary definition.
- **Tallest** — closest to ecological dominance, but the data
  model doesn't track canopy heights per member; would require
  schema work for a UI accent.

Every choice elevates one layer above the others, working against
the worldview the tool is supposed to support. The host's
polyculture composition is the load-bearing feature; designing UI
that hides four-fifths of it behind one layer's color is a model
violation, not a presentation choice.

## What the steward actually needs

The existing counts line — *"3 guilds · 7 canopy-bearing
members"* — already surfaces the host's polyculture composition in
the tooltip. If the steward needs to see *which* layers compose the
host (and how many members in each), the **right** UI is a
breakdown — a small list inside the tooltip showing
`overstory ×2 · midstory ×3 · understory ×2`, with each layer name
in its own tint *as a label, not as a category color for the host
as a whole*. That would surface the polyculture explicitly without
forcing a "dominant" reduction.

This breakdown is **not in scope for Slice O** — it overlaps with
Slice M (hover-card drill-down), where the natural design move is
to expand a block into a richer surface that lists per-guild
breakdowns. Noting it here so the rejected stripe is not the only
path forward: when the polyculture composition needs to be visible
at-a-glance, that's Slice M's design space, not a color-stripe's.

## Decision

**Reject the per-layer tinted accent stripe, second pass.** The
2026-05-24 / 25 reasoning holds: layer-tinting a per-host
aggregate misrepresents polyculture composition, and the tooltip's
visual contiguity with the halo means the surface boundary doesn't
insulate the halo from the same hue-confusion the original ADR
flagged.

Flip the deferral status: this is no longer a "deferred until
revisited" item — it is a **decided rejection**, captured here so
future roadmap sweeps don't re-list it as "still deferred."

## What the slice ships

- This ADR.
- The log entry pointing at it.
- A wiki/log.md index entry.
- Cross-references appended to the
  [2026-05-24 ADR](2026-05-24-atlas-b4-host-canopy-union-viz.md)
  and [2026-05-25 ADR](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
  noting that their deferral has now been resolved as a rejection
  via this slice. (Performed lightly in this slice's commit so the
  prior ADRs stay readable as their original-intent docs.)

## Out of scope

- Per-guild breakdown line in the tooltip text content — overlaps
  with Slice M (hover-card drill-down). That slice is the right
  home for polyculture visibility, not a color stripe.
- Layer-aware *icons* on the tooltip (canopy/midstory/understory
  glyphs alongside member counts) — distinct from color-tint,
  worth a separate design conversation but not in scope here.
- Changes to the existing `LAYER_TINT` palette on the map's
  per-member geometries — those remain correct (per-layer
  geometries genuinely belong to a single layer).
- Light/dark theming of the tooltip surface (separate deferral
  from earlier ADRs).

## Consequences

**No code change.** This is a documentation-only slice — by
shipping the rejection in an ADR rather than as code, the slice
resolves the deferral without adding a half-decision in the
codebase.

**Roadmap status update.** The roadmap's Slice O entry can flip
from "deferred / revisit" to "rejected (second pass)." Future
sweeps should not re-surface this as a candidate without the
underlying constraint (silvopasture is polyculture-by-construction;
"dominant layer" is information loss) materially changing.

**Unlocks future Slice M conversations.** The breakdown-line
alternative noted above lands naturally in Slice M's design space.
Whoever picks Slice M up next can lean on this ADR's reasoning to
justify why a richer breakdown is the right move when at-a-glance
polyculture visibility is needed.

## References

- Roadmap defining Slice O (per-layer tinted stripe research /
  decision):
  `~/.claude/plans/vitest-covering-the-staleness-delegated-quill.md`
- Original rejection on the halo itself:
  [2026-05-24-atlas-b4-host-canopy-union-viz.md](2026-05-24-atlas-b4-host-canopy-union-viz.md)
- First deferral on the tooltip surface:
  [2026-05-25-atlas-b4-host-union-hover-tooltip.md](2026-05-25-atlas-b4-host-union-hover-tooltip.md)
- Slice N ship that preceded this slice:
  [2026-05-30-atlas-b4-tooltip-i18n-seam.md](2026-05-30-atlas-b4-tooltip-i18n-seam.md)
