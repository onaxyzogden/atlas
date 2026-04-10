import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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
