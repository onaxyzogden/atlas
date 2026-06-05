# 2026-05-30 — B4 per-layer tinted stripe rejection (Slice O — second pass)

**Branch.** `feat/atlas-permaculture` (shipped as
`claude/zealous-hawking-a75e25`). Closes Slice O of the [B4 tooltip
remaining-deferrals roadmap](2026-05-30-b4-tooltip-perblock-fade-and-reverse.md)
as a **documentation-only rejection** — no code change. Full
reasoning in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-tooltip-per-layer-stripe-rejection.md).

**What changed.** Wiki only. New ADR documents the second-pass
rejection of the per-layer tinted accent stripe; new log entry
points at it; this index entry links the log entry.

**The roadmap's explicit instruction.** Slice O was flagged in the
roadmap as requiring a research/decision step before code: *"this
slice's plan must start with a research/decision step … decide
whether the stripe is genuinely distinguishable (different surface)
or re-introduces the same problem (same concept, different shape).
Only then design the implementation, or document the second
rejection with fresh reasoning."* This slice ships the
second-rejection path.

**The previous rejections.** The 2026-05-24 host-canopy-union viz
ADR colored the halo neutral grey and explicitly rejected
`LAYER_TINT`: *"Neutral grey (not LAYER_TINT) because the union is
a per-host aggregate, not a per-layer geometry; layer-tinting would
mislead the eye into reading the halo as canopy-layer-specific."*
The 2026-05-25 hover tooltip ADR carried the same reasoning forward
to the tooltip stripe: *"the union is a per-host aggregate;
layer-tinting would reintroduce the misleading-hue concern
2026-05-24 called out for the halo itself."*

**The fresh counter-argument considered.** The natural revisit is:
the halo is on the map (color = layer-data), but the tooltip is a
*separate UI surface* with its own visual conventions (already
carries a gold "saved overlap" accent — a non-data color), so a
stripe there reads as "category metadata," not "this geometry =
green-layer."

**Why the counter-argument fails on two grounds.**

1. **Visual contiguity.** The tooltip is cursor-anchored adjacent
   to the halo it describes — stewards see them simultaneously. A
   green stripe next to a grey halo invites the eye to bind
   "this host = green," propagating the layer-tint association
   from the *label* onto the halo it labels. The surface boundary
   doesn't exist for the eye when the surfaces are positionally
   adjacent. The 2026-05-24 reasoning survives unchanged: the
   stripe tints the halo's label, which is the same problem one
   frame downstream.

2. **"Dominant" is the wrong reduction.** A host is in the
   silvopasture data because it carries *multiple* canopy layers
   (polyculture by construction). Defining "dominant" requires a
   flattening choice — biggest area (biases toward fast-spreading
   shrubs), most members (biases toward groundcovers), tallest
   (data model doesn't track per-member heights), alphabetical
   (defensible only as a tie-breaker). Every choice elevates one
   layer above the others, working against the worldview the tool
   is supposed to support. Polyculture composition is the
   load-bearing feature; hiding four-fifths of it behind one
   layer's color is a model violation, not a presentation choice.

**What the steward actually needs (and where it goes).** The
existing counts line — *"3 guilds · 7 canopy-bearing members"* —
already surfaces polyculture composition. If at-a-glance per-layer
breakdown matters, the right UI is a small list inside the tooltip
(e.g. `overstory ×2 · midstory ×3 · understory ×2`), with each
layer name in its own tint *as a label, not as a category color
for the host as a whole*. **This breakdown is not in scope for
Slice O** — it overlaps with Slice M (hover-card drill-down),
where the natural design move is to expand a block into a richer
surface that lists per-guild breakdowns. Whoever picks Slice M up
next can lean on this ADR's reasoning to justify the breakdown
approach.

**Status flip.** The 2026-05-24 / 25 ADRs left this deferral as
"deferred — revisit if needed." This slice flips it to **decided
rejection**. Future roadmap sweeps should not re-list it as
candidate work without the underlying constraint (silvopasture is
polyculture-by-construction; "dominant layer" is information loss)
materially changing.

**Roadmap status.** H + I + J + K + N shipped as code; O shipped
as a documented rejection. Remaining: **Slice L** (multi-pin —
substantial slice; needs design conversation about whether the
"steward wants to compare 2+ hosts side-by-side" use case is real
before committing) and **Slice M** (hover-card drill-down — depends
on L's per-block addressability).

**Out of scope.**

- Code changes — none, by design.
- Per-guild breakdown line in the tooltip text — Slice M's space.
- Layer-aware *icons* on the tooltip (canopy/midstory/understory
  glyphs) — distinct from color-tint, worth a separate design
  conversation, not in scope here.
- Changes to the existing `LAYER_TINT` palette on the map's
  per-member geometries — those remain correct (per-member
  geometries genuinely belong to a single layer).
- Light/dark theming of the tooltip surface (separate deferral).

**Verification.** No code change → no tests to run, no tsc to
check, no preview-server to verify. The slice's deliverable is
this log entry + the ADR; both are reviewable in `git log`.

**Invariants preserved.** Every B4 invariant from earlier ADRs
holds verbatim — no surface has been touched.
