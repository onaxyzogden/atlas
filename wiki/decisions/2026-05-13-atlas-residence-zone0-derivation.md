# 2026-05-13 — Observe: residence → Zone 0 (homestead) anchor derivation

**Status:** Accepted (decision only; implementation deferred)

## Context

Commit [`134540e0`](../log.md) closed a Permaculture-zone tool gating
bug on Observe by wiring a "Place homestead" control into the canvas
and aligning the `projectId` fallback between `ObserveLayout` and
`ObserveTools`. The steward's screenshot that surfaced the bug showed
a "home" icon on the map; their mental model was *that icon is the
homestead — why isn't the Permaculture-zone tool unlocked?*

The icon they saw was a **Built-Environment structure** — a
`useBuiltEnvironmentStoreV2` entity with `kind ∈ {building, cabin,
yurt, tent-glamping, earthship}` and `state === 'existing'`, owned by
the BE registry at `packages/shared/src/builtEnvironmentKinds.ts`.

The Permaculture-zone tool gates on a **separate concept** — the
Mollison Zone 0 anchor stored at
`homesteadStore.byProject[projectId]` (`apps/web/src/store/homesteadStore.ts`,
key `'ogden-atlas-homestead'`, persisted to localStorage as
`{ byProject: Record<string, [lng, lat]> }`). Today the only way to
populate it is the `<DiagnoseMap homestead={…}>` control's "Place
homestead" button.

The two concepts share iconography (a "home") and overlap heavily in
the common case (single-residence smallholding) but are not
equivalent in the general case (multi-dwelling or
non-residential-headquarters sites). The 2026-05-13 bug fix
deliberately did **not** conflate them. This ADR records the
decision about whether — and how — they should be linked, so the
gap is explicit rather than implicit.

## Decision

**Option C — Lazy "suggested anchor" fallback, never an eager write.**

- When `homesteadStore.byProject[projectId]` is unset *and* exactly one
  primary-dwelling BE entity exists on the parcel (kind ∈
  {`building`, `cabin`, `yurt`, `tent-glamping`, `earthship`} with
  `state === 'existing'`), tools that consume the anchor read a
  *derived* anchor from the residence's geometry centroid.
- The `homesteadStore` is **never written** as a side effect of
  placing a residence. The steward's explicit Place-homestead
  control remains the only writer.
- If zero or multiple primary-dwelling residences exist on the
  parcel, the derived anchor is undefined; the Permaculture-zone
  tool stays disabled and Place-homestead remains the only path.
- A consuming hook — `useEffectiveHomestead(projectId)` — encapsulates
  this read-side fallback and is the single point through which all
  consumers (`ObserveTools` gate, `PermacultureZoneTool`,
  `AnnotationSectorHandles`, `SunWindWedgeTool`,
  `humanContextStore` permaculture-zone anchor, `observeHowChecksStore`)
  resolve the anchor.

## Rationale

- **Permaculture semantics.** Zone 0 is the *seat of activity*, not
  "any building." On multi-dwelling smallholdings
  (farmhouse + cabin + workshop) the right anchor is a design call,
  not a geometric reduction. Eager auto-set would silently lock in
  the wrong choice and make subsequent design audits read against an
  unintentional reference.
- **Zero-friction default for the common case.** Single-residence
  smallholdings — the steward mental model that exposed this bug —
  get the expected behaviour with no extra clicks. The
  Permaculture-zone tool unlocks the moment a residence exists.
- **No store conflation.** `homesteadStore` stays
  semantically clean (steward intent) and
  `builtEnvironmentStoreV2` stays clean (physical structures).
  Avoids a circular-update class of bug if the residence is moved,
  re-kinded, or deleted after the derived anchor has been
  referenced elsewhere.
- **Reversibility.** Lazy-fallback is a read-side helper; if the
  team later decides to eager-set, the lazy hook becomes a
  one-time migration trigger. The reverse — un-conflating after
  eager writes have already populated user state in localStorage —
  is much harder.

## Alternatives considered

- **A. No derivation — status quo.** Keeps the concepts pure but
  requires every steward to learn the two-concept distinction.
  *Rejected:* the bug exists *because* stewards don't see the
  distinction; the fix should narrow the gap, not document it.
- **B. Eager auto-set on residence place.** Zero-friction, but
  silently picks the wrong building on multi-dwelling sites,
  tangles store ownership, and is hard to undo once written.
  *Rejected:* lossy on the general case.
- **D. Prompt the steward.** "Use *Farmhouse* as your homestead?"
  modal on residence place. Better than B, but adds a modal to a
  draw flow that's already busy with phase tagging and inline-edit
  popovers. *Rejected for v1*, deferred as a future enhancement
  on top of C if telemetry shows derivation surprise (i.e. stewards
  placing residences then still hunting for the Place-homestead
  control).

## Consequences

**What becomes easier**

- The Permaculture-zone tool unlocks on the natural single-residence
  workflow with no extra step — the gating bug's surface symptom is
  closed at its root, not just at the UX layer.
- Future Zone-0-anchored tools (Solar / Wind sectors, audit rings,
  scheduled-moves rays) read through a single hook and inherit the
  fallback without each one duplicating the residence-lookup logic.
- A canonical `RESIDENCE_KINDS` constant in
  `packages/shared/src/builtEnvironmentKinds.ts` becomes the
  shared truth for "is-a-dwelling" across the codebase.

**What becomes harder**

- The "current anchor" is no longer a single store read — debugging
  why an anchor exists/doesn't requires checking both
  `homesteadStore` and the BE entity table.
- The hook must run a small filter over BE entities on every read;
  cheap at permaculture scale (≤ ~50 entities) but a non-zero cost.
- The multi-dwelling case still requires explicit Place-homestead.
  The UX should make this discoverable when zero or >1 residences
  match — a non-trivial empty-state design call left to the
  implementation session.

**New follow-ups**

- Implement `useEffectiveHomestead(projectId)` and migrate the five
  consumers above. Decide the polygon-centroid utility (introduce
  `@turf/centroid` to the web app, or hand-roll for the
  Polygon-only case — buildings are always Polygon per the BE
  schema). *Separate session.*
- Promote the `{building, cabin, yurt, tent-glamping, earthship}`
  enumeration to a `RESIDENCE_KINDS` constant in
  `packages/shared/src/builtEnvironmentKinds.ts` so the BE
  registry and the homestead hook can't drift. *Bundled with the
  hook implementation.*
- Telemetry: log when the gate flips via derivation vs explicit
  Place-homestead, so we can measure whether D ("prompt the
  steward") is needed in a future iteration.

## References

- Bug fix that motivated the ADR — `134540e0`
  *(fix(observe): wire homestead control + scope BaseMapCard
  legend per stage)*
- `apps/web/src/store/homesteadStore.ts` — Zone 0 anchor store
  (`set`, `clear`, `byProject`)
- `packages/shared/src/builtEnvironmentKinds.ts` — BE kind catalogue
  (currently no `RESIDENCE_KINDS` constant — see follow-up)
- `apps/web/src/v3/observe/tools/ObserveTools.tsx:147,348-349` — the
  Permaculture-zone gate
- `apps/web/src/v3/components/DiagnoseMap.tsx` — `HomesteadControl`
  prop shape (the only homestead writer today)
- Log entry for this session: `wiki/log.md` (2026-05-13)
