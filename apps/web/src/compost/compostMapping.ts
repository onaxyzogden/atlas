/**
 * compostMapping — pure boundary mappers between the server's typed compost
 * entities (canonical Celsius, ISO `capturedAt`, `CompostPile`) and the local
 * screen model (Fahrenheit `Reading.temp`, derived `day`/`date`, `PlanRecipe`).
 *
 * NO store or api imports — this module is pure so it is unit-testable in
 * isolation (see compostMapping.test.ts). The unit boundary lives here and
 * ONLY here: server is °C, the Plan/Act/Observe screens stay °F.
 *
 * - `fToC` (model.ts) is the canonical °F→°C (1-decimal) used for display.
 * - `cToF` here is the inverse, rounded to an integer °F to match the
 *   prototype's `logReading` (`round(c*9/5+32)`); `Reading.temp` is integer °F.
 * - `day` has a single source of truth: the index into `capturedAt`-ASC order.
 */

import type {
  CompostPile,
  CompostReading,
  CompostRecipeLayer,
} from '@ogden/shared';
import {
  PLAN_RECIPE,
  fToC,
  type PlanRecipe,
  type PlanObjective,
  type RecipeLayer,
  type Reading,
} from './model.js';

// ── Outbound payload + queue-op types ──────────────────────────────────────

/** POST body for a reading — matches the apiClient `readings.create` input. */
export type ReadingCreatePayload = Omit<CompostReading, 'id' | 'pileId' | 'recordedBy'>;

/** POST body for a pile — matches the apiClient `piles.create` input. */
export type CompostPileCreate = Omit<CompostPile, 'id' | 'siteId' | 'orgId' | 'ownerId'>;

/** PATCH body for a pile — matches the apiClient `piles.update` input. */
export type CompostPilePatch = Partial<CompostPileCreate>;

/**
 * A pending offline mutation. `createReading` is keyed by the optimistic temp
 * `localId` (so a retry never double-POSTs); `patchPile` coalesces to a single
 * slot (last-write-wins) because there is exactly one active pile.
 */
export type CompostOp =
  | {
      kind: 'createReading';
      localId: string;
      payload: ReadingCreatePayload;
      retryCount: number;
      ts: number;
    }
  | {
      kind: 'patchPile';
      localId: 'pile';
      patch: CompostPilePatch;
      retryCount: number;
      ts: number;
    };

// ── Temperature + date helpers ─────────────────────────────────────────────

/** °C → integer °F (inverse of the display `fToC`; matches `logReading`). */
export function cToF(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/**
 * Format an ISO timestamp as the screens' short label ("Mar 04"). Formatted in
 * UTC so it is deterministic regardless of the runner/browser timezone (the
 * synthetic seed timestamps are minted at 12:00 UTC).
 */
export function formatReadingDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    timeZone: 'UTC',
  });
}

/** Deterministic synthetic capture time for the day-N textbook seed reading. */
const SEED_BASE_MS = Date.parse('2026-03-04T12:00:00.000Z');
export function seedCapturedAt(day: number): string {
  return new Date(SEED_BASE_MS + day * 86_400_000).toISOString();
}

/** Re-stamp each reading's `day` to its array index (captured_at-ASC order). */
export function reindexDays(readings: Reading[]): Reading[] {
  return readings.map((r, i) => (r.day === i ? r : { ...r, day: i }));
}

// ── Reading mapping ────────────────────────────────────────────────────────

/**
 * Map one server reading to the local screen model. `day` is supplied by the
 * caller (the captured_at-ASC index); moisture falls back to the prior
 * reading's value when the server stored none (manual logs omit moisture).
 */
export function readingFromApi(
  r: CompostReading,
  day: number,
  fallbackMoisture: number,
): Reading {
  return {
    id: r.id,
    day,
    date: formatReadingDate(r.capturedAt),
    temp: cToF(r.tempC),
    moisture: r.moisturePct ?? fallbackMoisture,
    turned: r.turned,
    note: r.note ?? '',
    proofPhoto: Boolean(r.proofPhotoUri),
  };
}

/**
 * Map a full server reading list to the local series: sort by `capturedAt`
 * ASC, assign `day` = index (the single source of `day`), and carry moisture
 * forward across readings that lack their own value.
 */
export function readingsFromApi(list: CompostReading[]): Reading[] {
  const sorted = [...list].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const out: Reading[] = [];
  let lastMoisture = 50;
  sorted.forEach((r, i) => {
    const reading = readingFromApi(r, i, lastMoisture);
    lastMoisture = reading.moisture;
    out.push(reading);
  });
  return out;
}

