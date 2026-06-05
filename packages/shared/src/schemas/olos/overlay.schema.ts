// overlay.schema.ts
//
// The 15 universal overlays from the OLOS Observe / Plan / Act developer specs
// (§5 in each). Each Objective binds a default OverlayBundle drawn from this
// set; the map view loads only that bundle when a Stage × Domain × Objective
// is selected. Domain-attached layers (Water Flow → Hydrology home, etc.) are
// modelled by which Domain owns the corresponding overlay-render component —
// the overlay id set itself is stage-agnostic.
//
// Canonical id list, labels, geometry-type hints, and per-overlay metadata are
// re-exported from ../../constants/olos/overlays.ts.

import { z } from 'zod';

export const OverlayId = z.enum([
  'zones',
  'sectors',
  'contours-landform',
  'water-flow',
  'soil-conditions',
  'ecology-habitat',
  'access-movement',
  'infrastructure-utilities',
  'resource-flows',
  'roles-responsibility',
  'risk-compliance',
  'suitability',
  'stewardship-intensity',
  'monitoring-records',
  'timeline-phasing',
]);
export type OverlayId = z.infer<typeof OverlayId>;

export const OverlayGeometryType = z.enum([
  'polygon',
  'line',
  'point',
  'raster',
  'mixed',
]);
export type OverlayGeometryType = z.infer<typeof OverlayGeometryType>;

export const OverlaySchema = z.object({
  id: OverlayId,
  name: z.string().min(1),
  description: z.string(),
  geometryType: OverlayGeometryType,
  defaultStyle: z
    .object({
      fillColor: z.string().optional(),
      strokeColor: z.string().optional(),
      strokeWidth: z.number().optional(),
      opacity: z.number().min(0).max(1).optional(),
      iconColor: z.string().optional(),
    })
    .default({}),
});
export type Overlay = z.infer<typeof OverlaySchema>;

export const OverlayBundleSchema = z.array(OverlayId);
export type OverlayBundle = z.infer<typeof OverlayBundleSchema>;
