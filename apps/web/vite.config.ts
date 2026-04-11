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
          // Stale-while-revalidate for Mapbox raster & vector tiles
          {
            urlPattern: /^https:\/\/(api|tiles)\.mapbox\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'ogden-map-tiles',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Network-first for Mapbox style JSON (changes rarely)
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/styles\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ogden-map-styles',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
              networkTimeoutSeconds: 3,
            },
          },
          // Cache-first for Mapbox fonts and sprites (static assets)
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/(fonts|sprites)\/.*/,
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
    // Expose feature flags to client code (process.env doesn't work in Vite)
    'process.env.FEATURE_OFFLINE': JSON.stringify(process.env.FEATURE_OFFLINE ?? 'true'),
    'process.env.FEATURE_MULTI_USER': JSON.stringify(process.env.FEATURE_MULTI_USER ?? 'true'),
    'process.env.FEATURE_SCENARIOS': JSON.stringify(process.env.FEATURE_SCENARIOS ?? 'true'),
  },
  resolve: {
    alias: {
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      'mapbox-gl': 'maplibre-gl',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // MapLibre GL is the heaviest dependency (~600KB)
          maplibre: ['maplibre-gl', '@mapbox/mapbox-gl-draw'],
          // Turf.js geospatial utilities
          turf: ['@turf/turf'],
          // State management + routing
          framework: ['zustand', '@tanstack/react-router', '@tanstack/react-query'],
          // CesiumJS 3D engine — lazy-loaded, separate chunk
          cesium: ['cesium'],
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
