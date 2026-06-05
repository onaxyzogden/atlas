# Observe Live Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the decorative `PseudoMap` SVG in the Observe lens with a real, read-only MapLibre basemap that renders the project's parcel boundary and observation points at their true geographic positions, preserving the existing pin visual language, with `PseudoMap` as an honest fallback for geometry-less projects.

**Architecture:** A pure builder (`buildObserveMap`) computes an `ObserveMapData` payload (boundary + bbox + georeferenced markers + a demo-data flag) on the live bundle; it returns `null` when there is no geometry, so the dashboard renders `PseudoMap`. A new lightweight `ObserveMap` component initializes `maplibre-gl` via the shared `lib/maplibre.ts` style resolver, draws the boundary as a GeoJSON layer, and overlays observation pins (re-projected on every map move) using an `ObservationPin` subcomponent extracted from `PseudoMap` so both surfaces share identical pin markup. The `mtc` builtin is seeded with a plausible Ontario parcel boundary and per-point coordinates so the demo renders, badged "Sample location data".

**Tech Stack:** React 18 + TypeScript, `maplibre-gl ^4.7.0`, Zustand, Vitest (`--pool=forks`), pnpm + Turborepo (Windows / git-bash).

---

## Source-of-truth facts (verified against the codebase)

- `PseudoMap` lives in `apps/web/src/v3/observe/lens/components.tsx` (pin block ~lines 77-91); pins read normalized `[0,1]` coords (`px = obs.x*720`, `py = obs.y*550`).
- `MockObservation` (`types.ts:206-214`) = `{ id, lens, x, y, type, label, age }`.
- `LensDataBundle` (`types.ts:280-288`) is constructed in exactly TWO places: `mockBundle.ts` and `liveBundle.ts` (`buildLiveLensBundle`). Both must set any new required field.
- `buildObservationPins` + `coordsOf` already exist in `liveBundle.ts` (lines 283-328 / 158-171). `coordsOf` safe-reads `ObserveDataPoint.locationGeometry` (nullable GeoJSON Point).
- The dashboard mounts the canvas at `ObserveLensDashboard.tsx:122-128` (`canvas={<PseudoMap .../>}`).
- `ObserveSeedRow` (`builtinObserveDataPoints.ts:40-58`) ALREADY supports `location?: readonly [number, number]`. The 10 MTC rows (`MTC_OBSERVE_BUNDLE`, lines 262-403) currently set NO `location` -> every MTC point is null-geometry.
- `MTC_SEED` (`projectStore.ts:1237-1262`) has `parcelBoundaryGeojson: null`, `hasParcelBoundary: false`, `isBuiltin: true`. `seedMtcDemo` (1264-1283) inserts it only when absent -> a persisted MTC row from a prior session keeps the null boundary unless we backfill.
- `lib/maplibre.ts` exports `maplibregl`, `MAP_STYLES` (`.satellite` = ESRI raster object, `.hybrid` = MapTiler), `ESRI_WORLD_IMAGERY_STYLE`, `hasMapToken`. CSS is imported there, so importing `maplibregl` from it pulls the stylesheet.
- `GeoJSON.*` global types are available in `apps/web` (already used in `projectStore.ts:67`).

## File Structure

- MODIFY `apps/web/src/v3/observe/lens/types.ts` — add `BBox`, `ObserveMapMarker`, `ObserveMapData`; add `map` to `LensDataBundle`.
- MODIFY `apps/web/src/v3/observe/lens/lensData/mockBundle.ts` — set `map: null`.
- MODIFY `apps/web/src/v3/observe/lens/lensData/liveBundle.ts` — add `buildObserveMap` + bbox helpers; extend `LiveBundleInput`; wire `map` into the builder; pass boundary + demo flag from the hook.
- CREATE `apps/web/src/v3/observe/lens/lensData/__tests__/observeMap.test.ts` — unit tests for `buildObserveMap`.
- MODIFY `apps/web/src/v3/observe/lens/components.tsx` — extract + export `ObservationPin`; refactor `PseudoMap` to use it (no behavior change).
- CREATE `apps/web/src/v3/observe/lens/ObserveMap.tsx` — read-only MapLibre canvas.
- MODIFY `apps/web/src/v3/observe/lens/ObserveLensDashboard.tsx` — swap the canvas to `bundle.map ? <ObserveMap/> : <PseudoMap/>`.
- MODIFY `apps/web/src/store/projectStore.ts` — `MTC_PARCEL_BOUNDARY` const; set it on `MTC_SEED`; backfill onto an existing persisted MTC row in `seedMtcDemo`.
- MODIFY `apps/web/src/data/builtinObserveDataPoints.ts` — add `location` to all 10 MTC seed rows.

## Conventions for every task

- Bash = git-bash. Commit each task on green: `git add -- <explicit paths>` then `git commit -F <tmpfile>` (heredoc stdin does NOT feed `-F -`; write the message to a temp file, commit, then `rm -f` it). NEVER `git add -A`. Verify `git diff --cached --name-only` lists ONLY this task's files; `git restore --staged <foreign>` anything the external rebase raced into staging. **Do NOT push.**
- ASCII only in all source/strings; use double quotes / escape apostrophes in JS strings.
- Never pipe `tsc` through `head` (write to a temp file in the package dir, read it, `rm`). Never run vitest unbounded (`--pool=forks` + an OS-level timeout).
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- No-deletion: `PseudoMap` stays exported and used; `mockData.ts` stays byte-untouched.

---

