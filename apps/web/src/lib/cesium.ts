import { Ion, CesiumTerrainProvider } from 'cesium';

const ionToken = import.meta.env['VITE_CESIUM_ION_TOKEN'] as string | undefined;

/** Whether a Cesium Ion access token is configured */
export const hasCesiumToken = !!ionToken;

/** Set the Ion default access token. Call once before creating terrain providers. */
export function initCesiumIon() {
  if (ionToken) {
    Ion.defaultAccessToken = ionToken;
  }
}

/** Create a Cesium World Terrain provider (Ion asset 1) with vertex normals and water mask. */
export async function createWorldTerrain() {
  return await CesiumTerrainProvider.fromIonAssetId(1, {
    requestVertexNormals: true,
    requestWaterMask: true,
  });
}
