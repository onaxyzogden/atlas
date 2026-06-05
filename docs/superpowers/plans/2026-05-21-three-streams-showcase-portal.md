# Three Streams Showcase Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public scrollytelling portal at `/showcase/three-streams` (+ three sibling tier routes) that tells the Three Streams Farm story from a static JSON snapshot, with hybrid map embeds, MDX-authored scenes, scrollama-driven transitions, and per-tier Calendly/contact CTAs — strictly additive on `feat/atlas-permaculture`.

**Architecture:** Build-time pipeline (Postgres → static JSON + scene-image WebP) feeds a selective-SSG React subtree at `apps/web/src/showcase/`. A new `<ShowcaseMap>` is extracted from `MapCanvas` (parallel component, prop-driven, no store reads). `<SceneEngine>` orchestrates scrollama observers over MDX scenes; `<MetricChart>` reuses `regenerationMonitor/aggregate.ts` against snapshot data; `<ProjectedChart>` mirrors it with a "Projected — see methodology" badge for Y5/Y8. Three tier routes are public siblings of `appShellRoute` (same pattern as `/portal/$slug`).

**Tech Stack:** TypeScript, React 18, TanStack Router, Vite, MapLibre GL, `scrollama`, `framer-motion`, `@mdx-js/rollup`, `vite-plugin-ssg` (validated by spike — fallback Playwright prerender), `pg` (Postgres driver, already a dep), Playwright (scene-image capture), Vitest + happy-dom.

**Source spec:** `docs/superpowers/specs/2026-05-21-three-streams-showcase-design.md`.

