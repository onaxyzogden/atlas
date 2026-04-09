import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@ogden/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Mapbox GL is the heaviest dependency (~600KB)
          mapbox: ['mapbox-gl', '@mapbox/mapbox-gl-draw'],
          // Turf.js geospatial utilities
          turf: ['@turf/turf'],
          // State management + routing
          framework: ['zustand', '@tanstack/react-router', '@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Mapbox chunk will be large, that's OK
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