### Task 1: Types — `ObserveMapData` contract + `LensDataBundle.map`

**Files:**
- Modify: `apps/web/src/v3/observe/lens/types.ts`
- Modify: `apps/web/src/v3/observe/lens/lensData/mockBundle.ts`
- Modify: `apps/web/src/v3/observe/lens/lensData/liveBundle.ts` (temporary `map: null` so it compiles; replaced in Task 2)

- [ ] **Step 1: Add the map types to `types.ts`**

Append after the `MockObservation` interface (after line 214):

```typescript
// ── Live-map payload (real MapLibre canvas) ─────────────────────────────────
// Geographic bounding box as [minLng, minLat, maxLng, maxLat] (a maplibre-gl
// LngLatBoundsLike). Produced by buildObserveMap from the parcel boundary, or
// from the markers when no boundary exists.
export type BBox = [number, number, number, number];

/** An observation pin carrying its true geographic position. */
export type ObserveMapMarker = MockObservation & { lng: number; lat: number };

/**
 * Render-ready payload for the real Observe map. Null on the bundle means "no
 * geometry to map" -> the dashboard renders PseudoMap instead. `demoGeometry`
 * is true when the boundary/markers came from a builtin seed (drives the
 * "Sample location data" badge -- honest provenance, never mistaken for
 * surveyed ground truth).
 */
export interface ObserveMapData {
  boundary: GeoJSON.FeatureCollection | null;
  bbox: BBox;
  markers: ObserveMapMarker[];
  demoGeometry: boolean;
}
```

- [ ] **Step 2: Add the `map` field to `LensDataBundle`**

In `types.ts`, inside `interface LensDataBundle` (lines 280-288), add the field after `observations`:

```typescript
export interface LensDataBundle {
  project: LensProject;
  lenses: LensDisplay[];
  domainDetail: Partial<Record<ObserveLensId, DomainDetail>>;
  observations: MockObservation[];
  /** Real-map payload; null = no geometry, render PseudoMap. */
  map: ObserveMapData | null;
  cycle: LensCycle;
  freshness: Record<Freshness, FreshnessConfig>;
  typeIcon: Record<string, string>;
}
```

- [ ] **Step 3: Set `map: null` in `mockBundle.ts`**

In `mockBundle.ts`, add `map: null` to the `mockBundle` object literal (mock/Millbrook always uses PseudoMap):

```typescript
export const mockBundle: LensDataBundle = {
  project: PROJECT,
  lenses: LENSES,
  domainDetail: DOMAIN_DETAIL,
  observations: MOCK_OBSERVATIONS,
  map: null,
  cycle: CYCLE,
  freshness: FRESHNESS,
  typeIcon: TYPE_ICON,
};
```

- [ ] **Step 4: Temporary `map: null` in `liveBundle.ts`**

In `liveBundle.ts`, inside the object returned by `buildLiveLensBundle` (lines 601-609), add `map: null,` after `observations: ...`. (Task 2 replaces this with the real builder; this keeps the file compiling now.)

```typescript
  return {
    project,
    lenses,
    domainDetail,
    observations: buildObservationPins(activePoints, nowMs),
    map: null,
    cycle,
    freshness: FRESHNESS,
    typeIcon: TYPE_ICON,
  };
```

- [ ] **Step 5: Typecheck**

Run (git-bash, from repo root):

```bash
cd apps/web && (npx tsc --noEmit > tsc_t1.txt 2>&1; echo "EXIT $?"); cat tsc_t1.txt; rm -f tsc_t1.txt; cd ../..
```

Expected: `EXIT 0`, no errors. (If the repo uses a heap flag for tsc, prepend `NODE_OPTIONS=--max-old-space-size=8192`.)

- [ ] **Step 6: Commit**

```bash
git add -- apps/web/src/v3/observe/lens/types.ts apps/web/src/v3/observe/lens/lensData/mockBundle.ts apps/web/src/v3/observe/lens/lensData/liveBundle.ts
git diff --cached --name-only   # MUST list only the three files above
printf '%s\n' "feat(observe): add ObserveMapData contract + LensDataBundle.map field" "" "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" > _m.txt
git commit -F _m.txt && rm -f _m.txt
```

---

### Task 2: `buildObserveMap` pure builder + unit tests + live wire

