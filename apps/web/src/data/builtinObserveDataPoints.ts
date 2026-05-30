/**
 * builtinObserveDataPoints — projects builtin sample site facts into the
 * Phase-4 `observeDataPointStore` so the Observe Dashboard lights up.
 *
 * Root cause this fixes: the dashboard's `useDomainSnapshots`
 * (apps/web/src/v3/observe/dashboard/useDomainSnapshot.ts) reads ONLY
 * `observeDataPointStore.byProject[projectId]`. The legacy
 * `seedBuiltinObserveData` populates *source* stores (soil / ecology /
 * topography / hazards / sectors / vision / SWOT) but never the data-point
 * store, so every one of the 16 domain cards renders `missing`. This module
 * supplies a declarative projection of each builtin's site into valid
 * `ObserveDataPoint` rows and replays them idempotently.
 *
 * Two distinct bundles, one per builtin, so the flagship Moontrance Creek
 * sample shows ITS OWN site rather than borrowing the 351-House content
 * (operator decision: author an MTC-specific Observe fixture):
 *   - BUILTIN_351_OBSERVE_BUNDLE  — 351 House (Halton Hills homestead).
 *   - MTC_OBSERVE_BUNDLE          — Moontrance Creek (demo silvopasture).
 *
 * The bundles are declarative (each row carries its own domain + status)
 * rather than derived from the source stores, which keeps this projection
 * decoupled from seven store-row shapes and trivially unit-testable. The
 * pure builder validates every row against `ObserveDataPointSchema`; the
 * replay merges by id via `setProjectPoints` so re-runs (hydrate + a later
 * dashboard mount) never duplicate and never clobber user-captured points.
 */

import {
  ObserveDataPointSchema,
  type ObserveDataPoint,
  type ObserveStatusOutput,
  type UniversalDomain,
} from '@ogden/shared';
import { useObserveDataPointStore } from '../store/observeDataPointStore.js';

/** One declarative seed row. Carries its own domain + status so the builder
 *  stays a thin normaliser/validator. `key` is stable and unique within a
 *  bundle; the produced data-point id is `seed:<key>`. */
export interface ObserveSeedRow {
  key: string;
  domainId: UniversalDomain;
  statusOutput: ObserveStatusOutput;
  /** Any date-ish string: full ISO, YYYY-MM-DD, YYYY-MM, or YYYY. */
  capturedAt: string;
  label: string;
  note?: string;
  /** [lng, lat] if the observation has a location, else omitted. */
  location?: readonly [number, number];
}

const CAPTURED_BY = 'builtin-seed';

/**
 * Normalise a date-ish string to a strict RFC 3339 / `z.string().datetime()`
 * value. Date-only inputs are pinned to UTC midnight so we never shift the
 * day across the local timezone.
 */
export function normalizeCapturedAt(input: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(input)) {
    const ms = Date.parse(input);
    return Number.isNaN(ms) ? '1970-01-01T00:00:00.000Z' : new Date(ms).toISOString();
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return `${input}T00:00:00.000Z`;
  if (/^\d{4}-\d{2}$/.test(input)) return `${input}-01T00:00:00.000Z`;
  if (/^\d{4}$/.test(input)) return `${input}-01-01T00:00:00.000Z`;
  const ms = Date.parse(input);
  return Number.isNaN(ms) ? '1970-01-01T00:00:00.000Z' : new Date(ms).toISOString();
}

/**
 * Pure builder: declarative rows -> validated `ObserveDataPoint[]` for a
 * project. Rows that fail schema validation are skipped (warn in dev) rather
 * than aborting the whole seed. Deterministic: same (projectId, rows) in,
 * same points out — ids are `seed:<key>`.
 */
export function buildBuiltinObserveDataPoints(
  projectId: string,
  rows: readonly ObserveSeedRow[],
): ObserveDataPoint[] {
  const out: ObserveDataPoint[] = [];
  for (const row of rows) {
    const candidate = {
      id: `seed:${row.key}`,
      projectId,
      domainId: row.domainId,
      sourceType: 'manual_observation' as const,
      sourceActionId: null,
      sourceFeedEntryId: null,
      locationGeometry: row.location
        ? { type: 'Point' as const, coordinates: [row.location[0], row.location[1]] }
        : null,
      cycleId: 0,
      isSuperseded: false,
      supersededBy: null,
      statusOutput: row.statusOutput,
      measurementValue: row.note ? { label: row.label, note: row.note } : { label: row.label },
      proofItems: [],
      capturedAt: normalizeCapturedAt(row.capturedAt),
      capturedBy: CAPTURED_BY,
    };
    const parsed = ObserveDataPointSchema.safeParse(candidate);
    if (parsed.success) {
      out.push(parsed.data);
    } else if (import.meta.env?.DEV) {
      console.warn(
        `[builtinObserveDataPoints] skipped invalid seed row "${row.key}":`,
        parsed.error.issues,
      );
    }
  }
  return out;
}

