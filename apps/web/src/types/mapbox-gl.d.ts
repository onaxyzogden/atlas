/**
 * Type shim — redirects mapbox-gl types to maplibre-gl.
 *
 * @mapbox/mapbox-gl-draw (and its @types) import from 'mapbox-gl'.
 * At runtime Vite's resolve.alias handles the swap; this file
 * handles TypeScript's type resolution for the same purpose.
 */
declare module 'mapbox-gl' {
  export * from 'maplibre-gl';
  export { default } from 'maplibre-gl';
}