**Files:**
- Test: `apps/web/src/v3/observe/lens/lensData/__tests__/observeMap.test.ts` (create)
- Modify: `apps/web/src/v3/observe/lens/lensData/liveBundle.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/v3/observe/lens/lensData/__tests__/observeMap.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildObserveMap } from '../liveBundle.js';
import type { ObserveDataPoint } from '@ogden/shared';

const NOW = Date.parse('2026-06-04T00:00:00.000Z');

function pt(
  id: string,
  domainId: ObserveDataPoint['domainId'],
  coords: [number, number] | null,
): ObserveDataPoint {
  return {
    id,
    projectId: 'mtc',
    domainId,
    sourceType: 'manual_observation',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    sourceFeatureRef: null,
    locationGeometry: coords ? { type: 'Point', coordinates: coords } : null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'clear',
    measurementValue: { label: id },
    proofItems: [],
    capturedAt: '2026-05-20T00:00:00.000Z',
    capturedBy: 'test',
  } as ObserveDataPoint;
}

const BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.1059, 44.3035],
          [-80.0972, 44.3018],
          [-80.0958, 44.2965],
          [-80.1045, 44.2982],
          [-80.1059, 44.3035],
        ]],
      },
    },
  ],
};

describe('buildObserveMap', () => {
  it('returns null when there is no boundary and no georeferenced point', () => {
    const points = [pt('a', 'soil', null), pt('b', 'hydrology', null)];
    expect(buildObserveMap(points, null, NOW, false)).toBeNull();
  });

  it('passes the boundary through and derives bbox from it', () => {
    const res = buildObserveMap([pt('a', 'soil', null)], BOUNDARY, NOW, true)!;
    expect(res).not.toBeNull();
    expect(res.boundary).toBe(BOUNDARY);
    expect(res.demoGeometry).toBe(true);
    // bbox = [minLng, minLat, maxLng, maxLat] over the ring
    expect(res.bbox[0]).toBeCloseTo(-80.1059, 6);
    expect(res.bbox[1]).toBeCloseTo(44.2965, 6);
    expect(res.bbox[2]).toBeCloseTo(-80.0958, 6);
    expect(res.bbox[3]).toBeCloseTo(44.3035, 6);
  });

  it('emits a marker per georeferenced point (lng/lat + lens), omitting null-geometry points', () => {
    const points = [
      pt('geo-soil', 'soil', [-80.1015, 44.2992]),
      pt('no-geo', 'climate', null),
    ];
    const res = buildObserveMap(points, BOUNDARY, NOW, false)!;
    expect(res.markers).toHaveLength(1);
    const m = res.markers[0];
    expect(m.id).toBe('geo-soil');
    expect(m.lng).toBeCloseTo(-80.1015, 6);
    expect(m.lat).toBeCloseTo(44.2992, 6);
    expect(m.lens).toBe('living'); // soil -> living lens (DOMAIN_TO_LENS)
  });

  it('derives bbox from markers when there is no boundary', () => {
    const points = [
      pt('p1', 'soil', [-80.1045, 44.2982]),
      pt('p2', 'hydrology', [-80.0972, 44.3018]),
    ];
    const res = buildObserveMap(points, null, NOW, false)!;
    expect(res.boundary).toBeNull();
    expect(res.bbox[0]).toBeCloseTo(-80.1045, 6);
    expect(res.bbox[1]).toBeCloseTo(44.2982, 6);
    expect(res.bbox[2]).toBeCloseTo(-80.0972, 6);
    expect(res.bbox[3]).toBeCloseTo(44.3018, 6);
  });
});
```

> Note: `soil -> living` assumes the existing `DOMAIN_TO_LENS` mapping. If the live-bundle tests show a different lens id for `soil`, use that id (do not change the mapping).

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd apps/web && (timeout 60 npx vitest run src/v3/observe/lens/lensData/__tests__/observeMap.test.ts --pool=forks > vt2.txt 2>&1; echo "EXIT $?"); cat vt2.txt; rm -f vt2.txt; cd ../..
```

Expected: FAIL — `buildObserveMap` is not exported from `liveBundle.ts`.

- [ ] **Step 3: Implement `buildObserveMap` + bbox helpers in `liveBundle.ts`**

In `liveBundle.ts`, add `BBox`, `ObserveMapData`, `ObserveMapMarker` to the existing type import from `../types.js` (lines 53-67):

```typescript
import type {
  BBox,
  Confidence,
  DataPoint,
  DomainDetail,
  Freshness,
  KeyDatum,
  LensCycle,
  LensCyclePhase,
  LensDataBundle,
  LensDisplay,
  LensProject,
  MockObservation,
  ObserveMapData,
  ObserveMapMarker,
  PlanRevisionTrigger,
  Subdomain,
} from '../types.js';
```

Then add this block immediately AFTER `buildObservationPins` (after line 328):

```typescript
// ── live-map payload ──────────────────────────────────────────────────────────

// Recursively visit every [lng, lat] pair in a GeoJSON FeatureCollection and
// fold it into a bbox. Returns null if no numeric coordinate pair was found.
function bboxFromBoundary(fc: GeoJSON.FeatureCollection | null): BBox | null {
  if (!fc) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  let found = false;
  const visit = (node: unknown): void => {
    if (!Array.isArray(node)) return;
    if (
      node.length >= 2 &&
      typeof node[0] === 'number' &&
      typeof node[1] === 'number'
    ) {
      const lng = node[0] as number;
      const lat = node[1] as number;
      found = true;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const child of node) visit(child);
  };
  for (const f of fc.features) {
    const geom = f.geometry as { coordinates?: unknown } | null;
    if (geom && 'coordinates' in geom) visit(geom.coordinates);
  }
  return found ? [minLng, minLat, maxLng, maxLat] : null;
}

function bboxFromMarkers(markers: readonly ObserveMapMarker[]): BBox | null {
  if (markers.length === 0) return null;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const m of markers) {
    if (m.lng < minLng) minLng = m.lng;
    if (m.lng > maxLng) maxLng = m.lng;
    if (m.lat < minLat) minLat = m.lat;
    if (m.lat > maxLat) maxLat = m.lat;
  }
  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Build the real-map payload from a project's active points + parcel boundary.
 * Markers are the observation pins (same id/lens/type/label/age as the
 * PseudoMap pins) that carry a Point geometry, tagged with lng/lat. bbox comes
 * from the boundary when present, else from the markers. Returns null when
 * there is NO boundary AND zero georeferenced points (-> dashboard renders
 * PseudoMap). `demoGeometry` flags seeded/builtin geometry for the in-UI badge.
 */