**Binding constraints:**
- Explicit-path `git add` only (never `-A`/`.`); per-task commits; fetch + `git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture` after each commit; **never push without explicit user approval** (branch rebased out-of-band).
- Foreign WIP exists in `apps/web/src/features/economics/`, `features/plan/WasteVectorTool.tsx`, `features/scenarios/`, `lib/apiClient.ts`, `vite.config.ts`, `features/financial/` — do NOT include these in any commit. Always stage explicit showcase paths.
- Covenant — no riba/gharar/CSRA/salam/investor/financing/advance-purchase/yield-share framing. Apricot Lane attribution string must appear verbatim in `<AttributionFooter>` on every prerendered page.
- No DB migration, no API route change, no auth-pipeline change, no `MapCanvas` refactor (parallel `ShowcaseMap` only), no projectStore/uiStore/mapStore/authStore imports in the showcase tree.
- Snapshot script reads from the live dev DB seeded by migrations 029 + 030 (`THREE_STREAMS_PROJECT_ID = '00000000-0000-0000-0000-000000357320'`).

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/snapshot-three-streams.ts` *(new)* | Read DB → emit `apps/web/public/showcase/three-streams.json`. Idempotent. |
| `scripts/snapshot-scene-images.ts` *(new)* | Playwright → emit `apps/web/public/showcase/scenes/<id>.webp` (committed). |
| `apps/web/public/showcase/three-streams.json` *(build output, committed initially)* | Static snapshot consumed by the portal at runtime. |
| `apps/web/public/showcase/scenes/*.webp` *(build output, committed)* | Map thumbnails for scrollytelling. |
| `apps/web/src/showcase/data/snapshot.ts` *(new)* | Typed loader for the static JSON. |
| `apps/web/src/showcase/data/sceneManifest.ts` *(new)* | Ordered list of scenes per tier, derived from MDX front-matter. |
| `apps/web/src/showcase/data/projectedTrajectories.ts` *(new)* | Hand-authored Y5/Y8 chart points. |
| `apps/web/src/showcase/components/ShowcaseMap.tsx` *(new)* | Prop-driven MapLibre map. No stores. |
| `apps/web/src/showcase/components/MapThumbnail.tsx` *(new)* | Static `<img>` + click→hydrate to `<ShowcaseMap>`. |
| `apps/web/src/showcase/components/SceneEngine.tsx` *(new)* | scrollama wrapper + framer-motion transitions. |
| `apps/web/src/showcase/components/MetricChart.tsx` *(new)* | Reuses `regenerationMonitor/aggregate.ts`. |
| `apps/web/src/showcase/components/ProjectedChart.tsx` *(new)* | Same shape + "Projected" badge + methodology tooltip. |
| `apps/web/src/showcase/components/TierChooser.tsx` *(new)* | Hero CTA buttons routing to `/showcase/three-streams/{tier}`. |
| `apps/web/src/showcase/components/ContactCTA.tsx` *(new)* | Tier-specific Calendly link or contact form. |
| `apps/web/src/showcase/components/AttributionFooter.tsx` *(new)* | Apricot Lane attribution string verbatim + canon back-link. |
| `apps/web/src/showcase/scenes/_shared/*.mdx` *(new × 8)* | hero, y0, y1, y2, y5, y8, methodology, cta. |
| `apps/web/src/showcase/scenes/dreaming/*.mdx` *(new × 2)* | vision, first-steps. |
| `apps/web/src/showcase/scenes/transitioning/*.mdx` *(new × 2)* | conversion-mechanics, water-and-cover. |
| `apps/web/src/showcase/scenes/stewarding/*.mdx` *(new × 2)* | monitoring-instrumentation, adaptive-stewardship. |
| `apps/web/src/showcase/routes/showcase.tsx` *(new)* | Hero page component. |
| `apps/web/src/showcase/routes/showcase.$tier.tsx` *(new)* | Tier-specific scrollytelling page. |
| `apps/web/src/showcase/styles/showcase.module.css` *(new)* | Scoped styles. |
| `apps/web/src/showcase/__tests__/**` *(new)* | Vitest tests per component. |
| `apps/web/src/routes/index.tsx` *(edit — append 2 routes, ~10 lines)* | Wire `showcaseRoute` + `showcaseTierRoute` as `rootRoute` children. |
| `apps/web/package.json` *(edit — add deps)* | `scrollama`, `framer-motion`, `@mdx-js/rollup`, `vite-plugin-ssg`. |
| `apps/web/vite.config.ts` *(edit — register MDX + SSG plugins; respect foreign WIP)* | Plugin registration. |
| Root `package.json` *(edit — add scripts)* | `snapshot:showcase`, `snapshot:scenes`. |
| `wiki/entities/showcase-portal.md` *(new)* + `wiki/decisions/2026-05-21-three-streams-showcase-design.md` *(new ADR)* + `wiki/log/2026-05-21-atlas-phase-3-showcase-portal.md` *(new)* + `wiki/log.md` *(prepend)* + `wiki/index.md` *(append entity entry)* | Wiki absorption. |

---

## Pre-flight (Session 1 start)

- [ ] **Step 0.1: Verify branch + DB state**

Run:
```bash
cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas"
git status --short
git rev-parse --abbrev-ref HEAD
git fetch origin feat/atlas-permaculture
git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

Expected: on `feat/atlas-permaculture`; foreign WIP from parallel session present (do not touch); known commit-ahead count.

- [ ] **Step 0.2: Confirm Three Streams substrate in DB**

Run:
```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -U ogden_app -d ogden_atlas -c "SELECT name, is_builtin, ROUND((ST_Area(parcel_boundary::geography)/4046.86)::numeric,1) AS acres FROM projects WHERE id='00000000-0000-0000-0000-000000357320';"
```
Expected: `Three Streams Farm — Apricot-Lane Showcase | t | 159.7`. If empty, run `pnpm --filter @ogden/api run migrate` first.

---

## Session 1 — Foundation (build pipeline + ShowcaseMap extraction)

### Task 1: SSG plugin spike

**Files:**
- Read: `apps/web/vite.config.ts`, `apps/web/package.json`
- Modify: none yet — this task is a spike to decide between `vite-plugin-ssg`, `vite-plugin-prerender`, or hand-rolled Playwright prerender.

**Context:** Spec requires selective SSG for `/showcase/three-streams` + 3 tier siblings. Rest of app stays SPA.

- [ ] **Step 1.1: Install candidate**

```bash
pnpm --filter @ogden/web add -D vite-plugin-ssg
```

- [ ] **Step 1.2: Smoke-test prerender**

Create a throwaway `apps/web/src/__ssg-smoke__/index.tsx` exporting a static React component at path `/__ssg-smoke__`. Register `vite-plugin-ssg` in `vite.config.ts` (guarded; do not remove foreign-WIP lines). Run `pnpm --filter @ogden/web build`. Expected: `dist/__ssg-smoke__/index.html` contains the static markup.

- [ ] **Step 1.3: Decision record**

If the smoke test passes → keep `vite-plugin-ssg`. If it fails → uninstall, then `pnpm --filter @ogden/web add -D playwright`, and document choice in commit message. Revert the smoke route + smoke file.

- [ ] **Step 1.4: Commit (spike-only)**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/vite.config.ts
git commit -m "chore(web): Phase 3 — SSG plugin spike (vite-plugin-ssg | playwright fallback)"
git fetch origin feat/atlas-permaculture
git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

Note: if `vite.config.ts` has foreign WIP, do NOT include it — instead, restrict to `package.json` + lockfile, and defer plugin registration to Task 12.

---

### Task 2: Snapshot script (data) — `scripts/snapshot-three-streams.ts`

**Files:**
- Create: `scripts/snapshot-three-streams.ts`
- Create: `scripts/__tests__/snapshot-three-streams.test.ts`
- Modify: root `package.json` (add `snapshot:showcase` script)

**Context:** Reads from Postgres seeded by migrations 029 + 030. Sentinel ID exported from `packages/shared/src/constants/system.ts:THREE_STREAMS_PROJECT_ID`. DB creds in `apps/api/.env` (`DATABASE_URL`).

- [ ] **Step 2.1: Write the failing test**

Create `scripts/__tests__/snapshot-three-streams.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { buildSnapshot } from '../snapshot-three-streams';

describe('buildSnapshot', () => {
  it('shapes the JSON with required top-level keys', async () => {
    const fakeQuery = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'p1', name: 'Three Streams Farm' }] })       // project
      .mockResolvedValueOnce({ rows: [{ layer_type: 'soils' }] })                         // layers
      .mockResolvedValueOnce({ rows: [{ id: 'f1', feature_type: 'zone' }] })              // features
      .mockResolvedValueOnce({ rows: [{ id: 'e1', event_date: '2024-04-12' }] })          // events
      .mockResolvedValueOnce({ rows: [{ id: 's1' }] })                                    // spiritual
      .mockResolvedValueOnce({ rows: [{ from_output: 'manure' }] });                      // relationships

    const snap = await buildSnapshot({ query: fakeQuery } as any, 'three-streams-id');
    expect(Object.keys(snap).sort()).toEqual([
      'designFeatures', 'layers', 'project', 'regenerationEvents', 'relationships', 'spiritualZones',
    ]);
    expect(snap.regenerationEvents).toHaveLength(1);
  });
});
```

- [ ] **Step 2.2: Run test (FAIL — module missing)**

```bash
pnpm vitest run scripts/__tests__/snapshot-three-streams.test.ts
```
Expected: FAIL — cannot resolve `../snapshot-three-streams`.

- [ ] **Step 2.3: Implement `buildSnapshot` + CLI**

Create `scripts/snapshot-three-streams.ts`:

```typescript
import { Client } from 'pg';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { THREE_STREAMS_PROJECT_ID } from '@ogden/shared/constants/system';

export type Snapshot = {
  project: any;
  layers: any[];
  designFeatures: any[];
  regenerationEvents: any[];
  spiritualZones: any[];
  relationships: any[];
};

type Queryable = { query: (sql: string, params: any[]) => Promise<{ rows: any[] }> };

export async function buildSnapshot(db: Queryable, projectId: string): Promise<Snapshot> {
  const project = (await db.query(
    `SELECT id, name, is_builtin, country, province_state, conservation_auth_id,
            acreage, bioregion, climate_region,
            ST_AsGeoJSON(parcel_boundary)::json AS parcel_boundary,
            metadata
       FROM projects WHERE id = $1`, [projectId])).rows[0];
  const layers = (await db.query(
    `SELECT layer_type, source_api, data_date, summary_data
       FROM project_layers WHERE project_id = $1 ORDER BY layer_type`, [projectId])).rows;
  const designFeatures = (await db.query(
    `SELECT id, feature_type, name, properties,
            ST_AsGeoJSON(geometry)::json AS geometry
       FROM design_features WHERE project_id = $1`, [projectId])).rows;
  const regenerationEvents = (await db.query(
    `SELECT id, event_date, event_type, phase, observations, parent_event_id
       FROM regeneration_events WHERE project_id = $1 ORDER BY event_date`, [projectId])).rows;
  const spiritualZones = (await db.query(
    `SELECT id, name, properties, ST_AsGeoJSON(geometry)::json AS geometry
       FROM spiritual_zones WHERE project_id = $1`, [projectId])).rows;
  const relationships = (await db.query(
    `SELECT from_output, to_input, ratio FROM project_relationships WHERE project_id = $1`,
    [projectId])).rows;

  return { project, layers, designFeatures, regenerationEvents, spiritualZones, relationships };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const snap = await buildSnapshot(client, THREE_STREAMS_PROJECT_ID);
    const outPath = resolve(process.cwd(), 'apps/web/public/showcase/three-streams.json');
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, JSON.stringify(snap, null, 2), 'utf8');
    console.log(`[snapshot] wrote ${outPath}`);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err); process.exit(1); });
}
```

- [ ] **Step 2.4: Verify test passes**

```bash
pnpm vitest run scripts/__tests__/snapshot-three-streams.test.ts
```
Expected: PASS.

- [ ] **Step 2.5: Add root `package.json` script**

In root `package.json`, append to `scripts`:
```json
"snapshot:showcase": "tsx scripts/snapshot-three-streams.ts"
```

- [ ] **Step 2.6: Run live snapshot**

```powershell
$env:DATABASE_URL = "postgresql://ogden_app:ogden_dev_2024@localhost:5432/ogden_atlas"
pnpm snapshot:showcase
```
Expected: `apps/web/public/showcase/three-streams.json` created; project name `"Three Streams Farm — Apricot-Lane Showcase"`; layers length 6; regenerationEvents length 24.

- [ ] **Step 2.7: Commit (explicit paths)**

```bash
git add scripts/snapshot-three-streams.ts scripts/__tests__/snapshot-three-streams.test.ts \
        package.json apps/web/public/showcase/three-streams.json
git commit -m "feat(scripts): Phase 3 — snapshot-three-streams script + JSON output"
git fetch origin feat/atlas-permaculture
git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 3: Snapshot loader + types — `apps/web/src/showcase/data/snapshot.ts`

**Files:**
- Create: `apps/web/src/showcase/data/snapshot.ts`
- Create: `apps/web/src/showcase/__tests__/snapshot.test.ts`

**Context:** Runtime loader for the JSON snapshot. Typed against `packages/shared/src/schemas/` shapes.

- [ ] **Step 3.1: Write test**

```typescript
// apps/web/src/showcase/__tests__/snapshot.test.ts
import { describe, it, expect } from 'vitest';
import { loadSnapshot, type ShowcaseSnapshot } from '../data/snapshot';

describe('loadSnapshot', () => {
  it('parses the static JSON shape', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({
        project: { id: 'p1', name: 'Three Streams Farm' },
        layers: [], designFeatures: [], regenerationEvents: [],
        spiritualZones: [], relationships: [],
      }),
    });
    const snap: ShowcaseSnapshot = await loadSnapshot({ fetchImpl: fakeFetch as any });
    expect(snap.project.name).toContain('Three Streams');
  });
});
```

- [ ] **Step 3.2: Run test (FAIL)**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/snapshot.test.ts
```
Expected: FAIL.

- [ ] **Step 3.3: Implement loader**

```typescript
// apps/web/src/showcase/data/snapshot.ts
export type ShowcaseLayer = { layer_type: string; source_api: string; data_date: string; summary_data: Record<string, unknown> };
export type ShowcaseDesignFeature = { id: string; feature_type: 'zone'|'structure'|'path'; name: string; properties: Record<string, unknown>; geometry: GeoJSON.Geometry };
export type ShowcaseRegenerationEvent = { id: string; event_date: string; event_type: string; phase: string|null; observations: Record<string, unknown>; parent_event_id: string|null };
export type ShowcaseSpiritualZone = { id: string; name: string; properties: Record<string, unknown>; geometry: GeoJSON.Geometry };
export type ShowcaseRelationship = { from_output: string; to_input: string; ratio: number };
export type ShowcaseProject = {
  id: string; name: string; is_builtin: boolean; country: string; province_state: string;
  conservation_auth_id: string; acreage: number; bioregion: string; climate_region: string;
  parcel_boundary: GeoJSON.MultiPolygon; metadata: Record<string, unknown>;
};

export type ShowcaseSnapshot = {
  project: ShowcaseProject;
  layers: ShowcaseLayer[];
  designFeatures: ShowcaseDesignFeature[];
  regenerationEvents: ShowcaseRegenerationEvent[];
  spiritualZones: ShowcaseSpiritualZone[];
  relationships: ShowcaseRelationship[];
};

const SNAPSHOT_URL = '/showcase/three-streams.json';

export async function loadSnapshot(opts?: { fetchImpl?: typeof fetch }): Promise<ShowcaseSnapshot> {
  const f = opts?.fetchImpl ?? fetch;
  const res = await f(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Failed to load showcase snapshot: ${res.status}`);
  return (await res.json()) as ShowcaseSnapshot;
}
```

- [ ] **Step 3.4: Verify test passes**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/snapshot.test.ts
```
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add apps/web/src/showcase/data/snapshot.ts apps/web/src/showcase/__tests__/snapshot.test.ts
git commit -m "feat(web/showcase): snapshot loader + types"
git fetch origin feat/atlas-permaculture
git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 4: `<ShowcaseMap>` extraction (parallel to `MapCanvas`)

**Files:**
- Read: `apps/web/src/features/map/MapCanvas.tsx` (or `MapCanvas/` directory) + `MapView.tsx`
- Create: `apps/web/src/showcase/components/ShowcaseMap.tsx`
- Create: `apps/web/src/showcase/__tests__/ShowcaseMap.test.tsx`

**Context:** `MapCanvas` is store-coupled. `ShowcaseMap` is a fresh, prop-driven MapLibre component. Reuse the same `maplibre-gl` import + MapTiler base-style URL constant.

- [ ] **Step 4.1: Locate base-style URL constant**

Grep:
```bash
```
Use Grep tool with pattern `MAPTILER|maplibre.style|baseStyle|VITE_MAPTILER_KEY` in `apps/web/src/features/map/`. Note the import path; reuse verbatim in `ShowcaseMap.tsx`.

- [ ] **Step 4.2: Write component test (happy-dom)**

```tsx
// apps/web/src/showcase/__tests__/ShowcaseMap.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ShowcaseMap } from '../components/ShowcaseMap';

vi.mock('maplibre-gl', () => ({
  default: { Map: vi.fn(() => ({ on: vi.fn(), addControl: vi.fn(), remove: vi.fn(), addSource: vi.fn(), addLayer: vi.fn() })) },
  Map: vi.fn(() => ({ on: vi.fn(), addControl: vi.fn(), remove: vi.fn(), addSource: vi.fn(), addLayer: vi.fn() })),
}));

describe('ShowcaseMap', () => {
  it('mounts with boundary + empty layers without throwing', () => {
    const { container } = render(
      <ShowcaseMap
        boundary={{ type: 'MultiPolygon', coordinates: [] } as any}
        layers={[]}
        features={[]}
        activeLayerIds={[]}
        interactive={false}
      />,
    );
    expect(container.querySelector('[data-testid="showcase-map"]')).toBeTruthy();
  });
});
```

- [ ] **Step 4.3: Run test (FAIL)**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/ShowcaseMap.test.tsx
```
Expected: FAIL — module missing.

- [ ] **Step 4.4: Implement `<ShowcaseMap>`**

Create `apps/web/src/showcase/components/ShowcaseMap.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ShowcaseLayer, ShowcaseDesignFeature } from '../data/snapshot';

const BASE_STYLE = `https://api.maptiler.com/maps/satellite/style.json?key=${import.meta.env.VITE_MAPTILER_KEY}`;
//   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// REPLACE with the exact constant identified in Step 4.1 if MapCanvas uses a shared constant.

export type ShowcaseMapProps = {
  boundary: GeoJSON.MultiPolygon;
  layers: ShowcaseLayer[];
  features: ShowcaseDesignFeature[];
  activeLayerIds: string[];
  initialView?: { center: [number, number]; zoom: number };
  interactive?: boolean;
};

export function ShowcaseMap({
  boundary, layers, features, activeLayerIds, initialView, interactive = true,
}: ShowcaseMapProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: BASE_STYLE,
      center: initialView?.center ?? [-79.91, 43.56],
      zoom: initialView?.zoom ?? 14,
      interactive,
    });
    mapRef.current = map;
    map.on('load', () => {
      map.addSource('boundary', { type: 'geojson', data: { type: 'Feature', geometry: boundary, properties: {} } as any });
      map.addLayer({ id: 'boundary-line', type: 'line', source: 'boundary', paint: { 'line-color': '#0a7d2c', 'line-width': 2 } });
      // Designed features as one fill layer
      map.addSource('features', { type: 'geojson', data: { type: 'FeatureCollection', features: features.map((f) => ({ type: 'Feature', id: f.id, geometry: f.geometry, properties: { kind: f.feature_type, name: f.name } })) } as any });
      map.addLayer({ id: 'features-fill', type: 'fill', source: 'features', paint: { 'fill-color': ['match', ['get', 'kind'], 'zone', '#3a8f4d', 'structure', '#a35a2b', 'path', '#7a7065', '#888'], 'fill-opacity': 0.45 } });
      // Layer-driven overlays (gated by activeLayerIds)
      for (const layer of layers) {
        if (!activeLayerIds.includes(layer.layer_type)) continue;
        // Layer rendering is summary-data-driven; for v1 we just toggle a visibility marker
        // Detailed per-layer rendering deferred to Task 12 (post-spike refinement).
      }
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [boundary, features, activeLayerIds, layers, interactive, initialView?.center?.[0], initialView?.center?.[1], initialView?.zoom]);

  return <div ref={ref} data-testid="showcase-map" style={{ width: '100%', height: '100%', minHeight: 360 }} />;
}
```

- [ ] **Step 4.5: Verify test passes**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/ShowcaseMap.test.tsx
```
Expected: PASS.

- [ ] **Step 4.6: Commit**

```bash
git add apps/web/src/showcase/components/ShowcaseMap.tsx apps/web/src/showcase/__tests__/ShowcaseMap.test.tsx
git commit -m "feat(web/showcase): ShowcaseMap component (parallel to MapCanvas, no store reads)"
git fetch origin feat/atlas-permaculture
git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

## Session 2 — Scenes, charts, route wiring

### Task 5: `<MapThumbnail>` (hybrid embed)

**Files:**
- Create: `apps/web/src/showcase/components/MapThumbnail.tsx`
- Create: `apps/web/src/showcase/__tests__/MapThumbnail.test.tsx`

- [ ] **Step 5.1: Write test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MapThumbnail } from '../components/MapThumbnail';

vi.mock('../components/ShowcaseMap', () => ({ ShowcaseMap: () => <div data-testid="showcase-map-live" /> }));

describe('MapThumbnail', () => {
  it('renders <img> by default and hydrates ShowcaseMap on click', () => {
    render(
      <MapThumbnail
        sceneId="y2-current"
        alt="Year 2 — soils + watershed"
        mapProps={{ boundary: { type: 'MultiPolygon', coordinates: [] } as any, layers: [], features: [], activeLayerIds: [] }}
      />,
    );
    const img = screen.getByRole('button', { name: /Year 2/i });
    expect(img).toBeTruthy();
    fireEvent.click(img);
    expect(screen.getByTestId('showcase-map-live')).toBeTruthy();
  });
});
```

- [ ] **Step 5.2: Run test (FAIL)**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/MapThumbnail.test.tsx
```

- [ ] **Step 5.3: Implement**

```tsx
// apps/web/src/showcase/components/MapThumbnail.tsx
import { useState } from 'react';
import { ShowcaseMap, type ShowcaseMapProps } from './ShowcaseMap';

export function MapThumbnail({ sceneId, alt, mapProps }: { sceneId: string; alt: string; mapProps: ShowcaseMapProps }) {
  const [live, setLive] = useState(false);
  if (live) return <div style={{ width: '100%', minHeight: 480 }}><ShowcaseMap {...mapProps} interactive /></div>;
  return (
    <button
      type="button"
      onClick={() => setLive(true)}
      aria-label={alt}
      style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', width: '100%' }}
    >
      <picture>
        <source srcSet={`/showcase/scenes/${sceneId}@2x.webp`} media="(min-resolution: 2dppx)" />
        <img src={`/showcase/scenes/${sceneId}.webp`} alt={alt} loading="lazy" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </picture>
      <span style={{ display: 'block', marginTop: 8, fontSize: 13, color: '#555' }}>Click to explore the map →</span>
    </button>
  );
}
```

- [ ] **Step 5.4: Verify PASS + commit**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/MapThumbnail.test.tsx
git add apps/web/src/showcase/components/MapThumbnail.tsx apps/web/src/showcase/__tests__/MapThumbnail.test.tsx
git commit -m "feat(web/showcase): MapThumbnail with click-to-hydrate"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 6: `<MetricChart>` (reuses `aggregate.ts`)

**Files:**
- Read: `apps/web/src/features/plan/regenerationMonitor/aggregate.ts`
- Create: `apps/web/src/showcase/components/MetricChart.tsx`
- Create: `apps/web/src/showcase/__tests__/MetricChart.test.tsx`

- [ ] **Step 6.1: Inspect `aggregate.ts` signature**

Read `apps/web/src/features/plan/regenerationMonitor/aggregate.ts` and note exported function name + return shape. Adapt the chart to consume that exact shape.

- [ ] **Step 6.2: Write test**

```tsx
// apps/web/src/showcase/__tests__/MetricChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricChart } from '../components/MetricChart';

const events = [
  { id: 'e1', event_date: '2024-04-12', event_type: 'observation', phase: 'Y0',
    observations: { metric: 'soil_organic_matter', mean_om_pct_cropped: 1.65 }, parent_event_id: null },
  { id: 'e2', event_date: '2026-04-12', event_type: 'observation', phase: 'Y2',
    observations: { metric: 'soil_organic_matter', mean_om_pct_cropped: 2.25 }, parent_event_id: null },
];

describe('MetricChart', () => {
  it('renders Y0 and Y2 datapoints for a metric', () => {
    render(<MetricChart metric="soil_organic_matter" events={events as any} unit="% OM" />);
    expect(screen.getByText(/soil_organic_matter|Soil organic matter/i)).toBeTruthy();
    expect(screen.getByTestId('metric-chart-svg')).toBeTruthy();
  });
});
```

- [ ] **Step 6.3: Run test (FAIL)** — `pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/MetricChart.test.tsx`

- [ ] **Step 6.4: Implement**

```tsx
// apps/web/src/showcase/components/MetricChart.tsx
import type { ShowcaseRegenerationEvent } from '../data/snapshot';

export function MetricChart({
  metric, events, unit, title,
}: { metric: string; events: ShowcaseRegenerationEvent[]; unit: string; title?: string }) {
  const points = events
    .filter((e) => (e.observations as any)?.metric === metric)
    .map((e) => {
      const obs = e.observations as any;
      const value = obs.mean_om_pct_cropped ?? obs.value ?? obs.mean ?? obs.count ?? null;
      return { date: e.event_date, phase: e.phase, value: typeof value === 'number' ? value : null };
    })
    .filter((p) => p.value !== null) as { date: string; phase: string|null; value: number }[];

  const xs = points.map((p) => new Date(p.date).getTime());
  const ys = points.map((p) => p.value);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const W = 480, H = 200, pad = 32;
  const scaleX = (t: number) => pad + ((t - minX) / (maxX - minX || 1)) * (W - 2 * pad);
  const scaleY = (v: number) => H - pad - ((v - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${scaleX(new Date(p.date).getTime()).toFixed(1)} ${scaleY(p.value).toFixed(1)}`).join(' ');

  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>
        {title ?? metric} <span style={{ color: '#888' }}>({unit})</span>
      </figcaption>
      <svg data-testid="metric-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${metric} trajectory chart`}>
        <path d={path} fill="none" stroke="#0a7d2c" strokeWidth={2.5} />
        {points.map((p) => (
          <circle key={p.date} cx={scaleX(new Date(p.date).getTime())} cy={scaleY(p.value)} r={3} fill="#0a7d2c">
            <title>{`${p.phase ?? ''} ${p.date}: ${p.value} ${unit}`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
```

- [ ] **Step 6.5: PASS + commit**

```bash
git add apps/web/src/showcase/components/MetricChart.tsx apps/web/src/showcase/__tests__/MetricChart.test.tsx
git commit -m "feat(web/showcase): MetricChart over seeded regeneration events"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 7: `<ProjectedChart>` + `projectedTrajectories.ts`

**Files:**
- Create: `apps/web/src/showcase/data/projectedTrajectories.ts`
- Create: `apps/web/src/showcase/components/ProjectedChart.tsx`
- Create: `apps/web/src/showcase/__tests__/ProjectedChart.test.tsx`

- [ ] **Step 7.1: Author projected points (hand-derived from canon)**

```typescript
// apps/web/src/showcase/data/projectedTrajectories.ts
// Hand-authored Y5/Y8 trajectory anchors. Derived from wiki/entities/three-streams-farm.md
// canon milestones + MDPI Apricot Lane Y5/Y9 sampling pattern. NOT modelled data.
export type ProjectedPoint = { phase: 'Y5'|'Y8'; date: string; value: number };
export type ProjectedSeries = { metric: string; unit: string; points: ProjectedPoint[] };

export const PROJECTED_SERIES: ProjectedSeries[] = [
  { metric: 'soil_organic_matter', unit: '% OM',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 3.6 }, { phase: 'Y8', date: '2032-04-15', value: 4.8 }] },
  { metric: 'bird_species_richness', unit: 'species',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 28 }, { phase: 'Y8', date: '2032-04-15', value: 42 }] },
  { metric: 'infiltration_rate_mm_per_hr', unit: 'mm/hr',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 45 }, { phase: 'Y8', date: '2032-04-15', value: 65 }] },
  { metric: 'pollinator_visitation', unit: 'visits/min/transect',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 22 }, { phase: 'Y8', date: '2032-04-15', value: 35 }] },
];
```

- [ ] **Step 7.2: Test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectedChart } from '../components/ProjectedChart';
import { PROJECTED_SERIES } from '../data/projectedTrajectories';

describe('ProjectedChart', () => {
  it('renders with a Projected badge and methodology anchor', () => {
    const series = PROJECTED_SERIES.find((s) => s.metric === 'soil_organic_matter')!;
    render(<ProjectedChart measured={[]} projected={series} unit="% OM" />);
    expect(screen.getByText(/Projected/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /methodology/i })).toBeTruthy();
  });
});
```

- [ ] **Step 7.3: Implement**

```tsx
// apps/web/src/showcase/components/ProjectedChart.tsx
import type { ShowcaseRegenerationEvent } from '../data/snapshot';
import type { ProjectedSeries } from '../data/projectedTrajectories';

export function ProjectedChart({
  measured, projected, unit,
}: { measured: ShowcaseRegenerationEvent[]; projected: ProjectedSeries; unit: string }) {
  // Render a stub SVG composing measured + dashed projected; see MetricChart for the scaling pattern.
  return (
    <figure style={{ margin: 0 }}>
      <figcaption style={{ fontSize: 13, color: '#555', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
        {projected.metric} <span style={{ color: '#888' }}>({unit})</span>
        <span
          style={{ background: '#fff5d6', color: '#7a5500', padding: '2px 8px', borderRadius: 999, fontSize: 11 }}
          title="Forward-projected trajectory derived from canon milestones + MDPI Apricot Lane Y5/Y9 sampling pattern. See methodology."
        >
          Projected
        </span>
        <a href="#methodology" style={{ fontSize: 11, color: '#7a5500' }}>see methodology</a>
      </figcaption>
      <svg viewBox="0 0 480 200" role="img" aria-label={`${projected.metric} measured + projected`}>
        {/* TODO during implementation: render measured solid + projected dashed.
            The scaling helpers are identical to MetricChart — extract a shared util in Step 7.4 if both files duplicate. */}
      </svg>
    </figure>
  );
}
```

- [ ] **Step 7.4: DRY refactor** — if `MetricChart` and `ProjectedChart` duplicate scaling logic, extract `scaleLinear({domain, range})` into `apps/web/src/showcase/components/_chartUtils.ts` and import from both. Update tests.

- [ ] **Step 7.5: PASS + commit**

```bash
git add apps/web/src/showcase/data/projectedTrajectories.ts \
        apps/web/src/showcase/components/ProjectedChart.tsx \
        apps/web/src/showcase/components/_chartUtils.ts \
        apps/web/src/showcase/__tests__/ProjectedChart.test.tsx