/** Build the POST body for a manual reading logged by the operator (°C in). */
export function readingCreatePayload(
  tempC: number,
  note: string,
  capturedAt: string,
): ReadingCreatePayload {
  return {
    tempC,
    turned: false,
    note: note || undefined,
    source: 'manual',
    capturedAt,
  };
}

/**
 * Build the POST body that server-seeds one textbook reading. Converts the
 * local °F seed to canonical °C, preserves moisture/turned/note, and maps the
 * boolean `proofPhoto` flag to a placeholder proof URI so it survives the
 * round-trip back into `proofPhoto: true`.
 */
export function seedReadingToApiCreate(r: Reading, capturedAt: string): ReadingCreatePayload {
  return {
    tempC: fToC(r.temp),
    moisturePct: r.moisture,
    turned: r.turned,
    note: r.note || undefined,
    source: 'manual',
    capturedAt,
    proofPhotoUri: r.proofPhoto ? 'seed://proof' : undefined,
  };
}

// ── Pile ↔ PlanRecipe mapping ──────────────────────────────────────────────

function layerToApi(l: RecipeLayer): CompostRecipeLayer {
  return {
    id: l.id,
    type: l.type,
    name: l.name,
    depth: l.depth,
    cnApprox: l.cnApprox,
    status: l.status === 'complete' ? 'complete' : 'pending',
  };
}

function layerFromApi(l: CompostRecipeLayer): RecipeLayer {
  return {
    id: l.id,
    type: l.type,
    name: l.name,
    depth: l.depth ?? '',
    cnApprox: l.cnApprox ?? 0,
    status: l.status,
  };
}

/** Map a local `PlanRecipe` to a pile-create body (°F targets → °C). */
export function pileCreateFromPlanRecipe(recipe: PlanRecipe): CompostPileCreate {
  return {
    name: recipe.pileName,
    cycleLabel: recipe.cycle,
    status: 'active',
    dimensions: {
      lengthFt: recipe.dimensions.l,
      widthFt: recipe.dimensions.w,
      heightFt: recipe.dimensions.h,
    },
    targetCnRatio: recipe.cnRatio,
    targetMoisturePct: recipe.targetMoisture,
    targetTempMinC: fToC(recipe.targetTempMin),
    targetTempMaxC: fToC(recipe.targetTempMax),
    recipeLayers: recipe.layers.map(layerToApi),
    buildChecklist: recipe.checklist.map((c) => ({ id: c.id, label: c.label, done: c.done })),
    objectives: recipe.objectives.map((o) => ({
      id: o.id,
      tier: o.tier,
      title: o.title,
      status: o.status,
      gate: o.gate,
    })),
  };
}

/**
 * Map a server pile back to the exact `PlanRecipe` shape the Plan screen reads
 * (°C targets → °F; `volumeCuFt` recomputed from dimensions; `siteName` is the
 * site's display name). Absent optionals fall back to the static PLAN_RECIPE so
 * the screen never renders a hole.
 */
export function planRecipeFromPile(pile: CompostPile, siteName?: string): PlanRecipe {
  const dims = pile.dimensions ?? {
    lengthFt: PLAN_RECIPE.dimensions.l,
    widthFt: PLAN_RECIPE.dimensions.w,
    heightFt: PLAN_RECIPE.dimensions.h,
  };
  const l = dims.lengthFt;
  const w = dims.widthFt;
  const h = dims.heightFt;
  const objectives: PlanObjective[] = pile.objectives.map((o) => ({
    id: o.id,
    tier: o.tier,
    title: o.title,
    status: o.status,
    gate: o.gate ?? '',
  }));
  return {
    pileName: pile.name,
    site: siteName ?? PLAN_RECIPE.site,
    cycle: pile.cycleLabel ?? PLAN_RECIPE.cycle,
    dimensions: { l, w, h },
    volumeCuFt: l * w * h,
    cnRatio: pile.targetCnRatio ?? PLAN_RECIPE.cnRatio,
    targetMoisture: pile.targetMoisturePct ?? PLAN_RECIPE.targetMoisture,
    targetTempMin: pile.targetTempMinC != null ? cToF(pile.targetTempMinC) : PLAN_RECIPE.targetTempMin,
    targetTempMax: pile.targetTempMaxC != null ? cToF(pile.targetTempMaxC) : PLAN_RECIPE.targetTempMax,
    layers: pile.recipeLayers.map(layerFromApi),
    checklist: pile.buildChecklist.map((c) => ({ id: c.id, label: c.label, done: c.done })),
    objectives,
  };
}