export function buildObserveMap(
  activePoints: readonly ObserveDataPoint[],
  parcelBoundary: GeoJSON.FeatureCollection | null,
  nowMs: number,
  demoGeometry: boolean,
): ObserveMapData | null {
  const coordById = new Map<string, [number, number]>();
  for (const p of activePoints) {
    const c = coordsOf(p);
    if (c) coordById.set(p.id, c);
  }
  const markers: ObserveMapMarker[] = [];
  for (const pin of buildObservationPins(activePoints, nowMs)) {
    const c = coordById.get(pin.id);
    if (!c) continue;
    markers.push({ ...pin, lng: c[0], lat: c[1] });
  }
  const bbox = bboxFromBoundary(parcelBoundary) ?? bboxFromMarkers(markers);
  if (!bbox) return null;
  return { boundary: parcelBoundary, bbox, markers, demoGeometry };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd apps/web && (timeout 60 npx vitest run src/v3/observe/lens/lensData/__tests__/observeMap.test.ts --pool=forks > vt2.txt 2>&1; echo "EXIT $?"); cat vt2.txt; rm -f vt2.txt; cd ../..
```

Expected: PASS (4 tests).

- [ ] **Step 5: Wire `buildObserveMap` into the live builder + hook**

In `liveBundle.ts`, extend `LiveBundleInput` (after the `getSlot?` field, ~line 370):

```typescript
  getSlot?: SlotResolver;
  /** Project parcel boundary (GeoJSON FeatureCollection) for the real map. */
  parcelBoundary?: GeoJSON.FeatureCollection | null;
  /** True when boundary/points came from a builtin seed (drives the badge). */
  isDemoGeometry?: boolean;
```

Replace the temporary `map: null,` (added in Task 1) in the `buildLiveLensBundle` return with:

```typescript
    map: buildObserveMap(
      activePoints,
      input.parcelBoundary ?? null,
      nowMs,
      input.isDemoGeometry ?? false,
    ),
```

In the hook `useLiveLensBundle` (lines 640-660), read the boundary + builtin flag and thread them through:

```typescript
export function useLiveLensBundle(projectId: string): LensDataBundle {
  const byProject = useObserveDataPointStore((s) => s.byProject);
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const nowMs = useMemo(() => Date.now(), []);
  const points = byProject[projectId] ?? [];
  const projectName = project?.name ?? 'Project';
  const projectTypeLabel = resolveProjectTypeLabel(project);
  const parcelBoundary = project?.parcelBoundaryGeojson ?? null;
  const isDemoGeometry = project?.isBuiltin ?? false;

  return useMemo(
    () =>
      buildLiveLensBundle({
        points,
        nowMs,
        projectName,
        projectTypeLabel,
        getSlot: getMeasurementSlot,
        parcelBoundary,
        isDemoGeometry,
      }),
    [points, nowMs, projectName, projectTypeLabel, parcelBoundary, isDemoGeometry],
  );
}
```

- [ ] **Step 6: Typecheck + full bounded test run for the bundle**

```bash
cd apps/web && (npx tsc --noEmit > tsc_t2.txt 2>&1; echo "EXIT $?"); cat tsc_t2.txt; rm -f tsc_t2.txt
(timeout 90 npx vitest run src/v3/observe/lens/lensData/__tests__/ --pool=forks > vt2b.txt 2>&1; echo "EXIT $?"); cat vt2b.txt; rm -f vt2b.txt; cd ../..
```

Expected: tsc `EXIT 0`; `observeMap.test.ts` + the existing `liveBundle.test.ts` + `specialisedBuilders.test.ts` all PASS. (The existing `liveBundle.test.ts` passes no `parcelBoundary`, so `map` resolves from its fixtures' geometry or to `null` — additive, no assertion breaks. If a test deep-equals a whole bundle and now fails on the extra `map` key, add `map: null`/the expected payload to that fixture.)

- [ ] **Step 7: Commit**

```bash
git add -- apps/web/src/v3/observe/lens/lensData/liveBundle.ts apps/web/src/v3/observe/lens/lensData/__tests__/observeMap.test.ts
git diff --cached --name-only
printf '%s\n' "feat(observe): buildObserveMap pure builder + wire boundary/demo into live bundle" "" "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" > _m.txt
git commit -F _m.txt && rm -f _m.txt
```

---

### Task 3: Extract `ObservationPin` from `PseudoMap` (no behavior change)

**Files:**
- Modify: `apps/web/src/v3/observe/lens/components.tsx`

- [ ] **Step 1: Add the exported `ObservationPin` component**

In `components.tsx`, add this ABOVE the `PseudoMap` definition (before line 44 `export function PseudoMap`):

```typescript
// ─── OBSERVATION PIN (shared by PseudoMap + ObserveMap) ─────────────────────────
// One observation marker in absolute SVG user-space coords (px, py). PseudoMap
// passes coords from the normalized [0,1] viewBox; ObserveMap passes screen px
// from map.project(...). `pointerEvents: 'auto'` lets pins stay clickable when
// the ObserveMap overlay container sets pointer-events: none (harmless in
// PseudoMap, whose container has default pointer-events). Markup is identical to
// the prior inline pin -- this is a DRY extraction, not a redesign.
export function ObservationPin({
  px,
  py,
  obs,
  mapColor,
  isActive,
  isSelected,
  onClick,
}: {
  px: number;
  py: number;
  obs: MockObservation;
  mapColor?: string;
  isActive: boolean;
  isSelected: boolean;
  onClick: (obs: MockObservation) => void;
}) {
  const isDivergence = obs.type === 'divergence';
  return (
    <g
      style={{ cursor: 'pointer', opacity: isActive ? 1 : 0.12, transition: 'opacity 0.3s', pointerEvents: 'auto' }}
      onClick={() => onClick(obs)}
    >
      {isSelected && (
        <circle cx={px} cy={py} r={16} fill="none" stroke={mapColor} strokeWidth="1" opacity="0.5">
          <animate attributeName="r" from="12" to="22" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {isDivergence ? (
        <polygon points={`${px},${py - 8} ${px + 7},${py + 4} ${px - 7},${py + 4}`} fill={C.amber} filter="url(#glow)" />
      ) : (
        <circle
          cx={px}
          cy={py}
          r={isSelected ? 7 : 5}
          fill={mapColor || C.textSecondary}
          stroke={isSelected ? '#EDE9E0' : 'transparent'}
          strokeWidth="1.5"
          filter={isSelected ? 'url(#glow)' : 'none'}
          style={{ transition: 'r 0.2s' }}
        />
      )}
    </g>
  );
}
```

- [ ] **Step 2: Replace the inline pin map inside `PseudoMap`**

In `PseudoMap`, replace the `{MOCK_OBSERVATIONS.map((obs) => { ... })}` block (lines 77-91) with:

```typescript
        {MOCK_OBSERVATIONS.map((obs) => {
          const lens = lensById[obs.lens];
          const isActive = !activeLens || activeLens === 'all' || obs.lens === activeLens;
          const isSelected = selectedObs?.id === obs.id;
          return (
            <ObservationPin
              key={obs.id}
              px={obs.x * 720}
              py={obs.y * 550}
              obs={obs}
              mapColor={lens?.mapColor}
              isActive={isActive}
              isSelected={isSelected}
              onClick={onObsClick}
            />
          );
        })}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && (npx tsc --noEmit > tsc_t3.txt 2>&1; echo "EXIT $?"); cat tsc_t3.txt; rm -f tsc_t3.txt; cd ../..
```

Expected: `EXIT 0`.

- [ ] **Step 4: Visual regression check (PseudoMap unchanged)**

Start the dev preview, open `/v3/prototype/observe-lens` (the chrome-free debug route -> mock -> PseudoMap), and confirm pins render and click-select exactly as before. Take a screenshot. If `preview_screenshot` hangs (known transient `[[project-screenshot-hang]]`), disclose it and use `preview_eval` to assert the `<svg>` still renders the expected number of `<g>` pin nodes. Do NOT claim visual success without a screenshot or a disclosed DOM read.

- [ ] **Step 5: Commit**

```bash
git add -- apps/web/src/v3/observe/lens/components.tsx
git diff --cached --name-only
printf '%s\n' "refactor(observe): extract ObservationPin from PseudoMap (shared pin markup)" "" "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" > _m.txt
git commit -F _m.txt && rm -f _m.txt
```

---

### Task 4: `ObserveMap` component (read-only MapLibre canvas)

**Files:**
- Create: `apps/web/src/v3/observe/lens/ObserveMap.tsx`

- [ ] **Step 1: Create `ObserveMap.tsx`**

```typescript
// ObserveMap.tsx -- read-only MapLibre basemap for the Observe lens.
//
// Replaces PseudoMap when the live bundle resolves real geometry (see
// buildObserveMap in lensData/liveBundle.ts). Draws the parcel boundary as a
// GeoJSON layer and overlays observation pins re-projected on every map move,
// reusing the shared ObservationPin markup so the pin look/interactions match
// PseudoMap exactly. Read-only: no draw, rotation disabled (true-north).

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  maplibregl,
  MAP_STYLES,
  ESRI_WORLD_IMAGERY_STYLE,
  hasMapToken,
} from '../../../lib/maplibre.js';
import { C, F } from './tokens.js';
import { ObservationPin } from './components.js';
import { useLensData } from './lensData/LensDataContext.js';
import type { BBox, LensDisplay, MockObservation, ObserveMapMarker } from './types.js';

export interface ObserveMapProps {
  boundary: GeoJSON.FeatureCollection | null;
  bbox: BBox;
  markers: ObserveMapMarker[];
  activeLens: string;
  onObsClick: (obs: MockObservation) => void;
  selectedObs: MockObservation | null;
  demoGeometry: boolean;
}

export default function ObserveMap({
  boundary,
  bbox,
  markers,
  activeLens,
  onObsClick,
  selectedObs,
  demoGeometry,
}: ObserveMapProps) {
  const { lenses: LENSES } = useLensData();
  const lensById: Record<string, LensDisplay> = Object.fromEntries(LENSES.map((l) => [l.id, l]));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<ObserveMapMarker[]>(markers);
  const boundaryRef = useRef<GeoJSON.FeatureCollection | null>(boundary);
  markersRef.current = markers;
  boundaryRef.current = boundary;

  const [ready, setReady] = useState(false);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Re-project every marker's [lng,lat] to screen px. Reads refs so the map
  // event listeners never capture a stale marker list.
  const reposition = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const next: Record<string, { x: number; y: number }> = {};
    for (const m of markersRef.current) {
      const p = map.project([m.lng, m.lat]);
      next[m.id] = { x: p.x, y: p.y };
    }
    setPositions(next);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new maplibregl.Map({
      container,
      style: hasMapToken ? MAP_STYLES.hybrid : ESRI_WORLD_IMAGERY_STYLE,
      bounds: bbox,
      fitBoundsOptions: { padding: 48 },
      attributionControl: { compact: true },
      dragRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      const b = boundaryRef.current;
      if (b) {
        map.addSource('parcel', { type: 'geojson', data: b });
        map.addLayer({
          id: 'parcel-fill',
          type: 'fill',
          source: 'parcel',
          paint: { 'fill-color': '#5AAF72', 'fill-opacity': 0.1 },
        });
        map.addLayer({
          id: 'parcel-line',
          type: 'line',
          source: 'parcel',
          paint: { 'line-color': '#7BBF8C', 'line-width': 1.5, 'line-opacity': 0.85 },
        });
      }
      setReady(true);
      reposition();
    });
    map.on('move', reposition);
    map.on('resize', reposition);

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // bbox/boundary are captured once at mount; the bundle rebuilds (new
    // component instance) if the project changes, so a deps array of
    // [reposition] is correct and intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reposition]);

  // Re-project when the marker set changes after the map is ready.
  useEffect(() => {
    if (ready) reposition();
  }, [markers, ready, reposition]);

  const sel = selectedObs && positions[selectedObs.id] ? positions[selectedObs.id] : null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#0D1209', overflow: 'hidden' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="sglow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {ready &&
          markers.map((m) => {
            const pos = positions[m.id];
            if (!pos) return null;
            const lens = lensById[m.lens];
            const isActive = !activeLens || activeLens === 'all' || m.lens === activeLens;
            const isSelected = selectedObs?.id === m.id;
            return (
              <ObservationPin
                key={m.id}
                px={pos.x}
                py={pos.y}
                obs={m}
                mapColor={lens?.mapColor}
                isActive={isActive}
                isSelected={isSelected}
                onClick={onObsClick}
              />
            );
          })}
      </svg>

      {selectedObs && sel && (
        <div
          style={{
            position: 'absolute',
            left: sel.x + 14,
            top: sel.y - 20,
            background: C.bg3,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: 200,
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ fontSize: 13, color: C.textPrimary, fontWeight: 600, fontFamily: F.sans }}>{selectedObs.label}</div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 3, fontFamily: F.mono }}>
            {selectedObs.type} - {selectedObs.age} ago
          </div>
        </div>
      )}

      {demoGeometry && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            background: C.bg3 + 'EE',
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 11,
            color: C.textSecondary,
            fontFamily: F.mono,
            letterSpacing: '0.08em',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          SAMPLE LOCATION DATA
        </div>
      )}
    </div>
  );
}
```

> `C.bg3`, `C.border`, `C.borderLight`, `C.text*` are the same tokens `PseudoMap` uses (`./tokens.js`); the callout/badge styling mirrors PseudoMap's existing callout block for visual consistency.

- [ ] **Step 2: Typecheck**

```bash
cd apps/web && (npx tsc --noEmit > tsc_t4.txt 2>&1; echo "EXIT $?"); cat tsc_t4.txt; rm -f tsc_t4.txt; cd ../..
```

Expected: `EXIT 0`. (If `maplibregl.Map` option types reject `attributionControl: { compact: true }` on this version, use `attributionControl: false` and add `map.addControl(new maplibregl.AttributionControl({ compact: true }))` in the `load` handler.)

- [ ] **Step 3: Commit**

```bash
git add -- apps/web/src/v3/observe/lens/ObserveMap.tsx
git diff --cached --name-only
printf '%s\n' "feat(observe): add read-only ObserveMap MapLibre canvas" "" "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" > _m.txt
git commit -F _m.txt && rm -f _m.txt
```

---

### Task 5: Swap the dashboard canvas to the real map

**Files:**
- Modify: `apps/web/src/v3/observe/lens/ObserveLensDashboard.tsx`

- [ ] **Step 1: Import `ObserveMap`**

In `ObserveLensDashboard.tsx`, add after the `components.js` import block (after line 42):

```typescript
import ObserveMap from './ObserveMap.js';
```

- [ ] **Step 2: Swap the `canvas` slot**

Replace the `canvas={<PseudoMap .../>}` block (lines 122-128) with:

```typescript
          canvas={
            bundle.map ? (
              <ObserveMap
                boundary={bundle.map.boundary}
                bbox={bundle.map.bbox}
                markers={bundle.map.markers}
                activeLens={activeLens}
                onObsClick={handleObsClick}
                selectedObs={selectedObs}
                demoGeometry={bundle.map.demoGeometry}
              />
            ) : (
              <PseudoMap
                activeLens={activeLens}
                onObsClick={handleObsClick}
                selectedObs={selectedObs}
              />
            )
          }
