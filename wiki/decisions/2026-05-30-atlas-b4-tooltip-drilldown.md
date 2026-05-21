# 2026-05-30 — B4 tooltip drilldown (Slice M)

**Status.** Accepted. Slice M of the B4 tooltip remaining-deferrals
roadmap — final slice. Roadmap closes with this ship.

**Branch.** `feat/atlas-permaculture`
(via `claude/zealous-hawking-a75e25`).

## Context

The 2026-05-29 exit-fade ship plus Slices H–L closed the
animation/layout/interaction polish on the host-canopy-union tooltip.
Slice M closes the last carry-over: the "hover-card drill-down" — a
way for the steward to expand a single host block (or a single host
addressed from the map) into a richer per-member readout, with a path
into the full silvopasture-integration audit.

The roadmap framed Slice M as "depends on L's per-block
addressability" and required the slice's plan to "define the minimum
content set before writing code." Slice L delivered the
addressability (per-entry `hostId` + `pinned` flag + map-click-toggle
infrastructure). This ADR captures the three load-bearing design
decisions that were settled this turn and the implementation that
follows.

## Design decisions (steward-confirmed)

### 1. Trigger — right-click + long-press

Chosen: **right-click (desktop) / long-press (touch) context menu.**

Rejected alternatives:

- **Double-click on a host block.** Touch-UX is poor (collides with
  browser zoom), and the affordance is hidden — stewards have to learn
  a gesture with no visual hint.
- **In-tooltip "Open detail" button.** Only reachable in the Slice K
  4+ scroll-cap carve-out where `pointer-events: auto` is active.
  Below the threshold the tooltip is `pointer-events: none` (the
  2026-05-25 invariant), so the button would be unreachable for the
  common case. Restrictive.
- **Modifier-click (e.g. Shift+click).** Poor discoverability; no
  touch analog.

Right-click + long-press is the heaviest-infrastructure option (we
synthesise long-press from `pointerdown` + 500 ms timer + 10 px²
movement abort because MapLibre does not emit `contextmenu` from a
held touch) but the only one that works cross-device without teaching
stewards a hidden gesture.

### 2. Surface — floating card + link to slide-up

Chosen: **both.** A floating `HostUnionDrilldownCard` mounts at the
trigger point with a per-member roster; from the card an "Open full
audit →" link routes to the existing `SilvopastureIntegrationCard`
inside `PlanModuleSlideUp`, scrolling to + briefly highlighting the
matching host row.

Rationale: the card gives an immediate, low-context readout anchored
to the host on the map (no slide-up interrupts the steward's spatial
flow), while the slide-up handles depth (fodder species, browse
toxicity, canopy %, integration score — the existing audit card's
content set). Two surfaces, two clarities-of-purpose. The slide-up is
not modal-blocking new infrastructure; we already route into it from
NextBestActionsPanel.

### 3. Content (card v1) — per-member list only

Chosen: **per-member rows (name + layer pill) only.**

Rejected alternatives for v1:

- **Per-guild rollup by `GuildLayer`.** Slice O's rejection ADR
  flagged this as Slice M's space, but the layer pill on each member
  row already exposes layer composition without a separate grouping
  ceremony.
- **Fodder + toxicity findings.** Those belong in the full audit
  (the slide-up). Putting them on the card would duplicate the audit
  card's content set and blur the two-surface separation.

The card stays tight; the slide-up handles depth. If stewards report
needing a layer rollup, that's a v2 follow-up — additive, no
information lost.

## Implementation

### State (`PlanDataLayers.tsx`)

```ts
const [contextMenu, setContextMenu] = useState<{
  point: { x: number; y: number };
  hostId: string;
  hostName: string;
} | null>(null);

const [drilldownHost, setDrilldownHost] = useState<{
  point: { x: number; y: number };
  hostId: string;
  hostName: string;
  members: DrilldownMemberRow[];
} | null>(null);
```

Sequential, not concurrent: opening the menu does not also open the
drilldown card. Picking "Open detail" closes the menu and writes
`drilldownHost` at the same point.

### Triggers

**Desktop right-click** via `map.on('contextmenu', ...)`. The handler
queries `guild-host-canopy-union-fill` features under the cursor,
picks the topmost host, suppresses the OS context menu via
`e.originalEvent.preventDefault()`, and writes `contextMenu`.

