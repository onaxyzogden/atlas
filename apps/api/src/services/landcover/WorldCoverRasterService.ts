/**
 * WorldCoverRasterService — raster sampler for ESA WorldCover global COGs.
 *
 * Source CRS: EPSG:4326 (geographic, native — no reprojection at sample time).
 * Native pixel size: 0.0001° ≈ 10 m at the equator.
 * Vintage cadence: 2020 + 2021 + … (annual since 2020).
 *
 * Per ADR 2026-05-05-pollinator-corridor-raster-pipeline (D2, D3).
 * Tile layout: data/landcover/worldcover/<vintage>/<tile>.tif +
 * worldcover-manifest.json. WorldCover ships as 3°×3° tiles named by
 * SW corner (e.g. ESA_WorldCover_10m_2021_v200_N42W078_Map.tif).
 *
 * Operator ingest: see apps/api/src/jobs/landcover-tile-ingest.ts (Phase 6).
 */

import type { LandCoverSourceId } from '@ogden/shared';
import { LandCoverRasterServiceBase } from './LandCoverRasterServiceBase.js';

export class WorldCoverRasterService extends LandCoverRasterServiceBase {
  protected readonly sourceCRS = 4326;
  protected readonly manifestFilename = 'worldcover-manifest.json';
  protected readonly serviceName = 'WorldCoverRasterService';
  protected readonly sourceId: LandCoverSourceId = 'WorldCover';
  // EPSG:4326 ships with proj4 by default; this is a no-op identity but the
  // base class only consults it if it doesn't already know the EPSG code.
  protected get sourceCRSProj4(): string {
    return '+proj=longlat +datum=WGS84 +no_defs';
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _instance: WorldCoverRasterService | null = null;

export function initWorldCoverService(dataDir: string, s3Prefix: string | null): WorldCoverRasterService {
  _instance = new WorldCoverRasterService(dataDir, s3Prefix);
  _instance.loadManifest();
  return _instance;
}

export function getWorldCoverService(): WorldCoverRasterService | null {
  return _instance;
}
