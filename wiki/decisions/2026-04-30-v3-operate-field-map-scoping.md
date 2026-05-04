# 2026-04-30 — V3 OperatePage live field map (Phase 5.2 scoping)

**Status:** Proposed (scoping ADR — implementation gated on review)
**Branch:** `feat/atlas-permaculture` (implementation lands on a follow-up branch)
**Phase:** 5.2 (V3 MapboxGL integration — Operate field map)
**Implementing files (proposed):**
- `apps/web/src/v3/components/OperateMap.tsx` (new — mirrors `DiagnoseMap`)
- `apps/web/src/v3/components/overlays/FieldFlagOverlay.tsx` (new — pin layer)
- `apps/web/src/v3/data/useFieldFlags.ts` (new — derives flags from real stores)
- `apps/web/src/v3/types.ts` (extend `FieldFlag` with `lng`/`lat`)
- `apps/web/src/v3/pages/OperatePage.tsx` (replace `FieldMapPlaceholder` import)

## Context

`OperatePage` currently mounts `FieldMapPlaceholder` — a styled SVG canvas
with abstract polygons and `FieldFlag` glyphs positioned by 0–100
pseudo-coordinates (`x`, `y`). The accompanying comment marks the slot as
"Live MapboxGL field map arrives in v3.1." The page renders three sections
(Today on the Land, Field Activity Map, Alerts + Upcoming) and the
right-rail `OperateRail` is mounted by `V3ProjectLayout`.

`FieldFlag` today carries `kind: livestock | water | fence | weather | team`
+ `tone: OpsTone` + `label`. Source today is `mockProject.operate.fieldFlags`.

## Decision (proposed)

### 1. Map runtime — reuse `DiagnoseMap` pattern

Same call as 5.1: build `OperateMap.tsx` modelled on `DiagnoseMap`. The
shape stays identical — MapLibre instance, `transformRequest`,
`NavigationControl`, render-prop child, boundary-driven `fitBounds`. No
MapboxDraw runtime (Operate is read-only with click-to-create-task as the
single mutation; that does not need MapboxDraw).

### 2. `FieldFlag` schema change — promote to real coordinates

Today:
```ts
export interface FieldFlag {
  id: string;
  kind: FieldFlagKind;
  /** Pseudo-coordinate within a 100×100 placeholder canvas. */
  x: number;
  y: number;
  label: string;
  tone: OpsTone;
}
```

Proposed:
```ts
export interface FieldFlag {
  id: string;
  kind: FieldFlagKind;
  /** [lng, lat] in WGS84 — projected against the parcel boundary. */
  position: [number, number];
  label: string;
  detail?: string;
  tone: OpsTone;
  /** Source store + id pair, so click-to-edit can route to the right surface. */
  source?: { store: 'livestock' | 'waterSystems' | 'sectors' | 'team' | 'weather'; refId?: string };
  /** When the flag last updated; drives the "stale" affordance. */
  observedAt?: string;
}
```

Migration of MTC fixture: convert MTC's pseudo-coords to lng/lat by
projecting (x/100, y/100) against the MTC boundary bounds. One-shot
hand-edit, no runtime migration code needed.

### 3. Data sources — derive flags from real stores, with the brief as fallback

A new `useFieldFlags(projectId)` hook composes flags from existing
project-keyed stores:

| Flag kind | Source store | Position | Tone derivation |
|---|---|---|---|
| `livestock` | `useLivestockStore.paddocks[].centroid` | paddock centroid | Days-since-rotation > 5 → watch; > 10 → warning |
| `water` | `useWaterSystemsStore.storageInfra[].position` | storage position | Last sensor read tier (high → good, low → warning) |
| `fence` | (no store yet — Phase 5.2.x) | n/a | n/a |
| `weather` | derived from `useSiteDataStore.layers` weather alerts | parcel centroid | Severity → tone |
| `team` | (no store yet — Phase 5.2.x) | n/a | n/a |

Flags whose source store doesn't exist yet (`fence`, `team`) are still
read from `project.operate.fieldFlags` until their stores ship —
`useFieldFlags` returns the **union** of derived flags + brief fallbacks
keyed by id. This preserves the MTC smoke path while allowing real
livestock/water rotations to surface live.

### 4. Pin layer — single MapLibre symbol layer with kind-driven icons

One `geojson` source + one `symbol` layer:
- Sprite: 5 SVG icons compiled into a sprite sheet at build time
  (livestock 🐄 / water 💧 / fence ▦ / weather ❄ / team ✦), already in
  `FieldMapPlaceholder` as text glyphs — copy the visual contract.