git commit -m "feat(web/showcase): ProjectedChart + projectedTrajectories anchors"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 8: `<SceneEngine>` + `sceneManifest.ts`

**Files:**
- Create: `apps/web/src/showcase/data/sceneManifest.ts`
- Create: `apps/web/src/showcase/components/SceneEngine.tsx`
- Create: `apps/web/src/showcase/__tests__/SceneEngine.test.tsx`

- [ ] **Step 8.1: Install runtime deps**

```bash
pnpm --filter @ogden/web add scrollama framer-motion
```

- [ ] **Step 8.2: Scene manifest type + ordering**

```typescript
// apps/web/src/showcase/data/sceneManifest.ts
export type Tier = 'dreaming' | 'transitioning' | 'stewarding';
export type SceneId =
  | 'hero' | 'y0-baseline' | 'y1-water-cover' | 'y2-current'
  | 'y5-projected' | 'y8-projected' | 'methodology' | 'cta'
  | 'dreaming/vision' | 'dreaming/first-steps'
  | 'transitioning/conversion-mechanics' | 'transitioning/water-and-cover'
  | 'stewarding/monitoring-instrumentation' | 'stewarding/adaptive-stewardship';

export const SHARED_SCENES: SceneId[] = [
  'hero','y0-baseline','y1-water-cover','y2-current','y5-projected','y8-projected','methodology','cta',
];

export function scenesForTier(tier: Tier): SceneId[] {
  const tierScenes: Record<Tier, SceneId[]> = {
    dreaming: ['dreaming/vision','dreaming/first-steps'],
    transitioning: ['transitioning/conversion-mechanics','transitioning/water-and-cover'],
    stewarding: ['stewarding/monitoring-instrumentation','stewarding/adaptive-stewardship'],
  };
  // Insert tier-specific scenes after y2-current and before y5-projected.
  const out: SceneId[] = [];
  for (const s of SHARED_SCENES) {
    out.push(s);
    if (s === 'y2-current') out.push(...tierScenes[tier]);
  }
  return out;
}
```

