# 2026-05-22 — Cross-rail single-section highlight (Observe + both mini rails)

**Branch:** `feat/atlas-permaculture`
**Plan:** `~/.claude/plans/the-sector-compass-in-memoized-sphinx.md`

## What & why

Generalizes the committed Plan-main-rail single-section fix (`97182e38`,
[[log.md]] entry "Plan rail single-section highlight") to **full cross-rail
parity** across both stages that have multi-section rails. Before this work,
activating one Built-Environment category lit **every** sibling section that
shared its routed module, and the fix only covered the Plan **main** rail with
**local** `useState` confined to `PlanTools`. Three rails still multi-lit:

- **Observe main rail** (`ObserveTools`) — three section families (the module
  loop, the "From map" meta-section, and the BE-category loop) all route to
  `built-environment`; one click lit up to 7 sections.
- **Both mini rails** (`PlanChecklistAside`, `ObserveChecklistAside`) — render
  shared `GuidanceCard`s keyed only on `activeModule === routed`, so every BE
  card sharing a module lit together (Plan also has machinery 2-way and
  structures-subsystems 5-way fan-out).

The steward asked for parity **and** chose **shared cross-rail state**: a pick
in the main rail must propagate into the mini rail and vice-versa, so a stage
shows exactly **one** active section everywhere — no "family-lit on arrival"
after a click.

## Approach — lift the section discriminator into each Layout

Because both rails of a stage are siblings under one Layout that already owns
`activeModule` (URL) and `slideUpOpen` (`useState`), the natural home for the
shared `activeSectionId` is the **Layout** — mirroring how `slideUpOpen` is
already lifted and threaded to both rails. **No new Zustand store; no
route-schema change** (URL-persist of the picked section across reloads is
deliberately out of scope, so a cold URL load still falls back to the
whole-family highlight).

Each Layout (`PlanLayout`, `ObserveLayout`) now owns:

```ts
const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

// lazy reconcile at render — a stale id (reload, bottom-bar nav, deselect,
// or the brief transient before navigate() commits) routes to a different
// module and is ignored, so no race-prone useEffect is needed.
const effectiveSectionId =
  activeSectionId && planSectionIdModule(activeSectionId) === validModule
    ? activeSectionId
    : null;
```

Three handlers split the former single `handleSelectModule`:

- `navigateModule(mod)` — pure navigation (the former `handleSelectModule`
  body: navigate to `/plan` or `/plan/$module`, close the slide-up).
- `handleSelectModule(mod)` — `setActiveSectionId(null); navigateModule(mod)`.
  Used by the **bottom module bar** and programmatic selection, so picking a
  shared family from the bottom bar clears any narrow → shows the whole family.
- `handleSelectSection(mod, sectionId)` — toggles on strict identity: if
  `effectiveSectionId === sectionId` it deselects (`setActiveSectionId(null);
  navigateModule(null)`), else it narrows/switches (`setActiveSectionId(
  sectionId); navigateModule(mod)`). Used by every rail section click.

Both `effectiveSectionId` and `onSelectSection={handleSelectSection}` are passed
to **both** rails of the stage.

## Uniform `isActive` formula (all four rails)

Every `activeModule === <routed>` highlight test was replaced with the same
strict-when-picked / family-fallback formula:

```ts
const isActive =
  effectiveSectionId !== null
    ? effectiveSectionId === sectionId
    : activeModule === routed;   // === mod for module sections
```

Section ids reuse each section's existing React `key`: module sections → `mod`;
BE category sections → `be-${group.category}`; Observe's "From map" meta-section
→ `be-from-map`.

## Slices (8 files)

- **New** `apps/web/src/v3/plan/planSectionMap.ts` — `BE_CATEGORY_TO_PLAN_MODULE`
  (moved verbatim out of the two rail files) + `planSectionIdModule(id)`
  (be-prefix → routed module via the map, else `id as PlanModule`). Single
  source of truth for the Plan stage; removes the prior duplication between
  `PlanTools` and `PlanChecklistAside`.
- **New** `apps/web/src/v3/observe/observeSectionMap.ts` — same shape with
  `BE_CATEGORY_TO_OBSERVE_MODULE` (all 6 BE → `built-environment`, vegetation →
  `earth-water-ecology`, earthworks → `topography`) and `observeSectionIdModule(id)`,
  **plus** the Observe-only `if (id === 'be-from-map') return 'built-environment';`
  checked **before** the be-category slice.
- **Edit** `apps/web/src/v3/plan/PlanLayout.tsx` — lift `activeSectionId` /
  derive `effectiveSectionId`; split `navigateModule` / `handleSelectModule` /
  `handleSelectSection`; pass both new props to both rails; bottom bar keeps
  `handleSelectModule`.
