/**
 * NlcdRasterService — raster sampler for NLCD 2021 land-cover COGs.
 *
 * Source CRS: EPSG:5070 (NAD83 / Conus Albers Equal Area Conic).
 * Native pixel size: 30 m.
 * Vintage cadence: NLCD product releases ~ every 3 years (last: 2021).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D2, D3).
 * Tile layout: data/landcover/nlcd/<vintage>/<tile>.tif + nlcd-manifest.json.
 *
 * Operator ingest: see apps/api/src/jobs/landcover-tile-ingest.ts (Phase 6).
 */

import { LandCoverRasterServiceBase } from './LandCoverRasterServiceBase.js';

const NLCD_PROJ4 =
  '+proj=aea +lat_0=23 +lon_0=-96 +lat_1=29.5 +lat_2=45.5 ' +
  '+x_0=0 +y_0=0 +datum=NAD83 +units=m +no_defs';

export class NlcdRasterService extends LandCoverRasterServiceBase {
  protected readonly sourceCRS = 5070;
  protected readonly manifestFilename = 'nlcd-manifest.json';
  protected readonly serviceName = 'NlcdRasterService';
  protected get sourceCRSProj4(): string { return NLCD_PROJ4; }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _instance: NlcdRasterService | null = null;

export function initNlcdService(dataDir: string, s3Prefix: string | null): NlcdRasterService {
  _instance = new NlcdRasterService(dataDir, s3Prefix);
  _instance.loadManifest();
  return _instance;
}

export function getNlcdService(): NlcdRasterService | null {
  return _instance;
}
