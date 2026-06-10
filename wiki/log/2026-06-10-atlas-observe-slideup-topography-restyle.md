# 2026-06-10 -- Observe lens slide-up restyled toward the topography mockup (two iterations)

**Branch:** `main` (canonical line, externally rebased out-of-band; **not pushed**).
**Commits:** `8918fec6` (iteration 1), `74b0235d` (iteration 2). Both explicit-path,
single-file (`apps/web/src/v3/observe/lens/components.tsx`), foreign "epitaxy" WIP in the
working tree left untouched.

Operator asked to "update Observe dashboard to look more like the attached file in terms of
components and layout and text colors", supplying the reference mockup
`olos_observe_topography.html`. Three constraints were confirmed up front and held across both
iterations: (a) **keep the cool app palette** -- do NOT retune `tokens.ts` back to the mockup's
warm olive grays (the cool retune was the deliberate `de054364` decision); (b) **slide-up
only** -- no changes to the rails, spine, canvas, or any surface outside the
`DomainDetailSlideUp`; (c) **keep the existing font/icon stack** (Playfair Display + Unicode
glyph icons; no Lora serif, no Tabler webfont). The result is structural fidelity to the
mockup on the cool surface -- intentionally not a warm pixel match.

## Iteration 1 (`8918fec6`) -- slide-up frame + entry colour convention

Three mockup-faithful refinements, all in `components.tsx`:

- **TopographySpecialised zone cards** gain a 3px colour indicator bar (mockup `.zone-indicator`);
  the zone name moves to `C.textPrimary`; the area is right-aligned as a mono value.
- **DomainDetailSlideUp filter chips** become pills (radius 16, `4px 12px` padding).
- **DataPointRow** entry icon tile + mono value are now coloured by observation **type**
  (measurement = teal, trace/point = blue, logged/note = green) per the mockup data-log
  convention, instead of the single lens colour. Shared by every lens slide-up; falls back to
  the lens colour for unmapped types (`lensColor` still referenced, no unused-var).

## Iteration 2 (`74b0235d`) -- expanded entry-detail / proof-record

Operator then selected the expanded **proof-record detail** of a `DataPointRow` and asked to
"match styling/layout more". Eight edits (A-H), all inside the `isExpanded` detail subtree,
mapping each mockup `.entry-detail` sub-rule onto its live counterpart (18 insertions, 20
deletions):

- **A** detail container flows seamlessly from the header -- drop the top divider + top pad,
  left indent aligned under the title (52px).
- **B** proof-record label smaller/lighter/more tracked (`font 9, weight 600, ls .1em`).
- **C** proof pills -- radius 6, padding `3px 9px`, font 10, lighter (`C.borderLight`) border.
- **D** quote note becomes a **left-bar accent** (`border-left:2px`, radius `0 5px 5px 0`)
  instead of a full box.
- **E** Source / Plan objective -- borderless label+value stacks with uppercase, letter-spaced
  labels. **Wording preserved** ("Source task" / "Plan objective", NOT the mockup's
  "Pre-objective") -- restyle only, not a copy edit.
- **F** timestamp collapses to one middot-joined line (`Observed ... . Recorded ... . cycle`).
- **G** tags -- radius 5, font 9, padding `1px 7px`, sans (not mono).
- **H** "View on map" becomes a neutral ghost button (transparent + `C.borderLight` border)
  instead of lens-tinted.

Supersession / divergence notices were left unchanged -- they are live semantic chrome with no
mockup analogue.

## Verification

`tsc --noEmit` (8GB heap): `components.tsx` type-clean after each iteration. The only tsc error
in the tree (`src/v3/plan/canvas/draw/useDesignElementDrawTool.ts(374,7): TS2554`) is in
foreign uncommitted WIP -- a change isolated to `components.tsx` cannot introduce an error in a
different file, so it is pre-existing and unrelated; disclosed, not "fixed" (out of scope,
left untouched).

Iteration 1 was DOM-proven live on the mock prototype slide-up via `getComputedStyle` (zone
bars water/sage/amber, chips 16px, icons teal/blue/green). **Iteration 2 live proof was NOT
obtainable** -- the `/v3/prototype/observe-lens` renderer hung on mount across three clean
single-instance server starts (`preview_eval` timed out, no console errors): the documented
[[project-screenshot-hang]] environmental wall (dead-API `:3000` proxy retry storm + MapLibre
canvas init). Disclosed per CLAUDE.md -- iteration 2 rests on the audited static diff (exactly
the eight planned edits, only `components.tsx`) + type-cleanliness + the presentational-only
nature of the change on an already-rendering component, NOT on a live screenshot. A
no-duplicate-Vite cleanup confirmed the hang is environmental, not a second dev instance.

`tokens.ts` and `mockData.ts` byte-untouched throughout. Amanah: presentational refinement of a
read-only land-observation surface -- no riba, gharar, or finance framing
([[fiqh-csra-erased-2026-05-04]]). Entity [[entities/observe-dashboard]].