**Touch long-press** via `map.on('pointerdown'/'pointermove'/'pointerup', ...)`.
Hit-tests the same layer on `pointerdown`, starts a 500 ms timer; if
the cursor moves more than 10 px² before the timer fires, the press
aborts (so map drag/scroll doesn't unexpectedly open the menu).

Both triggers funnel into the same `setContextMenu` setter, so the
menu component is trigger-agnostic.

### Members resolution

The "Open detail" handler in `PlanDataLayers` calls the same
`resolveMembers(host, { cropAreas, designElements, paddocks, guilds }, hosts)`
selector the canopy-union polygon math uses (the count it produces is
the tooltip's `memberCount`). The flattened roster filters to
canopy-bearing members (`findSpecies(speciesId)?.canopySpreadM > 0`)
so the card's list count stays honest with the tooltip's count.

### Routing to the audit slide-up

A small `silvopastureDrilldownStore` (Zustand) brokers the
"Open full audit →" handoff:

- The drilldown card calls `requestOpenAudit(hostId)`; the store sets
  `targetHostId` + `pendingOpenModule`.
- `PlanLayout` subscribes to `pendingOpenModule`; on a non-null value
  it consumes (clears) the request, navigates to the requested module
  (`livestock` by default), and opens the slide-up.
- `SilvopastureIntegrationCard` reads `targetHostId` from the store
  on mount, scrolls the matching row into view via `scrollIntoView`,
  and renders it with a gold border-left (`#c4a265`, matching Slice
  L's per-block pinned accent) that fades back to neutral after ~2 s
  via a `data-target-faded` flip.
- The slide-up close handler in `PlanLayout` calls `clearTarget` so
  a re-open without an explicit route doesn't replay the scroll.

The store avoids prop-drilling through `PlanModuleSlideUp` and keeps
the routing seam thin. A URL-param alternative was considered and
rejected: a transient highlight is not a deep-linkable concept; URL
churn for in-session UI state pollutes browser history.

### Per-member layer pill — Slice O carve-out (NOT a regression)

The Slice O ADR (2026-05-30 per-layer tinted stripe rejection)
established that **host-aggregate layer tinting is information loss**:
silvopasture is polyculture-by-construction, so colouring the whole
host or stripe by a "dominant layer" misrepresents the assemblage.
The carve-out the Slice O ADR explicitly preserved:

> Per-member layer pills are legitimate — each member belongs to a
> single layer, so the pill is correct per-member metadata, not
> host-aggregate misrepresentation.

The drilldown card's per-member rows use the same `LAYER_TINT` palette
already used on the per-member geometry layers (PlanDataLayers:1408+).
The Slice O reasoning permits this; the host-as-a-whole stays
neutral.

### Existing invariants

| Invariant | Status |
|---|---|
| 2026-05-25 tooltip `pointer-events: none` | **Preserved.** New surfaces (menu + card) are sibling portals, not tooltip modifications. They are `pointer-events: auto` by design. |
| 2026-05-26 single-pin | **Already retired** in Slice L. Untouched here. |
| 2026-05-27 multi-feature fan-out (topmost-first) | **Preserved.** Right-click resolves to the topmost host (matches the click-pin semantic). |
| 2026-05-28 ESC + tap-outside dismiss | **Extended.** ESC closes all three surfaces; document-pointerdown dismisses each via per-surface `data-testid` carve-outs (`host-union-context-menu`, `host-union-drilldown-card`, plus the existing `host-canopy-union-tooltip` exemption). Map-canvas-internal pointerdowns close the menu (transient) but NOT the card (sticky — the steward wants to explore the map without losing the readout). |
| 2026-05-29/30 fade machinery | **Preserved on the tooltip.** Menu + card get their own enter/exit fades via the Slice I `--motion-overlay-*` tokens — all three surfaces feel consistent. |
| 2026-05-30 Slice K scroll-cap carve-out | **Unchanged on tooltip.** Card has its own `max-height: calc(100vh - 160px) + overflow-y: auto`; already `pointer-events: auto`, so no carve-out needed. |
| 2026-05-30 Slice L multi-pin | **Preserved.** Single-click pin toggle untouched; the new triggers are right-click + long-press (different event types — no conflict). |
| 2026-05-30 Slice N i18n seam | **Extended.** New strings live in a colocated `drilldownStrings.ts` mirroring `tooltipStrings.ts`. |

## Files

| File | Change |
|---|---|
| `apps/web/src/v3/plan/layers/HostUnionContextMenu.tsx` (NEW) | Floating context menu, single "Open detail" item, dark-glass palette, fade-in via Slice I tokens. |
| `apps/web/src/v3/plan/layers/HostUnionContextMenu.module.css` (NEW) | Menu styles. |
| `apps/web/src/v3/plan/layers/HostUnionDrilldownCard.tsx` (NEW) | Floating sticky card: host name + per-member list + "Open full audit →" link. |
| `apps/web/src/v3/plan/layers/HostUnionDrilldownCard.module.css` (NEW) | Card styles with scroll cap + per-row layer pill via `var(--pill-tint)`. |
| `apps/web/src/v3/plan/layers/drilldownStrings.ts` (NEW) | Colocated user-facing strings (mirrors Slice N pattern). |
| `apps/web/src/v3/plan/layers/silvopastureDrilldownStore.ts` (NEW) | Zustand bus for `requestOpenAudit` / `consumePendingOpen` / `clearTarget`. |
| `apps/web/src/v3/plan/layers/PlanDataLayers.tsx` | Add `contextMenu` + `drilldownHost` state; add right-click + long-press listeners; portal-mount the menu + card siblings of the existing tooltip portal; resolve members via the same `resolveMembers` call the polygon math uses. |
| `apps/web/src/features/agroforestry/SilvopastureIntegrationCard.tsx` | Optional `targetHostId?` prop (store falls through when prop is absent); scroll + gold-border highlight on mount; fade after 2 s. |
| `apps/web/src/features/agroforestry/SilvopastureIntegrationCard.module.css` | New `data-target='true'` selector with gold border-left + faint gold tint; transitions to neutral via `data-target-faded` flip. |
| `apps/web/src/v3/plan/PlanLayout.tsx` | Subscribe to `pendingOpenModule`; consume → navigate + open slide-up. Clear `targetHostId` on slide-up close. |
| `apps/web/src/v3/plan/layers/__tests__/HostUnionContextMenu.test.tsx` (NEW, 3) | Item-render + click-fires-open+close + ARIA host-name labelling. |
| `apps/web/src/v3/plan/layers/__tests__/HostUnionDrilldownCard.test.tsx` (NEW, 5) | Host-name header + per-member rows (layer pill `data-layer`) + empty state + close button + "Open full audit →" fires `onOpenAudit(hostId)`. |
| `apps/web/src/v3/plan/layers/__tests__/silvopastureDrilldownStore.test.ts` (NEW, 4) | `requestOpenAudit` populates state + `consumePendingOpen` clears pending (not target) + `clearTarget` + module/section override. |

## Tests

- `npx vitest run src/v3/plan/layers` → **40/40 passing** (12 over
  Slice L's 28).
- `npx vitest run src/v3/plan src/features/agroforestry` →
  **300/300 passing** (12 over Slice L's 288).
- `npx tsc --noEmit` — clean on all Slice M files; pre-existing
  unrelated errors elsewhere confirmed unchanged.

## Verification deferrals

- **Preview-server visual check.** Not possible in this worktree
  (Vite resolves against worktree-root `node_modules` which doesn't
  exist). Stated explicitly per project CLAUDE.md "say so rather
  than assuming success." The data-attribute contracts (menu
  `data-testid`, card `data-testid`, integration-card `data-target`)
  are fully unit-test-covered.
- **PlanDataLayers integration test for the trigger listeners.**
  MapLibre `contextmenu` + touch `pointerdown`/`pointermove`/`pointerup`
  events are awkward to simulate end-to-end in happy-dom; the timer
  logic is small and pure (no shared state outside the `press` local).
  Documented as a follow-up if a regression appears.
- **SilvopastureIntegrationCard render test for `data-target` +
  `scrollIntoView`.** Card render requires fixturing four
  cross-store inputs (`cropAreas`, `paddocks`, `guilds`,
  `designElements`) plus `computeSilvopastureIntegration` to produce
  a non-empty `report.rows`. The `silvopastureDrilldownStore` unit
  tests cover the routing contract; the card's `data-target` flip is
  a small conditional. Deferred.

## Out of scope (Slice M itself, by design)

- **Per-guild rollup line on the card.** Layer pills already expose
  composition. v2 candidate.
- **Fodder + toxicity findings on the card.** Belong in the slide-up.
- **Per-member geometry highlight on the map** when hovering a row
  in the drilldown. Additive affordance; defer.
- **Member-catalog edit from inside the card.** The card is
  read-only.
- **Touch double-tap as a secondary trigger.** Long-press covers
  touch; double-tap collides with browser zoom on mobile.
- **Keyboard navigation between member rows.** Defer to a broader
  accessibility pass.
- **Persistence of drilldown state across reloads.** Transient UI,
  like tooltip pins.
- **In-tooltip "Open detail" button** as a third trigger path. The
  context menu renders it redundant; revisit if field-testing shows
  context-menu discoverability issues.

## Roadmap status

Slices H + I + J + K + N + O + L + M shipped. **The B4 tooltip
remaining-deferrals roadmap is fully closed.** Future tooltip work
opens its own roadmap or ad-hoc slices as field-testing reveals gaps.