```

`PseudoMap` stays imported and used (the `bundle.map === null` branch). No other change.

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && (npx tsc --noEmit > tsc_t5.txt 2>&1; echo "EXIT $?"); cat tsc_t5.txt; rm -f tsc_t5.txt; cd ../..
```

Expected: `EXIT 0`. (Live MTC will still render PseudoMap until Task 6 seeds geometry — `bundle.map` is null with no boundary and no geo points. That is correct intermediate behavior.)

- [ ] **Step 4: Commit**

```bash
git add -- apps/web/src/v3/observe/lens/ObserveLensDashboard.tsx
git diff --cached --name-only
printf '%s\n' "feat(observe): render ObserveMap when the bundle resolves geometry, else PseudoMap" "" "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" > _m.txt
git commit -F _m.txt && rm -f _m.txt
```

---

### Task 6: Seed MTC geometry (boundary + point coordinates)

**Files:**
- Modify: `apps/web/src/store/projectStore.ts`
- Modify: `apps/web/src/data/builtinObserveDataPoints.ts`

- [ ] **Step 1: Add the MTC parcel boundary constant**

In `projectStore.ts`, add ABOVE `export const MTC_SEED` (before line 1237). Plausible ~40 ha Ontario parcel near Mulmur/Creemore (CA/ON), long axis along a gentle NW-SE lie of the land; full 6-decimal precision; true-north WGS84 (no rotation). Declared demo data.

