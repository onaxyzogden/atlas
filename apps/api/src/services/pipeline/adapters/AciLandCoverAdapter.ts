/**
 * AciLandCoverAdapter — CA-tier land cover from self-hosted AAFC ACI COGs.
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline. Replaces
 * AafcLandCoverAdapter (legacy WMS path) when registry is flipped after
 * operator runs landcover-tile-ingest. ACI's ag-class detail (Pasture vs.
 * Annual crops) flows through to the canonical class set with full fidelity.
 *
 * Source CRS: EPSG:3347 (Statistics Canada Lambert Conformal Conic).
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type {
  DataSourceAdapter,
  AdapterResult,
  ProjectContext,
} from '../DataPipelineOrchestrator.js';
import type { AciRasterService } from '../../landcover/AciRasterService.js';
import {
  buildLandCoverResult,
  buildUnavailableResult,
  extractParcelBbox,
} from './landCoverAdapterCommon.js';

const logger = pino({ name: 'AciLandCoverAdapter' });

const SOURCE_API = 'AAFC ACI (self-hosted COGs)';
const DEFAULT_ATTRIBUTION =
  'Contains information licensed under the Open Government Licence — Canada. ' +
  'Source: AAFC Annual Crop Inventory.';

export class AciLandCoverAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
    private readonly raster: AciRasterService,
  ) {}

  async fetchForBoundary(
    boundary: unknown,
    context: ProjectContext,
  ): Promise<AdapterResult> {
    const attribution = this.raster.getAttribution() || DEFAULT_ATTRIBUTION;

    if (!this.raster.isEnabled()) {
      logger.warn('ACI manifest not loaded — returning unavailable result');
      return buildUnavailableResult({
        source: 'ACI',
        layerType: this.layerType,
        sourceApi: SOURCE_API,
        attribution,
        reason: 'ACI tiles not yet ingested — see apps/api/src/jobs/landcover-tile-ingest.ts',
      });
    }

    const bbox = extractParcelBbox(context, boundary);
    logger.info({ bbox, vintage: this.raster.getVintage() }, 'Sampling ACI');

    const histogram = await this.raster.sampleHistogram(bbox);
    if (!histogram) {
      return buildUnavailableResult({
        source: 'ACI',
        layerType: this.layerType,
        sourceApi: SOURCE_API,
        attribution,
        reason: 'Parcel falls outside ACI raster extent (Canada only).',
      });
    }

    return buildLandCoverResult({
      histogram,
      source: 'ACI',
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