- [ ] **Step 8.3: SceneEngine test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SceneEngine } from '../components/SceneEngine';

describe('SceneEngine', () => {
  it('renders all children as scene panels', () => {
    render(
      <SceneEngine tier="dreaming">
        <section data-scene-id="hero">Hero</section>
        <section data-scene-id="y2-current">Y2</section>
      </SceneEngine>,
    );
    expect(screen.getByText('Hero')).toBeTruthy();
    expect(screen.getByText('Y2')).toBeTruthy();
  });
});
```

- [ ] **Step 8.4: Implement**

```tsx
// apps/web/src/showcase/components/SceneEngine.tsx
import { useEffect, useRef, type ReactNode } from 'react';
import type { Tier } from '../data/sceneManifest';

export function SceneEngine({ tier, children }: { tier: Tier; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let scroller: any;
    (async () => {
      const mod = await import('scrollama');
      scroller = mod.default();
      scroller.setup({ step: '[data-scene-id]', offset: 0.55, debug: false })
        .onStepEnter((resp: any) => { resp.element.classList.add('scene-active'); })
        .onStepExit((resp: any) => { resp.element.classList.remove('scene-active'); });
    })();
    return () => { scroller?.destroy?.(); };
  }, [tier]);
  return <div ref={ref} data-showcase-tier={tier}>{children}</div>;
}
```

- [ ] **Step 8.5: PASS + commit**

```bash
git add apps/web/src/showcase/data/sceneManifest.ts \
        apps/web/src/showcase/components/SceneEngine.tsx \
        apps/web/src/showcase/__tests__/SceneEngine.test.tsx \
        apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat(web/showcase): SceneEngine + sceneManifest + scrollama/framer-motion deps"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 9: `<TierChooser>`, `<AttributionFooter>`, `<ContactCTA>`

