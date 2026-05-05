/**
 * AciRasterService — raster sampler for AAFC Annual Crop Inventory COGs.
 *
 * Source CRS: EPSG:3347 (NAD83 / Statistics Canada Lambert Conformal Conic).
 * Native pixel size: 30 m.
 * Vintage cadence: annual since 1985 (latest typically published ~Q1 of n+1).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D2, D3).
 * Tile layout: data/landcover/aci/<vintage>/<tile>.tif + aci-manifest.json.
 *
 * Operator ingest: see apps/api/src/jobs/landcover-tile-ingest.ts (Phase 6).
 */

import { LandCoverRasterServiceBase } from './LandCoverRasterServiceBase.js';

const ACI_PROJ4 =
  '+proj=lcc +lat_0=63.390675 +lon_0=-91.866667 +lat_1=49 +lat_2=77 ' +
  '+x_0=6200000 +y_0=3000000 +datum=NAD83 +units=m +no_defs';

export class AciRasterService extends LandCoverRasterServiceBase {
  protected readonly sourceCRS = 3347;
  protected readonly manifestFilename = 'aci-manifest.json';
  protected readonly serviceName = 'AciRasterService';
  protected get sourceCRSProj4(): string { return ACI_PROJ4; }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _instance: AciRasterService | null = null;

export function initAciService(dataDir: string, s3Prefix: string | null): AciRasterService {
  _instance = new AciRasterService(dataDir, s3Prefix);
  _instance.loadManifest();
  return _instance;
}

export function getAciService(): AciRasterService | null {
  return _instance;
}