- `icon-image` + `text-field` data-driven from feature properties.
- Tone drives `icon-color` via a match expression: `good` →
  `--color-success-rgb`, `watch` → `--color-warning-rgb`, `warning` →
  `--color-danger-rgb`, `neutral` → `--color-text-muted`.
- Click → fly-to + open `<FieldFlagPopover>` (lightweight, no portal —
  uses `maplibregl.Popup`).

### 5. Refresh cadence — 60s polling, manual refresh button

- Stores hydrate on mount via the existing live-fetch path; no new fetch
  layer.
- Sensor-driven flags (water tank levels, weather) refresh on a 60s
  `setInterval` while the page is visible (`document.visibilityState`).
- Manual "Refresh" button in the section header forces an immediate poll.
- Stores that don't drive sensor data (livestock paddocks) only refresh
  on store-mutation events (push-driven, no polling needed).

### 6. CTAs — wire "Create Field Task" + "Log Observation"

These already exist in the page header as `<button>` elements. Wire them:

- **Create Field Task**: opens a popover with kind/title/notes fields;
  on submit creates a row in a new `useFieldTaskStore` (proposed in Phase
  6.4) with `position` = current map centre + click-to-place affordance.
  When the store doesn't exist yet, the button is `disabled` with tooltip
  "Wired in Phase 6.4."
- **Log Observation**: opens a popover that creates an entry in the
  existing `useObservationStore` (already shipped for OBSERVE Module 4).
  Position is captured via click-on-map. This works today.

### 7. Empty-state and zero-flag handling

When `useFieldFlags` returns `[]`, render the map *without* the placeholder
notice but with an inline "Nothing happening on the land right now" caption
above the map. Distinguishes "data is live but quiet" from "data isn't
loaded yet" — the former should not look like a regression.

## Out of scope (explicit deferrals)

- **`fence` and `team` stores.** Phase 5.2.x — they need their own
  schema decisions (fence segment shape, team-member ACL).
- **Pin clustering at low zoom.** Defer until parcel density warrants it
  — MTC has < 20 flags; clustering is a Phase 5.2.x optimisation.
- **Live alert streaming via SSE/WebSocket.** 60s polling is sufficient
  for v3.1; streaming is Phase 7.x.
- **Replay history slider.** Showing flag positions over time (where was
  the herd last week?) is Phase 5.2.x — needs an event-log store first.

## Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `FieldFlag` schema change breaks v2 consumers | Low | Med | Search confirms only v3 mounts `FieldMapPlaceholder`; v2 page doesn't use the type. Migration is in mock fixture only. |
| Polling drains battery on mobile | Med | Low | `document.visibilityState` gate; pause polling when hidden. |
| Click-to-create-task accidentally fires on map pan | Med | Med | Listen for `click` only (not `mousedown`); 250ms debounce; require pointer-up within 8 px of pointer-down. |
| Sprite sheet build complicates the dev loop | Low | Low | Inline SVG-as-data-URL for v3.1; revisit sprite if icon count grows. |

## Verification (proposed acceptance criteria)

- `npx tsc --noEmit` clean for `@ogden/web`.
- `/v3/project/mtc/operate` renders MapLibre canvas centred on MTC
  boundary; MTC's `fieldFlags` render as map pins (not SVG glyphs).
- Tone-coloured pins respect `OpsTone` palette.
- Click on pin opens popover with label + detail + observedAt.
- "Log Observation" creates a row in `useObservationStore` and the pin
  appears within 60s.
- With no MapTiler key configured, the map shows the
  `<MapTokenMissing>` paste-key prompt (same UX as Diagnose).

## Migration / cutover

- Hand-edit MTC fixture: convert each `FieldFlag.x/y` (0–100) to
  `position: [lng, lat]` against MTC boundary bounds.
- Delete `FieldMapPlaceholder.tsx` + its CSS module — no other consumers.
- `BACKLOG-v3.1.md` RULE 2 line gets struck through (5.2 is the second
  half of the lift).

## Sequence of implementation (proposed)

1. Schema change: extend `FieldFlag` + migrate MTC fixture (1 PR, ~80 LOC).
2. Build `OperateMap.tsx` + `FieldFlagOverlay.tsx` (1 PR, ~400 LOC).
3. Build `useFieldFlags` hook deriving from livestock/waterSystems
   stores (1 PR, ~200 LOC).
4. Wire "Log Observation" CTA (1 PR, ~150 LOC). "Create Field Task"
   waits on Phase 6.4.
5. Strike RULE 2 from `BACKLOG-v3.1.md`; update Phase 5.2 in this ADR
   Status to Accepted; log entry.

Total estimated scope: ~830 LOC across 4 PRs (smaller than 5.1 because
no scoring recompute or snap pass).