- **Edit** `apps/web/src/v3/observe/ObserveLayout.tsx` — mirror with
  `ObserveModule` / `observeSectionIdModule`.
- **Edit** `apps/web/src/v3/plan/PlanTools.tsx` — drop the now-redundant **local**
  `activeSectionId` / `effectiveId` / `sectionIdModule` / `onSectionActivate`
  (moved up to the Layout); consume `effectiveSectionId` + `onSelectSection`
  props; rewrite both `isActive` sites; call sites use `onSelectSection(mod, mod)`
  and `onSelectSection(routed, sectionId)`. Retains `onSelectModule` for the
  "Open module" button. Machinery fold untouched.
- **Edit** `apps/web/src/v3/observe/tools/ObserveTools.tsx` — consume props;
  rewrite the **three** `isActive` sites (module loop, "From map", BE loop) and
  their three handlers to call `onSelectSection`; removed the now-unused
  `BuiltEnvironmentCategory` type import and the duplicated inline map.
- **Edit** `apps/web/src/v3/plan/PlanChecklistAside.tsx` — import the centralized
  map; add `effectiveSectionId` + `onSelectSection` props (KEEP `onSelectModule`,
  still used by `PlanProjectTypeCard`); uniform `active` in both loops; cards'
  `onSelect` → `onSelectSection(routed, sectionId)`.
- **Edit** `apps/web/src/v3/observe/components/ObserveChecklistAside.tsx` — same,
  but **removed** `onSelectModule` (no other consumer).

`GuidanceCard.tsx` is **unchanged**. Its `onSelect` fires only on an *inactive*
card (an active click toggles the slide-up). With shared state that is exactly
right: arriving with a module active shows precisely one strict-active card, so
no family is lit to "swallow" clicks; clicking a dimmed sibling fires `onSelect`
→ `onSelectSection` → re-narrows both rails; clicking the active card opens its
detail as before.

## Accepted documented behavior

Picking **"From map"** in the Observe main rail sets `effectiveSectionId =
'be-from-map'`, which matches **no** card in `ObserveChecklistAside`, so the
Observe **mini rail shows no active card** for that pick (vs. today lighting all
BE cards). "From map" is a generic adopt meta-tool, not a BE category, so
showing no specific guidance card is acceptable and avoids re-introducing
multi-light. Likewise a **cold URL load** (no prior click) leaves
`activeSectionId` null → family highlight, since URL-persist is out of scope.

## Verification

- **typecheck** (`cd apps/web && npm run typecheck`) at the **3-error
  pre-existing baseline** (`StepBoundary.tsx`, `HostUnionContextMenu.test.tsx`,
  `HostUnionDrilldownCard.test.tsx`) — no new errors in any of the 8 files.
- **Live DOM (Claude Preview, port 5200)** — verified via `.groupActive` counts
  (the plan explicitly permits DOM/computed-style confirmation):
  - **Plan cross-rail:** Agricultural → 2 active (one per rail); Buildings →
    both rails switch to Buildings only; click active again → 0 (deselect both);
    Water Management (non-shared module) → 2; bottom-bar Structures &
    Subsystems → whole family (10, narrow cleared).
  - **Plan machinery 2-way:** module-level Machinery & Equipment and the
    `be-machinery` category each light alone.
  - **Observe:** Buildings (any BE category) → 2 across `ObserveTools` +
    `ObserveChecklistAside`; "From map" → 1 (main rail only, documented);
    human-context → 2.
- **Screenshot blocked by a pre-existing unrelated bug** — `preview_screenshot`
  times out (30 s) because `DesignElementLayers.tsx` emits a maplibre paint
  error every frame (`layers.design-el-line.paint.line-width: Only one
  zoom-based "step" or "interpolate" subexpression may be used`), saturating the
  renderer. **Not introduced by this change.** Per the project preview-verification
  rule this is stated, not assumed; DOM `.groupActive` counts are the
  authoritative confirmation here.

## Scope guards

- Staged **only** the 8 files by explicit path — the working tree carried
  concurrent-session foreign WIP (EconomicsPanel, capitalPartner, ZoneSom,
  SectorCompassOverlay, ringSeedGenerator, PlanDataLayers, ZoneLevelLayer, …)
  left untouched for its owners per `feedback_no_deletion`.
- No store / schema / registry / route change; `GuidanceCard.tsx` markup
  untouched.

## Follow-ups

- URL-persist the picked section across reloads (would touch the route schema;
  shared in-memory state already satisfies cross-rail parity, so deferred).
- The pre-existing `DesignElementLayers.tsx` `line-width` maplibre paint error
  is worth a separate fix — it saturates the renderer and is what blocks
  screenshot-based preview verification.
- **Act stage** has no multi-highlight rail (`ActChecklistAside` is an ops
  dashboard, `ActTools` has no per-module sections) — nothing to port.