/**
 * Idempotently replay a bundle into the data-point store for `projectId`.
 * Merge-by-id: existing rows whose id is NOT produced by this bundle are
 * preserved (so user-captured manual observations survive), while the seed
 * rows are replaced wholesale. Uses `setProjectPoints` (bypasses
 * supersession) so two nearby seed soil samples both stay active.
 */
export function replayBuiltinObserveDataPoints(
  projectId: string,
  rows: readonly ObserveSeedRow[],
): void {
  if (!projectId) return;
  const built = buildBuiltinObserveDataPoints(projectId, rows);
  if (built.length === 0) return;
  const store = useObserveDataPointStore.getState();
  const seedIds = new Set(built.map((p) => p.id));
  const preserved = store
    .getByProject(projectId)
    .filter((p) => !seedIds.has(p.id));
  store.setProjectPoints(projectId, [...preserved, ...built]);
}

// ───────────────────────────────────────────────────────────────────────
// 351 House — Atlas Sample (Halton Hills homestead). Mirrors the key facts
// already seeded into the source stores by builtinSampleObserveData.ts.
// ───────────────────────────────────────────────────────────────────────

export const BUILTIN_351_OBSERVE_BUNDLE: readonly ObserveSeedRow[] = [
  {
    key: '351-vision',
    domainId: 'vision-intent',
    statusOutput: 'clear',
    capturedAt: '2024-03-01',
    label: 'Carolinian homestead vision set',
    note: 'Food, learning, prayer, regenerative care — modest scale, long horizon.',
  },
  {
    key: '351-people',
    domainId: 'people-governance',
    statusOutput: 'clear',
    capturedAt: '2024-02-01',
    label: 'Two-steward roster confirmed',
    note: 'Lead steward + co-steward sharing maintenance load.',
  },
  {
    key: '351-topo',
    domainId: 'topography',
    statusOutput: 'clear',
    capturedAt: '2024-05-20',
    label: 'House-to-creek transect',
    note: '~28 m drop over 250 m (~11% grade), steepest in the middle third.',
    location: [-79.7045, 43.5055],
  },
  {
    key: '351-soil-yard',
    domainId: 'soil',
    statusOutput: 'clear',
    capturedAt: '2024-06-04',
    label: 'Kitchen-garden bed — pH 6.4, OM 4.2%',
    note: 'Earthworm casts, well-developed root mat, granular crumb structure.',
    location: [-79.7046, 43.5054],
  },
  {
    key: '351-soil-lowerfield',
    domainId: 'soil',
    statusOutput: 'needs_investigation',
    capturedAt: '2024-06-05',
    label: 'Lower field — plough pan at ~12 cm',
    note: 'Tile-drainage era compaction; low biological activity, slow percolation.',
    location: [-79.7053, 43.5048],
  },
  {
    key: '351-hydrology',
    domainId: 'hydrology',
    statusOutput: 'needs_investigation',
    capturedAt: '2024-04-15',
    label: 'Tile drainage shortcuts sheet-flow',
    note: 'Spring water leaves the parcel before it can infiltrate.',
  },
  {
    key: '351-ecology',
    domainId: 'ecology',
    statusOutput: 'clear',
    capturedAt: '2024-06-10',
    label: 'Heritage white oak + raptor activity',
    note: '24 m crown white oak; red-tailed hawk pair hunting the field margin.',
  },
  {
    key: '351-climate',
    domainId: 'climate',
    statusOutput: 'needs_investigation',
    capturedAt: '2024-05-12',
    label: 'Late-spring frost pocket — lower field',
    note: 'Radiative cooling, -2 C at dawn; loss of early apple bloom.',
  },
  {
    key: '351-risk-flood',
    domainId: 'risk-compliance',
    statusOutput: 'major_constraint',
    capturedAt: '2023-04',
    label: 'Conservation Halton 30 m watercourse setback',
    note: 'Regulated creek floods the setback corridor each spring; permits slow.',
  },
  {
    key: '351-landbase-swot',
    domainId: 'land-base',
    statusOutput: 'needs_investigation',
    capturedAt: '2024-06-12',
    label: 'SWOT — disrupted hydrology vs keyline opportunity',
    note: 'Weakness: tile-drained field. Opportunity: spring-fed creek storage.',
  },
];