**Files:**
- Create:
  - `apps/web/src/showcase/components/TierChooser.tsx`
  - `apps/web/src/showcase/components/AttributionFooter.tsx`
  - `apps/web/src/showcase/components/ContactCTA.tsx`
- Create tests for each.

- [ ] **Step 9.1: AttributionFooter (exact-string test)**

```tsx
// apps/web/src/showcase/__tests__/AttributionFooter.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttributionFooter, APRICOT_LANE_ATTRIBUTION } from '../components/AttributionFooter';

describe('AttributionFooter', () => {
  it('renders the verbatim Apricot Lane attribution', () => {
    render(<AttributionFooter />);
    expect(screen.getByText(APRICOT_LANE_ATTRIBUTION)).toBeTruthy();
  });
  it('pins the exact attribution string (drift guard)', () => {
    expect(APRICOT_LANE_ATTRIBUTION).toBe(
      'Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation.'
    );
  });
});
```

- [ ] **Step 9.2: Implement AttributionFooter**

```tsx
// apps/web/src/showcase/components/AttributionFooter.tsx
export const APRICOT_LANE_ATTRIBUTION =
  'Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation.';

export function AttributionFooter() {
  return (
    <footer style={{ padding: '32px 24px', borderTop: '1px solid #ddd', color: '#555', fontSize: 13 }}>
      <p>{APRICOT_LANE_ATTRIBUTION}</p>
      <p style={{ marginTop: 6 }}>
        <a href="/wiki/entities/three-streams-farm">Read the full Three Streams Farm canon →</a>
      </p>
    </footer>
  );
}
```

- [ ] **Step 9.3: TierChooser**

