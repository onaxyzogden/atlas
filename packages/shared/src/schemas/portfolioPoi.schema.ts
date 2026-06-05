import { z } from 'zod';

/**
 * Portfolio resource POIs (Portfolio Home Spec §2 — resource-node extension).
 *
 * A POI ("point of interest") is a steward-placed resource node on the
 * Portfolio Map that is NOT itself a project — e.g. a regional composting
 * depot, a shared water source, a feed store, an aggregation point. POIs
 * connect to whole projects via material FLOWS, modelling inter-project
 * resource exchange where one operation's waste output becomes another's input
 * ("one man's trash is another man's treasure").
 *
 * This EXTENDS the within-project MaterialFlow model (apps/web closedLoopStore)
 * UPWARD: it reuses the material vocabulary (`MaterialKind`) and the monthly
 * quantity fields, but NOT the within-project `sourceId/sinkId` endpoint shape.
 * Here one end is a POI and the other is a whole project, collapsed into a
 * `direction` relative to the POI.
 *
 * POIs are portfolio-scoped (owned by a user, not nested under a project) and
 * are display/awareness metadata for the Portfolio Map — they have no effect on
 * Plan, Act, or Observe data logic.
 */

/**
 * Material vocabulary. Kept in LOCKSTEP with three places:
 *   - the within-project `MaterialKind` union in apps/web closedLoopStore.ts,
 *   - the `material_kind` CHECK constraint in migration 050,
 *   - the API route validation (this schema is the single source of truth).
 * Adding a kind requires updating all three.
 */
export const MaterialKind = z.enum([
  'compost',
  'manure',
  'mulch',
  'water',
  'grain',
  'energy',
  'other',
  'organic_matter',
  'greywater',
]);
export type MaterialKind = z.infer<typeof MaterialKind>;

/**
 * POI category. Drives the map marker glyph/label; kept in lockstep with the
 * `poi_kind` CHECK in migration 050.
 */
export const PoiKind = z.enum([
  'compost_hub',
  'water_source',
  'feed_store',
  'energy_node',
  'aggregation_point',
  'market',
  'other',
]);
export type PoiKind = z.infer<typeof PoiKind>;

/**
 * Flow direction relative to the POI:
 *   output        — the POI SUPPLIES the project (POI → project)
 *   input         — the project supplies the POI (project → POI)
 *   bidirectional — both
 */
export const PoiFlowDirection = z.enum(['input', 'output', 'bidirectional']);
export type PoiFlowDirection = z.infer<typeof PoiFlowDirection>;

/**
 * A material flow between a POI and a project. Reuses the MaterialFlow monthly
 * quantity fields (all optional — a flow may be qualitative only).
 */
export const PoiProjectFlow = z.object({
  id: z.string().uuid(),
  poiId: z.string().uuid(),
  projectId: z.string().uuid(),
  materialKind: MaterialKind,
  direction: PoiFlowDirection,
  label: z.string().nullable(),
  massKgPerMonth: z.number().nullable(),
  volumeLPerMonth: z.number().nullable(),
  energyKwhPerMonth: z.number().nullable(),
  nutrientNKgPerMonth: z.number().nullable(),
  nutrientPKgPerMonth: z.number().nullable(),
  nutrientKKgPerMonth: z.number().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  /** Display name of the linked project — server-supplied for rendering. */
  projectName: z.string().nullable().optional(),
});
export type PoiProjectFlow = z.infer<typeof PoiProjectFlow>;

/** A stored portfolio POI with its material flows. */
export const PortfolioPoi = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  name: z.string(),
  poiKind: PoiKind,
  lng: z.number(),
  lat: z.number(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  flows: z.array(PoiProjectFlow),
});
export type PortfolioPoi = z.infer<typeof PortfolioPoi>;

// ─── Create / Update inputs ─────────────────────────────────────────────────

export const CreatePortfolioPoiInput = z.object({
  name: z.string().min(1).max(200),
  poiKind: PoiKind,
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
  notes: z.string().max(2000).nullable().optional(),
});
export type CreatePortfolioPoiInput = z.infer<typeof CreatePortfolioPoiInput>;

export const UpdatePortfolioPoiInput = z.object({
  name: z.string().min(1).max(200).optional(),
  poiKind: PoiKind.optional(),
  lng: z.number().min(-180).max(180).optional(),
  lat: z.number().min(-90).max(90).optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type UpdatePortfolioPoiInput = z.infer<typeof UpdatePortfolioPoiInput>;

/** A non-negative monthly quantity, nullable + optional (qualitative flows). */
const monthlyQuantity = z.number().nonnegative().max(1e12).nullable().optional();

export const CreatePoiFlowInput = z.object({
  projectId: z.string().uuid(),
  materialKind: MaterialKind,
  direction: PoiFlowDirection,
  label: z.string().max(200).nullable().optional(),
  massKgPerMonth: monthlyQuantity,
  volumeLPerMonth: monthlyQuantity,
  energyKwhPerMonth: monthlyQuantity,
  nutrientNKgPerMonth: monthlyQuantity,
  nutrientPKgPerMonth: monthlyQuantity,
  nutrientKKgPerMonth: monthlyQuantity,
  notes: z.string().max(2000).nullable().optional(),
});
export type CreatePoiFlowInput = z.infer<typeof CreatePoiFlowInput>;

export const UpdatePoiFlowInput = z.object({
  materialKind: MaterialKind.optional(),
  direction: PoiFlowDirection.optional(),
  label: z.string().max(200).nullable().optional(),
  massKgPerMonth: monthlyQuantity,
  volumeLPerMonth: monthlyQuantity,
  energyKwhPerMonth: monthlyQuantity,
  nutrientNKgPerMonth: monthlyQuantity,
  nutrientPKgPerMonth: monthlyQuantity,
  nutrientKKgPerMonth: monthlyQuantity,
  notes: z.string().max(2000).nullable().optional(),
});
export type UpdatePoiFlowInput = z.infer<typeof UpdatePoiFlowInput>;
