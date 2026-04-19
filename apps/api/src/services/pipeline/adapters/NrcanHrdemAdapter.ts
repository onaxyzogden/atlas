/**
 * NrcanHrdemAdapter — Fetches elevation data from NRCan HRDEM (LiDAR or CDEM fallback)
 * via STAC + Cloud-Optimized GeoTIFF and returns summary statistics for a project boundary.
 *
 * API: https://datacube.services.geo.ca/stac/api (STAC search → COG raster)
 *
 * This adapter delegates raster acquisition to ElevationGridReader.readNrcanHrdem(),
 * which handles STAC asset discovery, COG windowed reads, and CGVD2013→NAVD88 datum shift.
 * Summary statistics are computed by the shared computeElevationSummary() from the
 * UsgsElevationAdapter module (same terrain stats logic for both countries).
 *
 * Third live adapter in the pipeline (after SsurgoAdapter + UsgsElevationAdapter).
 */

import pino from 'pino';
import type { LayerType } from '@ogden/shared';
import type { DataSourceAdapter, AdapterResult, ProjectContext } from '../DataPipelineOrchestrator.js';
import { readElevationGrid, type ElevationGrid } from '../../terrain/ElevationGridReader.js';
import { boundaryToBbox, computeElevationSummary } from './UsgsElevationAdapter.js';
import { AppError } from '../../../lib/errors.js';

const logger = pino({ name: 'NrcanHrdemAdapter' });

// ─── Adapter Class ────────────────────────────────────────────────────────────

export class NrcanHrdemAdapter implements DataSourceAdapter {
  constructor(
    public readonly sourceId: string,
    private readonly layerType: LayerType,
  ) {}

  async fetchForBoundary(boundary: unknown, _context: ProjectContext): Promise<AdapterResult> {
    // Step 1: Extract bounding box from GeoJSON boundary
    const bbox = boundaryToBbox(boundary);
    logger.info({ bbox }, 'Fetching NRCan HRDEM elevation for boundary');

    // Step 2: Fetch elevation raster via ElevationGridReader (CA path)
    let grid: ElevationGrid;
    try {
      grid = await readElevationGrid(bbox, 'CA');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('timeout') || message.includes('abort')) {
        throw new AppError('ADAPTER_TIMEOUT', `NRCan HRDEM request timed out: ${message}`, 504);
      }

      if (message.includes('No HRDEM coverage')) {
        logger.warn({ bbox }, 'No HRDEM coverage found — outside Canadian DEM extent');
        return this.buildUnavailableResult();
      }

      if (message.includes('STAC') || message.includes('HTTP')) {
        throw new AppError('ADAPTER_HTTP_ERROR', `NRCan HRDEM STAC error: ${message}`, 502);
      }

      throw new AppError('ADAPTER_NETWORK', `NRCan HRDEM request failed: ${message}`, 502);
    }

    // Step 3: Compute summary statistics (reuse shared function)
    const summary = computeElevationSummary(grid);

    // Override source_api to reflect NRCan
    const nrcanSummary = {
      ...summary,
      source_api: 'NRCan HRDEM (STAC/COG)' as const,
      confidence: grid.confidence, // LiDAR = high, CDEM fallback = medium
    };

    logger.info(
      {
        resolution: nrcanSummary.resolution_m,
        validCells: nrcanSummary.valid_cell_pct,
        elevRange: nrcanSummary.elevation_range_m,
        confidence: nrcanSummary.confidence,
        source: grid.sourceApi,
      },
      'NRCan HRDEM fetch complete',
    );

    return {
      layerType: this.layerType,
      sourceApi: 'NRCan HRDEM (STAC/COG)',
      attributionText: this.getAttributionText(),
      confidence: nrcanSummary.confidence,
      dataDate: nrcanSummary.data_date,
      summaryData: nrcanSummary,
    };
  }

  getConfidence(result: AdapterResult): 'high' | 'medium' | 'low' {
    return result.confidence;
  }

  getAttributionText(): string {
    return 'Natural Resources Canada, High Resolution Digital Elevation Model (HRDEM)';
  }

  private buildUnavailableResult(): AdapterResult {
    return {
      layerType: this.layerType,
      sourceApi: 'NRCan HRDEM (STAC/COG)',
      attributionText: this.getAttributionText(),
      confidence: 'low',
      dataDate: null,
      summaryData: {
        unavailable: true,
        reason: 'outside_hrdem_coverage',
        min_elevation_m: 0,
        max_elevation_m: 0,
        mean_elevation_m: 0,
        elevation_range_m: 0,
        median_elevation_m: 0,
        std_dev_m: 0,
        mean_slope_deg: 0,
        max_slope_deg: 0,
        predominant_aspect: 'Unknown',
        terrain_ruggedness: 'Unknown',
        raster_width: 0,
        raster_height: 0,
        resolution_m: 0,
        valid_cell_pct: 0,
        data_date: new Date().toISOString().split('T')[0]!,
        source_api: 'NRCan HRDEM (STAC/COG)',
        confidence: 'low' as const,
      },
    };
  }
}