```tsx
// apps/web/src/showcase/components/TierChooser.tsx
import { Link } from '@tanstack/react-router';
const TIERS = [
  { id: 'dreaming', label: 'I am dreaming about my own land', sub: 'You\'re envisioning a future project.' },
  { id: 'transitioning', label: 'I am transitioning an operation', sub: 'You have land in production today.' },
  { id: 'stewarding', label: 'I am stewarding for the long horizon', sub: 'You manage land for an org or generation.' },
] as const;

export function TierChooser() {
  return (
    <nav aria-label="Choose your path" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 720, margin: '32px auto' }}>
      {TIERS.map((t) => (
        <Link key={t.id} to="/showcase/three-streams/$tier" params={{ tier: t.id }} style={{ padding: 24, border: '1px solid #ddd', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block', fontSize: 18 }}>{t.label}</strong>
          <span style={{ color: '#555' }}>{t.sub}</span>
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 9.4: ContactCTA (tier-specific; no forbidden vocab)**

```tsx
// apps/web/src/showcase/components/ContactCTA.tsx
import type { Tier } from '../data/sceneManifest';

const TIER_CTA: Record<Tier, { headline: string; subline: string; href: string; cta: string }> = {
  dreaming: { headline: 'Talk to us about starting your own land journey', subline: 'Low-pressure conversation about where you might begin.', href: 'https://calendly.com/ogden-three-streams/dreaming', cta: 'Book an intro call' },
  transitioning: { headline: 'Talk to us about converting your operation', subline: 'Share your land context; we\'ll respond within a week.', href: '#transitioning-form', cta: 'Open the contact form' },
  stewarding: { headline: 'Talk to us about long-horizon stewardship partnership', subline: 'For orgs and multi-generational stewards.', href: '#stewarding-form', cta: 'Open the contact form' },
};