```typescript
// Plausible Ontario placeholder parcel for the Moontrance Creek demo (~40 ha
// near Mulmur/Creemore, CA/ON). Long axis runs NW-SE along the lie of the
// land; the seasonal creek follows the low NE edge. Full 6-dp precision,
// true-north WGS84 -- swappable for surveyed coordinates later. DEMO DATA.
const MTC_PARCEL_BOUNDARY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Moontrance Creek (demo parcel)' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [-80.105900, 44.303500],
          [-80.097200, 44.301800],
          [-80.095800, 44.296500],
          [-80.104500, 44.298200],
          [-80.105900, 44.303500],
        ]],
      },
    },
  ],
};
```

- [ ] **Step 2: Set the boundary on `MTC_SEED`**

In `MTC_SEED` (lines 1237-1262), change the two boundary fields:

```typescript
  hasParcelBoundary: true,
```

and

```typescript
  parcelBoundaryGeojson: MTC_PARCEL_BOUNDARY,
```

- [ ] **Step 3: Backfill the boundary onto an already-persisted MTC row**

A returning user has a persisted `mtc` row with `parcelBoundaryGeojson: null`; editing the constant does not touch persisted state and we avoid a persist-version bump. In `seedMtcDemo` (lines 1264-1283), after the insert-if-absent block, add an idempotent backfill:

