/**
 * NlcdLandCoverAdapter — US-tier land cover from self-hosted NLCD 2021 COGs.
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D1, D2): raster
 * sample over the parcel bbox, no polygonisation at the adapter layer.
 * Replaces the legacy WMS-based NlcdAdapter when ADAPTER_REGISTRY is flipped
 * (gated on operator running landcover-tile-ingest first).
 *
 * Source CRS: EPSG:5070; reprojected at sample time. See NlcdRasterService.
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type {
  DataSourceAdapter,
  AdapterResult,
  ProjectContext,
} from '../DataPipelineOrchestrator.js';
import type { NlcdRasterService } from '../../landcover/NlcdRasterService.js';
import {
  buildLandCoverResult,
  buildUnavailableResult,
  extractParcelBbox,
} from './landCoverAdapterCommon.js';

const logger = pino({ name: 'NlcdLandCoverAdapter' });

const SOURCE_API = 'USGS NLCD (self-hosted COGs)';
const DEFAULT_ATTRIBUTION =
  'Land cover: USGS National Land Cover Database (Public Domain).';

export class NlcdLandCoverAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
    private readonly raster: NlcdRasterService,
  ) {}

  async fetchForBoundary(
    boundary: unknown,
    context: ProjectContext,
  ): Promise<AdapterResult> {
    const attribution = this.raster.getAttribution() || DEFAULT_ATTRIBUTION;

    if (!this.raster.isEnabled()) {
      logger.warn('NLCD manifest not loaded — returning unavailable result');
      return buildUnavailableResult({
        source: 'NLCD',
        layerType: this.layerType,
        sourceApi: SOURCE_API,
        attribution,
        reason: 'NLCD tiles not yet ingested — see apps/api/src/jobs/landcover-tile-ingest.ts',
      });
    }

    const bbox = extractParcelBbox(context, boundary);
    logger.info({ bbox, vintage: this.raster.getVintage() }, 'Sampling NLCD');

    const histogram = await this.raster.sampleHistogram(bbox);
    if (!histogram) {
      return buildUnavailableResult({
        source: 'NLCD',
        layerType: this.layerType,
        sourceApi: SOURCE_API,
        attribution,
        reason: 'Parcel falls outside NLCD raster extent (US 50 + PR only).',
      });
    }

    return buildLandCoverResult({
      histogram,
      source: 'NLCD',
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