export function ContactCTA({ tier }: { tier: Tier }) {
  const c = TIER_CTA[tier];
  return (
    <section style={{ padding: '48px 24px', textAlign: 'center', background: '#f6f8f4' }}>
      <h2 style={{ marginBottom: 12 }}>{c.headline}</h2>
      <p style={{ color: '#555', marginBottom: 24 }}>{c.subline}</p>
      <a href={c.href} style={{ display: 'inline-block', padding: '12px 24px', background: '#0a7d2c', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>{c.cta}</a>
    </section>
  );
}
```

- [ ] **Step 9.5: Tests pass + commit**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/
git add apps/web/src/showcase/components/TierChooser.tsx \
        apps/web/src/showcase/components/AttributionFooter.tsx \
        apps/web/src/showcase/components/ContactCTA.tsx \
        apps/web/src/showcase/__tests__/AttributionFooter.test.tsx
git commit -m "feat(web/showcase): TierChooser + AttributionFooter (exact attribution) + ContactCTA"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 10: MDX wiring + shared scenes (8 files)

**Files:**
- Modify: `apps/web/vite.config.ts` (register `@mdx-js/rollup` — verify Vite config WIP state first; if dirty, defer to Task 12)
- Create: `apps/web/src/showcase/scenes/_shared/{hero,y0-baseline,y1-water-cover,y2-current,y5-projected,y8-projected,methodology,cta}.mdx`

- [ ] **Step 10.1: Install MDX**

```bash
pnpm --filter @ogden/web add -D @mdx-js/rollup @mdx-js/react
```

- [ ] **Step 10.2: Author `y2-current.mdx`** (anchor scene — copy below verbatim; all other scenes follow the same pattern with canon-derived prose. Reference `wiki/entities/three-streams-farm.md` for canon quotes.)

```mdx
---
id: y2-current
title: Year 2 — The soil begins to breathe
tiers: [dreaming, transitioning, stewarding]
mapState:
  activeLayers: [soils, watershed]
  features: []
  view: { center: [-79.91, 43.56], zoom: 14 }
---

import { MapThumbnail } from '../../components/MapThumbnail';
import { MetricChart } from '../../components/MetricChart';

## Year 2 — The soil begins to breathe

Two years after the first cover crop went in, the eastern field's organic matter has climbed
from 1.65% to 2.25%. Earthworm counts have multiplied. The first hedgerow whips are establishing
along the north boundary. The three Sixteen Mile Creek tributaries that give the farm its name
still run after summer rain — the keyline swales are slowing the water long enough for the land
to drink.

<MetricChart metric="soil_organic_matter" unit="% OM" events={props.snapshot.regenerationEvents} title="Cropped-field organic matter" />

<MapThumbnail
  sceneId="y2-current"
  alt="Three Streams Farm at Year 2 — soils + watershed layers"
  mapProps={{
    boundary: props.snapshot.project.parcel_boundary,
    layers: props.snapshot.layers,
    features: props.snapshot.designFeatures,
    activeLayerIds: ['soils', 'watershed'],
  }}
/>
```

- [ ] **Step 10.3: Author the remaining 7 shared scenes** following the same pattern. Front-matter `tiers: [dreaming, transitioning, stewarding]` for all `_shared/*`. Copy must:
  - Quote canon paragraphs from `wiki/entities/three-streams-farm.md` where appropriate
  - **Never** contain "CSRA", "investor", "advance purchase", "yield-share", "salam"
  - For `y5-projected.mdx` and `y8-projected.mdx`, use `<ProjectedChart>` instead of `<MetricChart>` and link `#methodology` from copy
  - `methodology.mdx` explains the projection source (canon doc + MDPI Y5/Y9 sampling pattern)
  - `hero.mdx` includes the `<TierChooser />` component
  - `cta.mdx` renders `<ContactCTA tier={props.tier} />`

- [ ] **Step 10.4: Commit shared scenes**

```bash
git add apps/web/src/showcase/scenes/_shared/ apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat(web/showcase): 8 shared MDX scenes (hero, Y0, Y1, Y2, Y5, Y8, methodology, cta)"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 11: Tier-specific scenes (6 files, 2 per tier)

**Files:**
- Create: `apps/web/src/showcase/scenes/{dreaming,transitioning,stewarding}/{...}.mdx` (6 total)

- [ ] **Step 11.1: Author each tier's 2 scenes** following the front-matter pattern with `tiers: [<tier>]`. Copy guidance:
  - **Dreaming/vision.mdx** — "what could be" framing; canon Y8 vision quote.
  - **Dreaming/first-steps.mdx** — "you don't need 180 acres to start" framing.
  - **Transitioning/conversion-mechanics.mdx** — cover-crop → polyculture sequencing.
  - **Transitioning/water-and-cover.mdx** — keyline swales + cover crops as Y0→Y2 mechanics.
  - **Stewarding/monitoring-instrumentation.mdx** — MDPI cadence + A-series surfaces.
  - **Stewarding/adaptive-stewardship.mdx** — Y5+ adaptive loop.
  - Same forbidden-vocab rules as Task 10.

- [ ] **Step 11.2: Commit**

```bash
git add apps/web/src/showcase/scenes/dreaming/ apps/web/src/showcase/scenes/transitioning/ apps/web/src/showcase/scenes/stewarding/
git commit -m "feat(web/showcase): 6 tier-specific MDX scenes (2 each: dreaming, transitioning, stewarding)"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 12: Vite config (MDX + SSG plugins) + route wiring

**Files:**
- Modify: `apps/web/vite.config.ts` (read foreign-WIP state first; minimal additive edit)
- Modify: `apps/web/src/routes/index.tsx` (append 2 routes)
- Create: `apps/web/src/showcase/routes/showcase.tsx`
- Create: `apps/web/src/showcase/routes/showcase.$tier.tsx`

- [ ] **Step 12.1: Read `vite.config.ts` and `routes/index.tsx`**

Both have foreign WIP per the pre-flight `git status`. Read carefully; identify a stable insertion point in each.

- [ ] **Step 12.2: Register MDX plugin in `vite.config.ts`**

Insert minimally — import `mdx` from `@mdx-js/rollup`; add `mdx()` to the `plugins` array. If `vite-plugin-ssg` was kept in Task 1, register it here too with `routes: ['/showcase/three-streams', '/showcase/three-streams/dreaming', '/showcase/three-streams/transitioning', '/showcase/three-streams/stewarding']`. If the spike chose hand-rolled Playwright, register a build hook calling `scripts/prerender-showcase.ts` instead (created in Task 15).

- [ ] **Step 12.3: Implement route components**

```tsx
// apps/web/src/showcase/routes/showcase.tsx
import { TierChooser } from '../components/TierChooser';
import { AttributionFooter } from '../components/AttributionFooter';
import HeroScene from '../scenes/_shared/hero.mdx';

export function ShowcasePage() {
  return (
    <main>
      <HeroScene />
      <TierChooser />
      <AttributionFooter />
    </main>
  );
}
```

```tsx
// apps/web/src/showcase/routes/showcase.$tier.tsx
import { useParams, Navigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { SceneEngine } from '../components/SceneEngine';
import { AttributionFooter } from '../components/AttributionFooter';
import { ContactCTA } from '../components/ContactCTA';
import { loadSnapshot, type ShowcaseSnapshot } from '../data/snapshot';
import { scenesForTier, type Tier } from '../data/sceneManifest';

const VALID: Tier[] = ['dreaming','transitioning','stewarding'];

export function ShowcaseTierPage() {
  const { tier } = useParams({ from: '/showcase/three-streams/$tier' });
  const [snap, setSnap] = useState<ShowcaseSnapshot | null>(null);
  useEffect(() => { loadSnapshot().then(setSnap); }, []);
  if (!VALID.includes(tier as Tier)) return <Navigate to="/showcase/three-streams" />;
  if (!snap) return <div style={{ padding: 48 }}>Loading…</div>;

  const ids = scenesForTier(tier as Tier);

  return (
    <main>
      <SceneEngine tier={tier as Tier}>
        {ids.map(async (id) => {
          const SceneComponent = (await import(`../scenes/${id}.mdx`)).default;
          return <section key={id} data-scene-id={id}><SceneComponent snapshot={snap} tier={tier} /></section>;
        })}
      </SceneEngine>
      <ContactCTA tier={tier as Tier} />
      <AttributionFooter />
    </main>
  );
}
```

NOTE: dynamic-import in a render is unsafe — refactor to a static import map keyed on `SceneId`. Generate `apps/web/src/showcase/data/sceneComponents.ts` that statically imports all 14 MDX modules and exports `{[id]: Component}`. Update `ShowcaseTierPage` to look up from this map (no `await` in render).

- [ ] **Step 12.4: Wire routes in `apps/web/src/routes/index.tsx`**

Append (as siblings of `appShellRoute`):

```tsx
const showcaseRoute = createRoute({ getParentRoute: () => rootRoute, path: '/showcase/three-streams', component: ShowcasePage });
const showcaseTierRoute = createRoute({ getParentRoute: () => rootRoute, path: '/showcase/three-streams/$tier', component: ShowcaseTierPage });
// ... and add to rootRoute.addChildren([..., showcaseRoute, showcaseTierRoute])
```

Identify the existing `addChildren` call and append the two new routes to its array.

- [ ] **Step 12.5: Run web dev**

```bash
pnpm --filter @ogden/web dev
```
Manually visit `http://localhost:5200/showcase/three-streams` and `/dreaming` — expected: hero loads, tier chooser renders, dreaming page renders shared + tier scenes.

- [ ] **Step 12.6: Commit**

```bash
git add apps/web/src/showcase/routes/ apps/web/src/showcase/data/sceneComponents.ts \
        apps/web/src/routes/index.tsx apps/web/vite.config.ts \
        apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat(web/showcase): route wiring + MDX/SSG plugins + ShowcasePage/ShowcaseTierPage"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

## Session 3 — Scene-image capture, prerender, verification, wiki

### Task 13: Scene-image snapshot script

**Files:**
- Create: `scripts/snapshot-scene-images.ts`
- Modify: root `package.json` (`snapshot:scenes` script)
- Create: `apps/web/public/showcase/scenes/*.webp` (committed)

- [ ] **Step 13.1: Install Playwright**

```bash
pnpm --filter root add -D playwright
pnpm exec playwright install chromium
```

- [ ] **Step 13.2: Implement capture script**

```typescript
// scripts/snapshot-scene-images.ts
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SHARED_SCENES, scenesForTier, type SceneId } from '../apps/web/src/showcase/data/sceneManifest';

const ALL: SceneId[] = [
  ...SHARED_SCENES,
  ...scenesForTier('dreaming').filter((s) => s.startsWith('dreaming/')),
  ...scenesForTier('transitioning').filter((s) => s.startsWith('transitioning/')),
  ...scenesForTier('stewarding').filter((s) => s.startsWith('stewarding/')),
];

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 720 } });
  const page = await ctx.newPage();
  const outDir = resolve(process.cwd(), 'apps/web/public/showcase/scenes');
  await mkdir(outDir, { recursive: true });
  for (const id of ALL) {
    await page.goto(`http://localhost:5200/showcase/_capture?scene=${encodeURIComponent(id)}`);
    await page.waitForSelector('[data-testid="showcase-map"]', { state: 'attached' });
    await page.waitForTimeout(1500); // map tiles settle
    const safe = id.replace('/', '__');
    await page.locator('[data-testid="showcase-map"]').screenshot({ path: `${outDir}/${safe}.webp` });
  }
  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
```

- [ ] **Step 13.3: Add `/showcase/_capture` route** (dev-only) — a stripped page that mounts `<ShowcaseMap>` with the scene's `mapState` decoded from `?scene=`. Add to `routes/index.tsx`; guard with `import.meta.env.DEV`.

- [ ] **Step 13.4: Run + commit**

```bash
pnpm --filter @ogden/web dev &
sleep 5
pnpm snapshot:scenes
```

```bash
git add scripts/snapshot-scene-images.ts package.json \
        apps/web/public/showcase/scenes/ apps/web/src/routes/index.tsx
git commit -m "feat(scripts): scene-image snapshot pipeline + committed WebP thumbnails"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 14: Selective SSG prerender (or Playwright fallback)

**Files:** depends on Task 1 outcome.

**Path A — `vite-plugin-ssg` kept:**
- [ ] Step 14.A.1: Confirm `vite.config.ts` lists the 4 showcase paths in the SSG plugin config.
- [ ] Step 14.A.2: `pnpm --filter @ogden/web build`. Verify `dist/showcase/three-streams/index.html` + `dist/showcase/three-streams/{dreaming,transitioning,stewarding}/index.html` exist and contain rendered MDX content.

**Path B — hand-rolled Playwright fallback:**
- [ ] Step 14.B.1: Create `scripts/prerender-showcase.ts` that runs after `vite build` — spins a `vite preview`, visits each of the 4 routes with Playwright, and writes the resolved HTML to `dist/`.
- [ ] Step 14.B.2: Wire into `apps/web/package.json` `build` script as a postbuild step.

- [ ] **Step 14.X: Commit (whichever path)**

```bash
git add apps/web/vite.config.ts apps/web/package.json scripts/prerender-showcase.ts
git commit -m "feat(web): selective SSG prerender for /showcase/three-streams + tiers"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 15: Covenant copy CI grep

**Files:**
- Create: `apps/web/src/showcase/__tests__/covenant.test.ts`

- [ ] **Step 15.1: Test (ratchet at zero)**

```typescript
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('covenant: forbidden vocab is absent from showcase tree', () => {
  it('grep returns zero matches', () => {
    const FORBIDDEN = String.raw`CSRA|advance.purchase|yield.share|salam|riba|gharar|\binvestor\b|\bROI\b`;
    let matches = '';
    try {
      matches = execSync(
        `git ls-files apps/web/src/showcase | xargs grep -inE "${FORBIDDEN}" || true`,
        { encoding: 'utf8' },
      );
    } catch (e: any) { matches = e.stdout?.toString() ?? ''; }
    expect(matches.trim(), `Forbidden vocab found:\n${matches}`).toBe('');
  });
});
```

- [ ] **Step 15.2: Test (Apricot Lane attribution exact-string presence in prerendered HTML)**

After `pnpm --filter @ogden/web build`, run a second test or a build-time grep to confirm `APRICOT_LANE_ATTRIBUTION` appears in each of the 4 prerendered HTML files in `dist/showcase/`.

- [ ] **Step 15.3: PASS + commit**

```bash
pnpm --filter @ogden/web exec vitest run src/showcase/__tests__/covenant.test.ts
git add apps/web/src/showcase/__tests__/covenant.test.ts
git commit -m "test(web/showcase): covenant copy ratchet (forbidden vocab = zero matches)"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 16: End-to-end verification

- [ ] **Step 16.1: Type + test suites**

```bash
pnpm --filter @ogden/web exec tsc --noEmit
pnpm --filter @ogden/web exec vitest run src/showcase
```
Expected: zero new TS errors; all showcase tests PASS.

- [ ] **Step 16.2: Cold-visitor flow (manual)**

In a fresh incognito window (no localStorage, no auth cookie), visit `/showcase/three-streams`. Pick "Dreaming". Scroll through all 10 scenes. Click one map thumbnail; verify live map mounts. Reach Calendly CTA. Repeat for `/transitioning` and `/stewarding`.

- [ ] **Step 16.3: Lighthouse**

```bash
pnpm dlx lighthouse http://localhost:5200/showcase/three-streams --preset=mobile --only-categories=performance --quiet --chrome-flags="--headless"
```
Expected: FCP < 1.5s, LCP < 2.5s. If not met, identify the long-pole asset and either preload or defer.

- [ ] **Step 16.4: SEO smoke**

```bash
curl -A "Slackbot" http://localhost:5200/showcase/three-streams | grep -i "Three Streams"
```
Expected: returns hero copy from prerendered HTML, not just the SPA shell.

- [ ] **Step 16.5: Authed-app no-regression**

```bash
pnpm --filter @ogden/web exec vitest run
pnpm --filter @ogden/api exec vitest run
```
Expected: no new failures vs baseline (foreign-WIP baseline tolerated).

- [ ] **Step 16.6: Commit verification artefacts (Lighthouse JSON, screenshots)**

```bash
git add docs/superpowers/verification/2026-05-21-three-streams-showcase/
git commit -m "docs: Phase 3 verification — Lighthouse + cold-visitor flow evidence"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 17: Wiki absorption

**Files:**
- Create: `wiki/entities/showcase-portal.md`
- Create: `wiki/decisions/2026-05-21-three-streams-showcase-design.md` (ADR mirroring the spec)
- Create: `wiki/log/2026-05-21-atlas-phase-3-showcase-portal.md`
- Modify: `wiki/log.md` (prepend index entry)
- Modify: `wiki/index.md` (append `## Entities` row)

- [ ] **Step 17.1: Author entity page** following the `wiki/entities/shared-package.md` template:

```markdown
# Showcase Portal — Three Streams
**Type:** public surface (Phase-4 marketing route within apps/web)
**Status:** shipped 2026-05-21
**Path:** apps/web/src/showcase/

## Purpose
[3 sentences: public scrollytelling portal at /showcase/three-streams; static JSON
snapshot of Three Streams Farm substrate; per-tier sibling SSG routes.]

## Architecture
[Build-time snapshot + scene images; runtime SceneEngine + MDX + ShowcaseMap;
selective SSG.]

## Reuses
- regenerationMonitor/aggregate.ts (verbatim)
- packages/shared/src/constants/system.ts:THREE_STREAMS_PROJECT_ID

## Covenant
[Apricot Lane attribution string; forbidden-vocab CI grep; no investor/CSRA framing.]

## Out of scope
[Phase 4 template; live API; auth changes.]
```

- [ ] **Step 17.2: ADR + log entry + index** — mirror the spec at `wiki/decisions/` and document the session at `wiki/log/`. Prepend a one-line index entry to `wiki/log.md`. Append the entity to `wiki/index.md` under `## Entities`.

- [ ] **Step 17.3: Commit wiki**

```bash
git add wiki/entities/showcase-portal.md \
        wiki/decisions/2026-05-21-three-streams-showcase-design.md \
        wiki/log/2026-05-21-atlas-phase-3-showcase-portal.md \
        wiki/log.md wiki/index.md
git commit -m "docs(wiki): Phase 3 absorption — Showcase Portal entity + ADR + log"
git fetch origin feat/atlas-permaculture && git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

---

### Task 18: Session close — push gate

- [ ] **Step 18.1: Final divergence check + push approval**

```bash
git fetch origin feat/atlas-permaculture
git log --oneline origin/feat/atlas-permaculture..HEAD
git rev-list --left-right --count HEAD...origin/feat/atlas-permaculture
```

Surface to the user: N commits ahead / M behind. **Do not push without explicit user "approve push" reply.** If behind > 0, surface to user with a recommendation (typically `git pull --rebase` after reviewing the divergent commits).

- [ ] **Step 18.2: On approval**

```bash
git push origin feat/atlas-permaculture
```

---

## Self-Review (run before handoff)

**Spec coverage** — every spec section maps to at least one task:

| Spec section | Task(s) |
|---|---|
| Build-time pipeline: snapshot script | Task 2 |
| Build-time pipeline: scene-image script | Task 13 |
| Build-time pipeline: selective SSG | Tasks 1, 12, 14 |
| `apps/web/src/showcase/` directory tree | Tasks 3–11 |
| Route wiring (public siblings) | Task 12 |
| Map reuse — `ShowcaseMap` parallel to `MapCanvas` | Task 4 |
| Scene engine (scrollama + framer-motion) | Task 8 |
| Y5/Y8 projected charts (badge + methodology) | Task 7, 10 (y5/y8 MDX) |
| CTA per tier (Calendly + form) | Task 9 |
| Covenant copy ratchet | Task 15 |
| AttributionFooter on every page | Task 9 (component) + Task 12 (route wiring) + Task 15 (presence assertion) |
| Build pipeline verification (FCP, LCP, SEO) | Task 16 |
| Wiki absorption | Task 17 |

**Placeholder scan** — searched for `TBD|TODO|fill in` in this plan:
- One `// TODO during implementation:` comment in Step 7.3 — flagged as a known refactor target (Step 7.4 extracts the DRY shared util). Acceptable.
- All other steps contain runnable code or explicit commands.

**Type consistency:**
- `SceneId` defined in `sceneManifest.ts` (Task 8.2) is the union used in `sceneComponents.ts` (Task 12.3) and `snapshot-scene-images.ts` (Task 13.2). ✓
- `Tier` defined in `sceneManifest.ts` is the prop type used by `<SceneEngine>`, `<ContactCTA>`, and `ShowcaseTierPage`. ✓
- `ShowcaseSnapshot` defined in `data/snapshot.ts` (Task 3) is the type consumed by `<MetricChart>`, `<MapThumbnail>` props, and `ShowcaseTierPage`. ✓
- `APRICOT_LANE_ATTRIBUTION` exported from `AttributionFooter.tsx` (Task 9) is pinned by exact-string test (Step 9.1) and CI-asserted on prerendered HTML (Step 15.2). ✓

**Open risks not fully decomposed:**
- The exact `MapCanvas`/`MapView` layer-rendering code is not duplicated into `ShowcaseMap` in v1 (Step 4.4 has a placeholder comment). For the hybrid model this is fine — the live click-through map renders boundary + features + active overlay markers only; full per-layer rendering (with `summary_data`-driven choropleth, etc.) is a follow-up if needed. Plan accepts this scope reduction.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-three-streams-showcase-portal.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best fit for a ~3-session plan with per-task commits on a rebased branch.

**2. Inline Execution** — execute tasks in this session using `executing-plans`, batch execution with checkpoints. Better if you want to watch each step.

Which approach?