```typescript
function seedMtcDemo(): void {
  const existing = useProjectStore.getState().projects.find((p) => p.id === 'mtc');
  if (!existing) {
    useProjectStore.setState((state) => ({
      projects: [...state.projects, MTC_SEED],
    }));
  } else if (!existing.parcelBoundaryGeojson) {
    // Backfill the demo boundary onto a row persisted before it existed.
    // Idempotent: only patches when the boundary is still absent, so a user
    // who later draws their own boundary is never overwritten.
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === 'mtc'
          ? { ...p, parcelBoundaryGeojson: MTC_PARCEL_BOUNDARY, hasParcelBoundary: true }
          : p,
      ),
    }));
  }
  seedCuratedMtcActionsIfEmpty('mtc');
  seedMtcObserveDataPoints('mtc');
}
```

- [ ] **Step 4: Add `location` to all 10 MTC seed rows**

In `builtinObserveDataPoints.ts`, add a `location` (interior of the parcel, domain-plausible: water/risk on the low NE creek edge, topography on high SW ground, vision/people/climate near the field centre, ecology/access on the east edge; 6-dp). Add the field to each row object in `MTC_OBSERVE_BUNDLE` (lines 262-403):

| Row `key` | Add to the row object |
|---|---|
| `mtc-vision` | `location: [-80.100800, 44.300000],` |
| `mtc-people` | `location: [-80.100200, 44.299600],` |
| `mtc-ecology-hedgerow` | `location: [-80.096900, 44.299400],` |
| `mtc-hydrology-creek` | `location: [-80.098800, 44.301200],` |
| `mtc-soil-field` | `location: [-80.101500, 44.299200],` |
| `mtc-topo` | `location: [-80.103200, 44.298700],` |
| `mtc-risk-setback` | `location: [-80.098400, 44.300800],` |
| `mtc-access` | `location: [-80.097700, 44.300100],` |
| `mtc-climate-sectors` | `location: [-80.100500, 44.299900],` |
| `mtc-landbase` | `location: [-80.101000, 44.300300],` |

Example (the `mtc-soil-field` row keeps its existing `proofs`, just gains `location`):

```typescript
  {
    key: 'mtc-soil-field',
    domainId: 'soil',
    statusOutput: 'needs_investigation',
    capturedAt: '2026-05-16',
    label: 'Tile-drained crop field - degraded topsoil',
    note: 'Decades of corn/soy rotation; texture sample pulled, structure poor.',
    location: [-80.101500, 44.299200],
    proofs: [
      { slotId: 'obs-soil-ph', loggedResult: { zone: 'North block', ph: 6.1, om: 2.3, compaction: 'high' } },
      { slotId: 'obs-soil-ph', loggedResult: { zone: 'Mid block', ph: 6.5, om: 3.0, compaction: 'moderate' } },
      { slotId: 'obs-soil-ph', loggedResult: { zone: 'Creek edge', ph: 6.8 } },
    ],
  },
```

> Keep every existing field (including the apostrophe-free ASCII copy and all `proofs`) intact — only ADD the `location` line to each of the 10 rows.

- [ ] **Step 5: Typecheck**

```bash
cd apps/web && (npx tsc --noEmit > tsc_t6.txt 2>&1; echo "EXIT $?"); cat tsc_t6.txt; rm -f tsc_t6.txt; cd ../..
```

Expected: `EXIT 0`.

- [ ] **Step 6: Commit**

```bash
git add -- apps/web/src/store/projectStore.ts apps/web/src/data/builtinObserveDataPoints.ts
git diff --cached --name-only
printf '%s\n' "feat(observe): seed MTC demo parcel boundary + observation point coordinates" "" "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>" > _m.txt
git commit -F _m.txt && rm -f _m.txt
```

