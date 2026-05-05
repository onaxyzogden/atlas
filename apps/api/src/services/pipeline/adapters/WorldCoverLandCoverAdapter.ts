/**
 * WorldCoverLandCoverAdapter — INTL-tier land cover fallback from
 * self-hosted ESA WorldCover 10m global COGs.
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline. Activates the
 * INTL slot of ADAPTER_REGISTRY.land_cover (currently empty). WorldCover's
 * 11 classes are the floor — the canonical Atlas class set carries
 * `(unspecified)` buckets where WorldCover's coarseness forces them
 * (Crops, Built-up, Wetland).
 *
 * Source CRS: EPSG:4326 (no reprojection at sample time).
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type {
  DataSourceAdapter,
  AdapterResult,
  ProjectContext,
} from '../DataPipelineOrchestrator.js';
import type { WorldCoverRasterService } from '../../landcover/WorldCoverRasterService.js';
import {
  buildLandCoverResult,
  buildUnavailableResult,
  extractParcelBbox,
} from './landCoverAdapterCommon.js';

const logger = pino({ name: 'WorldCoverLandCoverAdapter' });

const SOURCE_API = 'ESA WorldCover (self-hosted COGs)';
const DEFAULT_ATTRIBUTION =
  'Land cover: © ESA WorldCover project — CC-BY 4.0.';

export class WorldCoverLandCoverAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
    private readonly raster: WorldCoverRasterService,
  ) {}

  async fetchForBoundary(
    boundary: unknown,
    context: ProjectContext,
  ): Promise<AdapterResult> {
    const attribution = this.raster.getAttribution() || DEFAULT_ATTRIBUTION;

    if (!this.raster.isEnabled()) {
      logger.warn('WorldCover manifest not loaded — returning unavailable result');
      return buildUnavailableResult({
        source: 'WorldCover',
        layerType: this.layerType,
        sourceApi: SOURCE_API,
        attribution,
        reason: 'WorldCover tiles not yet ingested — see apps/api/src/jobs/landcover-tile-ingest.ts',
      });
    }

    const bbox = extractParcelBbox(context, boundary);
    logger.info({ bbox, vintage: this.raster.getVintage() }, 'Sampling WorldCover');

    const histogram = await this.raster.sampleHistogram(bbox);
    if (!histogram) {
      return buildUnavailableResult({
        source: 'WorldCover',
        layerType: this.layerType,
        sourceApi: SOURCE_API,
        attribution,
        reason: 'Parcel falls outside WorldCover tile coverage (check tile manifest).',
      });
    }

    return buildLandCoverResult({
      histogram,
      source: 'WorldCover',
      layerType: this.layerType,
      sourceApi: SOURCE_API,
      attribution,
    });
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return this.raster.getAttribution() || DEFAULT_ATTRIBUTION;
  }
}