// ───────────────────────────────────────────────────────────────────────
// Moontrance Creek (MTC) — demo silvopasture conversion. Distinct from the
// 351-House content: its own creek, hedgerow, and tile-drain readings,
// consistent with the curated MTC Act seed (seedCuratedMtcActions.ts).
// ───────────────────────────────────────────────────────────────────────

export const MTC_OBSERVE_BUNDLE: readonly ObserveSeedRow[] = [
  {
    key: 'mtc-vision',
    domainId: 'vision-intent',
    statusOutput: 'clear',
    capturedAt: '2026-05-01',
    label: 'Moontrance Creek silvopasture vision',
    note: 'Convert a tile-drained cash-crop field to creek-edge silvopasture.',
  },
  {
    key: 'mtc-people',
    domainId: 'people-governance',
    statusOutput: 'unknown',
    capturedAt: '2026-05-02',
    label: 'Steward roster not yet confirmed',
    note: 'Decision-maker roster for the creek parcel still being recorded.',
  },
  {
    key: 'mtc-ecology-hedgerow',
    domainId: 'ecology',
    statusOutput: 'clear',
    capturedAt: '2026-05-12',
    label: 'Remnant hedgerow — east boundary',
    note: 'Mixed remnant hedgerow; head-start for a future shelterbelt.',
  },
  {
    key: 'mtc-hydrology-creek',
    domainId: 'hydrology',
    statusOutput: 'needs_investigation',
    capturedAt: '2026-05-14',
    label: 'Seasonal creek runs SW to NE',
    note: 'Flashy seasonal flow; SW inlet to NE outlet across the lower field.',
  },
  {
    key: 'mtc-soil-field',
    domainId: 'soil',
    statusOutput: 'needs_investigation',
    capturedAt: '2026-05-16',
    label: 'Tile-drained crop field — degraded topsoil',
    note: 'Decades of corn/soy rotation; texture sample pulled, structure poor.',
  },
  {
    key: 'mtc-topo',
    domainId: 'topography',
    statusOutput: 'clear',
    capturedAt: '2026-05-10',
    label: 'Gentle fall toward the creek corridor',
    note: 'Low-relief field grading to the seasonal watercourse on the NE edge.',
  },
  {
    key: 'mtc-risk-setback',
    domainId: 'risk-compliance',
    statusOutput: 'major_constraint',
    capturedAt: '2026-05-18',
    label: '30 m watercourse setback applies',
    note: 'Mapped watercourse setback constrains earthworks near the creek.',
  },
  {
    key: 'mtc-access',
    domainId: 'access-circulation',
    statusOutput: 'needs_investigation',
    capturedAt: '2026-05-15',
    label: 'Culvert at the access-track creek crossing',
    note: 'Condition unverified; inspection scheduled before machinery moves.',
  },
  {
    key: 'mtc-climate-sectors',
    domainId: 'climate',
    statusOutput: 'clear',
    capturedAt: '2026-05-08',
    label: 'Prevailing wind + sun sectors logged',
    note: 'Sector read from the field centre informs windbreak placement.',
  },
  {
    key: 'mtc-landbase',
    domainId: 'land-base',
    statusOutput: 'needs_investigation',
    capturedAt: '2026-05-20',
    label: 'Land reading in progress',
    note: 'Baseline climate/landform/water/soil/ecology read still underway.',
  },
];

/** Replay the 351-House Observe data points (idempotent). */
export function seedBuiltinObserveDataPoints(projectId: string): void {
  replayBuiltinObserveDataPoints(projectId, BUILTIN_351_OBSERVE_BUNDLE);
}

/** Replay the Moontrance Creek Observe data points (idempotent). */
export function seedMtcObserveDataPoints(projectId: string): void {
  replayBuiltinObserveDataPoints(projectId, MTC_OBSERVE_BUNDLE);
}
