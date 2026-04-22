import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, join, dirname } from 'path';
import { createRequire } from 'module';

// Resolve Cesium's Build directory from the hoisted node_modules
const require = createRequire(import.meta.url);
const cesiumRoot = dirname(require.resolve('cesium/package.json'));
const cesiumBuild = join(cesiumRoot, 'Build', 'Cesium');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      injectRegister: 'auto',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB — Cesium bundle is ~4.1 MB
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          // Network-first for API calls — serve from cache when offline
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ogden-api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 5,
            },
          },
          // Stale-while-revalidate for MapTiler raster & vector tiles
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/(tiles|maps)\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ogden-map-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Network-first for MapTiler style JSON (changes rarely)
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/maps\/.*\/style\.json.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ogden-map-styles',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache-first for MapTiler fonts, sprites, and static tiles
          {
            urlPattern: /^https:\/\/api\.maptiler\.com\/(fonts|sprites|tiles)\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ogden-map-assets',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: {
        name: 'OGDEN Land Design Atlas',
        short_name: 'Atlas',
        description: 'A tool for seeing land whole, and building it wisely.',
        theme_color: '#312617',
        background_color: '#faf8f4',
        display: 'standalone',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
    viteStaticCopy({
      targets: [
        { src: join(cesiumBuild, 'Workers').replace(/\\/g, '/') + '/**/*', dest: 'cesium/Workers' },
        { src: join(cesiumBuild, 'Assets').replace(/\\/g, '/') + '/**/*', dest: 'cesium/Assets' },
        { src: join(cesiumBuild, 'ThirdParty').replace(/\\/g, '/') + '/**/*', dest: 'cesium/ThirdParty' },
        { src: join(cesiumBuild, 'Widgets').replace(/\\/g, '/') + '/**/*', dest: 'cesium/Widgets' },
      ],
    }),
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium'),
    // Expose all feature flags to client code (process.env doesn't exist in browser)
    'process.env.FEATURE_TERRAIN_3D': JSON.stringify(process.env.FEATURE_TERRAIN_3D ?? 'false'),
    'process.env.FEATURE_HYDROLOGY': JSON.stringify(process.env.FEATURE_HYDROLOGY ?? 'false'),
    'process.env.FEATURE_LIVESTOCK': JSON.stringify(process.env.FEATURE_LIVESTOCK ?? 'false'),
    'process.env.FEATURE_AI': JSON.stringify(process.env.FEATURE_AI ?? 'false'),
    'process.env.FEATURE_OFFLINE': JSON.stringify(process.env.FEATURE_OFFLINE ?? 'true'),
    'process.env.FEATURE_MULTI_USER': JSON.stringify(process.env.FEATURE_MULTI_USER ?? 'true'),
    'process.env.FEATURE_SCENARIOS': JSON.stringify(process.env.FEATURE_SCENARIOS ?? 'true'),
    'process.env.FEATURE_PUBLIC_PORTAL': JSON.stringify(process.env.FEATURE_PUBLIC_PORTAL ?? 'false'),
  },
  resolve: {
    alias: {
      // More-specific subpath aliases MUST come first — Vite prefix-matches in order.
      '@ogden/shared/scoring': resolve(__dirname, '../../packages/shared/src/scoring/index.ts'),
      '@ogden/shared/manifest': resolve(__dirname, '../../packages/shared/src/featureManifest.ts'),
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      'mapbox-gl': 'maplibre-gl',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Vendor splits
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl') || id.includes('@mapbox/mapbox-gl-draw')) return 'maplibre';
            if (id.includes('@turf/turf')) return 'turf';
            if (
              id.includes('zustand') ||
              id.includes('@tanstack/react-router') ||
              id.includes('@tanstack/react-query')
            ) return 'framework';
            if (id.includes('cesium')) return 'cesium';
            return undefined;
          }
          // Sprint BS: split the lazy-loaded SiteIntelligencePanel (~1.14 MB)
          // into shell + sections + compute-libs so sections load in parallel
          // and changing one section/lib doesn't invalidate the whole panel chunk.
          const norm = id.replace(/\\/g, '/');
          // FAO EcoCrop dataset (~968 kB parsed JSON) — isolate so panel-compute stays lean
          if (norm.includes('/data/ecocrop_parsed.json') || norm.includes('/data/ecocropSubset')) return 'ecocrop-db';
          if (norm.includes('/components/panels/sections/')) return 'panel-sections';
          if (
            /\/lib\/(designIntelligence|regulatoryIntelligence|energyIntelligence|climateProjections|ecosystemValuation|cropMatching|companionPlanting|fuzzyMCDM|hydrologyMetrics|canopyHeight|waterRightsRegistry|computeScores)\.ts/.test(norm) ||
            /\/hooks\/useSiteIntelligenceMetrics\.ts/.test(norm)
          ) return 'panel-compute';
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 5000, // MapLibre + Cesium chunks are large
  },
  server: {
    port: Number(process.env.PORT) || 5200,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  worker: {
    format: 'es',
  },
});
