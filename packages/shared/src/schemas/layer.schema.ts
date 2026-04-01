import { z } from 'zod';
import { WithConfidence } from './confidence.schema.js';
import { type LayerType } from '../constants/dataSources.js';

export const FetchStatus = z.enum(['pending', 'fetching', 'complete', 'failed', 'unavailable']);
export type FetchStatus = z.infer<typeof FetchStatus>;

// The Layer Contract — every Tier 1/2/3 layer response must conform to this shape.
// Frontend renderer, assessment engine, and AI layer all consume only this interface.
export const LayerResponse = WithConfidence.extend({
  layerId: z.string().uuid(),
  projectId: z.string().uuid(),
  layerType: z.string() as z.ZodType<LayerType>,
  sourceApi: z.string(),
  attributionText: z.string(),
  dataDate: z.string().date().nullable(),
  fetchStatus: FetchStatus,
  data: z.union([
    z.object({ type: z.literal('geojson'), geojson: z.unknown() }),
    z.object({ type: z.literal('raster_ref'), url: z.string() }),
    z.object({ type: z.literal('wms_ref'), url: z.string(), layers: z.string() }),
    z.object({ type: z.literal('summary'), values: z.record(z.unknown()) }),
  ]),
  metadata: z.record(z.unknown()).optional(),
});
export type LayerResponse = z.infer<typeof LayerResponse>;
