import { z } from 'zod';
import { ConfidenceLevel } from './confidence.schema.js';

// ─── Enums ──────────────────────────────────────────────────────────────────

export const FileType = z.enum([
  'kml',
  'kmz',
  'geojson',
  'shapefile',
  'geotiff',
  'photo',
  'soil_test',
  'document',
]);
export type FileType = z.infer<typeof FileType>;

export const ProcessingStatus = z.enum([
  'pending',
  'processing',
  'complete',
  'failed',
]);
export type ProcessingStatus = z.infer<typeof ProcessingStatus>;

// ─── Project File ───────────────────────────────────────────────────────────

export const ProjectFile = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  uploadedBy: z.string().uuid().nullable().optional(),
  filename: z.string(),
  fileType: FileType,
  storageUrl: z.string(),
  fileSizeBytes: z.number(),
  processingStatus: ProcessingStatus,
  processedGeojson: z.unknown().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
});
export type ProjectFile = z.infer<typeof ProjectFile>;

// ─── Extended with confidence (for UI display of extracted data) ────────────

export const ProjectFileWithConfidence = ProjectFile.extend({
  confidence: ConfidenceLevel.optional(),
  dataSources: z.array(z.string()).optional(),
});
export type ProjectFileWithConfidence = z.infer<typeof ProjectFileWithConfidence>;

// ─── Geo extraction result (stored in processed_geojson) ────────────────────

export const GeoExtractionResult = z.object({
  geojson: z.unknown(),
  featureCount: z.number(),
  geometryTypes: z.array(z.string()),
  bbox: z.array(z.number()).length(4).nullable(),
});
export type GeoExtractionResult = z.infer<typeof GeoExtractionResult>;

// ─── EXIF metadata (stored in metadata for photos) ─────────────────────────

export const ExifMetadata = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  altitude: z.number().optional(),
  timestamp: z.string().optional(),
  camera: z.string().optional(),
});
export type ExifMetadata = z.infer<typeof ExifMetadata>;

// ─── Soil test extraction (stored in metadata for soil_test files) ──────────

export const SoilTestExtraction = z.object({
  ph: z.number().optional(),
  organicMatter: z.number().optional(),
  texture: z.string().optional(),
  nitrogen: z.number().optional(),
  phosphorus: z.number().optional(),
  potassium: z.number().optional(),
});
export type SoilTestExtraction = z.infer<typeof SoilTestExtraction>;

// ─── Size limits per file type (bytes) ──────────────────────────────────────

export const FILE_SIZE_LIMITS: Record<FileType, number> = {
  kml: 50 * 1024 * 1024,       // 50 MB
  kmz: 50 * 1024 * 1024,
  geojson: 50 * 1024 * 1024,
  shapefile: 50 * 1024 * 1024,
  geotiff: 200 * 1024 * 1024,  // 200 MB (rasters are large)
  photo: 25 * 1024 * 1024,     // 25 MB
  soil_test: 10 * 1024 * 1024, // 10 MB
  document: 50 * 1024 * 1024,
};