---

### Task 7: Live verification + diff audit

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck + bounded test sweep**

```bash
cd apps/web && (npx tsc --noEmit > tsc_t7.txt 2>&1; echo "EXIT $?"); cat tsc_t7.txt; rm -f tsc_t7.txt
(timeout 120 npx vitest run src/v3/observe/lens/lensData/__tests__/ --pool=forks > vt7.txt 2>&1; echo "EXIT $?"); cat vt7.txt; rm -f vt7.txt; cd ../..
```

Expected: tsc `EXIT 0`; all observe-lens lensData tests PASS.

- [ ] **Step 2: Live preview — MTC real map**

Start the dev server. Open `/v3/project/mtc/observe` in **Live** source. Confirm:
1. A real satellite basemap renders (ESRI imagery when no MapTiler key; the network tab shows `server.arcgisonline.com` tiles).
2. The MTC parcel polygon draws (green fill + stroke).
3. The 10 observation pins sit INSIDE the parcel at plausible spots (water/risk near the NE creek edge, topography on the SW high ground).
4. Clicking a pin selects it (callout + pulse) and the lens detail interactions behave as before.
5. Pan/zoom keeps pins glued to their geography.
6. The "SAMPLE LOCATION DATA" badge shows bottom-right.

Capture a screenshot. If `preview_screenshot` hangs (`[[project-screenshot-hang]]`), DISCLOSE it and use `preview_eval` to assert: the maplibre canvas exists, the `parcel-fill` layer is present (`map.getLayer('parcel-fill')`), `map.queryRenderedFeatures` / the overlay `<g>` count == 10, and the badge text node exists. Do NOT claim success without a screenshot or a disclosed DOM read.

- [ ] **Step 3: Regression — mock + geometry-less fallback**

- Toggle the MTC project to **Mock** source: confirm it renders `PseudoMap` (Millbrook fixtures), unchanged.
- Open `/v3/prototype/observe-lens` (debug route, no project): confirm `PseudoMap`.
- Confirm `mockData.ts` is byte-untouched (`git status` shows it unmodified).

- [ ] **Step 4: Diff audit**

```bash
git log --oneline -7
git status --short
```

Expected: 6 feature commits (Tasks 1-6) on `feat/atlas-permaculture`; working tree shows only foreign WIP from the external process (none of THIS plan's files left uncommitted); `mockData.ts` and the `PseudoMap` export intact. **Branch NOT pushed** (a push needs a fetch + divergence check the operator has not requested).

- [ ] **Step 5: Session close (wiki)**

Per the global protocol, after verification: append a `wiki/log/2026-06-04-atlas-observe-live-map.md` entry; update `wiki/entities/observe-dashboard.md` (real-map canvas + `buildObserveMap` + demo badge); file ADR `wiki/decisions/2026-06-04-atlas-observe-live-map.md` (new read-only map component + `ObserveMapData` contract + seeded demo geometry + provenance badge); add the ADR ref to the Decisions list in `wiki/index.md`. ASCII-only; explicit-path commit; not pushed.

---

## Definition of Done

On `/v3/project/mtc/observe` (Live), the Observe canvas shows a real MapLibre basemap with the seeded MTC parcel boundary and all 10 observation pins at their true positions, click-to-select + detail and pan/zoom-glued pins preserving the existing pin look, and a "SAMPLE LOCATION DATA" badge. Geometry-less projects and mock/Millbrook mode keep `PseudoMap`. `buildObserveMap` is pure + unit-tested; `tsc` and bounded tests are green; `mockData.ts` and the `PseudoMap` export are intact; live behavior verified (screenshot or disclosed DOM proof). Each task committed explicit-path on verify; branch NOT pushed; wiki updated.

## Self-Review (completed against the spec)

- **Spec coverage:** dedicated lightweight `ObserveMap` on `maplibre-gl` reusing `lib/maplibre.ts` (Task 4) ✓; pure `buildObserveMap` returning null at zero geometry + new `ObserveMapData`/`ObserveMapMarker` types + `LensDataBundle.map` (Tasks 1-2) ✓; `ObservationPin` extraction shared by both surfaces, no PseudoMap behavior change (Task 3) ✓; mount swap, PseudoMap kept exported (Task 5) ✓; MTC seed boundary + per-point coords with the four seed constraints — full precision, NW-SE oriented polygon, true-north WGS84, domain-plausible placement (Task 6) ✓; demo-data honesty badge driven off `demoGeometry` (Tasks 1/2/4/6) ✓; degrade matrix — null->PseudoMap, no token->ESRI raster, point-without-geometry omitted (Tasks 2/4) ✓; bounded vitest + live preview + regression + diff audit (Task 7) ✓; persist-version-bump risk handled via idempotent backfill, not a migration (Task 6 Step 3) ✓; no-deletion + mockData intact + ASCII + not-pushed (conventions + Task 7) ✓.
- **Placeholder scan:** no TBD/"handle errors"/"similar to" — every code step carries full code.
- **Type consistency:** `buildObserveMap(activePoints, parcelBoundary, nowMs, demoGeometry)` signature identical in Tasks 2/2-tests; `ObserveMapData { boundary, bbox, markers, demoGeometry }` identical in types (Task 1), builder return (Task 2), and `ObserveMap` props (Task 4); `BBox = [number,number,number,number]` used uniformly; `ObservationPin` prop names (`px,py,obs,mapColor,isActive,isSelected,onClick`) identical in definition (Task 3) and both call sites (Tasks 3/4).
